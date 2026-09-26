import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';
import { detectImageMime, getImageStorageProvider, imageStorageConfig } from '../services/imageStorageService';

const router = express.Router();
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: imageStorageConfig.maxBytes, files: imageStorageConfig.maxImages } });
const imageUploadMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  imageUpload.array('files', imageStorageConfig.maxImages)(req, res, (error) => {
    if (error) return res.status(400).json({ error: imageErrorMessage(error) });
    next();
  });
};

// Apply authentication to all routes
router.use(authenticateToken);

const vehicleStatusSchema = z.enum(['IDLE', 'RENTED', 'RESERVED', 'SERVICE']);

// Kiralama sitesi vitrin alanları — hepsi opsiyonel, null ile temizlenebilir
const showcaseFields = {
  category: z.string().max(40).nullable().optional(),
  year: z.number().int().min(1980).max(2100).nullable().optional(),
  fuelType: z.string().max(30).nullable().optional(),
  transmission: z.string().max(30).nullable().optional(),
  seats: z.number().int().min(1).max(20).nullable().optional(),
  dailyRateTL: z.number().min(0).nullable().optional(), // TL cinsinden gelir, kuruş olarak saklanır
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(2_000).nullable().optional(), // yalnızca harici URL; binary upload ayrı image endpointinden yapılır
  showOnSite: z.boolean().optional()
};

const createVehicleSchema = z.object({
  plate: z.string().min(1),
  name: z.string().optional(),
  isConsignment: z.boolean().optional(),
  status: vehicleStatusSchema.optional(),
  active: z.boolean().optional(),
  ...showcaseFields
});

const updateVehicleSchema = z.object({
  plate: z.string().optional(),
  name: z.string().optional(),
  status: vehicleStatusSchema.optional(),
  active: z.boolean().optional(),
  ...showcaseFields
});

// dailyRateTL alanını kuruş cinsinden dailyRate'e çevirir
function mapShowcaseData<T extends { dailyRateTL?: number | null }>(data: T) {
  const { dailyRateTL, ...rest } = data;
  return {
    ...rest,
    ...(dailyRateTL !== undefined
      ? { dailyRate: dailyRateTL === null ? null : Math.round(dailyRateTL * 100) }
      : {})
  };
}

const imageMetaSchema = z.object({
  altText: z.string().trim().max(160).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
const externalImageSchema = z.object({
  imageUrl: z.string().max(2_000).url().refine((value) => /^https?:\/\//i.test(value), 'Yalnızca http/https görsel URL\'si kullanılabilir.'),
  altText: z.string().trim().max(160).optional().nullable(),
});
const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(imageStorageConfig.maxImages) });

function imageErrorMessage(error: unknown): string {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return `Görsel boyutu en fazla ${Math.round(imageStorageConfig.maxBytes / 1024 / 1024)} MB olabilir.`;
    if (error.code === 'LIMIT_FILE_COUNT') return `Bir araçta en fazla ${imageStorageConfig.maxImages} görsel olabilir.`;
  }
  return error instanceof Error ? error.message : 'Görsel yüklenemedi.';
}

async function createVehicleImage(vehicleId: string, input: { imageUrl: string; storageKey?: string | null; altText?: string | null; sortOrder?: number; forcePrimary?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.vehicleImage.count({ where: { vehicleId } });
    const isPrimary = input.forcePrimary || count === 0;
    if (isPrimary) await tx.vehicleImage.updateMany({ where: { vehicleId }, data: { isPrimary: false } });
    return tx.vehicleImage.create({ data: { vehicleId, imageUrl: input.imageUrl, storageKey: input.storageKey || null, altText: input.altText || null, sortOrder: input.sortOrder ?? count, isPrimary } });
  });
}

