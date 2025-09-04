import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// GET /api/reservations - Tüm rezervasyonları listele
router.get('/', async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        customer: true,
        vehicle: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// GET /api/reservations/:id - Tek rezervasyon detayı
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true
      }
    });
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// POST /api/reservations - Yeni rezervasyon oluştur
router.post('/', async (req, res) => {
  try {
    const {
      customerId,
      vehicleId,
      customerName,
      licensePlate,
      reservationDate,
      reservationTime,
      rentalDuration,
      note
    } = req.body;

    console.log('Received reservation data:', req.body);
    
    // Frontend sadece müşteri adı ve plaka gönderiyor, ID'leri bul
    let finalCustomerId = customerId;
    let finalVehicleId = vehicleId;

    // Müşteri ID'si yoksa, isimden bul veya oluştur
    if (!customerId && customerName) {
      let customer = await prisma.customer.findFirst({
        where: {
          fullName: customerName
        }
      });

      if (!customer) {
        // Yeni müşteri oluştur
        customer = await prisma.customer.create({
          data: {
            fullName: customerName,
            phone: '', // Boş telefon
          }
        });
      }
      finalCustomerId = customer.id;
    }

    // Araç ID'si yoksa, plakadan bul
    if (!vehicleId && licensePlate) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { plate: licensePlate }
      });
      
      if (!vehicle) {
        return res.status(400).json({ error: `Vehicle with plate ${licensePlate} not found` });
      }
      finalVehicleId = vehicle.id;
    }

    // Validation
    if (!finalCustomerId || !finalVehicleId || !customerName || !licensePlate || !reservationDate || !reservationTime) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: req.body,
        processed: { finalCustomerId, finalVehicleId }
      });
    }
    
    // Rezervasyon tarih/saat kombinasyonu oluştur
    let reservationDateTime: Date;
    
    try {
      // Frontend'den gelen tarih zaten ISO string formatında olabilir
      if (reservationDate.includes('T')) {
        // ISO string formatında geldiyse direkt parse et
        reservationDateTime = new Date(reservationDate);
      } else {
        // Sadece tarih string'i ise saat ile birleştir
        reservationDateTime = new Date(`${reservationDate}T${reservationTime}:00.000Z`);
      }
      
      // Tarih geçerli mi kontrol et
      if (isNaN(reservationDateTime.getTime())) {
        throw new Error('Invalid date format');
      }
      
      console.log('🗓️ Parsed reservation date:', reservationDateTime);
      
    } catch (error) {
      console.error('Date parsing error:', error);
      return res.status(400).json({ 
        error: 'Invalid date format',
        received: { reservationDate, reservationTime }
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        customerId: finalCustomerId,
        vehicleId: finalVehicleId,
        customerName,
        licensePlate,
        reservationDate: reservationDateTime,
        reservationTime,
        rentalDuration: rentalDuration ? parseInt(String(rentalDuration)) : 0,
        note: note || '',
        status: 'PENDING'
      },
      include: {
        customer: true,
        vehicle: true
      }
    });
    
    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ 
      error: 'Failed to create reservation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/reservations/:id - Rezervasyonu güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      vehicleId,
      customerName,
      licensePlate,
      reservationDate,
      reservationTime,
      rentalDuration,
      note,
      status
    } = req.body;
    
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...(customerId && { customerId }),
        ...(vehicleId && { vehicleId }),
        ...(customerName && { customerName }),
        ...(licensePlate && { licensePlate }),
        ...(reservationDate && { reservationDate: new Date(reservationDate) }),
        ...(reservationTime && { reservationTime }),
        ...(rentalDuration && { rentalDuration: parseInt(rentalDuration) }),
        ...(note !== undefined && { note }),
        ...(status && { status })
      },
      include: {
        customer: true,
        vehicle: true
      }
    });
    
    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

// DELETE /api/reservations/:id - Rezervasyonu sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.reservation.delete({
      where: { id }
    });
    
    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

// POST /api/reservations/:id/confirm - Rezervasyonu onayla
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED'
      },
      include: {
        customer: true,
        vehicle: true
      }
    });
    
    res.json(reservation);
  } catch (error) {
    console.error('Error confirming reservation:', error);
    res.status(500).json({ error: 'Failed to confirm reservation' });
  }
});

// POST /api/reservations/:id/cancel - Rezervasyonu iptal et
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      },
      include: {
        customer: true,
        vehicle: true
      }
    });
    
    res.json(reservation);
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

export default router;
