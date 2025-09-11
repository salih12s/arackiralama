const { PrismaClient } = require('@prisma/client');

async function checkRentals() {
  const prisma = new PrismaClient();
  
  try {
    const rentals = await prisma.rental.findMany({
      include: {
        vehicle: true,
        customer: true
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    console.log('\n📋 VERİTABANINDAKİ KIRALAMA VERİLERİ:');
    console.log('='.repeat(120));
    
    rentals.forEach((rental, index) => {
      console.log(`\n${index + 1}. KIRALAMA:`);
      console.log(`   ID: ${rental.id}`);
      console.log(`   Plaka: ${rental.vehicle.plate}`);
      console.log(`   Müşteri: ${rental.customer.fullName}`);
      console.log(`   Başlangıç: ${rental.startDate.toISOString().split('T')[0]} (${rental.startDate.toISOString()})`);
      console.log(`   Bitiş: ${rental.endDate.toISOString().split('T')[0]} (${rental.endDate.toISOString()})`);
      console.log(`   Gün Sayısı: ${rental.days}`);
      console.log(`   Günlük Ücret: ${rental.dailyPrice} kuruş`);
      console.log(`   KM Farkı: ${rental.kmDiff} kuruş`);
      console.log(`   Toplam Borç: ${rental.totalDue} kuruş`);
      console.log(`   Durum: ${rental.status}`);
      console.log(`   Silindi mi: ${rental.deleted}`);
      console.log('-'.repeat(80));
    });

    console.log(`\n📊 TOPLAM: ${rentals.length} kiralama bulundu\n`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRentals();