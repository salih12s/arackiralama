import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

const createVehicleExpenseSchema = z.object({
  date: z.string(),
  vehicleId: z.string(),
  expenseType: z.string().min(1),
  location: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
});

const updateVehicleExpenseSchema = z.object({
  date: z.string().optional(),
  vehicleId: z.string().optional(),
  expenseType: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
});

// GET /api/vehicle-expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await (prisma as any).vehicleExpense.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            name: true,
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json(expenses);
  } catch (error) {
    console.error('Vehicle expenses fetch error:', error);
    res.status(500).json({ error: 'Giderler getirilirken hata oluştu' });
  }
});

// GET /api/vehicle-expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await (prisma as any).vehicleExpense.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            name: true,
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Gider bulunamadı' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Vehicle expense fetch error:', error);
    res.status(500).json({ error: 'Gider getirilirken hata oluştu' });
  }
});

// POST /api/vehicle-expenses
router.post('/', async (req, res) => {
  try {
    const validatedData = createVehicleExpenseSchema.parse(req.body);
    
    const expense = await (prisma as any).vehicleExpense.create({
      data: validatedData,
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            name: true,
          }
        }
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Vehicle expense creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Geçersiz veri formatı', details: error.errors });
    }
    res.status(500).json({ error: 'Gider oluşturulurken hata oluştu' });
  }
});

// PUT /api/vehicle-expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateVehicleExpenseSchema.parse(req.body);
    
    const expense = await (prisma as any).vehicleExpense.update({
      where: { id },
      data: validatedData,
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            name: true,
          }
        }
      }
    });

    res.json(expense);
  } catch (error) {
    console.error('Vehicle expense update error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Geçersiz veri formatı', details: error.errors });
    }
    res.status(500).json({ error: 'Gider güncellenirken hata oluştu' });
  }
});

// DELETE /api/vehicle-expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await (prisma as any).vehicleExpense.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Vehicle expense deletion error:', error);
    res.status(500).json({ error: 'Gider silinirken hata oluştu' });
  }
});

export default router;