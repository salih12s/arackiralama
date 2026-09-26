import app from './app';
import { prisma } from './db/prisma';
import { initializeBackupScheduler } from './services/backupService';

// Set timezone
process.env.TZ = 'Europe/Istanbul';

const PORT = process.env.PORT || 3005;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.info('📦 Database connected successfully');

    // Start server
    const server = app.listen(PORT, () => {
      console.info(`🚀 Server running on port ${PORT}`);
      console.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.info(`🔒 CORS allowed origin: ${process.env.ALLOWED_ORIGIN || '(tanımsız)'}`);
    });

    // Initialize backup scheduler (uses BACKUP_FREQUENCY from .env or defaults to weekly)
    initializeBackupScheduler();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.info('HTTP server closed');
        prisma.$disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.info('HTTP server closed');
        prisma.$disconnect();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
