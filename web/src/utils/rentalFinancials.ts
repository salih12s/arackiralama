import { Rental } from '../api/client';

/**
 * Kiralama finansal özeti — AllRentals tablosu, özet kartları ve
 * Kiralama Detay modalı aynı hesabı buradan kullanır.
 *
 * Not: Bazı eski kayıtlarda orijinal toplam, note alanında
 * "ORIGINAL_TOTAL:<kuruş>" olarak saklanır; varsa o esas alınır.
 */
export interface RentalFinancials {
  rentBase: number;        // kira bedeli (orijinal toplam veya gün × günlük)
  extras: {
    kmDiff: number;
    hgs: number;
    cleaning: number;
    damage: number;
    fuel: number;
  };
  totalAmount: number;     // genel toplam
  installments: number;    // peşin + 4 taksit
  extraPayments: number;   // payments[] kayıtları
  totalPaid: number;
  balance: number;         // + borç, 0 kapalı, - fazla ödeme
}

export function getRentalFinancials(rental: Rental): RentalFinancials {
  const noteMatch = rental.note?.match(/ORIGINAL_TOTAL:(\d+)/);
  const rentBase = noteMatch ? parseInt(noteMatch[1], 10) / 100 : rental.dailyPrice * rental.days;

  const extras = {
    kmDiff: rental.kmDiff || 0,
    hgs: rental.hgs || 0,
    cleaning: rental.cleaning || 0,
    damage: rental.damage || 0,
    fuel: rental.fuel || 0,
  };

  const totalAmount = rentBase + extras.kmDiff + extras.hgs + extras.cleaning + extras.damage + extras.fuel;

  const installments =
    (rental.upfront || 0) + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0);
  const extraPayments = (rental.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalPaid = installments + extraPayments;

  return { rentBase, extras, totalAmount, installments, extraPayments, totalPaid, balance: totalAmount - totalPaid };
}

/** Note alanından ORIGINAL_TOTAL etiketini temizleyip kullanıcı notunu döndürür. */
export function getDisplayNote(note?: string | null): string {
  return note?.replace(/ORIGINAL_TOTAL:\d+\|?/, '').trim() || '';
}
