const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Available models:');
    
    // Test direct access to models
    console.log('- user:', !!prisma.user);
    console.log('- vehicle:', !!prisma.vehicle);
    console.log('- customer:', !!prisma.customer);
    console.log('- rental:', !!prisma.rental);
    console.log('- payment:', !!prisma.payment);
    console.log('- consignmentRental:', !!prisma.consignmentRental);
    console.log('- consignmentDeduction:', !!prisma.consignmentDeduction);
    console.log('- externalPayment:', !!prisma.externalPayment);
    
    // Test a simple query
    const vehicles = await prisma.vehicle.findMany({ take: 1 });
    console.log('Vehicle query test successful:', vehicles.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
