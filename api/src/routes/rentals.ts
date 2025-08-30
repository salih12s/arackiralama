import express from 'express';
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
      limit = '50'
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

    res.json({
      data: rentals,
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

// GET /api/rentals/:id - Get single rental
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rental = await prisma.rental.findFirst({
      where: { 
        id, 
        deleted: false 
      },
      include: {
        vehicle: true,
        customer: true,
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      }
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    res.json(rental);
  } catch (error) {
    console.error('Get rental error:', error);
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

    // Determine vehicle status based on dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newVehicleStatus = startDate <= today ? 'RENTED' : 'RESERVED';

    // Create rental and update vehicle status in transaction
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

      await tx.vehicle.update({
        where: { id: data.vehicleId },
        data: { status: newVehicleStatus }
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

// PATCH /api/rentals/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = createRentalSchema.parse(req.body);

    const existingRental = await prisma.rental.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!existingRental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Check if vehicle exists and is available (if vehicle is changing)
    if (data.vehicleId !== existingRental.vehicleId) {
      const newVehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId }
      });

      if (!newVehicle) {
        return res.status(404).json({ error: 'New vehicle not found' });
      }

      if (!newVehicle.active) {
        return res.status(400).json({ error: 'New vehicle is not active' });
      }

      if (newVehicle.status !== 'IDLE') {
        return res.status(400).json({ error: 'New vehicle is not available' });
      }
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { fullName: data.customerName }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: data.customerName,
          phone: data.customerPhone || null
        }
      });
    } else if (data.customerPhone && customer.phone !== data.customerPhone) {
      // Update customer phone if different
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: data.customerPhone
        }
      });
    }

    // Calculate amounts
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = data.days || calculateDaysBetween(startDate, endDate);
    
    const totalDue = data.dailyPrice * days + (data.kmDiff || 0) + 
                     (data.cleaning || 0) + (data.hgs || 0) + (data.damage || 0) + (data.fuel || 0);
    const totalPaid = (data.upfront || 0) + (data.pay1 || 0) + (data.pay2 || 0) + (data.pay3 || 0) + (data.pay4 || 0);
    const balance = totalDue - totalPaid;

    const result = await prisma.$transaction(async (tx) => {
      // If vehicle is changing, update vehicle statuses
      if (data.vehicleId !== existingRental.vehicleId) {
        // Set old vehicle to IDLE
        await tx.vehicle.update({
          where: { id: existingRental.vehicleId },
          data: { status: 'IDLE' }
        });

        // Set new vehicle to RENTED
        await tx.vehicle.update({
          where: { id: data.vehicleId },
          data: { status: 'RENTED' }
        });
      }

      // Update rental
      const rental = await tx.rental.update({
        where: { id },
        data: {
          vehicleId: data.vehicleId,
          customerId: customer!.id,
          startDate,
          endDate,
          days,
          dailyPrice: data.dailyPrice,
          kmDiff: data.kmDiff || 0,
          cleaning: data.cleaning || 0,
          hgs: data.hgs || 0,
          damage: data.damage || 0,
          fuel: data.fuel || 0,
          upfront: data.upfront || 0,
          pay1: data.pay1 || 0,
          pay2: data.pay2 || 0,
          pay3: data.pay3 || 0,
          pay4: data.pay4 || 0,
          totalDue,
          balance,
          note: data.note || null
        },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      return rental;
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Update rental error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      rentalId: req.params.id,
      requestBody: req.body
    });
    res.status(500).json({ error: 'Internal server error', details: error?.message });
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
          completedAt: new Date()
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
      const manualPayments = updatedRental!.upfront + updatedRental!.pay1 + updatedRental!.pay2 + updatedRental!.pay3 + updatedRental!.pay4;
      const balance = Math.max(0, updatedRental!.totalDue - manualPayments - totalPayments);

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

    // Amount'ları kuruş cinsinden döndür (artık TL'ye çevirme)
    res.json(payments);
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
      const amountKurus = Math.round(Number(amount) * 100); // TL → kuruş (tek kere)
      const payment = await tx.payment.create({
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
      const manualPayments = updatedRental!.upfront + updatedRental!.pay1 + updatedRental!.pay2 + updatedRental!.pay3 + updatedRental!.pay4;
      const balance = Math.max(0, updatedRental!.totalDue - manualPayments - totalPayments);

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

export default router;
