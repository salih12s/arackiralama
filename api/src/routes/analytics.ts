import express from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/analytics/vehicle/:id - Araç detaylı analizi
router.get('/vehicle/:id', async (req, res) => {
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
          orderBy: { startDate: 'desc' }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Toplam gelir hesaplama
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalDays = 0;
    let totalRentals = vehicle.rentals.length;

    const revenueByMonth: { [key: string]: number } = {};
    const customerHistory: Array<{
      customerName: string;
      rentalCount: number;
      totalSpent: number;
      lastRental: Date;
    }> = [];

    // Her kiralama için hesaplamalar
    vehicle.rentals.forEach((rental: any) => {
      totalRevenue += rental.totalDue;
      totalDays += rental.days;

      // Ödemeler
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const totalRentalPaid = paymentSum + manualPayments;
      
      totalPaid += totalRentalPaid;
      totalOutstanding += Math.max(0, rental.totalDue - totalRentalPaid);

      // Aylık gelir
      const monthKey = rental.startDate.toISOString().substring(0, 7); // YYYY-MM
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + rental.totalDue;
    });

    // Müşteri geçmişi hesaplama
    const customerMap = new Map();
    vehicle.rentals.forEach((rental: any) => {
      const key = rental.customerId;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerName: rental.customer.fullName,
          rentalCount: 0,
          totalSpent: 0,
          lastRental: rental.startDate
        });
      }
      
      const customer = customerMap.get(key);
      customer.rentalCount++;
      
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      customer.totalSpent += paymentSum + manualPayments;
      
      if (rental.startDate > customer.lastRental) {
        customer.lastRental = rental.startDate;
      }
    });

    customerHistory.push(...Array.from(customerMap.values()));
    customerHistory.sort((a, b) => b.totalSpent - a.totalSpent);

    // Aylık gelir trendleri (son 12 ay)
    const monthlyTrends = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().substring(0, 7);
      monthlyTrends.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        revenue: revenueByMonth[monthKey] || 0
      });
    }

    // Ortalamalar
    const avgDailyRate = totalRentals > 0 ? Math.round(totalRevenue / totalDays) : 0;
    const avgRentalDuration = totalRentals > 0 ? Math.round(totalDays / totalRentals) : 0;
    const utilizationRate = totalDays > 0 ? Math.round((totalDays / (totalRentals * 30)) * 100) : 0; // Rough calculation

    res.json({
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: (vehicle as any).brand,
        model: (vehicle as any).model,
        year: (vehicle as any).year,
        color: (vehicle as any).color,
        status: vehicle.status,
        note: (vehicle as any).note
      },
      statistics: {
        totalRevenue,
        totalPaid,
        totalOutstanding,
        totalRentals,
        totalDays,
        avgDailyRate,
        avgRentalDuration,
        utilizationRate
      },
      monthlyTrends,
      customerHistory: customerHistory.slice(0, 10), // Top 10 müşteri
      recentRentals: vehicle.rentals.slice(0, 5).map((rental: any) => ({
        id: rental.id,
        customerName: rental.customer.fullName,
        startDate: rental.startDate,
        endDate: rental.endDate,
        days: rental.days,
        totalDue: rental.totalDue,
        status: rental.status
      }))
    });

  } catch (error) {
    console.error('Vehicle analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/overview - Genel sistem analizi
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Araç durumları
    const vehicleStats = await prisma.vehicle.groupBy({
      by: ['status'],
      _count: true
    });

    const statusCounts = vehicleStats.reduce((acc: any, stat: any) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    // Bu ayki kiralamalar
    const monthlyRentals = await prisma.rental.findMany({
      where: {
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth }
      },
      include: { payments: true }
    });

    let monthlyRevenue = 0;
    let monthlyPaid = 0;
    let monthlyOutstanding = 0;

    monthlyRentals.forEach((rental: any) => {
      monthlyRevenue += rental.totalDue;
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const totalPaid = paymentSum + manualPayments;
      
      monthlyPaid += totalPaid;
      monthlyOutstanding += Math.max(0, rental.totalDue - totalPaid);
    });

    // En çok gelir getiren araçlar (son 6 ay)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    const topVehicles = await prisma.vehicle.findMany({
      include: {
        rentals: {
          where: {
            startDate: { gte: sixMonthsAgo }
          },
          include: { payments: true }
        }
      }
    });

    const vehicleRevenues = topVehicles.map((vehicle: any) => {
      const revenue = vehicle.rentals.reduce((sum: number, rental: any) => {
        const paymentSum = rental.payments.reduce((pSum: number, payment: any) => pSum + payment.amount, 0);
        const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        return sum + paymentSum + manualPayments;
      }, 0);

      return {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        revenue,
        rentalCount: vehicle.rentals.length
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      vehicleStats: {
        total: Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0),
        idle: statusCounts.IDLE || 0,
        rented: statusCounts.RENTED || 0,
        reserved: statusCounts.RESERVED || 0,
        service: statusCounts.SERVICE || 0
      },
      monthlyStats: {
        revenue: monthlyRevenue,
        paid: monthlyPaid,
        outstanding: monthlyOutstanding,
        rentalCount: monthlyRentals.length
      },
      topVehicles: vehicleRevenues
    });

  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
