const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetData() {
  try {
    console.log('🔄 Veritabanı içeriği temizleniyor (users tablosu hariç)...');
    
    // Delete in correct order (considering foreign key constraints)
    
    // First delete payments (if exists)
    try {
      await prisma.payment.deleteMany();
      console.log('✅ Tüm ödemeler silindi');
    } catch (e) {
      console.log('ℹ️  Payment tablosu bulunamadı veya boş');
    }
    
    await prisma.rental.deleteMany();
    console.log('✅ Tüm kiralamalar silindi');
    
    await prisma.customer.deleteMany();
    console.log('✅ Tüm müşteriler silindi');
    
    await prisma.vehicle.deleteMany();
    console.log('✅ Tüm araçlar silindi');
    
    console.log('🎉 Veritabanı başarıyla temizlendi! (users tablosu korundu)');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetData();
