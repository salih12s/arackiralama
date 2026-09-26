import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import {
  checkVehicleAvailability,
  getBlockedVehicleIds,
  parseIstanbulDate,
  rangesOverlap,
  reservationEndDate,
} from '../services/availabilityService';
import { buildQuote, calculateRentalDays, type Quote } from '../services/quoteService';
import { isLegacyDataUrl } from '../services/imageStorageService';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiting — rezervasyon yazma ucu sıkı, okuma uçları daha gevşek
// ---------------------------------------------------------------------------
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Çok fazla talep gönderildi. Lütfen biraz sonra tekrar deneyin.' },
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' },
});

router.use(readLimiter);

// ---------------------------------------------------------------------------
// Şemalar
// ---------------------------------------------------------------------------
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih formatı');
const timeStr = z.string().regex(/^\d{2}:\d{2}$/).optional();

const rangeQuerySchema = z.object({
  start: dateStr.optional(),
  end: dateStr.optional(),
});

const reservationRequestSchema = z.object({
  vehicleId: z.string().min(1).max(50),
  fullName: z.string().trim().min(3).max(100),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .pipe(z.string().regex(/^(\+90|0)?5\d{9}$/, 'Geçerli bir cep telefonu girin')),
  email: z.string().trim().email().max(120).optional().or(z.literal('')),
  startDate: dateStr,
  endDate: dateStr,
  pickupTime: timeStr,
  pickupLocation: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Kiralama şartları kabul edilmelidir' }) }),
});

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
const showcaseSelect = {
  id: true,
  name: true,
  plate: true,
  status: true,
  year: true,
  fuelType: true,
  transmission: true,
  seats: true,
  dailyRate: true,
  description: true,
  imageUrl: true,
  category: true,
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    select: { id: true, imageUrl: true, altText: true, sortOrder: true, isPrimary: true },
  },
} satisfies Prisma.VehicleSelect;

type ShowcaseVehicle = Prisma.VehicleGetPayload<{ select: typeof showcaseSelect }>;

function maskPlate(plate: string): string {
  return `${plate.slice(0, 2)} ••• ${plate.slice(-2)}`;
}

/** Telefonu 0XXXXXXXXXX biçimine normalleştirir (karşılaştırma için). */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('5')) return `0${digits}`;
  return digits;
}

function toShowcase(vehicle: ShowcaseVehicle, opts: { withGallery?: boolean; available?: boolean; unavailableReason?: string; quote?: Quote | null } = {}) {
  const legacyImageUrl = vehicle.imageUrl && !isLegacyDataUrl(vehicle.imageUrl) ? vehicle.imageUrl : null;
  const gallery = vehicle.images.map((image) => ({ id: image.id, imageUrl: image.imageUrl, altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary }));
  const primaryImage = gallery[0]?.imageUrl || legacyImageUrl;
  const publicQuote = opts.quote ? { days: opts.quote.days, dailyRateTL: opts.quote.dailyRateTL, totalTL: opts.quote.totalTL } : opts.quote;
  return {
    id: vehicle.id,
    name: vehicle.name || 'Kiralık Araç',
    plate: maskPlate(vehicle.plate),
    category: vehicle.category,
    year: vehicle.year,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    seats: vehicle.seats,
    dailyRate: vehicle.dailyRate != null ? vehicle.dailyRate / 100 : null, // kuruş → TL
    imageUrl: primaryImage,
    description: vehicle.description,
    available: opts.available ?? vehicle.status === 'IDLE',
    unavailableReason: opts.unavailableReason ?? (vehicle.status === 'SERVICE' ? 'SERVICE' : vehicle.status === 'RENTED' ? 'RENTED' : vehicle.status === 'RESERVED' ? 'RESERVED' : undefined),
    ...(opts.quote !== undefined ? { quote: publicQuote } : {}),
    ...(opts.withGallery ? { gallery } : {}),
  };
}

