const { PrismaClient } = require('@prisma/client');

async function cleanup() {
  const prisma = new PrismaClient();
  try {
    await prisma.vehicleExpense.deleteMany();
    await prisma.note.deleteMany();
    console.log('✅ Test verileri temizlendi');
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