// POST /api/vehicles/:vehicleId/images — binary upload (multipart/form-data, field: files)
router.post('/:vehicleId/images', imageUploadMiddleware, async (req, res) => {
  const uploaded: Array<{ imageUrl: string; storageKey: string }> = [];
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.vehicleId }, select: { id: true } });
    if (!vehicle) return res.status(404).json({ error: 'Araç bulunamadı.' });
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    if (!files.length) return res.status(400).json({ error: 'En az bir görsel seçilmelidir.' });
    const currentCount = await prisma.vehicleImage.count({ where: { vehicleId: vehicle.id } });
    if (currentCount + files.length > imageStorageConfig.maxImages) return res.status(400).json({ error: `Bir araçta en fazla ${imageStorageConfig.maxImages} görsel olabilir.` });
    const storage = getImageStorageProvider();
    for (const file of files) {
      const mime = detectImageMime(file.buffer);
      if (!mime) {
        const validationError = new Error('Yalnızca gerçek JPG, PNG veya WebP dosyaları kabul edilir. SVG desteklenmez.') as Error & { statusCode?: number };
        validationError.statusCode = 400;
        throw validationError;
      }
      const stored = await storage.uploadVehicleImage({ buffer: file.buffer, mimeType: mime, vehicleId: vehicle.id });
      uploaded.push(stored);
    }
    const images = [];
    for (const stored of uploaded) images.push(await createVehicleImage(vehicle.id, stored));
    return res.status(201).json({ data: images });
  } catch (error) {
    if (uploaded.length) {
      try {
        const storage = getImageStorageProvider();
        await Promise.allSettled(uploaded.map((item) => storage.deleteVehicleImage(item)));
      } catch {
        // Preserve the original request error if storage cleanup itself fails.
      }
    }
    const statusCode = error instanceof multer.MulterError ? 400 : (error as { statusCode?: number })?.statusCode || 500;
    return res.status(statusCode).json({ error: imageErrorMessage(error) });
  }
});

// POST /api/vehicles/:vehicleId/images/url — explicitly managed external URL
router.post('/:vehicleId/images/url', async (req, res) => {
  try {
    const input = externalImageSchema.parse(req.body);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.vehicleId }, select: { id: true } });
    if (!vehicle) return res.status(404).json({ error: 'Araç bulunamadı.' });
    const count = await prisma.vehicleImage.count({ where: { vehicleId: vehicle.id } });
    if (count >= imageStorageConfig.maxImages) return res.status(400).json({ error: `Bir araçta en fazla ${imageStorageConfig.maxImages} görsel olabilir.` });
    return res.status(201).json({ data: await createVehicleImage(vehicle.id, { imageUrl: input.imageUrl, altText: input.altText }) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0]?.message || 'Geçersiz görsel URL.' });
    return res.status(500).json({ error: 'Görsel URL eklenemedi.' });
  }
});

router.patch('/:vehicleId/images/reorder', async (req, res) => {
  try {
    const { ids } = reorderSchema.parse(req.body);
    const existing = await prisma.vehicleImage.findMany({ where: { vehicleId: req.params.vehicleId }, select: { id: true } });
    if (existing.length !== ids.length || existing.some((item) => !ids.includes(item.id))) return res.status(400).json({ error: 'Sıralama araç görselleriyle eşleşmiyor.' });
    await prisma.$transaction(ids.map((id, index) => prisma.vehicleImage.update({ where: { id }, data: { sortOrder: index } })));
    return res.json({ data: await prisma.vehicleImage.findMany({ where: { vehicleId: req.params.vehicleId }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] }) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Geçersiz görsel sıralaması.' });
    return res.status(500).json({ error: 'Görsel sıralaması güncellenemedi.' });
  }
});

router.patch('/:vehicleId/images/:imageId/primary', async (req, res) => {
  try {
    const image = await prisma.vehicleImage.findFirst({ where: { id: req.params.imageId, vehicleId: req.params.vehicleId } });
    if (!image) return res.status(404).json({ error: 'Görsel bulunamadı.' });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.vehicleImage.updateMany({ where: { vehicleId: image.vehicleId }, data: { isPrimary: false } });
      return tx.vehicleImage.update({ where: { id: image.id }, data: { isPrimary: true } });
    });
    return res.json({ data: updated });
  } catch { return res.status(500).json({ error: 'Ana görsel güncellenemedi.' }); }
});

