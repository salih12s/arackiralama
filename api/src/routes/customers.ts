import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const router = Router();

// Validation schemas
const createCustomerSchema = z.object({
  fullName: z.string().min(1, 'Ad soyad gerekli'),
  phone: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// GET /api/customers - List all customers
router.get('/', async (req, res) => {
  try {
    const { search, limit = '50' } = req.query;
    
    const customers = await prisma.customer.findMany({
      where: search ? {
        OR: [
          { fullName: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } },
        ]
      } : undefined,
      include: {
        _count: {
          select: {
            rentals: true
          }
        }
      },
      orderBy: { fullName: 'asc' },
      take: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: customers.map(customer => ({
        ...customer,
        rentalCount: (customer as any)._count?.rentals || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Müşteriler getirilirken hata oluştu' 
    });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        rentals: {
          include: {
            vehicle: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            rentals: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        ...customer,
        rentalCount: (customer as any)._count?.rentals || 0
      }
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri getirilirken hata oluştu'
    });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    
    // Check if customer with same name already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { fullName: data.fullName }
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Bu isimde bir müşteri zaten mevcut'
      });
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone: data.phone || null,
      }
    });

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz müşteri bilgileri',
        details: error.errors
      });
    }
    
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri oluşturulurken hata oluştu'
    });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
      }
    });

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz müşteri bilgileri',
        details: error.errors
      });
    }

    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri güncellenirken hata oluştu'
    });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer has any rentals
    const rentalCount = await prisma.rental.count({
      where: { customerId: id }
    });

    if (rentalCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bu müşterinin kiralama kayıtları olduğu için silinemez'
      });
    }

    await prisma.customer.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Müşteri başarıyla silindi'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri silinirken hata oluştu'
    });
  }
});

export default router;
