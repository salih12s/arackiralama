import * as express from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';
import { calculateRentalAmounts, calculateDaysBetween } from '../services/rentalCalc';

const router = express.Router();

// Test endpoint without auth
router.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Apply authentication to all routes except test
router.use(authenticateToken);

const rentalStatusSchema = z.enum(['ACTIVE', 'RETURNED', 'CANCELLED']);

const createRentalSchema = z.object({
  vehicleId: z.string().cuid(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  days: z.number().int().positive().optional(),
  dailyPrice: z.number().int().positive(),
  kmDiff: z.number().int().default(0),
  cleaning: z.number().int().default(0),
  hgs: z.number().int().default(0),
  damage: z.number().int().default(0),
  fuel: z.number().int().default(0),
  upfront: z.number().int().default(0),
  pay1: z.number().int().default(0),
  pay2: z.number().int().default(0),
  pay3: z.number().int().default(0),
  pay4: z.number().int().default(0),
  rentalType: z.enum(['NEW', 'EXTENSION']).default('NEW'),
  note: z.string().optional()
});

// GET /api/rentals
router.get('/', async (req, res) => {
  try {
    const {
      search,
      plate,
      customer,
      from,
      to,
      page = '1',
      limit = '1000'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {
      deleted: false // Sadece silinmemiş kiralamaları getir
    };

    if (plate) {
      where.vehicle = { plate: { contains: plate, mode: 'insensitive' } };
    }

    if (customer) {
      where.customer = { fullName: { contains: customer, mode: 'insensitive' } };
    }

    if (search) {
      where.OR = [
        { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { note: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by date range - check for overlap
    if (from || to) {
      const fromDate = from ? new Date(from as string) : new Date('1970-01-01');
      const toDate   = to   ? new Date(to as string)   : new Date('2999-12-31');

      // gün başlangıcı/sonu
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);

      // [start,end] ile [from,to] kesişsin
      where.AND = [
        { startDate: { lte: toDate } },
        { endDate:   { gte: fromDate } },
      ];
    }

    const [rentals, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        include: {
          vehicle: true,
          customer: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.rental.count({ where })
    ]);

    // Convert amounts from kuruş to TL for frontend
    const rentalsInTL = rentals.map(rental => ({
      ...rental,
      dailyPrice: rental.dailyPrice / 100,
      kmDiff: rental.kmDiff / 100,
      hgs: rental.hgs / 100,
      damage: rental.damage / 100,
      fuel: rental.fuel / 100,
      cleaning: rental.cleaning / 100,
      upfront: rental.upfront / 100,
      pay1: rental.pay1 / 100,
      pay2: rental.pay2 / 100,
      pay3: rental.pay3 / 100,
      pay4: rental.pay4 / 100,
      totalDue: rental.totalDue / 100,  // TL'ye çevir
      balance: rental.balance / 100,    // TL'ye çevir
      payments: rental.payments.map(payment => ({
        ...payment,
        amount: payment.amount / 100    // Payment'ları da TL'ye çevir
      }))
    }));

    res.json({
      data: rentalsInTL,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get rentals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rentals
router.post('/', async (req, res) => {
  try {
    const data = createRentalSchema.parse(req.body);
    
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    // Calculate days if not provided
    const days = data.days || calculateDaysBetween(startDate, endDate);
    
    // Calculate totals
    const { totalDue, balance } = calculateRentalAmounts({
      days,
      dailyPrice: data.dailyPrice,
      kmDiff: data.kmDiff,
      cleaning: data.cleaning,
      hgs: data.hgs,
      damage: data.damage,
      fuel: data.fuel,
      upfront: data.upfront,
      pay1: data.pay1,
      pay2: data.pay2,
      pay3: data.pay3,
      pay4: data.pay4
    });

    // Check if vehicle exists and is available
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (!vehicle.active) {
      return res.status(400).json({ error: 'Vehicle is not active' });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { fullName: data.customerName }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: data.customerName,
          phone: data.customerPhone
        }
      });
    }

    // Create rental and update vehicle status to RENTED
    const result = await prisma.$transaction(async (tx: any) => {
      const rental = await tx.rental.create({
        data: {
          vehicleId: data.vehicleId,
          customerId: customer.id,
          startDate,
          endDate,
          days,
          dailyPrice: data.dailyPrice,
          kmDiff: data.kmDiff,
          cleaning: data.cleaning,
          hgs: data.hgs,
          damage: data.damage,
          fuel: data.fuel,
          totalDue,
          upfront: data.upfront,
          pay1: data.pay1,
          pay2: data.pay2,
          pay3: data.pay3,
          pay4: data.pay4,
          balance,
          note: data.note
        },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      // Kiralama oluşturulunca araç durumunu RENTED yap
      await tx.vehicle.update({
        where: { id: data.vehicleId },
        data: { status: 'RENTED' }
      });

      return rental;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Create rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rentals/:id - Get single rental by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: true,
        payments: true
      }
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Convert amounts from kuruş to TL for frontend (same as in getAll)
    const rentalInTL = {
      ...rental,
      dailyPrice: rental.dailyPrice / 100,
      kmDiff: rental.kmDiff / 100,
      hgs: rental.hgs / 100,
      damage: rental.damage / 100,
      fuel: rental.fuel / 100,
      cleaning: rental.cleaning / 100,
      upfront: rental.upfront / 100,
      pay1: rental.pay1 / 100,
      pay2: rental.pay2 / 100,
      pay3: rental.pay3 / 100,
      pay4: rental.pay4 / 100,
      totalDue: rental.totalDue / 100,  // TL'ye çevir
      balance: rental.balance / 100,    // TL'ye çevir
      payments: rental.payments.map(payment => ({
        ...payment,
        amount: payment.amount / 100    // Payment'ları da TL'ye çevir
      }))
    };

    res.json(rentalInTL);
  } catch (error) {
    console.error('Get rental by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rentals/:id/return
router.post('/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (rental.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Rental is not active' });
    }

    // Recalculate balance with current payments
    const { balance } = calculateRentalAmounts(rental, rental.payments);

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedRental = await tx.rental.update({
        where: { id },
        data: {
          status: 'RETURNED',
          balance
        },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: { status: 'IDLE' }
      });

      return updatedRental;
    });

    res.json(result);
  } catch (error) {
    console.error('Return rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rentals/:id/complete
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Complete rental request for ID:', id);
    
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!rental) {
      console.log('Rental not found:', id);
      return res.status(404).json({ error: 'Rental not found' });
    }

    console.log('Rental found:', rental.id, 'Status:', rental.status);

    if (rental.status !== 'ACTIVE') {
      console.log('Rental is not active:', rental.status);
      return res.status(400).json({ error: 'Rental is not active' });
    }

    // Recalculate balance with current payments
    const { balance } = calculateRentalAmounts(rental, rental.payments);
    console.log('Calculated balance:', balance);

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedRental = await tx.rental.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          balance, // Keep the balance for history
          completedAt: new Date() // Sadece teslim alma zamanını kaydet
        },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: { status: 'IDLE' }
      });

      console.log('Rental completed successfully:', updatedRental.id);
      return updatedRental;
    });

    res.json(result);
  } catch (error) {
    console.error('Complete rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rentals/:id/add-payment
router.post('/:id/add-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paidAt, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check if rental exists
      const rental = await tx.rental.findUnique({
        where: { id },
        include: { 
          vehicle: true,
          customer: true,
          payments: true 
        }
      });

      if (!rental) {
        throw new Error('Rental not found');
      }

      // Create payment record
      const amountKurus = Math.round(Number(amount) * 100); // TL → kuruş (tek kere)
      await tx.payment.create({
        data: {
          rentalId: id,
          amount: amountKurus,
          paidAt: new Date(paidAt),
          method: method || 'CASH'
        }
      });

      // Get updated rental with all payments
      const updatedRental = await tx.rental.findUnique({
        where: { id },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      // Recalculate balance with all payments including the new one
      const totalPayments = updatedRental!.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = updatedRental!.totalDue - totalPayments;

      // Update rental balance
      const finalRental = await tx.rental.update({
        where: { id },
        data: { balance },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      return finalRental;
    });

    res.json(result);
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rentals/:id/payments
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('GET payments for rental ID:', id);

    // Rental'ın varlığını kontrol et
    const rental = await prisma.rental.findUnique({
      where: { id }
    });

    if (!rental) {
      console.log('Rental not found for payments request:', id);
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Ödemeleri getir
    const payments = await prisma.payment.findMany({
      where: { rentalId: id },
      orderBy: { paidAt: 'desc' }
    });

    console.log('Found payments:', payments.length, 'for rental:', id);

    // Payments kuruş cinsinde saklanıyor, TL'ye çevir
    const paymentsInTL = payments.map(payment => ({
      ...payment,
      amount: payment.amount / 100 // kuruş → TL
    }));
    
    res.json(paymentsInTL);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rentals/:id/payments
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paidAt, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check if rental exists
      const rental = await tx.rental.findUnique({
        where: { id },
        include: { 
          vehicle: true,
          customer: true,
          payments: true 
        }
      });

      if (!rental) {
        throw new Error('Rental not found');
      }

      // Create payment record
      // Frontend TL gönderiyor, kuruş'a çevir
      const payment = await tx.payment.create({
        data: {
          rentalId: id,
          amount: Math.round(Number(amount) * 100), // TL'yi kuruş'a çevir
          paidAt: new Date(paidAt),
          method: method || 'CASH'
        }
      });

      // Get updated rental with all payments
      const updatedRental = await tx.rental.findUnique({
        where: { id },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      // Recalculate balance with all payments including the new one
      const totalPayments = updatedRental!.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = updatedRental!.totalDue - totalPayments;

      // Update rental balance
      const finalRental = await tx.rental.update({
        where: { id },
        data: { balance },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      return { payment, rental: finalRental };
    });

    res.json(result);
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/rentals/:id - Update rental
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    console.log('Updating rental:', id, data);

    // Find existing rental
    const existingRental = await prisma.rental.findUnique({
      where: { id },
      include: { customer: true, vehicle: true }
    });

    if (!existingRental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Prepare update data - convert TL to kuruş if needed
    const updateData: any = {};

    // Handle customer update
    if (data.customerId) {
      updateData.customerId = data.customerId;
    }

    // Handle vehicle update  
    if (data.vehicleId) {
      updateData.vehicleId = data.vehicleId;
    }

    // Handle dates
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.days !== undefined) updateData.days = data.days;

    // Handle prices - convert TL to kuruş (multiply by 100)
    if (data.dailyPrice !== undefined) updateData.dailyPrice = Math.round(data.dailyPrice * 100);
    if (data.kmDiff !== undefined) updateData.kmDiff = Math.round(data.kmDiff * 100);
    if (data.hgs !== undefined) updateData.hgs = Math.round(data.hgs * 100);
    if (data.damage !== undefined) updateData.damage = Math.round(data.damage * 100);
    if (data.fuel !== undefined) updateData.fuel = Math.round(data.fuel * 100);
    if (data.cleaning !== undefined) updateData.cleaning = Math.round(data.cleaning * 100);
    if (data.upfront !== undefined) updateData.upfront = Math.round(data.upfront * 100);
    if (data.pay1 !== undefined) updateData.pay1 = Math.round(data.pay1 * 100);
    if (data.pay2 !== undefined) updateData.pay2 = Math.round(data.pay2 * 100);
    if (data.pay3 !== undefined) updateData.pay3 = Math.round(data.pay3 * 100);
    if (data.pay4 !== undefined) updateData.pay4 = Math.round(data.pay4 * 100);

    // Handle rental type
    if (data.rentalType) updateData.rentalType = data.rentalType;

    // Handle note/description
    if (data.note !== undefined) updateData.note = data.note;

    // Update rental
    const updatedRental = await prisma.rental.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        payments: true
      }
    });

    // Recalculate totalDue and balance after update
    const newTotalDue = (updatedRental.days * updatedRental.dailyPrice) + 
                       updatedRental.kmDiff + updatedRental.cleaning + 
                       updatedRental.hgs + updatedRental.damage + updatedRental.fuel;
    
    const totalPayments = updatedRental.payments.reduce((sum, p) => sum + p.amount, 0);
    const newBalance = newTotalDue - totalPayments;

    // Update totalDue and balance
    const finalRental = await prisma.rental.update({
      where: { id },
      data: { 
        totalDue: newTotalDue,
        balance: newBalance 
      },
      include: {
        customer: true,
        vehicle: true,
        payments: true
      }
    });

    // Convert amounts back to TL for response
    const responseRental = {
      ...finalRental,
      dailyPrice: finalRental.dailyPrice / 100,
      kmDiff: finalRental.kmDiff / 100,
      hgs: finalRental.hgs / 100,
      damage: finalRental.damage / 100,
      fuel: finalRental.fuel / 100,
      cleaning: finalRental.cleaning / 100,
      upfront: finalRental.upfront / 100,
      pay1: finalRental.pay1 / 100,
      pay2: finalRental.pay2 / 100,
      pay3: finalRental.pay3 / 100,
      pay4: finalRental.pay4 / 100,
      totalDue: finalRental.totalDue / 100,
      balance: finalRental.balance / 100,
      payments: finalRental.payments.map(p => ({
        ...p,
        amount: p.amount / 100
      }))
    };

    res.json({ success: true, data: responseRental });
  } catch (error) {
    console.error('Update rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/rentals/:id - Soft Delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Rental'ın varlığını kontrol et (silinmemiş olanlar arasında)
    const existingRental = await prisma.rental.findFirst({
      where: { id, deleted: false },
      include: { payments: true }
    });

    if (!existingRental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Soft delete - sadece deleted=true yap
    await prisma.$transaction(async (tx) => {
      // Rental'ı soft delete yap
      await tx.rental.update({
        where: { id },
        data: { 
          deleted: true,
          deletedAt: new Date()
        }
      });

      // Araç durumunu IDLE yap (eğer aktif kiralama ise)
      if (existingRental.status === 'ACTIVE' && existingRental.vehicleId) {
        await tx.vehicle.update({
          where: { id: existingRental.vehicleId },
          data: { status: 'IDLE' }
        });
      }
    });

    res.json({ success: true, message: 'Rental deleted successfully' });
  } catch (error) {
    console.error('Soft delete rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === CONSIGNMENT RENTAL ENDPOINTS ===

const consignmentRentalSchema = z.object({
  consignmentDeductions: z.array(z.object({
    vehicleId: z.string().cuid(),
    amount: z.number().positive(),
    description: z.string().optional()
  })),
  externalPayments: z.array(z.object({
    customerId: z.string().cuid(),
    amount: z.number().positive(),
    description: z.string().optional()
  })),
  generalNote: z.string().optional()
});

// GET /api/rentals/consignment
router.get('/consignment', async (req, res) => {
  try {
    console.log('🔍 Consignment endpoint accessed');
    
    // Gerçek veritabanından konsinye kayıtlarını getir
    try {
      const consignmentRentals = await prisma.consignmentRental.findMany({
        include: {
          consignmentDeductions: {
            include: {
              vehicle: true
            }
          },
          externalPayments: {
            include: {
              customer: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('📋 Found consignment rentals:', consignmentRentals.length);

      // Transform data for frontend
      const transformedData = consignmentRentals.map(rental => ({
        id: rental.id,
        createdAt: rental.createdAt,
        generalNote: rental.generalNote,
        consignmentDeductions: rental.consignmentDeductions.map(d => ({
          id: d.id,
          vehiclePlate: d.vehicle.plate,
          amount: d.amount,
          description: d.description
        })),
        externalPayments: rental.externalPayments.map(p => ({
          id: p.id,
          customerName: p.customer.fullName,
          amount: p.amount,
          description: p.description
        }))
      }));

      res.json({
        data: transformedData
      });
    } catch (prismaError) {
      console.log('� Prisma error, returning empty data:', prismaError);
      // If database error, return empty array
      res.json({ data: [] });
    }
    
  } catch (error) {
    console.error('Get consignment rentals error:', error);
    res.status(500).json({ error: 'Failed to fetch consignment rentals' });
  }
});

// POST /api/rentals/consignment
router.post('/consignment', async (req, res) => {
  try {
    const data = consignmentRentalSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Create consignment rental record
      const consignmentRental = await tx.consignmentRental.create({
        data: {
          generalNote: data.generalNote
        }
      });

      // Create consignment deductions
      if (data.consignmentDeductions.length > 0) {
        await tx.consignmentDeduction.createMany({
          data: data.consignmentDeductions.map(d => ({
            consignmentRentalId: consignmentRental.id,
            vehicleId: d.vehicleId,
            amount: Math.round(d.amount * 100), // Convert to kuruş
            description: d.description
          }))
        });
      }

      // Create external payments
      if (data.externalPayments.length > 0) {
        await tx.externalPayment.createMany({
          data: data.externalPayments.map(p => ({
            consignmentRentalId: consignmentRental.id,
            customerId: p.customerId,
            amount: Math.round(p.amount * 100), // Convert to kuruş
            description: p.description
          }))
        });
      }

      return consignmentRental;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }

    console.error('Create consignment rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/rentals/consignment/:id
router.put('/consignment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = consignmentRentalSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Update consignment rental record
      const consignmentRental = await tx.consignmentRental.update({
        where: { id },
        data: {
          generalNote: data.generalNote
        }
      });

      // Delete existing deductions and payments
      await tx.consignmentDeduction.deleteMany({
        where: { consignmentRentalId: id }
      });
      await tx.externalPayment.deleteMany({
        where: { consignmentRentalId: id }
      });

      // Create new consignment deductions
      if (data.consignmentDeductions.length > 0) {
        await tx.consignmentDeduction.createMany({
          data: data.consignmentDeductions.map(d => ({
            consignmentRentalId: id,
            vehicleId: d.vehicleId,
            amount: Math.round(d.amount * 100), // Convert to kuruş
            description: d.description
          }))
        });
      }

      // Create new external payments
      if (data.externalPayments.length > 0) {
        await tx.externalPayment.createMany({
          data: data.externalPayments.map(p => ({
            consignmentRentalId: id,
            customerId: p.customerId,
            amount: Math.round(p.amount * 100), // Convert to kuruş
            description: p.description
          }))
        });
      }

      return consignmentRental;
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }

    console.error('Update consignment rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/rentals/consignment/:id
router.delete('/consignment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.consignmentDeduction.deleteMany({
        where: { consignmentRentalId: id }
      });
      await tx.externalPayment.deleteMany({
        where: { consignmentRentalId: id }
      });

      // Delete consignment rental
      await tx.consignmentRental.delete({
        where: { id }
      });
    });

    res.json({ message: 'Consignment rental deleted successfully' });
  } catch (error) {
    console.error('Delete consignment rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Individual item DELETE endpoints
router.delete('/consignment-deduction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.consignmentDeduction.delete({
      where: { id }
    });

    res.json({ message: 'Consignment deduction deleted successfully' });
  } catch (error) {
    console.error('Delete consignment deduction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/external-payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.externalPayment.delete({
      where: { id }
    });

    res.json({ message: 'External payment deleted successfully' });
  } catch (error) {
    console.error('Delete external payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Individual item UPDATE endpoints
router.put('/consignment-deduction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, amount, description } = req.body;
    
    const updated = await prisma.consignmentDeduction.update({
      where: { id },
      data: {
        vehicleId,
        amount: Math.round(amount * 100), // Convert to kuruş
        description
      },
      include: {
        vehicle: true
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update consignment deduction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/external-payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, amount, description } = req.body;
    
    const updated = await prisma.externalPayment.update({
      where: { id },
      data: {
        customerId,
        amount: Math.round(amount * 100), // Convert to kuruş
        description
      },
      include: {
        customer: true
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update external payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
