import dayjs from 'dayjs';
import { Rental } from '../api/client';
import { getRentalFinancials } from './rentalFinancials';

/**
 * GET /vehicles/:id kiralamaları veritabanındaki gibi KURUŞ döndürür
 * (GET /rentals ise TL). Ortak finans hesabına vermeden önce TL'ye çevirir.
 */
export function normalizeVehicleRentals(rentals: unknown[] | undefined | null): Rental[] {
  const tl = (value: number | null | undefined) => (value || 0) / 100;
  return ((rentals || []) as Rental[]).map((rental) => ({
    ...rental,
    dailyPrice: tl(rental.dailyPrice),
    kmDiff: tl(rental.kmDiff),
    cleaning: tl(rental.cleaning),
    hgs: tl(rental.hgs),
    damage: tl(rental.damage),
    fuel: tl(rental.fuel),
    totalDue: tl(rental.totalDue),
    upfront: tl(rental.upfront),
    pay1: tl(rental.pay1),
    pay2: tl(rental.pay2),
    pay3: tl(rental.pay3),
    pay4: tl(rental.pay4),
    balance: tl(rental.balance),
    payments: (rental.payments || []).map((payment) => ({ ...payment, amount: tl(payment.amount) })),
  }));
}

export interface VehicleRentalStats {
  revenue: number;
  rentAndKm: number;
  rentOnly: number;
  kmOnly: number;
  outstanding: number;
  active: number;
  /** Son 90 günde kirada geçen gün oranı (0–1), iptaller hariç */
  utilization: number;
}

/** TL'ye çevrilmiş kiralamalardan araç özetini hesaplar. */
export function vehicleRentalStats(rentals: Rental[]): VehicleRentalStats {
  let revenue = 0;
  let rentOnly = 0;
  let kmOnly = 0;
  let outstanding = 0;
  for (const rental of rentals) {
    const fin = getRentalFinancials(rental);
    revenue += fin.totalAmount;
    rentOnly += fin.rentBase;
    kmOnly += fin.extras.kmDiff;
    outstanding += Math.max(0, fin.balance);
  }
  const windowStart = dayjs().subtract(90, 'day').startOf('day');
  const today = dayjs().endOf('day');
  const busyDays = rentals
    .filter((rental) => rental.status !== 'CANCELLED')
    .reduce((sum, rental) => {
      const start = dayjs(rental.startDate).isAfter(windowStart) ? dayjs(rental.startDate) : windowStart;
      const end = dayjs(rental.endDate).isBefore(today) ? dayjs(rental.endDate) : today;
      return sum + Math.max(0, end.diff(start, 'day'));
    }, 0);
  return {
    revenue,
    rentAndKm: rentOnly + kmOnly,
    rentOnly,
    kmOnly,
    outstanding,
    active: rentals.filter((rental) => rental.status === 'ACTIVE').length,
    utilization: Math.min(1, busyDays / 90),
  };
}
