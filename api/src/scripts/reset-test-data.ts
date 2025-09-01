import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetTestData() {
  try {
    console.log('🧹 Verileri sıfırlıyor (users hariç)...');

    // Foreign key kısıtlamaları nedeniyle doğru sırayla silme
    
    // 1. Payments tablosunu temizle
    await prisma.payment.deleteMany({});
    console.log('✅ Payments temizlendi');

    // 2. Rentals tablosunu temizle  
    await prisma.rental.deleteMany({});
    console.log('✅ Rentals temizlendi');

    // 3. Customers tablosunu temizle
    await prisma.customer.deleteMany({});
    console.log('✅ Customers temizlendi');

    // 4. Vehicles tablosunu temizle
    await prisma.vehicle.deleteMany({});
    console.log('✅ Vehicles temizlendi');

    console.log('🎉 Tüm veriler sıfırlandı! Users tablosu korundu.');
    console.log('✅ Database temiz, test için hazır!');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetTestData();
