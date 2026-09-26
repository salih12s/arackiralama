import { prisma } from '../db/prisma';

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

export interface VehicleRevenue {
  licensePlate: string;
  totalRevenue: number;
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

  const statusCounts = vehicleCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {});

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

  monthlyRentals.forEach((rental) => {
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    
    // Bu ay için kaç gün düşüyor hesapla
    const daysInCurrentMonth = calculateDaysInMonth(startDate, endDate, targetMonth, targetYear);
    
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
      
      // Ödemeler için de aynı oranı uygula
      const paymentSum = rental.payments.reduce((sum: number, payment) => sum + payment.amount, 0);
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
    totalVehicles: Object.values(statusCounts).reduce((sum: number, count) => sum + count, 0),
    rentedToday: statusCounts.RENTED || 0, // Araç durumu RENTED olanların sayısı
    idle: statusCounts.IDLE || 0,
    reserved: statusCounts.RESERVED || 0,
    service: statusCounts.SERVICE || 0,
    monthBilled: monthBilled / 100, // Kuruş'tan TL'ye çevir
    monthCollected: monthCollected / 100, // Kuruş'tan TL'ye çevir
    monthOutstanding: monthOutstanding / 100, // Kuruş'tan TL'ye çevir
    monthVehicleProfit: monthVehicleProfit / 100 // Kuruş'tan TL'ye çevir
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

    rentals.forEach((rental) => {
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
        const paymentSum = rental.payments.reduce((sum: number, payment) => sum + payment.amount, 0);
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

  return vehicles.map((vehicle) => {
    let billed = 0;
    let collected = 0;
    let outstanding = 0;

    vehicle.rentals.forEach((rental) => {
      // Araç geliri = Sadece kiralama ücreti + KM farkı (temizlik, HGS vs. hariç)
      const vehicleIncome = (rental.days * rental.dailyPrice) + (rental.kmDiff || 0);
      billed += vehicleIncome;
      
      const paymentSum = rental.payments.reduce((sum: number, payment) => sum + payment.amount, 0);
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
      billed: billed, // Kuruş'tan TL'ye çevir
      collected: collected, // Kuruş'tan TL'ye çevir
      outstanding: outstanding // Kuruş'tan TL'ye çevir
    };
  });
}

export async function getVehicleRevenueReport(): Promise<VehicleRevenue[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { active: true },
    include: {
      rentals: {
        where: { deleted: false }, // Sadece silinmemiş kiralamalar
        include: {
          payments: true
        }
      }
    }
  });

  return vehicles.map((vehicle) => {
    let totalRevenue = 0;

    vehicle.rentals.forEach((rental) => {
      // Araç geliri = Kiralama ücreti + KM farkı (sadece araçla ilgili gelir)
      const dailyRate = rental.dailyPrice || 0;
      const days = rental.days || 0;
      const kmDiff = rental.kmDiff || 0;
      
      const vehicleIncome = (days * dailyRate) + kmDiff;
      totalRevenue += vehicleIncome;
    });

    return {
      licensePlate: vehicle.plate,
      totalRevenue: totalRevenue / 100 // Kuruş'tan TL'ye çevir
    };
  }); // Tüm araçları göster (geliri 0 olanlar da dahil)
}

export async function getDebtorReport(): Promise<{ customerId: string; customerName: string; totalDebt: number }[]> {
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

  // Müşteri bazında borç toplamı
  const customerDebtMap = new Map<string, { customerName: string; totalDebt: number }>();

  rentals.forEach((rental) => {
    // UnpaidDebtsDetail mantığı ile gerçek zamanlı hesaplama
    const days = rental.days || 0;
    const dailyPrice = rental.dailyPrice || 0;  // TL cinsinden
    const totalPrice = days * dailyPrice;
    
    // Ek ücretler - TL cinsinden
    const kmPrice = rental.kmDiff || 0;
    const hgsFee = rental.hgs || 0;
    const cleaningFee = rental.cleaning || 0;
    const damageFee = rental.damage || 0;
    const fuelCost = rental.fuel || 0;
    
    // Toplam tutar hesaplama
    const totalAmount = totalPrice + kmPrice + hgsFee + cleaningFee + damageFee + fuelCost;
    
    // Ödemeler - TL cinsinden
    const installmentPayments = (rental.upfront || 0) + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0);
    const extraPayments = rental.payments.reduce((sum: number, payment) => sum + (payment.amount || 0), 0);
    const totalPaid = installmentPayments + extraPayments;
    
    // Bakiye hesaplama
    const actualBalance = totalAmount - totalPaid;
    
    if (actualBalance > 0) {
      const customerId = rental.customer.id;
      const customerName = rental.customer.fullName;
      
      if (customerDebtMap.has(customerId)) {
        const existing = customerDebtMap.get(customerId)!;
        existing.totalDebt += actualBalance;
      } else {
        customerDebtMap.set(customerId, {
          customerName,
          totalDebt: actualBalance
        });
      }
    }
  });

  const debtorList = Array.from(customerDebtMap.entries()).map(([customerId, data]) => ({
    customerId,
    customerName: data.customerName,
    totalDebt: data.totalDebt // TL cinsinden döndürülür
  }));

  return debtorList.sort((a, b) => b.totalDebt - a.totalDebt);
}

// Financial Dashboard fonksiyonu
export async function getFinancialDashboard() {
  // Placeholder implementation
  return {
    totalRevenue: 0,
    monthlyRevenue: 0,
    outstandingPayments: 0,
    vehiclePerformance: []
  };
}

// Overall Vehicle Performance fonksiyonu
export async function getOverallVehiclePerformance() {
  // Placeholder implementation
  return {
    topEarningVehicle: null,
    lowestEarningVehicle: null
  };
}
