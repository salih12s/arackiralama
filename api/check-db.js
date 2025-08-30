const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== RENTALS ===');
    const rentals = await prisma.rental.findMany({
      include: {
        payments: true,
        customer: true,
        vehicle: true,
      },
      take: 5
    });
    
    rentals.forEach(rental => {
      console.log(`\nRental ID: ${rental.id.substring(0, 8)}...`);
      console.log(`Customer: ${rental.customer.name}`);
      console.log(`Vehicle: ${rental.vehicle.plate}`);
      console.log(`Total Due: ${rental.totalDue} kuruş (${rental.totalDue/100} TL)`);
      console.log(`Manual Payments: upfront=${rental.upfront}, pay1=${rental.pay1}, pay2=${rental.pay2}, pay3=${rental.pay3}, pay4=${rental.pay4}`);
      console.log(`Balance: ${rental.balance} kuruş (${rental.balance/100} TL)`);
      console.log(`Payments Count: ${rental.payments.length}`);
      
      if (rental.payments.length > 0) {
        rental.payments.forEach((payment, idx) => {
          console.log(`  Payment ${idx+1}: ${payment.amount} kuruş (${payment.amount/100} TL) - ${payment.method}`);
        });
      }
    });

    console.log('\n=== PAYMENT SUMMARY ===');
    const payments = await prisma.payment.findMany({
      orderBy: { paidAt: 'desc' },
      take: 10
    });
    
    payments.forEach(payment => {
      console.log(`Payment: ${payment.amount} kuruş (${payment.amount/100} TL) - ${payment.method} - ${payment.paidAt.toISOString().split('T')[0]}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
