/**
 * Public rezervasyon fiyat teklifi servisi.
 *
 * Toplam tutar HER ZAMAN backend'de hesaplanır — frontend'den gelen tutara
 * güvenilmez. Para birimi kuralı korunur: veritabanında kuruş (integer),
 * API yanıtında TL.
 */

export interface Quote {
  days: number;
  dailyRateTL: number;
  totalTL: number;
  totalKurus: number;
}

/** Gün sayısı: gün seviyesinde fark, minimum 1 (rentalCalc.calculateDaysBetween ile aynı kural). */
export function calculateRentalDays(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/** Günlük vitrin fiyatı (kuruş) üzerinden teklif. Fiyatı olmayan araç için null. */
export function buildQuote(dailyRateKurus: number | null | undefined, start: Date, end: Date): Quote | null {
  if (dailyRateKurus == null || dailyRateKurus <= 0) return null;
  const days = calculateRentalDays(start, end);
  const totalKurus = days * dailyRateKurus;
  return {
    days,
    dailyRateTL: dailyRateKurus / 100,
    totalTL: totalKurus / 100,
    totalKurus,
  };
}