/** Sorgu parametrelerinden gün aralığı üretir; verilmemişse null. */
function parseRange(query: { start?: string; end?: string }) {
  if (!query.start || !query.end) return null;
  const start = parseIstanbulDate(query.start);
  const end = parseIstanbulDate(query.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return { start, end };
}

/** Kısa, okunabilir rezervasyon kodu: SS- + 6 karakter (karışabilen karakterler hariç). */
function generateReservationCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SS-${code}`;
}

// ---------------------------------------------------------------------------
// GET /api/public/vehicles — vitrindeki araçlar (+ opsiyonel tarih aralığına göre müsaitlik/teklif)
// ---------------------------------------------------------------------------
router.get('/vehicles', async (req, res) => {
  try {
    const query = rangeQuerySchema.safeParse(req.query);
    const range = query.success ? parseRange(query.data) : null;

    const vehicles = await prisma.vehicle.findMany({
      where: { active: true, showOnSite: true, archivedAt: null },
      orderBy: [{ status: 'asc' }, { dailyRate: 'asc' }, { name: 'asc' }],
      select: showcaseSelect,
    });

    let blocked: { rentedVehicleIds: Set<string>; reservedVehicleIds: Set<string> } | null = null;
    if (range) {
      blocked = await getBlockedVehicleIds(range);
    }

    const data = vehicles.map((vehicle) => {
      let available: boolean;
      let unavailableReason: string | undefined;
      if (range) {
        available =
          vehicle.status !== 'SERVICE' &&
          !blocked!.rentedVehicleIds.has(vehicle.id) &&
          !blocked!.reservedVehicleIds.has(vehicle.id);
        unavailableReason = vehicle.status === 'SERVICE'
          ? 'SERVICE'
          : blocked!.rentedVehicleIds.has(vehicle.id)
            ? 'RENTED'
            : blocked!.reservedVehicleIds.has(vehicle.id)
              ? 'RESERVED'
              : undefined;
      } else {
        available = vehicle.status === 'IDLE';
        unavailableReason = vehicle.status === 'SERVICE' ? 'SERVICE' : vehicle.status === 'RENTED' ? 'RENTED' : vehicle.status === 'RESERVED' ? 'RESERVED' : undefined;
      }
      const quote = range ? buildQuote(vehicle.dailyRate, range.start, range.end) : undefined;
      return toShowcase(vehicle, { available, unavailableReason, quote });
    });

    if (!range) res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ data });
  } catch (error) {
    console.error('Public vehicles error:', error);
    res.status(500).json({ error: 'Araçlar şu anda yüklenemiyor.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/public/categories — filtreler için kategori listesi
// ---------------------------------------------------------------------------
router.get('/categories', async (_req, res) => {
  try {
    const rows = await prisma.vehicle.findMany({
      where: { active: true, showOnSite: true, archivedAt: null, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ data: rows.map((row) => row.category).filter(Boolean) });
  } catch (error) {
    console.error('Public categories error:', error);
    res.status(500).json({ error: 'Kategoriler yüklenemedi.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/public/vehicles/:id — detay (+ tarihe göre müsaitlik/teklif + benzer araçlar)
// ---------------------------------------------------------------------------
router.get('/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.id, active: true, showOnSite: true, archivedAt: null },
      select: showcaseSelect,
    });
    if (!vehicle) return res.status(404).json({ error: 'Araç bulunamadı.' });

    const query = rangeQuerySchema.safeParse(req.query);
    const range = query.success ? parseRange(query.data) : null;

    let available = vehicle.status === 'IDLE';
    let unavailableReason = vehicle.status === 'SERVICE' ? 'SERVICE' : vehicle.status === 'RENTED' ? 'RENTED' : vehicle.status === 'RESERVED' ? 'RESERVED' : undefined;
    let quote = undefined as ReturnType<typeof buildQuote> | undefined;
    if (range) {
      const check = await checkVehicleAvailability(vehicle.id, range);
      available = check.available;
      unavailableReason = check.reason;
      quote = buildQuote(vehicle.dailyRate, range.start, range.end);
    }

    const similar = await prisma.vehicle.findMany({
      where: {
        active: true,
        showOnSite: true,
        archivedAt: null,
        id: { not: vehicle.id },
        ...(vehicle.category ? { category: vehicle.category } : {}),
      },
      orderBy: [{ status: 'asc' }, { dailyRate: 'asc' }],
      take: 3,
      select: showcaseSelect,
    });
    // Aynı kategoride 3 araç yoksa diğerlerinden tamamla
    if (similar.length < 3) {
      const extra = await prisma.vehicle.findMany({
        where: { active: true, showOnSite: true, archivedAt: null, id: { notIn: [vehicle.id, ...similar.map((s) => s.id)] } },
        orderBy: [{ status: 'asc' }, { dailyRate: 'asc' }],
        take: 3 - similar.length,
        select: showcaseSelect,
      });
      similar.push(...extra);
    }

    res.json({
      data: toShowcase(vehicle, { withGallery: true, available, unavailableReason, quote }),
      similar: similar.map((item) => toShowcase(item)),
    });
  } catch (error) {
    console.error('Public vehicle detail error:', error);
    res.status(500).json({ error: 'Araç bilgisi şu anda yüklenemiyor.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/public/reservations — talep oluşturma
//  - fiyat backend'de yeniden hesaplanır
//  - müsaitlik transaction içinde yeniden kontrol edilir (Serializable)
//  - aynı telefondan aynı araç için çakışan mükerrer talep reddedilir
// ---------------------------------------------------------------------------
router.post('/reservations', writeLimiter, async (req, res) => {
  try {
    const input = reservationRequestSchema.parse(req.body);

    const startDate = parseIstanbulDate(input.startDate, input.pickupTime || '10:00');
    const endDate = parseIstanbulDate(input.endDate, input.pickupTime || '10:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate < today || endDate <= startDate) {
      return res.status(400).json({ error: 'Teslim tarihi başlangıç tarihinden sonra ve bugünden ileri olmalıdır.' });
    }

    const rentalDuration = calculateRentalDays(startDate, endDate);
    if (rentalDuration > 60) {
      return res.status(400).json({ error: 'Online talepler en fazla 60 gün için oluşturulabilir.' });
    }

    const normalizedPhone = normalizePhone(input.phone);

    const result = await prisma.$transaction(
      async (tx) => {
        const vehicle = await tx.vehicle.findFirst({
          where: { id: input.vehicleId, active: true, showOnSite: true, archivedAt: null },
          select: { id: true, plate: true, dailyRate: true, status: true },
        });
        if (!vehicle) return { status: 409 as const, error: 'Bu araç artık listede değil. Lütfen başka bir araç seçin.' };

        // Müsaitlik: listeleme anına değil, ŞU ANA göre yeniden kontrol
        const availability = await checkVehicleAvailability(vehicle.id, { start: startDate, end: endDate }, tx);
        if (!availability.available) {
          return {
            status: 409 as const,
            error:
              availability.reason === 'SERVICE'
                ? 'Bu araç şu anda serviste. Lütfen başka bir araç seçin.'
                : 'Seçtiğiniz tarihlerde bu araç müsait değil. Lütfen tarihleri veya aracı değiştirin.',
          };
        }

        // Mükerrer talep kontrolü: aynı telefon + aynı araç + çakışan tarih
        const existing = await tx.reservation.findMany({
          where: { vehicleId: vehicle.id, status: { in: ['PENDING', 'CONFIRMED'] } },
          select: { reservationDate: true, rentalDuration: true, reservationCode: true, customer: { select: { phone: true } } },
        });
        for (const prev of existing) {
          const prevPhone = normalizePhone(prev.customer?.phone || '');
          const prevEnd = reservationEndDate(prev.reservationDate, prev.rentalDuration);
          if (prevPhone && prevPhone === normalizedPhone && rangesOverlap(prev.reservationDate, prevEnd, startDate, endDate)) {
            return {
              status: 409 as const,
              error: `Bu araç için zaten bekleyen bir talebiniz var${prev.reservationCode ? ` (${prev.reservationCode})` : ''}. Ekibimiz sizinle iletişime geçecek.`,
            };
          }
        }

        // Müşteri: telefona göre bul veya oluştur
        let customer = await tx.customer.findFirst({ where: { phone: normalizedPhone } });
        if (!customer) {
          customer = await tx.customer.create({
            data: { fullName: input.fullName, phone: normalizedPhone },
          });
        }

        // Fiyat: backend hesabı — frontend'den tutar kabul edilmez
        const quote = buildQuote(vehicle.dailyRate, startDate, endDate);

        // Benzersiz kod (çakışırsa yeniden dene)
        let reservationCode = generateReservationCode();
        for (let attempt = 0; attempt < 5; attempt++) {
          const clash = await tx.reservation.findUnique({ where: { reservationCode }, select: { id: true } });
          if (!clash) break;
          reservationCode = generateReservationCode();
        }

        const noteParts = [
          'Web sitesi rezervasyon talebi',
          `Dönüş: ${input.endDate}`,
          input.email ? `E-posta: ${input.email}` : null,
          input.note || null,
        ].filter(Boolean);

        const reservation = await tx.reservation.create({
          data: {
            customerId: customer.id,
            vehicleId: vehicle.id,
            customerName: input.fullName,
            licensePlate: vehicle.plate,
            reservationDate: startDate,
            reservationTime: input.pickupTime || '10:00',
            rentalDuration,
            note: noteParts.join(' • '),
            status: 'PENDING',
            reservationCode,
            source: 'WEB',
            quotedAmount: quote?.totalKurus ?? null,
            pickupLocation: input.pickupLocation || null,
            termsAcceptedAt: new Date(),
          },
          select: { reservationCode: true, status: true, createdAt: true },
        });

        return { status: 201 as const, reservation, quote };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.status !== 201) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Rezervasyon talebiniz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecek.',
      reservation: {
        code: result.reservation!.reservationCode,
        status: result.reservation!.status,
        createdAt: result.reservation!.createdAt,
      },
      quote: result.quote
        ? { days: result.quote.days, dailyRateTL: result.quote.dailyRateTL, totalTL: result.quote.totalTL }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Lütfen bilgilerinizi kontrol edin.' });
    }
    // Serializable çakışması → güvenli mesaj
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return res.status(409).json({ error: 'Bu araç için eşzamanlı başka bir talep işleniyor. Lütfen tekrar deneyin.' });
    }
    console.error('Public reservation error:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Talebiniz şu anda alınamadı. Lütfen daha sonra tekrar deneyin.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/public/reservations/:code?phone=XXXX — rezervasyon sorgulama
// Kod + telefonun tamamı veya son 4 hanesi eşleşmeli. Başka müşteri verisi dönmez.
// ---------------------------------------------------------------------------
router.get('/reservations/:code', async (req, res) => {
  try {
    // Tire ve boşluk isteğe bağlı: "ss k7m2p9" → "SS-K7M2P9". Eski "EF-" kodları da geçerli.
    const raw = String(req.params.code || '').trim().toUpperCase().replace(/[\s-]/g, '');
    const code = /^(SS|EF)[A-Z0-9]{6}$/.test(raw) ? `${raw.slice(0, 2)}-${raw.slice(2)}` : '';
    const phoneInput = String(req.query.phone || '').replace(/\D/g, '');
    if (!code || phoneInput.length < 4) {
      return res.status(400).json({ error: 'Rezervasyon kodu ve telefon bilgisi gereklidir.' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { reservationCode: code },
      select: {
        reservationCode: true,
        status: true,
        reservationDate: true,
        reservationTime: true,
        rentalDuration: true,
        quotedAmount: true,
        pickupLocation: true,
        createdAt: true,
        customer: { select: { phone: true } },
        vehicle: { select: { name: true, plate: true } },
      },
    });

    const storedPhone = normalizePhone(reservation?.customer?.phone || '');
    const matches =
      reservation &&
      storedPhone &&
      (storedPhone === normalizePhone(phoneInput) || storedPhone.endsWith(phoneInput.slice(-4)));

    // Kod veya telefon uyuşmazsa aynı mesaj — bilgi sızdırma yok
    if (!matches) {
      return res.status(404).json({ error: 'Bu bilgilerle bir rezervasyon bulunamadı.' });
    }

    const endDate = reservationEndDate(reservation!.reservationDate, reservation!.rentalDuration);
    res.json({
      data: {
        code: reservation!.reservationCode,
        status: reservation!.status, // PENDING | CONFIRMED | CANCELLED | COMPLETED
        vehicleName: reservation!.vehicle?.name || 'Araç',
        vehiclePlate: reservation!.vehicle ? maskPlate(reservation!.vehicle.plate) : null,
        startDate: reservation!.reservationDate,
        endDate,
        pickupTime: reservation!.reservationTime,
        days: reservation!.rentalDuration,
        totalTL: reservation!.quotedAmount != null ? reservation!.quotedAmount / 100 : null,
        pickupLocation: reservation!.pickupLocation,
        createdAt: reservation!.createdAt,
      },
    });
  } catch (error) {
    console.error('Public reservation lookup error:', error);
    res.status(500).json({ error: 'Sorgulama şu anda yapılamıyor.' });
  }
});

export default router;