router.patch('/:vehicleId/images/:imageId', async (req, res) => {
  try {
    const input = imageMetaSchema.parse(req.body);
    const image = await prisma.vehicleImage.updateMany({ where: { id: req.params.imageId, vehicleId: req.params.vehicleId }, data: input });
    if (!image.count) return res.status(404).json({ error: 'Görsel bulunamadı.' });
    return res.json({ data: await prisma.vehicleImage.findUnique({ where: { id: req.params.imageId } }) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Geçersiz görsel bilgisi.' });
    return res.status(500).json({ error: 'Görsel bilgisi güncellenemedi.' });
  }
});

router.delete('/:vehicleId/images/:imageId', async (req, res) => {
  try {
    const image = await prisma.vehicleImage.findFirst({ where: { id: req.params.imageId, vehicleId: req.params.vehicleId } });
    if (!image) return res.status(404).json({ error: 'Görsel bulunamadı.' });
    await getImageStorageProvider().deleteVehicleImage(image);
    await prisma.vehicleImage.delete({ where: { id: image.id } });
    if (image.isPrimary) {
      const next = await prisma.vehicleImage.findFirst({ where: { vehicleId: image.vehicleId }, orderBy: { sortOrder: 'asc' } });
      if (next) await prisma.vehicleImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return res.json({ message: 'Görsel silindi.' });
  } catch (error) { return res.status(500).json({ error: imageErrorMessage(error) }); }
});

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const { status, consignment, archived = 'active', limit = '1000' } = req.query;
    
    const where: any = {};
    if (status && vehicleStatusSchema.safeParse(status).success) {
      where.status = status;
    }
    
    // Konsinye araç filtrelemesi
    if (consignment !== undefined) {
      where.isConsignment = consignment === 'true';
    }
    if (archived !== 'all') where.archivedAt = archived === 'archived' ? { not: null } : null;

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { plate: 'asc' },
      take: parseInt(limit as string),
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 12 },
        _count: {
          select: { rentals: true }
        },
        rentals: {
          where: {
            deleted: false // Sadece silinmemiş kiralamaları dahil et
          },
          include: {
            payments: true
          }
        }
      }
    });

    // Calculate revenue performance for each vehicle
    const vehiclesWithPerformance = await Promise.all(vehicles.map(async vehicle => {
      let totalRevenue = 0;
      let totalCollected = 0;
      let totalBalance = 0;

      // Active rentals calculations
      vehicle.rentals.forEach(rental => {
        totalRevenue += rental.totalDue;
        
        // Calculate total paid for this rental
        const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        const paidFromPayments = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalPaid = paidFromRental + paidFromPayments;
        
        // Calculate actual balance = totalDue - all payments
        const actualBalance = rental.totalDue - totalPaid;
        
        totalCollected += totalPaid;
        totalBalance += actualBalance; // Use real-time calculated balance
      });

      // Calculate deleted rentals revenue (for historical earnings)
      const deletedRentals = await prisma.rental.findMany({
        where: {
          vehicleId: vehicle.id,
          deleted: true
        },
        include: {
          payments: true
        }
      });

      let deletedRentalsRevenue = 0;
      deletedRentals.forEach(rental => {
        const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        const paidFromPayments = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalPaid = paidFromRental + paidFromPayments;
        
        deletedRentalsRevenue += totalPaid; // Only count what was actually collected from deleted rentals
      });

      return {
        ...vehicle,
        performance: {
          totalRevenue, // in kuruş (from active rentals)
          totalCollected, // in kuruş (from active rentals)
          totalBalance, // in kuruş (from active rentals)
          deletedRentalsRevenue, // in kuruş (collected from deleted rentals)
        },
        // Remove rentals from response to keep it clean
        rentals: undefined
      };
    }));

    res.json(vehiclesWithPerformance);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vehicles
