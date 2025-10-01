const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Database bağlantısı test ediliyor...');
    
    // Check if VehicleExpense table exists
    const vehicleExpenses = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_expenses'
      );
    `;
    
    console.log('VehicleExpense tablosu mevcut:', vehicleExpenses[0].exists);
    
    // Check if Note table exists  
    const notes = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notes'
      );
    `;
    
    console.log('Notes tablosu mevcut:', notes[0].exists);
    
    // List all tables
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('Tüm tablolar:');
    allTables.forEach(table => console.log('  -', table.table_name));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();