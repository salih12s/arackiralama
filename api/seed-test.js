const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Test verileri ekleniyor...');

    // Test müşterileri
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          fullName: 'Ahmet Yılmaz',
          phone: '0532-123-4567',
          tcNumber: '12345678901',
          address: 'İstanbul, Türkiye'
        }
      }),
      prisma.customer.create({
        data: {
          fullName: 'Mehmet Demir',
          phone: '0533-123-4567',
          tcNumber: '12345678902',
          address: 'Ankara, Türkiye'
        }
      }),
      prisma.customer.create({
        data: {
          fullName: 'Fatma Kaya',
          phone: '0534-123-4567',
          tcNumber: '12345678903',
          address: 'İzmir, Türkiye'
        }
      }),
      prisma.customer.create({
        data: {
          fullName: 'Ali Özkan',
          phone: '0535-123-4567',
          tcNumber: '12345678904',
          address: 'Bursa, Türkiye'
        }
      }),
      prisma.customer.create({
        data: {
          fullName: 'Ayşe Şahin',
          phone: '0536-123-4567',
          tcNumber: '12345678905',
          address: 'Antalya, Türkiye'
        }
      })
    ]);

    // Test araçları
    const vehicles = await Promise.all([
      prisma.vehicle.create({
        data: {
          plate: '34ABC123',
          brand: 'Volkswagen',
          model: 'Passat',
          year: 2022,
          color: 'Beyaz',
          status: 'IDLE'
        }
      }),
      prisma.vehicle.create({
        data: {
          plate: '35DEF456',
          brand: 'BMW',
          model: 'X3',
          year: 2023,
          color: 'Siyah',
          status: 'IDLE'
        }
      }),
      prisma.vehicle.create({
        data: {
          plate: '06GHI789',
          brand: 'Mercedes',
          model: 'C200',
          year: 2023,
          color: 'Gri',
          status: 'IDLE'
        }
      }),
      prisma.vehicle.create({
        data: {
          plate: '16JKL012',
          brand: 'Audi',
          model: 'A4',
          year: 2022,
          color: 'Mavi',
          status: 'IDLE'
        }
      }),
      prisma.vehicle.create({
        data: {
          plate: '07MNO345',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2021,
          color: 'Kırmızı',
          status: 'IDLE'
        }
      })
    ]);

    // Test kiralamaları (Eylül 2025 için)
    const rentals = [];
    
    // 1. Passat - En çok kazanan (tam ay + yüksek KM farkı)
    rentals.push(await prisma.rental.create({
      data: {
        vehicleId: vehicles[0].id,
        customerId: customers[0].id,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        days: 30,
        dailyRate: 50000, // 500 TL/gün
        kmStart: 10000,
        kmEnd: 12000,
        kmRate: 300,
        kmDifference: 600000, // 2000 km * 300 = 600 TL
        cleaningFee: 10000,
        hgsFee: 5000,
        totalCost: 2115000, // 30*500 + 600 + 100 + 50 = 2115 TL
        balance: 1115000, // 1115 TL borç
        pay1: 100000, // 100 TL ödendi
        pay2: 0,
        pay3: 0,
        pay4: 0
      }
    }));

    // 2. BMW - İkinci en çok kazanan (cross-month)
    rentals.push(await prisma.rental.create({
      data: {
        vehicleId: vehicles[1].id,
        customerId: customers[1].id,
        startDate: new Date('2025-09-15'),
        endDate: new Date('2025-10-15'),
        days: 31,
        dailyRate: 70000, // 700 TL/gün
        kmStart: 5000,
        kmEnd: 6000,
        kmRate: 300,
        kmDifference: 300000, // 1000 km * 300 = 300 TL
        cleaningFee: 15000,
        hgsFee: 8000,
        totalCost: 2493000, // 31*700 + 300 + 150 + 80 = 2493 TL
        balance: 0, // Tam ödendi
        pay1: 150000, // 1500 TL ödendi
        pay2: 100000,
        pay3: 93000,
        pay4: 0
      }
    }));

    // 3. Mercedes - Orta düzey kazanç
    rentals.push(await prisma.rental.create({
      data: {
        vehicleId: vehicles[2].id,
        customerId: customers[2].id,
        startDate: new Date('2025-09-10'),
        endDate: new Date('2025-09-25'),
        days: 16,
        dailyRate: 60000, // 600 TL/gün
        kmStart: 8000,
        kmEnd: 8500,
        kmRate: 300,
        kmDifference: 150000, // 500 km * 300 = 150 TL
        cleaningFee: 12000,
        hgsFee: 6000,
        totalCost: 1128000, // 16*600 + 150 + 120 + 60 = 1128 TL
        balance: 528000, // 528 TL borç
        pay1: 60000, // 600 TL ödendi
        pay2: 0,
        pay3: 0,
        pay4: 0
      }
    }));

    // 4. Audi - Düşük kazanç (kısa süre)
    rentals.push(await prisma.rental.create({
      data: {
        vehicleId: vehicles[3].id,
        customerId: customers[3].id,
        startDate: new Date('2025-09-25'),
        endDate: new Date('2025-09-28'),
        days: 4,
        dailyRate: 55000, // 550 TL/gün
        kmStart: 15000,
        kmEnd: 15100,
        kmRate: 300,
        kmDifference: 30000, // 100 km * 300 = 30 TL
        cleaningFee: 10000,
        hgsFee: 5000,
        totalCost: 265000, // 4*550 + 30 + 100 + 50 = 265 TL
        balance: 265000, // Hiç ödeme yapılmamış
        pay1: 0,
        pay2: 0,
        pay3: 0,
        pay4: 0
      }
    }));

    // 5. Toyota - En düşük kazanç (çok kısa süre)
    rentals.push(await prisma.rental.create({
      data: {
        vehicleId: vehicles[4].id,
        customerId: customers[4].id,
        startDate: new Date('2025-09-28'),
        endDate: new Date('2025-09-30'),
        days: 3,
        dailyRate: 40000, // 400 TL/gün
        kmStart: 20000,
        kmEnd: 20050,
        kmRate: 300,
        kmDifference: 15000, // 50 km * 300 = 15 TL
        cleaningFee: 8000,
        hgsFee: 4000,
        totalCost: 147000, // 3*400 + 15 + 80 + 40 = 147 TL
        balance: 0, // Tam ödendi
        pay1: 147000,
        pay2: 0,
        pay3: 0,
        pay4: 0
      }
    }));

    console.log('✅ Test verileri başarıyla eklendi!');
    console.log(`📊 Oluşturuldu:`);
    console.log(`   - ${customers.length} müşteri`);
    console.log(`   - ${vehicles.length} araç`);
    console.log(`   - ${rentals.length} kiralama`);

    // Araç durumlarını güncelle
    await prisma.vehicle.update({
      where: { id: vehicles[0].id },
      data: { status: 'RENTED' }
    });
    await prisma.vehicle.update({
      where: { id: vehicles[1].id },
      data: { status: 'RENTED' }
    });
    await prisma.vehicle.update({
      where: { id: vehicles[2].id },
      data: { status: 'IDLE' }
    });

    console.log('✅ Araç durumları güncellendi!');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
