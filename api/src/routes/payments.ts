import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';
import { calculateRentalAmounts } from '../services/rentalCalc';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

const createPaymentSchema = z.object({
  rentalId: z.string().cuid(),
  amount: z.number().int().positive(),
  paidAt: z.string().datetime(),
  method: z.enum(['CASH', 'TRANSFER', 'CARD'])
});

const updatePaymentDateSchema = z.object({
  paidAt: z.string().datetime(),
});

// POST /api/rentals/:id/payments
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paidAt, method } = createPaymentSchema.parse({
      ...req.body,
      rentalId: id
    });

    // Verify rental exists
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          rentalId: id,
          amount,
          paidAt: new Date(paidAt),
          method
        }
      });

      // Get updated payments for balance calculation
      const updatedPayments = [...rental.payments, payment];
      
      // Recalculate balance
      const { balance } = calculateRentalAmounts(rental, updatedPayments);

      // Update rental balance
      const updatedRental = await tx.rental.update({
        where: { id },
        data: { balance },
        include: {
          vehicle: true,
          customer: true,
          payments: true
        }
      });

      return { payment, rental: updatedRental };
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/payments/:paymentId/date - Update payment date
router.patch('/:paymentId/date', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paidAt } = updatePaymentDateSchema.parse(req.body);

    // Update the payment date
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { paidAt: new Date(paidAt) },
      include: {
        rental: {
          include: {
            customer: true,
            vehicle: true
          }
        }
      }
    });

    res.json(updatedPayment);
  } catch (error: any) {
    console.error('Update payment date error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { rentalId, method, from, to } = req.query;

    const where: any = {};
    
    if (rentalId) {
      where.rentalId = rentalId;
    }

    if (method) {
      where.method = method;
    }

    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from as string);
      if (to) where.paidAt.lte = new Date(to as string);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        rental: {
          include: {
            vehicle: true,
            customer: true
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
