import { Rental, Payment } from '@prisma/client';

export interface RentalCalculation {
  totalDue: number;
  balance: number;
}

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
}

export interface RentalWithPayments extends Rental {
  payments: Payment[];
}

/**
 * Calculate total due amount in KURUŞ
 * ALL fields are in TL except payments which are already in kuruş
 * Convert TL fields to kuruş for consistency
 */
export function calculateTotalDue(input: RentalInput): number {
  const {
    days,
    dailyPrice,
    kmDiff = 0,
    cleaning = 0,
    hgs = 0,
    damage = 0,
    fuel = 0
  } = input;

  // dailyPrice, kmDiff, cleaning, hgs, damage, fuel are in TL
  // Convert to kuruş: TL * 100
  const totalTL = days * dailyPrice + kmDiff + cleaning + hgs + damage + fuel;
  return Math.round(totalTL * 100); // Return in kuruş
}

/**
 * Calculate balance amount in KURUŞ
 * balance = totalDue - (upfront + pay1 + pay2 + pay3 + pay4 + sum(payments.amount))
 * All values are in kuruş, upfront/pay1-4 need conversion from TL
 */
export function calculateBalance(
  totalDue: number, // Already in kuruş
  rental: RentalInput,
  payments: Payment[] = []
): number {
  const {
    upfront = 0,
    pay1 = 0,
    pay2 = 0,
    pay3 = 0,
    pay4 = 0
  } = rental;

  const paymentSum = payments.reduce((sum, payment) => sum + payment.amount, 0); // Already in kuruş
  const manualPaymentsKurus = (upfront + pay1 + pay2 + pay3 + pay4) * 100; // Convert TL to kuruş
  const totalPaid = manualPaymentsKurus + paymentSum;
  
  // Balance cannot be negative - if overpaid, balance is 0
  const calculatedBalance = totalDue - totalPaid;
  return Math.max(0, calculatedBalance);
}

/**
 * Calculate both total due and balance
 */
export function calculateRentalAmounts(
  input: RentalInput,
  payments: Payment[] = []
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
 * Calculate days between two dates (inclusive)
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  
  return Math.max(1, diffDays); // Minimum 1 day
}
