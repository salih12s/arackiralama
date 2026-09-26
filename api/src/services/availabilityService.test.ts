import {
  rangesOverlap,
  reservationEndDate,
  parseIstanbulDate,
  checkVehicleAvailability,
} from './availabilityService';
import { buildQuote, calculateRentalDays } from './quoteService';

const d = (s: string) => new Date(`${s}T10:00:00+03:00`);

describe('rangesOverlap (gün seviyesi, kapsayıcı)', () => {
  it('tamamen ayrık aralıklar çakışmaz', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-06'), d('2026-07-10'))).toBe(false);
    expect(rangesOverlap(d('2026-07-06'), d('2026-07-10'), d('2026-07-01'), d('2026-07-05'))).toBe(false);
  });

  it('iç içe geçen aralıklar çakışır', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-10'), d('2026-07-03'), d('2026-07-05'))).toBe(true);
  });

  it('kısmi kesişme çakışır', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-04'), d('2026-07-08'))).toBe(true);
  });

  it('bitiş günü ile yeni başlangıç günü aynıysa çakışma SAYILIR (aynı gün devir manuel onay ister)', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-05'), d('2026-07-08'))).toBe(true);
  });

  it('saat farkı gün seviyesinde sonucu değiştirmez', () => {
    const lateEnd = new Date('2026-07-05T23:30:00+03:00');
    const earlyStart = new Date('2026-07-06T00:30:00+03:00');
    expect(rangesOverlap(d('2026-07-01'), lateEnd, earlyStart, d('2026-07-09'))).toBe(false);
  });
});

describe('reservationEndDate', () => {
  it('başlangıç + süre gününü döndürür', () => {
    const end = reservationEndDate(d('2026-07-10'), 3);
    expect(end.getDate()).toBe(13);
  });

  it('0 veya negatif süre minimum 1 gün sayılır', () => {
    expect(reservationEndDate(d('2026-07-10'), 0).getDate()).toBe(11);
  });
});

describe('parseIstanbulDate', () => {
  it('tarihi Europe/Istanbul (+03:00) gününe sabitler', () => {
    const parsed = parseIstanbulDate('2026-07-15', '10:00');
    expect(parsed.toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });
});

describe('quoteService', () => {
  it('gün sayısı: aynı gün = 1, standart fark doğru', () => {
    expect(calculateRentalDays(d('2026-07-10'), d('2026-07-10'))).toBe(1);
    expect(calculateRentalDays(d('2026-07-10'), d('2026-07-13'))).toBe(3);
  });

  it('toplam tutar backend tarafından kuruş üzerinden hesaplanır', () => {
    const quote = buildQuote(145000, d('2026-07-10'), d('2026-07-13')); // 1450 TL/gün, 3 gün
    expect(quote).not.toBeNull();
    expect(quote!.days).toBe(3);
    expect(quote!.totalKurus).toBe(435000);
    expect(quote!.totalTL).toBe(4350);
    expect(quote!.dailyRateTL).toBe(1450);
  });

  it('fiyatı olmayan araç için teklif üretilmez', () => {
    expect(buildQuote(null, d('2026-07-10'), d('2026-07-13'))).toBeNull();
    expect(buildQuote(0, d('2026-07-10'), d('2026-07-13'))).toBeNull();
  });
});

describe('checkVehicleAvailability (mock db)', () => {
  const range = { start: d('2026-07-10'), end: d('2026-07-13') };

  function mockDb(overrides: {
    vehicle?: any;
    rentals?: any[];
    reservations?: any[];
  }) {
    return {
      vehicle: { findFirst: jest.fn().mockResolvedValue('vehicle' in overrides ? overrides.vehicle : { id: 'v1', status: 'IDLE' }) },
      rental: { findMany: jest.fn().mockResolvedValue(overrides.rentals ?? []) },
      reservation: { findMany: jest.fn().mockResolvedValue(overrides.reservations ?? []) },
    } as any;
  }

  it('çakışma yoksa müsait', async () => {
    const db = mockDb({});
    await expect(checkVehicleAvailability('v1', range, db)).resolves.toEqual({ available: true });
  });

  it('çakışan aktif kiralama aracı bloke eder', async () => {
    const db = mockDb({ rentals: [{ startDate: d('2026-07-08'), endDate: d('2026-07-11') }] });
    await expect(checkVehicleAvailability('v1', range, db)).resolves.toEqual({ available: false, reason: 'RENTED' });
  });

  it('çakışmayan kiralama bloke etmez (soft-deleted kayıtlar sorguya hiç girmez)', async () => {
    const db = mockDb({ rentals: [{ startDate: d('2026-07-01'), endDate: d('2026-07-05') }] });
    await expect(checkVehicleAvailability('v1', range, db)).resolves.toEqual({ available: true });
    // deleted:false filtresi sorgu koşulunda
    expect(db.rental.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deleted: false, status: 'ACTIVE' }) })
    );
  });

  it('çakışan ONAYLI rezervasyon aracı bloke eder', async () => {
    const db = mockDb({ reservations: [{ reservationDate: d('2026-07-12'), rentalDuration: 2 }] });
    await expect(checkVehicleAvailability('v1', range, db)).resolves.toEqual({ available: false, reason: 'RESERVED' });
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'CONFIRMED' }) })
    );
  });

  it('servisteki araç rezervasyona kapalı', async () => {
    const db = mockDb({ vehicle: { id: 'v1', status: 'SERVICE' } });
    await expect(checkVehicleAvailability('v1', range, db)).resolves.toEqual({ available: false, reason: 'SERVICE' });
  });

  it('pasif/vitrine kapalı araç listede yok sayılır', async () => {
    const db = mockDb({ vehicle: null });
    await expect(checkVehicleAvailability('v1', range, db)).resolves.toEqual({ available: false, reason: 'NOT_LISTED' });
  });
});
