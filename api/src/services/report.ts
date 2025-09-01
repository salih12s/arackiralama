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
  monthVehicleProfit: number; // Sadece kiralama ücreti + km farkı
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

export async function getDashboardStats(month?: number, year?: number): Promise<DashboardStats> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1; // 1-12
  const targetYear = year ?? now.getFullYear();
  
  const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
  const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

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
  let monthVehicleProfit = 0;

  // Helper function to calculate how many days of a rental fall within a specific month
  const calculateDaysInMonth = (startDate: Date, endDate: Date, targetMonth: number, targetYear: number): number => {
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0); // Son gün
    
    const rangeStart = startDate > monthStart ? startDate : monthStart;
    const rangeEnd = endDate < monthEnd ? endDate : monthEnd;
    
    if (rangeStart > rangeEnd) return 0;
    
    const timeDiff = rangeEnd.getTime() - rangeStart.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 çünkü aynı gün de dahil
  };

  monthlyRentals.forEach((rental: any) => {
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    
    // Bu ay için kaç gün düşüyor hesapla
    const daysInCurrentMonth = calculateDaysInMonth(startDate, endDate, targetMonth, targetYear);
    
    console.log(`🔍 Rental Debug - ${rental.id}:`);
    console.log(`  Start: ${startDate.toISOString().split('T')[0]}, End: ${endDate.toISOString().split('T')[0]}`);
    console.log(`  Days in ${targetMonth}/${targetYear}: ${daysInCurrentMonth}`);
    console.log(`  Daily rate: ${rental.dailyPrice}, Total days: ${rental.days}`);
    
    if (daysInCurrentMonth > 0) {
      // Bu aya düşen kısmı hesapla
      const dailyRate = rental.dailyPrice || 0;
      const monthlyPortion = daysInCurrentMonth * dailyRate;
      
      // KM farkı ve diğer ek maliyetler kiralama başlangıcındaki aya eklenir
      let additionalCosts = 0;
      if (startDate.getMonth() + 1 === targetMonth && startDate.getFullYear() === targetYear) {
        additionalCosts = (rental.kmDiff || 0) + (rental.cleaning || 0) + (rental.hgs || 0) + (rental.damage || 0) + (rental.fuel || 0);
      }
      
      monthBilled += monthlyPortion + additionalCosts;
      
      console.log(`  Monthly portion: ${monthlyPortion}, Additional costs: ${additionalCosts}`);
      console.log(`  Total billed for this month: ${monthlyPortion + additionalCosts}`);
      
      // Ödemeler için de aynı oranı uygula
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const totalPayments = paymentSum + manualPayments;
      
      // Ödeme oranını hesapla (toplam ödenen / toplam borç)
      const paymentRatio = rental.totalDue > 0 ? totalPayments / rental.totalDue : 0;
      const monthlyPaymentPortion = (monthlyPortion + additionalCosts) * paymentRatio;
      
      monthCollected += monthlyPaymentPortion;
      monthOutstanding += Math.max(0, (monthlyPortion + additionalCosts) - monthlyPaymentPortion);

      // Araç kazancı = Bu aya düşen kiralama ücreti + KM farkı (sadece başlangıç ayında)
      const kmProfit = startDate.getMonth() + 1 === targetMonth && startDate.getFullYear() === targetYear ? (rental.kmDiff || 0) : 0;
      monthVehicleProfit += monthlyPortion + kmProfit;
    }
  });

  return {
    totalVehicles: Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0),
    rentedToday: statusCounts.RENTED || 0, // Araç durumu RENTED olanların sayısı
    idle: statusCounts.IDLE || 0,
    reserved: statusCounts.RESERVED || 0,
    service: statusCounts.SERVICE || 0,
    monthBilled,
    monthCollected,
    monthOutstanding,
    monthVehicleProfit
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

    // Helper function to calculate how many days of a rental fall within a specific month
    const calculateDaysInMonth = (rentalStart: Date, rentalEnd: Date, targetMonth: number, targetYear: number): number => {
      const monthStart = new Date(targetYear, targetMonth - 1, 1);
      const monthEnd = new Date(targetYear, targetMonth, 0); // Son gün
      
      const rangeStart = rentalStart > monthStart ? rentalStart : monthStart;
      const rangeEnd = rentalEnd < monthEnd ? rentalEnd : monthEnd;
      
      if (rangeStart > rangeEnd) return 0;
      
      const timeDiff = rangeEnd.getTime() - rangeStart.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 çünkü aynı gün de dahil
    };

    rentals.forEach((rental: any) => {
      const rentalStartDate = new Date(rental.startDate);
      const rentalEndDate = new Date(rental.endDate);
      
      // Bu ay için kaç gün düşüyor hesapla
      const daysInCurrentMonth = calculateDaysInMonth(rentalStartDate, rentalEndDate, month, year);
      
      if (daysInCurrentMonth > 0) {
        // Bu aya düşen kısmı hesapla
        const dailyRate = rental.dailyPrice || 0;
        const monthlyPortion = daysInCurrentMonth * dailyRate;
        
        // KM farkı ve diğer ek maliyetler kiralama başlangıcındaki aya eklenir
        let additionalCosts = 0;
        if (rentalStartDate.getMonth() + 1 === month && rentalStartDate.getFullYear() === year) {
          additionalCosts = (rental.kmDiff || 0) + (rental.cleaning || 0) + (rental.hgs || 0) + (rental.damage || 0) + (rental.fuel || 0);
        }
        
        const totalMonthlyBilling = monthlyPortion + additionalCosts;
        billed += totalMonthlyBilling;
        
        // Ödemeler için de aynı oranı uygula
        const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
        const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        const totalPayments = paymentSum + manualPayments;
        
        // Ödeme oranını hesapla (toplam ödenen / toplam borç)
        const paymentRatio = rental.totalDue > 0 ? totalPayments / rental.totalDue : 0;
        const monthlyPaymentPortion = totalMonthlyBilling * paymentRatio;
        
        collected += monthlyPaymentPortion;
        outstanding += Math.max(0, totalMonthlyBilling - monthlyPaymentPortion);
      }
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
      // Araç geliri = Sadece kiralama ücreti + KM farkı (temizlik, HGS vs. hariç)
      const vehicleIncome = (rental.days * rental.dailyPrice) + (rental.kmDiff || 0);
      billed += vehicleIncome;
      
      const paymentSum = rental.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const totalCollected = paymentSum + manualPayments;
      
      // Toplanan tutarın araç gelirine oranını hesapla
      const paymentRatio = rental.totalDue > 0 ? totalCollected / rental.totalDue : 0;
      const vehicleCollected = vehicleIncome * paymentRatio;
      
      collected += vehicleCollected;
      
      // Outstanding sadece silinmemiş kiralamalar için hesapla
      if (!rental.deleted) {
        outstanding += Math.max(0, vehicleIncome - vehicleCollected);
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
