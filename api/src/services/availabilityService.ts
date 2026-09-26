import { prisma } from '../db/prisma';

/**
 * Merkezi müsaitlik servisi.
 *
 * Tüm tarih çakışması kontrolleri buradan geçer — hem public araç listeleme
 * hem rezervasyon oluşturma aynı mantığı kullanır.
 *
 * İş kuralları:
 *  - Aktif (soft delete edilmemiş, status=ACTIVE) kiralamalar aracı bloke eder.
 *  - ONAYLANMIŞ rezervasyonlar aracı bloke eder.
 *  - BEKLEMEDEKİ rezervasyonlar genel müsaitliği bloke ETMEZ (talep bazlı akış;
 *    onayı ekip verir) — ancak aynı telefon numarasından aynı araç için çakışan
 *    ikinci talep publicReservation tarafında reddedilir.
 *  - SERVİSTEKİ araçlar rezervasyona kapalıdır (servis bitişi sistemde tutulmadığı
 *    için güvenli taraf seçilir).
 *  - Pasif/arşivlenmiş (active=false veya archivedAt dolu) ve vitrine kapalı araçlar public
 *    tarafta hiç listelenmez.
 *
 * Tüm karşılaştırmalar gün seviyesindedir (mevcut kiralama sistemi gün bazlı).
 */

export interface DayRange {
  start: Date;
  end: Date;
}

/** Gün seviyesinde kapsayıcı çakışma: [aStart,aEnd] ile [bStart,bEnd] kesişiyor mu? */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  const dayStart = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  // Kapsayıcı: bitiş günü ile yeni başlangıç günü aynıysa çakışma sayılır
  // (aynı gün araç teslimi + yeni teslim alma manuel onay gerektirir).
  return dayStart(aStart) <= dayStart(bEnd) && dayStart(bStart) <= dayStart(aEnd);
}

/** Rezervasyonun bitiş gününü hesaplar: başlangıç + süre (gün). */
export function reservationEndDate(reservationDate: Date, rentalDuration: number): Date {
  const end = new Date(reservationDate);
  end.setDate(end.getDate() + Math.max(1, rentalDuration || 1));
  return end;
}

/** "YYYY-MM-DD" değerini Europe/Istanbul (+03:00, DST yok) gününe sabitleyerek parse eder. */
export function parseIstanbulDate(dateStr: string, time = '10:00'): Date {
  return new Date(`${dateStr}T${time}:00+03:00`);
}

export interface UnavailabilityReasons {
  rentedVehicleIds: Set<string>;
  reservedVehicleIds: Set<string>;
}

/**
 * Verilen tarih aralığında bloke olan araç id'lerini döndürür.
 * Kaynaklar: aktif kiralamalar + onaylanmış rezervasyonlar.
 * (SERVICE/pasif araç filtresi sorgu tarafında `status`/`active` ile yapılır.)
 */
export async function getBlockedVehicleIds(range: DayRange): Promise<UnavailabilityReasons> {
  const [rentals, reservations] = await Promise.all([
    prisma.rental.findMany({
      where: {
        deleted: false,
        status: 'ACTIVE',
        // gün bazlı kesişim ön filtresi (kesin kontrol rangesOverlap ile)
        startDate: { lte: range.end },
        endDate: { gte: new Date(range.start.getTime() - 24 * 3600 * 1000) },
      },
      select: { vehicleId: true, startDate: true, endDate: true },
    }),
    prisma.reservation.findMany({
      where: { status: 'CONFIRMED' },
      select: { vehicleId: true, reservationDate: true, rentalDuration: true },
    }),
  ]);

  const rentedVehicleIds = new Set<string>();
  for (const rental of rentals) {
    if (rangesOverlap(rental.startDate, rental.endDate, range.start, range.end)) {
      rentedVehicleIds.add(rental.vehicleId);
    }
  }

  const reservedVehicleIds = new Set<string>();
  for (const reservation of reservations) {
    const resEnd = reservationEndDate(reservation.reservationDate, reservation.rentalDuration);
    if (rangesOverlap(reservation.reservationDate, resEnd, range.start, range.end)) {
      reservedVehicleIds.add(reservation.vehicleId);
    }
  }

  return { rentedVehicleIds, reservedVehicleIds };
}

export type UnavailableReason = 'RENTED' | 'RESERVED' | 'SERVICE' | 'NOT_LISTED';

export interface AvailabilityResult {
  available: boolean;
  reason?: UnavailableReason;
}

/**
 * Tek aracın verilen aralıktaki müsaitliği. Rezervasyon oluşturma sırasında
 * (transaction içinde) yeniden çağrılır — listeleme anındaki bilgiye güvenilmez.
 */
export async function checkVehicleAvailability(
  vehicleId: string,
  range: DayRange,
  db: Pick<typeof prisma, 'vehicle' | 'rental' | 'reservation'> = prisma
): Promise<AvailabilityResult> {
  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, active: true, showOnSite: true, archivedAt: null },
    select: { id: true, status: true },
  });
  if (!vehicle) return { available: false, reason: 'NOT_LISTED' };
  if (vehicle.status === 'SERVICE') return { available: false, reason: 'SERVICE' };

  const rentals = await db.rental.findMany({
    where: { vehicleId, deleted: false, status: 'ACTIVE' },
    select: { startDate: true, endDate: true },
  });
  for (const rental of rentals) {
    if (rangesOverlap(rental.startDate, rental.endDate, range.start, range.end)) {
      return { available: false, reason: 'RENTED' };
    }
  }

  const reservations = await db.reservation.findMany({
    where: { vehicleId, status: 'CONFIRMED' },
    select: { reservationDate: true, rentalDuration: true },
  });
  for (const reservation of reservations) {
    const resEnd = reservationEndDate(reservation.reservationDate, reservation.rentalDuration);
    if (rangesOverlap(reservation.reservationDate, resEnd, range.start, range.end)) {
      return { available: false, reason: 'RESERVED' };
    }
  }

  return { available: true };
}
