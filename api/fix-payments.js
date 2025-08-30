const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPayments() {
  try {
    console.log('🔍 Checking for inflated payments (> 100000 kuruş = 1000 TL)...');
    
    // 100000 kuruş (1000 TL) üzeri ödemeleri bul - bunlar büyük ihtimalle hatalı
    const inflatedPayments = await prisma.payment.findMany({
      where: {
        amount: {
          gt: 100000 // 1000 TL üzeri şüpheli
        }
      },
      include: {
        rental: {
          include: {
            customer: true,
            vehicle: true
          }
        }
      }
    });

    console.log(`Found ${inflatedPayments.length} potentially inflated payments:`);
    
    inflatedPayments.forEach(payment => {
      const currentTL = payment.amount / 100;
      const correctedTL = payment.amount / 10000; // 100 kat düşür
      console.log(`Payment ID: ${payment.id.substring(0, 8)}... - Current: ${currentTL} TL -> Should be: ${correctedTL} TL`);
      console.log(`  Rental: ${payment.rental.vehicle.plate} - ${payment.rental.customer?.name || 'No customer'}`);
    });

    if (inflatedPayments.length === 0) {
      console.log('✅ No inflated payments found!');
      return;
    }

    console.log('\n🚨 WARNING: This will divide all payments above 1000 TL by 100!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🔧 Fixing payments...');
    
    // Batch update - tüm büyük ödemeleri 100'e böl
    const updateResult = await prisma.payment.updateMany({
      where: {
        amount: {
          gt: 100000 // 1000 TL üzeri
        }
      },
      data: {
        amount: {
          divide: 100 // Prisma doesn't support divide, we'll do it manually
        }
      }
    });

    console.log('❌ Prisma doesn\'t support divide operation in updateMany.');
    console.log('Fixing payments one by one...');

    // Manuel olarak tek tek düzelt
    for (const payment of inflatedPayments) {
      const correctedAmount = Math.round(payment.amount / 100);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { amount: correctedAmount }
      });
      
      console.log(`✅ Fixed payment ${payment.id.substring(0, 8)}... : ${payment.amount/100} TL -> ${correctedAmount/100} TL`);
    }

    console.log('\n🔧 Recalculating rental balances...');
    
    // Etkilenen rental'ların balance'larını yeniden hesapla
    const affectedRentalIds = [...new Set(inflatedPayments.map(p => p.rentalId))];
    
    for (const rentalId of affectedRentalIds) {
      const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
        include: { payments: true }
      });

      if (rental) {
        const totalPayments = rental.payments.reduce((sum, p) => sum + p.amount, 0);
        const manualPayments = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        const newBalance = rental.totalDue - manualPayments - totalPayments;

        await prisma.rental.update({
          where: { id: rentalId },
          data: { balance: Math.max(0, newBalance) } // Negatif balance'ı önle
        });

        console.log(`✅ Recalculated balance for rental ${rentalId.substring(0, 8)}... : ${newBalance/100} TL`);
      }
    }

    console.log('\n✅ All payments and balances fixed!');

    // Sonuçları kontrol et
    console.log('\n📊 Verification:');
    const fixedPayments = await prisma.payment.findMany({
      where: {
        id: { in: inflatedPayments.map(p => p.id) }
      }
    });

    fixedPayments.forEach(payment => {
      console.log(`Payment ${payment.id.substring(0, 8)}... : ${payment.amount/100} TL`);
    });

  } catch (error) {
    console.error('❌ Error fixing payments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPayments();
