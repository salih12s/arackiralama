const { PrismaClient } = require('@prisma/client');

async function testAllData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Database verilerini kontrol ediyorum...\n');
    
    // Check VehicleExpenses
    const vehicleExpenses = await prisma.vehicleExpense.findMany({
      include: {
        vehicle: {
          select: {
            plate: true,
            name: true
          }
        }
      }
    });
    
    console.log('📊 ARAÇ GİDERLERİ:');
    console.log(`   Toplam Kayıt: ${vehicleExpenses.length}`);
    if (vehicleExpenses.length > 0) {
      console.log('   Son 3 kayıt:');
      vehicleExpenses.slice(-3).forEach(expense => {
        console.log(`   - ${expense.vehicle.plate} | ${expense.expenseType} | ${expense.amount} TL`);
        console.log(`     Yer: ${expense.location}`);
        console.log(`     Açıklama: ${expense.description || 'Yok'}`);
        console.log('');
      });
    } else {
      console.log('   ❌ Henüz gider kaydı yok\n');
    }
    
    // Check Notes
    const notes = await prisma.note.findMany({
      orderBy: {
        rowIndex: 'asc'
      }
    });
    
    console.log('📝 NOTLAR:');
    console.log(`   Toplam Kayıt: ${notes.length}`);
    if (notes.length > 0) {
      console.log('   Kayıtlı notlar:');
      notes.forEach(note => {
        const preview = note.content.length > 50 
          ? note.content.substring(0, 50) + '...' 
          : note.content;
        console.log(`   Satır ${note.rowIndex + 1}: ${preview}`);
      });
    } else {
      console.log('   ❌ Henüz not kaydı yok');
    }
    
    console.log('\n✅ Tüm tablolar aktif ve çalışıyor!');
    console.log('\n📌 API Endpoint\'leri:');
    console.log('   • POST   /api/vehicle-expenses  (Gider Ekle)');
    console.log('   • GET    /api/vehicle-expenses  (Giderleri Listele)');
    console.log('   • PUT    /api/vehicle-expenses/:id  (Gider Güncelle)');
    console.log('   • DELETE /api/vehicle-expenses/:id  (Gider Sil)');
    console.log('');
    console.log('   • POST   /api/notes  (Not Ekle)');
    console.log('   • GET    /api/notes  (Notları Listele)');
    console.log('   • PUT    /api/notes/:id  (Not Güncelle)');
    console.log('   • DELETE /api/notes/:id  (Not Sil)');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAllData();