router.post('/', async (req, res) => {
  try {
    const { plate, name, isConsignment, status, active, ...showcase } = createVehicleSchema.parse(req.body);

    const vehicle = await prisma.vehicle.create({
      data: {
        plate: plate.toUpperCase(),
        name,
        isConsignment: isConsignment || false,
        status: status || 'IDLE',
        active: active !== undefined ? active : true,
        ...mapShowcaseData(showcase)
      }
    });

    res.status(201).json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    // Handle unique constraint violation
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Vehicle with this plate already exists' });
    }

    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH/PUT /api/vehicles/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = updateVehicleSchema.parse(req.body);

    // If plate is being updated, make it uppercase
    if (updateData.plate) {
      updateData.plate = updateData.plate.toUpperCase();
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: mapShowcaseData(updateData)
    });

    res.json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT method for compatibility
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = updateVehicleSchema.parse(req.body);

    // If plate is being updated, make it uppercase
    if (updateData.plate) {
      updateData.plate = updateData.plate.toUpperCase();
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: mapShowcaseData(updateData)
    });

    res.json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        rentals: {
          include: {
            customer: true,
            payments: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/vehicles/:id — normal davranış arşivlemedir; hard delete açık onay ister.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        rentals: { select: { id: true } },
        reservations: { select: { id: true } },
        expenses: { select: { id: true } },
        consignmentDeductions: { select: { id: true } },
        images: true,
      }
    });
    if (!vehicle) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }
    const hardDelete = req.query.hard === 'true' && req.body?.confirm === 'DELETE';
    if (!hardDelete) {
      const archived = await prisma.vehicle.update({ where: { id }, data: { archivedAt: new Date(), active: false, showOnSite: false } });
      return res.json({ message: 'Araç arşivlendi.', vehicle: archived });
    }
    const relationCount = vehicle.rentals.length + vehicle.reservations.length + vehicle.expenses.length + vehicle.consignmentDeductions.length;
    if (relationCount > 0) return res.status(409).json({ error: 'Geçmiş ilişkileri bulunan araç hard delete edilemez. Arşivleyin.' });
    if (vehicle.status !== 'IDLE') return res.status(409).json({ error: 'Hard delete yalnızca boşta olan araçlarda yapılabilir.' });
    if (vehicle.images.length) {
      const storage = getImageStorageProvider();
      for (const image of vehicle.images) await storage.deleteVehicleImage(image);
    }
    await prisma.$transaction(async (tx) => {
      await tx.vehicleImage.deleteMany({ where: { vehicleId: id } });
      await tx.vehicle.delete({ where: { id } });
    });
    return res.json({ message: 'Araç kalıcı olarak silindi.' });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }

    console.error('Archive/delete vehicle error:', error);
    res.status(500).json({ error: 'Araç arşivlenirken veya silinirken bir hata oluştu.' });
  }
});

router.post('/:id/archive', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: { archivedAt: new Date(), active: false, showOnSite: false } });
    return res.json({ data: vehicle });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') return res.status(404).json({ error: 'Araç bulunamadı.' });
    return res.status(500).json({ error: 'Araç arşivlenemedi.' });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: { archivedAt: null, deletedAt: null, active: true } });
    return res.json({ data: vehicle });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') return res.status(404).json({ error: 'Araç bulunamadı.' });
    return res.status(500).json({ error: 'Araç geri yüklenemedi.' });
  }
});

// GET /api/vehicles/:id/rentals - Check if vehicle has rentals (for safety deletion)
router.get('/:id/rentals', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rentals = await prisma.rental.findMany({
      where: { 
        vehicleId: id,
        deleted: false // Only count active rentals
      },
      select: { id: true } // Only return IDs for efficiency
    });

    res.json(rentals);
  } catch (error) {
    console.error('Error checking vehicle rentals:', error);
    res.status(500).json({
      error: 'Araç kiralamaları kontrol edilirken hata oluştu'
    });
  }
});

export default router;
