import { prisma } from '../db/prisma';
import { isRentalActiveToday } from './rentalCalc';

export interface DashboardStats {
  totalVehicles: number;
  rentedToday: number;
  idle: number;
  reserved: number;
  service: number;
  monthBilled: number;
  monthCollected: number;
  monthOutstanding: number;
}

export interface MonthlyReportItem {
  label: string;
  month: number;
  year: number;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface VehicleIncomeReport {
  plate: string;
  vehicleId: string;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface DebtorReport {
  rentalId: string;
  plate: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  balance: number;
  days: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get vehicle counts by status
  const vehicleCounts = await prisma.vehicle.groupBy({
    by: ['status'],
    _count: true,
    where: { active: true }
  });

  const statusCounts = vehicleCounts.reduce((acc: any, item: any) => {
    acc[item.status] = item._count;
    return acc;
  }, {} as Record<string, number>);

  // Get active rentals for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const activeRentals = await prisma.rental.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: endOfToday },
      endDate: { gte: today }
    }
  });

  const rentedToday = activeRentals.length;

  // Calculate month totals
  const monthlyRentals = await prisma.rental.findMany({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    include: {
      payments: true
    }
  });

  let monthBilled = 0;
  let monthCollected = 0;
  let monthOutstanding = 0;

  monthlyRentals.forEach((rental: any) => {
    monthBilled += rental.totalDue;
    
    const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
    const collected = paymentSum + manualPayments;
    
    monthCollected += collected;
    monthOutstanding += Math.max(0, rental.totalDue - collected);
  });

  return {
    totalVehicles: Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0),
    rentedToday,
    idle: statusCounts.IDLE || 0,
    reserved: statusCounts.RESERVED || 0,
    service: statusCounts.SERVICE || 0,
    monthBilled,
    monthCollected,
    monthOutstanding
  };
}

export async function getMonthlyReport(year: number): Promise<MonthlyReportItem[]> {
  const reports: MonthlyReportItem[] = [];
  
  for (let month = 1; month <= 12; month++) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const rentals = await prisma.rental.findMany({
      where: {
        // ay ile kiralama döneminin kesişmesi
        startDate: { lte: endDate },
        endDate:   { gte: startDate },
      },
      include: {
        payments: true
      }
    });

    let billed = 0;
    let collected = 0;
    let outstanding = 0;

    rentals.forEach((rental: any) => {
      billed += rental.totalDue;
      
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const totalCollected = paymentSum + manualPayments;
      
      collected += totalCollected;
      outstanding += Math.max(0, rental.totalDue - totalCollected);
    });

    reports.push({
      label: new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
      month,
      year,
      billed,
      collected,
      outstanding
    });
  }

  return reports;
}

export async function getVehicleIncomeReport(): Promise<VehicleIncomeReport[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { active: true },
    include: {
      rentals: {
        // SİLİNEN KİRALAMALAR DA DAHİL - Gelir hesabında silinmiş kiralamaları da say
        include: {
          payments: true
        }
      }
    }
  });

  return vehicles.map((vehicle: any) => {
    let billed = 0;
    let collected = 0;
    let outstanding = 0;

    vehicle.rentals.forEach((rental: any) => {
      // Tüm kiralamalardan gelir hesapla (silinmiş olanlar dahil)
      billed += rental.totalDue;
      
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const totalCollected = paymentSum + manualPayments;
      
      collected += totalCollected;
      
      // Outstanding sadece silinmemiş kiralamalar için hesapla
      if (!rental.deleted) {
        outstanding += Math.max(0, rental.totalDue - totalCollected);
      }
    });

    return {
      plate: vehicle.plate,
      vehicleId: vehicle.id,
      billed,
      collected,
      outstanding
    };
  });
}

export async function getDebtorReport(): Promise<DebtorReport[]> {
  const rentals = await prisma.rental.findMany({
    where: {
      deleted: false // Sadece silinmemiş kiralamalarda borç takibi
    },
    include: {
      vehicle: true,
      customer: true,
      payments: true // Ayrı ödemeleri de dahil et
    }
  });

  // Her kiralama için gerçek balance hesapla
  const debtors = rentals
    .map((rental: any) => {
      // Toplam ödenen = kiralama içindeki ödemeler + ayrı ödemeler
      const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const paidFromPayments = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const totalPaid = paidFromRental + paidFromPayments;
      
      // Gerçek kalan borç hesapla
      const actualBalance = rental.totalDue - totalPaid;
      
      // Debug log
      if (rental.customer.fullName.includes('Hüseyin') || rental.customer.fullName.includes('salih')) {
        console.log('\n=== BACKEND DEBTORS DEBUG ===');
        console.log('Rental ID:', rental.id);
        console.log('Müşteri:', rental.customer.fullName);
        console.log('Toplam Tutar (totalDue):', rental.totalDue, '→', rental.totalDue / 100, 'TL');
        console.log('Payments array:', rental.payments);
        console.log('Payments toplamı:', paidFromPayments, '→', paidFromPayments / 100, 'TL');
        console.log('Kiralama ödemeleri:');
        console.log('  - upfront:', rental.upfront, '→', rental.upfront / 100, 'TL');
        console.log('  - pay1:', rental.pay1, '→', rental.pay1 / 100, 'TL');
        console.log('  - pay2:', rental.pay2, '→', rental.pay2 / 100, 'TL');
        console.log('  - pay3:', rental.pay3, '→', rental.pay3 / 100, 'TL');
        console.log('  - pay4:', rental.pay4, '→', rental.pay4 / 100, 'TL');
        console.log('Kiralama ödemeleri toplamı:', paidFromRental, '→', paidFromRental / 100, 'TL');
        console.log('TOPLAM ÖDENEN:', totalPaid, '→', totalPaid / 100, 'TL');
        console.log('HESAPLANAN BORÇ:', actualBalance, '→', actualBalance / 100, 'TL');
        console.log('ESKİ BORÇ (rental.balance):', rental.balance, '→', rental.balance / 100, 'TL');
        console.log('=============================\n');
      }
      
      return {
        rentalId: rental.id,
        plate: rental.vehicle.plate,
        customerName: rental.customer.fullName,
        startDate: rental.startDate,
        endDate: rental.endDate,
        balance: actualBalance, // Gerçek hesaplanmış balance
        days: rental.days
      };
    })
    .filter(rental => rental.balance > 0); // Sadece borcu olanları al

  return debtors;
}
