import { Rental, Payment } from '@prisma/client';

export interface RentalCalculation {
  totalDue: number;
  balance: number;
}

/**
 * Kiralama tutar hesabı. GİRDİLER ve ÇIKTILAR KURUŞ cinsindendir (veritabanıyla aynı birim).
 * TL ↔ kuruş dönüşümü yalnızca API sınırında yapılır.
 *
 * Kural web tarafındaki `getRentalFinancials` ile birebir aynıdır; panel ve raporlar aynı rakamı gösterir.
 */
export interface RentalInput {
  days: number;
  dailyPrice: number;
  kmDiff?: number;
  cleaning?: number;
  hgs?: number;
  damage?: number;
  fuel?: number;
  upfront?: number;
  pay1?: number;
  pay2?: number;
  pay3?: number;
  pay4?: number;
  /** "ORIGINAL_TOTAL:<kuruş>" etiketi taşıyabilir */
  note?: string | null;
}

export interface RentalWithPayments extends Rental {
  payments: Payment[];
}

/**
 * Kira bedeli (kuruş). Panel günlük ücreti 10 TL'ye yuvarlayarak saklar; kullanıcının girdiği
 * gerçek toplam note alanında ORIGINAL_TOTAL olarak durur ve varsa o esas alınır.
 */
export function calculateRentBase(input: Pick<RentalInput, 'days' | 'dailyPrice' | 'note'>): number {
  const originalTotal = input.note?.match(/ORIGINAL_TOTAL:(\d+)/);
  return originalTotal ? parseInt(originalTotal[1], 10) : input.days * input.dailyPrice;
}

/** Toplam borç (kuruş) = kira bedeli + ek ücretler */
export function calculateTotalDue(input: RentalInput): number {
  const { kmDiff = 0, cleaning = 0, hgs = 0, damage = 0, fuel = 0 } = input;
  return calculateRentBase(input) + kmDiff + cleaning + hgs + damage + fuel;
}

/**
 * Bakiye (kuruş) = toplam borç - (peşinat + taksitler + ek ödemeler).
 * Fazla ödemede negatif olur (müşteri alacağı); kırpılmaz.
 */
export function calculateBalance(
  totalDue: number,
  rental: RentalInput,
  payments: Pick<Payment, 'amount'>[] = []
): number {
  const { upfront = 0, pay1 = 0, pay2 = 0, pay3 = 0, pay4 = 0 } = rental;
  const paymentSum = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return totalDue - (upfront + pay1 + pay2 + pay3 + pay4 + paymentSum);
}

/**
 * Calculate both total due and balance
 */
export function calculateRentalAmounts(
  input: RentalInput,
  payments: Pick<Payment, 'amount'>[] = []
): RentalCalculation {
  const totalDue = calculateTotalDue(input);
  const balance = calculateBalance(totalDue, input, payments);

  return { totalDue, balance };
}

/**
 * Check if a rental is active for today
 */
export function isRentalActiveToday(rental: Rental): boolean {
  const today = new Date();
  const startDate = new Date(rental.startDate);
  const endDate = new Date(rental.endDate);
  
  // Set time to start of day for comparison
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return rental.status === 'ACTIVE' && 
         today >= startDate && 
         today <= endDate;
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Remove +1 to fix calculation
  
  return Math.max(1, diffDays); // Minimum 1 day
}
