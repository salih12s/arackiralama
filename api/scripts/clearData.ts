import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllDataExceptUsers() {
  try {
    console.log('🧹 Veritabanı temizleniyor (User tablosu hariç)...');

    // Önce foreign key constraints nedeniyle belirli sırayla silmek gerekiyor
    
    // 1. Önce payments tablosunu temizle
    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`✅ ${deletedPayments.count} payment kaydı silindi`);

    // 2. Sonra rentals tablosunu temizle
    const deletedRentals = await prisma.rental.deleteMany({});
    console.log(`✅ ${deletedRentals.count} rental kaydı silindi`);

    // 3. Customers tablosunu temizle
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`✅ ${deletedCustomers.count} customer kaydı silindi`);

    // 4. Vehicles tablosunu temizle
    const deletedVehicles = await prisma.vehicle.deleteMany({});
    console.log(`✅ ${deletedVehicles.count} vehicle kaydı silindi`);

    // User tablosunu koruyoruz - SİLMİYORUZ!
    const userCount = await prisma.user.count();
    console.log(`ℹ️ User tablosunda ${userCount} kayıt korundu`);

    console.log('');
    console.log('🎉 Veritabanı temizlendi! Sadece user verileri korundu.');
    console.log('📊 Artık sistemi deploy için hazırlamaya başlayabilirsiniz.');
    
  } catch (error) {
    console.error('❌ Veri temizleme hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
clearAllDataExceptUsers();
