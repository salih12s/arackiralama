import bcrypt from 'bcrypt';
import { prisma } from './db/prisma';
import { calculateRentalAmounts } from './services/rentalCalc';

/**
 * Demo/portfolio seed data.
 * Resets rental-related tables and repopulates them with a realistic,
 * self-consistent dataset (Turkish names, plates, prices) so the app
 * looks presentable for local screenshots. Safe to re-run.
 *
 * Money fields on Rental/Payment are stored in KURUŞ (TL * 100).
 * Everything below is authored in TL and converted with TL().
 */
const TL = (n: number) => Math.round(n * 100);

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // ---------------------------------------------------------------------
    // 0) Clean slate for demo tables (respecting FK order)
    // ---------------------------------------------------------------------
    await prisma.payment.deleteMany({});
    await prisma.consignmentDeduction.deleteMany({});
    await prisma.externalPayment.deleteMany({});
    await prisma.consignmentRental.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.vehicleExpense.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.rental.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.vehicle.deleteMany({});
    console.log('🧹 Cleared existing demo data');

    // ---------------------------------------------------------------------
    // 1) Admin user
    // ---------------------------------------------------------------------
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@arackiralama.com' },
      update: {},
      create: {
        email: 'admin@arackiralama.com',
        passwordHash: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('👤 Admin user ready:', adminUser.email);

    // ---------------------------------------------------------------------
    // 2) Vehicles — status set explicitly to match the rentals below.
    //    Showcase fields feed the public rental site (/kirala).
    // ---------------------------------------------------------------------
    const vehicleData = [
      { plate: '34 CVK 07', category: 'EKONOMİK', name: 'Renault Clio',      status: 'IDLE'     as const,
        year: 2022, fuelType: 'BENZİN', transmission: 'MANUEL',   seats: 5, dailyRate: TL(1450),
        description: 'Şehir içi kullanım için ekonomik ve çevik. Düşük yakıt tüketimi, kolay park imkanı. Günlük işleriniz ve kısa seyahatler için ideal tercih.' },
      { plate: '34 DTM 12', category: 'KONFOR', name: 'Volkswagen Passat', status: 'RENTED'   as const,
        year: 2021, fuelType: 'DİZEL',  transmission: 'OTOMATİK', seats: 5, dailyRate: TL(2700),
        description: 'Uzun yol konforu arayanlar için. Geniş iç hacim, güçlü dizel motor ve düşük tüketim. İş seyahatleri ve şehirlerarası yolculuklar için mükemmel.' },
      { plate: '06 EBN 45', category: 'EKONOMİK', name: 'Fiat Egea',         status: 'IDLE'     as const,
        year: 2023, fuelType: 'DİZEL',  transmission: 'MANUEL',   seats: 5, dailyRate: TL(1400),
        description: 'Türkiye\'nin en çok tercih edilen sedanı. Geniş bagaj, ekonomik dizel motor. Aile seyahatleri için uygun fiyatlı ve güvenilir seçenek.' },
      { plate: '35 FLR 88', category: 'KONFOR', name: 'Toyota Corolla',    status: 'RENTED'   as const,
        year: 2022, fuelType: 'HİBRİT', transmission: 'OTOMATİK', seats: 5, dailyRate: TL(2100),
        description: 'Hibrit motoruyla şehir içinde sınıfının en düşük yakıt tüketimi. Sessiz, konforlu ve Toyota güvencesiyle sorunsuz sürüş.' },
      { plate: '16 GKY 21', category: 'EKONOMİK', name: 'Hyundai i20',       status: 'IDLE'     as const,
        year: 2023, fuelType: 'BENZİN', transmission: 'OTOMATİK', seats: 5, dailyRate: TL(1500),
        description: 'Kompakt boyutlarına rağmen şaşırtıcı iç genişlik. Otomatik vites konforu, geri görüş kamerası ve zengin donanım.' },
      { plate: '41 HSV 63', category: 'KONFOR', name: 'Honda Civic',       status: 'SERVICE'  as const,
        year: 2021, fuelType: 'BENZİN', transmission: 'OTOMATİK', seats: 5, dailyRate: TL(2200),
        description: 'Sportif tasarım ve sürüş keyfi bir arada. Güçlü motor, hassas yol tutuş. Konforundan ödün vermek istemeyenler için.' },
      { plate: '34 IPT 09', category: 'PREMIUM', name: 'BMW 3.20i',         status: 'RENTED'   as const,
        year: 2022, fuelType: 'BENZİN', transmission: 'OTOMATİK', seats: 5, dailyRate: TL(4600),
        description: 'Prestij ve performansın buluşma noktası. Deri döşeme, sunroof ve tam donanım. Özel günleriniz ve önemli iş görüşmeleriniz için.' },
      { plate: '07 JNK 77', category: 'PREMIUM', name: 'Mercedes C180',     status: 'IDLE'     as const,
        year: 2023, fuelType: 'BENZİN', transmission: 'OTOMATİK', seats: 5, dailyRate: TL(4900),
        description: 'Filomuzun amiral gemisi. Mercedes konforu, en yeni güvenlik teknolojileri ve göz alıcı tasarım. VIP transferler ve özel organizasyonlar için.' },
      { plate: '34 KLM 15', category: 'EKONOMİK', name: 'Peugeot 301',       status: 'IDLE'     as const,
        year: 2022, fuelType: 'DİZEL',  transmission: 'MANUEL',   seats: 5, dailyRate: TL(1550),
        description: 'Geniş bagajı ve ekonomik dizel motoruyla pratik bir sedan. Uygun bütçeyle konforlu ulaşım arayanlar için.' },
      { plate: '06 LOP 34', category: 'KONFOR', name: 'Skoda Octavia',     status: 'SERVICE'  as const,
        year: 2021, fuelType: 'DİZEL',  transmission: 'OTOMATİK', seats: 5, dailyRate: TL(2300),
        description: 'Sınıfının en geniş bagaj hacmi. DSG otomatik şanzıman, uzun yolda düşük tüketim. Aileler ve bol bagajlı seyahatler için biçilmiş kaftan.' },
      { plate: '34 MRS 50', category: 'PREMIUM', name: 'Audi A3',           status: 'RESERVED' as const,
        year: 2022, fuelType: 'BENZİN', transmission: 'OTOMATİK', seats: 5, dailyRate: TL(2900),
        description: 'Kompakt premium deneyimi. Kaliteli iç mekan, dijital gösterge paneli ve keyifli sürüş dinamikleri.' },
      { plate: '35 NCT 66', category: 'SUV', name: 'Dacia Duster',      status: 'IDLE' as const, isConsignment: true,
        year: 2023, fuelType: 'DİZEL',  transmission: 'MANUEL',   seats: 5, dailyRate: TL(2250),
        description: 'Yüksek sürüş pozisyonu ve SUV pratikliği. Şehir dışı yollar ve doğa gezileri için dayanıklı, ekonomik tercih.' },
    ];

    const vehicles = [];
    for (const data of vehicleData) {
      const vehicle = await prisma.vehicle.create({ data });
      vehicles.push(vehicle);
    }
    console.log(`🚗 Created ${vehicles.length} vehicles`);
    const [clio, passat, egea, corolla, i20, civic, bmw, c180, p301, octavia, a3, duster] = vehicles;

    // ---------------------------------------------------------------------
    // 3) Customers
    // ---------------------------------------------------------------------
    const customerData = [
      { fullName: 'Ahmet Yılmaz',     phone: '+90 532 111 22 33' },
      { fullName: 'Mehmet Demir',     phone: '+90 533 222 33 44' },
      { fullName: 'Ayşe Kaya',        phone: '+90 534 333 44 55' },
      { fullName: 'Fatma Şahin',      phone: '+90 535 444 55 66' },
      { fullName: 'Mustafa Çelik',    phone: '+90 536 555 66 77' },
      { fullName: 'Emine Yıldız',     phone: '+90 537 666 77 88' },
      { fullName: 'Hüseyin Aydın',    phone: '+90 538 777 88 99' },
      { fullName: 'Zeynep Arslan',    phone: '+90 539 888 99 00' },
      { fullName: 'Ali Doğan',        phone: '+90 530 123 45 67' },
      { fullName: 'Elif Kılıç',       phone: '+90 531 234 56 78' },
      { fullName: 'İbrahim Aslan',    phone: '+90 542 345 67 89' },
      { fullName: 'Hatice Çetin',     phone: '+90 543 456 78 90' },
      { fullName: 'Hasan Kara',       phone: '+90 544 567 89 01' },
      { fullName: 'Merve Koç',        phone: '+90 545 678 90 12' },
      { fullName: 'Osman Kurt',       phone: '+90 546 789 01 23' },
      { fullName: 'Büşra Özdemir',    phone: '+90 547 890 12 34' },
    ];

    const customers = [];
    for (const data of customerData) {
      customers.push(await prisma.customer.create({ data }));
    }
    console.log(`👥 Created ${customers.length} customers`);
    const [ahmet, mehmet, ayse, fatma, mustafa, emine, huseyin, zeynep, ali, elif, ibrahim, hatice, hasan, merve, osman, busra] = customers;

    // ---------------------------------------------------------------------
    // 4) Rentals + their payments
    // ---------------------------------------------------------------------
    const now = new Date();

    interface RentalSeed {
      vehicle: typeof vehicles[number];
      customer: typeof customers[number];
      startOffsetDays: number; // days ago
      days: number;
      dailyPriceTL: number;
      kmDiffTL?: number;
      cleaningTL?: number;
      hgsTL?: number;
      damageTL?: number;
      fuelTL?: number;
      upfrontTL?: number;
      status: 'ACTIVE' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';
      rentalType?: 'NEW' | 'EXTENSION';
      note?: string;
      payments?: { amountTL: number; method: 'CASH' | 'TRANSFER' | 'CARD'; afterStartDays: number }[];
      deleted?: boolean;
    }

    const rentalSeeds: RentalSeed[] = [
      { vehicle: clio,    customer: ahmet,   startOffsetDays: 200, days: 5,  dailyPriceTL: 1450, cleaningTL: 100,
        status: 'COMPLETED', payments: [{ amountTL: 5 * 1450 + 100, method: 'CASH', afterStartDays: 0 }] },

      { vehicle: passat,  customer: mehmet,  startOffsetDays: 185, days: 10, dailyPriceTL: 2700, damageTL: 1500,
        status: 'COMPLETED',
        payments: [
          { amountTL: 10000, method: 'CASH', afterStartDays: 0 },
          { amountTL: 10 * 2700 + 1500 - 10000, method: 'TRANSFER', afterStartDays: 10 },
        ] },

      { vehicle: egea,    customer: ayse,    startOffsetDays: 170, days: 4,  dailyPriceTL: 1400,
        status: 'COMPLETED', upfrontTL: 4 * 1400 },

      { vehicle: corolla, customer: fatma,   startOffsetDays: 155, days: 7,  dailyPriceTL: 2100, hgsTL: 180, fuelTL: 250,
        status: 'COMPLETED', upfrontTL: 10000, note: 'Bakiye bir sonraki kirada mahsup edilecek' },

      { vehicle: i20,     customer: mustafa, startOffsetDays: 140, days: 3,  dailyPriceTL: 1500,
        status: 'COMPLETED', upfrontTL: 3 * 1500 },

      { vehicle: civic,   customer: emine,   startOffsetDays: 130, days: 6,  dailyPriceTL: 2200, damageTL: 2000, fuelTL: 300,
        status: 'COMPLETED', payments: [{ amountTL: 8000, method: 'CARD', afterStartDays: 6 }],
        note: 'Sağ ön çamurluk hasarı - kalan tutar takipte' },

      { vehicle: bmw,     customer: huseyin, startOffsetDays: 115, days: 3,  dailyPriceTL: 4600,
        status: 'COMPLETED', upfrontTL: 3 * 4600 },

      { vehicle: c180,    customer: zeynep,  startOffsetDays: 100, days: 5,  dailyPriceTL: 4900, cleaningTL: 150,
        status: 'RETURNED', payments: [{ amountTL: 5 * 4900 + 150, method: 'TRANSFER', afterStartDays: 5 }] },

      { vehicle: p301,    customer: ali,     startOffsetDays: 90,  days: 4,  dailyPriceTL: 1550,
        status: 'COMPLETED', upfrontTL: 4 * 1550 },

      { vehicle: octavia, customer: elif,    startOffsetDays: 75,  days: 8,  dailyPriceTL: 2300, kmDiffTL: 400, hgsTL: 120,
        status: 'RETURNED', payments: [{ amountTL: 12000, method: 'CASH', afterStartDays: 8 }],
        note: 'Km farkı faturaya yansıtıldı' },

      { vehicle: a3,      customer: ibrahim, startOffsetDays: 60,  days: 5,  dailyPriceTL: 2900,
        status: 'COMPLETED', upfrontTL: 5 * 2900 },

      { vehicle: duster,  customer: hatice,  startOffsetDays: 45,  days: 6,  dailyPriceTL: 2250,
        status: 'COMPLETED', upfrontTL: 6 * 2250, note: 'Konsinye araç - aylık hesap kesimi yapıldı' },

      { vehicle: clio,    customer: hasan,   startOffsetDays: 30,  days: 4,  dailyPriceTL: 1450,
        status: 'COMPLETED', upfrontTL: 4 * 1450 },

      { vehicle: egea,    customer: merve,   startOffsetDays: 20,  days: 1,  dailyPriceTL: 300,
        status: 'CANCELLED', upfrontTL: 300, note: 'Rezervasyon iptal edildi - kapora iade edilmedi' },

      { vehicle: passat,  customer: osman,   startOffsetDays: 10,  days: 12, dailyPriceTL: 2700, kmDiffTL: 350,
        status: 'ACTIVE', rentalType: 'EXTENSION', note: 'Müşteri talebiyle 2 gün uzatıldı',
        payments: [{ amountTL: 15000, method: 'TRANSFER', afterStartDays: 1 }] },

      { vehicle: corolla, customer: busra,   startOffsetDays: 4,   days: 6,  dailyPriceTL: 2100,
        status: 'ACTIVE', upfrontTL: 8000, payments: [{ amountTL: 4000, method: 'CARD', afterStartDays: 1 }] },

      { vehicle: bmw,     customer: ahmet,   startOffsetDays: 2,   days: 3,  dailyPriceTL: 4600,
        status: 'ACTIVE', upfrontTL: 5000 },

      // Soft-deleted rental — demonstrates the "silinen kiralamalar" history the vehicle
      // income report still accounts for; hidden from all normal list views.
      { vehicle: clio,    customer: fatma,   startOffsetDays: 50,  days: 3,  dailyPriceTL: 1450,
        status: 'CANCELLED', upfrontTL: 3 * 1450, deleted: true,
        note: 'Yanlışlıkla oluşturuldu, iptal edilip silindi' },
    ];

    let createdRentals = 0;
    let createdPayments = 0;

    for (const seedItem of rentalSeeds) {
      const startDate = addDays(now, -seedItem.startOffsetDays);
      const endDate = addDays(startDate, seedItem.days);
      const paymentsKurus = (seedItem.payments ?? []).map(p => ({ amount: TL(p.amountTL) }));

      const { totalDue, balance } = calculateRentalAmounts(
        {
          days: seedItem.days,
          dailyPrice: TL(seedItem.dailyPriceTL),
          kmDiff: TL(seedItem.kmDiffTL ?? 0),
          cleaning: TL(seedItem.cleaningTL ?? 0),
          hgs: TL(seedItem.hgsTL ?? 0),
          damage: TL(seedItem.damageTL ?? 0),
          fuel: TL(seedItem.fuelTL ?? 0),
          upfront: TL(seedItem.upfrontTL ?? 0),
        },
        paymentsKurus
      );

      const rental = await prisma.rental.create({
        data: {
          vehicleId: seedItem.vehicle.id,
          customerId: seedItem.customer.id,
          rentalType: seedItem.rentalType ?? 'NEW',
          startDate,
          endDate,
          days: seedItem.days,
          dailyPrice: TL(seedItem.dailyPriceTL),
          kmDiff: TL(seedItem.kmDiffTL ?? 0),
          cleaning: TL(seedItem.cleaningTL ?? 0),
          hgs: TL(seedItem.hgsTL ?? 0),
          damage: TL(seedItem.damageTL ?? 0),
          fuel: TL(seedItem.fuelTL ?? 0),
          totalDue,
          upfront: TL(seedItem.upfrontTL ?? 0),
          balance,
          status: seedItem.status,
          note: seedItem.note,
          deleted: seedItem.deleted ?? false,
          deletedAt: seedItem.deleted ? addDays(startDate, seedItem.days + 1) : null,
          completedAt: seedItem.status === 'COMPLETED' ? endDate : null,
        }
      });
      createdRentals++;

      for (const p of seedItem.payments ?? []) {
        await prisma.payment.create({
          data: {
            rentalId: rental.id,
            amount: TL(p.amountTL),
            paidAt: addDays(startDate, p.afterStartDays),
            method: p.method,
          }
        });
        createdPayments++;
      }
    }
    console.log(`📋 Created ${createdRentals} rentals with ${createdPayments} payments`);

    // ---------------------------------------------------------------------
    // 5) Reservations
    // ---------------------------------------------------------------------
    interface ReservationSeed {
      customer: typeof merve;
      vehicle: typeof a3;
      offsetDays: number;
      time: string;
      duration: number;
      status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
      note: string;
      source?: 'WEB' | 'ADMIN' | 'PHONE';
      code?: string;
      pickupLocation?: string;
    }

    const reservationSeeds: ReservationSeed[] = [
      { customer: merve,   vehicle: a3,      offsetDays: -5,  time: '10:00', duration: 4, status: 'PENDING' as const,
        note: 'Web sitesi rezervasyon talebi • Havalimanından teslim alınacak',
        source: 'WEB', code: 'SS-DEMO01', pickupLocation: 'İstanbul Havalimanı' },
      { customer: ibrahim, vehicle: egea,    offsetDays: -10, time: '14:30', duration: 3, status: 'CONFIRMED' as const,
        note: 'Kapora alındı' },
      { customer: hatice,  vehicle: i20,     offsetDays: 15,  time: '09:00', duration: 2, status: 'COMPLETED' as const,
        note: '' },
      { customer: osman,   vehicle: p301,    offsetDays: 8,   time: '16:00', duration: 5, status: 'CANCELLED' as const,
        note: 'Müşteri iptal etti', source: 'PHONE' },
    ];

    for (const r of reservationSeeds) {
      await prisma.reservation.create({
        data: {
          customerId: r.customer.id,
          vehicleId: r.vehicle.id,
          customerName: r.customer.fullName,
          licensePlate: r.vehicle.plate,
          reservationDate: addDays(now, -r.offsetDays),
          reservationTime: r.time,
          rentalDuration: r.duration,
          note: r.note,
          status: r.status,
          source: r.source ?? 'ADMIN',
          reservationCode: r.code ?? null,
          pickupLocation: r.pickupLocation ?? null,
          quotedAmount: r.vehicle.dailyRate != null ? r.vehicle.dailyRate * r.duration : null,
          termsAcceptedAt: r.source === 'WEB' ? addDays(now, -r.offsetDays - 1) : null,
        }
      });
    }
    console.log(`📅 Created ${reservationSeeds.length} reservations`);

    // ---------------------------------------------------------------------
    // 6) Vehicle expenses
    // ---------------------------------------------------------------------
    const expenseSeeds = [
      { vehicle: civic,   offsetDays: 5,   type: 'ARIZA',       location: 'Bosch Car Service - Maltepe',      amount: 3200,   desc: 'Motor arıza tespiti ve onarımı' },
      { vehicle: civic,   offsetDays: 3,   type: 'YAĞ BAKIM',   location: 'Bosch Car Service - Maltepe',      amount: 850,    desc: 'Periyodik yağ ve filtre bakımı' },
      { vehicle: octavia, offsetDays: 60,  type: 'ŞANZUMAN',    location: 'Oto Şanzıman Ustası - Kartal',     amount: 6500,   desc: 'Şanzıman revizyonu' },
      { vehicle: octavia, offsetDays: 58,  type: 'FREN',        location: 'Merkez Oto Bakım - Pendik',        amount: 1450,   desc: 'Ön fren balata ve disk değişimi' },
      { vehicle: passat,  offsetDays: 90,  type: 'LASTİK',      location: 'Yılmaz Lastik - Kadıköy',          amount: 7200,   desc: '4 adet kış lastiği' },
      { vehicle: corolla, offsetDays: 80,  type: 'AKÜ',         location: 'Aydın Akü - Kartal',               amount: 2100,   desc: 'Akü değişimi' },
      { vehicle: bmw,     offsetDays: 70,  type: 'GENEL BAKIM', location: 'BMW Yetkili Servis - Ataşehir',    amount: 9800,   desc: '60.000 km periyodik bakım' },
      { vehicle: c180,    offsetDays: 110, type: 'KLİMA',       location: 'Star Klima Servisi - Şişli',       amount: 1650,   desc: 'Klima gazı dolumu ve bakımı' },
      { vehicle: clio,    offsetDays: 130, type: 'ELEKTRİK',    location: 'Özkan Oto Elektrik - Ümraniye',    amount: 980,    desc: 'Far ve sinyal sistemi onarımı' },
      { vehicle: p301,    offsetDays: 150, type: 'DÖŞEME',      location: 'Anadolu Döşeme - Kadıköy',         amount: 1200,   desc: 'Ön koltuk döşeme yenileme' },
      { vehicle: egea,    offsetDays: 170, type: 'SİGORTA',     location: 'Güven Sigorta - Kadıköy',          amount: 4300,   desc: 'Yıllık trafik sigortası yenileme' },
      { vehicle: i20,     offsetDays: 175, type: 'KASKO',       location: 'Anadolu Sigorta - Şişli',          amount: 6100,   desc: 'Yıllık kasko poliçesi' },
      { vehicle: a3,      offsetDays: 20,  type: 'GENEL BAKIM', location: 'Audi Yetkili Servis - Maslak',     amount: 5400,   desc: '30.000 km periyodik bakım' },
      { vehicle: duster,  offsetDays: 40,  type: 'LASTİK',      location: 'Yılmaz Lastik - Kadıköy',          amount: 5800,   desc: '4 adet yaz lastiği' },
      { vehicle: octavia, offsetDays: 15,  type: 'DİĞER',       location: 'Oto Yıkama Merkezi - Pendik',      amount: 350,    desc: 'Detaylı iç-dış temizlik' },
      { vehicle: egea,    offsetDays: 200, type: 'ARIZA',       location: 'Fiat Yetkili Servis - Kadıköy',    amount: 2750,   desc: 'Klima kompresörü arızası giderildi' },
    ];

    for (const e of expenseSeeds) {
      await prisma.vehicleExpense.create({
        data: {
          date: addDays(now, -e.offsetDays),
          vehicleId: e.vehicle.id,
          expenseType: e.type,
          location: e.location,
          amount: e.amount,
          description: e.desc,
        }
      });
    }
    console.log(`🧾 Created ${expenseSeeds.length} vehicle expenses`);

    // ---------------------------------------------------------------------
    // 7) Notes (Excel-style notepad)
    // ---------------------------------------------------------------------
    const noteSeeds = [
      'Ayşe Kaya 25 Temmuz\'da aracı iade edecek, hatırlat.',
      '34 IPT 09 BMW - lastik değişimi Ağustos başında yapılacak.',
      'Hasan Kara ödeme planını taksitlere böldü, takip et.',
      'Yeni araç alımı için Renault bayisiyle görüşüldü, teklif bekleniyor.',
      'Sigorta yenileme tarihleri kontrol edilecek - tüm filo.',
      'Osman Kurt\'un kirası 2 gün uzatıldı, sözleşme güncellendi.',
      'Konsinye Duster için aylık hesap kesimi her ayın 1\'inde yapılıyor.',
    ];

    for (let i = 0; i < noteSeeds.length; i++) {
      await prisma.note.create({ data: { rowIndex: i, content: noteSeeds[i] } });
    }
    console.log(`📝 Created ${noteSeeds.length} notes`);

    console.log('\n✅ Database seed completed successfully!');
    console.log('📝 Login credentials:');
    console.log('   Email:    admin@arackiralama.com');
    console.log('   Password: admin123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
