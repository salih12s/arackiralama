import express from 'express';
import { z } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

const vehicleStatusSchema = z.enum(['IDLE', 'RENTED', 'RESERVED', 'SERVICE']);

const createVehicleSchema = z.object({
  plate: z.string().min(1),
  name: z.string().optional()
});

const updateVehicleSchema = z.object({
  name: z.string().optional(),
  status: vehicleStatusSchema.optional(),
  active: z.boolean().optional()
});

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    const where: any = {};
    if (status && vehicleStatusSchema.safeParse(status).success) {
      where.status = status;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { plate: 'asc' },
      include: {
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
    const { plate, name } = createVehicleSchema.parse(req.body);

    const vehicle = await prisma.vehicle.create({
      data: {
        plate: plate.toUpperCase(),
        name
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

// PATCH /api/vehicles/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = updateVehicleSchema.parse(req.body);

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData
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

// DELETE /api/vehicles/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        rentals: {
          where: { deleted: false }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }

    // Check if vehicle has active rentals
    if (vehicle.rentals.length > 0) {
      return res.status(400).json({ 
        error: 'Bu araçta aktif kiralamalar var. Önce kiralamaları sonlandırın.' 
      });
    }

    // Only allow deletion if vehicle is IDLE
    if (vehicle.status !== 'IDLE') {
      return res.status(400).json({ 
        error: 'Sadece boşta olan araçlar silinebilir.' 
      });
    }

    // Delete the vehicle
    await prisma.vehicle.delete({
      where: { id }
    });

    res.json({ message: 'Araç başarıyla silindi' });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }

    console.error('Delete vehicle error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      vehicleId: req.params.id
    });
    
    res.status(500).json({ 
      error: 'Araç silinirken bir hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
