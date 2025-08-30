import bcrypt from 'bcrypt';
import { prisma } from './db/prisma';
import { calculateRentalAmounts } from './services/rentalCalc';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@arackiralama.com' },
      update: {},
      create: {
        email: 'admin@arackiralama.com',
        passwordHash: hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log('👤 Admin user created:', adminUser.email);

    // Create sample vehicles
    const vehicleData = [
      { plate: '34 AKR 123', name: 'Renault Clio' },
      { plate: '06 BMW 456', name: 'BMW 3.20i' },
      { plate: '54 VW 789', name: 'Volkswagen Golf' },
      { plate: '35 MRZ 321', name: 'Mercedes C180' },
      { plate: '07 AUD 654', name: 'Audi A4' },
    ];

    const vehicles = [];
    for (const data of vehicleData) {
      const vehicle = await prisma.vehicle.upsert({
        where: { plate: data.plate },
        update: {},
        create: data
      });
      vehicles.push(vehicle);
    }

    console.log(`🚗 Created ${vehicles.length} vehicles`);

    // Create sample customers
    const customerData = [
      { fullName: 'Ahmet Yılmaz', phone: '+90 532 123 45 67' },
      { fullName: 'Fatma Demir', phone: '+90 533 987 65 43' },
      { fullName: 'Mehmet Kaya', phone: '+90 534 456 78 90' },
      { fullName: 'Ayşe Öz', phone: '+90 535 321 09 87' },
    ];

    const customers = [];
    for (const data of customerData) {
      const customer = await prisma.customer.create({
        data: data
      });
      customers.push(customer);
    }

    console.log(`👥 Created ${customers.length} customers`);

    // Create sample rentals
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const rentalData = [
      {
        vehicleId: vehicles[0].id,
        customerId: customers[0].id,
        startDate: yesterday,
        endDate: nextWeek,
        days: 8,
        dailyPrice: 15000, // 150 TL in kuruş
        kmDiff: 2500, // 25 TL
        cleaning: 1000, // 10 TL
        hgs: 500, // 5 TL
        upfront: 50000, // 500 TL peşin
        status: 'ACTIVE'
      },
      {
        vehicleId: vehicles[1].id,
        customerId: customers[1].id,
        startDate: lastWeek,
        endDate: yesterday,
        days: 6,
        dailyPrice: 20000, // 200 TL
        damage: 5000, // 50 TL kaza bedeli
        pay1: 100000, // 1000 TL 1. ödeme
        status: 'RETURNED'
      },
      {
        vehicleId: vehicles[2].id,
        customerId: customers[2].id,
        startDate: today,
        endDate: nextWeek,
        days: 7,
        dailyPrice: 12000, // 120 TL
        fuel: 3000, // 30 TL yakıt
        upfront: 20000, // 200 TL peşin
        status: 'ACTIVE'
      }
    ];

    const rentals = [];
    for (const data of rentalData) {
      const { totalDue, balance } = calculateRentalAmounts(data);
      
      const rental = await prisma.rental.create({
        data: {
          ...data,
          totalDue,
          balance,
          status: data.status as any, // Type assertion for enum
        }
      });

      // Update vehicle status based on rental
      await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: { 
          status: data.status === 'ACTIVE' ? 'RENTED' : 'IDLE'
        }
      });

      rentals.push(rental);
    }

    console.log(`📋 Created ${rentals.length} rentals`);

    // Create sample payments
    const paymentData = [
      {
        rentalId: rentals[1].id, // For the returned rental
        amount: 50000, // 500 TL
        paidAt: new Date(yesterday.getTime() - 2 * 24 * 60 * 60 * 1000),
        method: 'CASH'
      },
      {
        rentalId: rentals[2].id, // For current rental
        amount: 30000, // 300 TL
        paidAt: today,
        method: 'TRANSFER'
      }
    ];

    const payments = [];
    for (const data of paymentData) {
      const payment = await prisma.payment.create({
        data: {
          ...data,
          method: data.method as any, // Type assertion for enum
        }
      });

      // Recalculate rental balance
      const rental = await prisma.rental.findUnique({
        where: { id: data.rentalId },
        include: { payments: true }
      });

      if (rental) {
        const { balance } = calculateRentalAmounts(rental, rental.payments);
        await prisma.rental.update({
          where: { id: data.rentalId },
          data: { balance }
        });
      }

      payments.push(payment);
    }

    console.log(`💰 Created ${payments.length} payments`);

    console.log('✅ Database seed completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Email: admin@arackiralama.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
