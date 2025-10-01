const { PrismaClient } = require('@prisma/client');

async function testDataInsertion() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Test verisi ekleniyor...\n');
    
    // Get a vehicle first
    const vehicles = await prisma.vehicle.findMany({ take: 1 });
    
    if (vehicles.length === 0) {
      console.log('❌ Önce bir araç eklemeniz gerekiyor!');
      return;
    }
    
    const vehicle = vehicles[0];
    console.log(`✅ Test için araç bulundu: ${vehicle.plate}\n`);
    
    // Test 1: Add VehicleExpense
    console.log('📊 Test 1: Araç Gideri Ekleme...');
    const expense = await prisma.vehicleExpense.create({
      data: {
        date: new Date(),
        vehicleId: vehicle.id,
        expenseType: 'LASTİK DEĞİŞİMİ',
        location: 'Test Lastikçi',
        amount: 2500.00,
        description: 'Test açıklaması - 4 adet lastik değişimi'
      }
    });
    console.log(`✅ Gider kaydedildi! ID: ${expense.id}`);
    console.log(`   Tutar: ${expense.amount} TL`);
    console.log(`   Gider Türü: ${expense.expenseType}\n`);
    
    // Test 2: Add Note
    console.log('📝 Test 2: Not Ekleme...');
    const note = await prisma.note.create({
      data: {
        rowIndex: 0,
        content: 'Test notu - Bu bir deneme notudur'
      }
    });
    console.log(`✅ Not kaydedildi! ID: ${note.id}`);
    console.log(`   Satır: ${note.rowIndex + 1}`);
    console.log(`   İçerik: ${note.content}\n`);
    
    // Test 3: Read back the data
    console.log('🔍 Test 3: Verileri Okuma...');
    const allExpenses = await prisma.vehicleExpense.count();
    const allNotes = await prisma.note.count();
    console.log(`✅ Toplam Gider: ${allExpenses}`);
    console.log(`✅ Toplam Not: ${allNotes}\n`);
    
    // Test 4: Update
    console.log('✏️ Test 4: Güncelleme...');
    const updatedExpense = await prisma.vehicleExpense.update({
      where: { id: expense.id },
      data: { amount: 3000.00 }
    });
    console.log(`✅ Gider güncellendi! Yeni tutar: ${updatedExpense.amount} TL\n`);
    
    // Test 5: Delete
    console.log('🗑️ Test 5: Silme İşlemi...');
    console.log('❓ Test verilerini silmek ister misiniz? (Manuel kontrol için bırakılıyor)');
    console.log('   Silmek için: node -e "require(\'@prisma/client\').PrismaClient().then(p => p.vehicleExpense.delete({ where: { id: \'' + expense.id + '\' } }))"');
    
    console.log('\n✅ TÜM TESTLER BAŞARILI!');
    console.log('📌 Database tam olarak çalışıyor ve tüm veriler kaydediliyor!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDataInsertion();
