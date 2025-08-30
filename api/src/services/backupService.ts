import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';

const prisma = new PrismaClient();

export class BackupService {
  private backupDir: string;
  private maxBackups: number;

  constructor(backupDir: string = 'backups', maxBackups: number = 30) {
    this.backupDir = path.join(process.cwd(), backupDir);
    this.maxBackups = maxBackups;
    this.ensureBackupDir();
  }

  private async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Backup directory created: ${this.backupDir}`);
    }
  }

  async createBackup(): Promise<{ filename: string; size: number; recordCounts: Record<string, number> }> {
    try {
      console.log('🔄 Creating automated backup...');

      // Fetch all data from database
      const [users, vehicles, customers, rentals, payments] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          }
        }),
        prisma.vehicle.findMany({
          include: {
            _count: {
              select: { rentals: true }
            }
          }
        }),
        prisma.customer.findMany({
          include: {
            _count: {
              select: { rentals: true }
            }
          }
        }),
        prisma.rental.findMany({
          include: {
            vehicle: true,
            customer: true,
            payments: true,
          }
        }),
        prisma.payment.findMany({
          include: {
            rental: {
              include: {
                vehicle: true,
                customer: true,
              }
            }
          }
        }),
      ]);

      // Create backup object
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        type: 'automated',
        data: {
          users: users.length,
          vehicles: vehicles.length,
          customers: customers.length,
          rentals: rentals.length,
          payments: payments.length,
        },
        tables: {
          users,
          vehicles,
          customers,
          rentals,
          payments,
        }
      };

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-auto-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      // Write backup to file
      const backupContent = JSON.stringify(backup, null, 2);
      await fs.writeFile(filepath, backupContent);

      // Get file size
      const stats = await fs.stat(filepath);

      console.log('✅ Automated backup created successfully:', {
        filename,
        size: `${(stats.size / 1024).toFixed(1)} KB`,
        records: backup.data
      });

      return {
        filename,
        size: stats.size,
        recordCounts: backup.data,
      };

    } catch (error) {
      console.error('❌ Automated backup failed:', error);
      throw error;
    }
  }

  async cleanOldBackups(): Promise<number> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(async (file) => {
          const filepath = path.join(this.backupDir, file);
          const stats = await fs.stat(filepath);
          return {
            filename: file,
            filepath,
            created: stats.ctime,
          };
        });

      const backups = await Promise.all(backupFiles);
      
      // Sort by creation date, oldest first
      backups.sort((a, b) => a.created.getTime() - b.created.getTime());

      // Delete old backups if we have more than maxBackups
      let deletedCount = 0;
      if (backups.length > this.maxBackups) {
        const filesToDelete = backups.slice(0, backups.length - this.maxBackups);
        
        for (const backup of filesToDelete) {
          await fs.unlink(backup.filepath);
          deletedCount++;
          console.log(`🗑️ Deleted old backup: ${backup.filename}`);
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('❌ Failed to clean old backups:', error);
      return 0;
    }
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: string;
    newestBackup?: string;
  }> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
      
      if (backupFiles.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
        };
      }

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filepath = path.join(this.backupDir, file);
          const stats = await fs.stat(filepath);
          return {
            filename: file,
            size: stats.size,
            created: stats.ctime,
          };
        })
      );

      backups.sort((a, b) => a.created.getTime() - b.created.getTime());

      return {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
        oldestBackup: backups[0]?.filename,
        newestBackup: backups[backups.length - 1]?.filename,
      };

    } catch (error) {
      console.error('❌ Failed to get backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
      };
    }
  }

  // Schedule automatic backups
  startScheduledBackups(schedule: string = '0 2 * * *') { // Default: Daily at 2 AM
    console.log(`📅 Scheduling automatic backups with cron: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      try {
        console.log('🕐 Running scheduled backup...');
        await this.createBackup();
        await this.cleanOldBackups();
        
        const stats = await this.getBackupStats();
        console.log('📊 Backup stats after scheduled run:', stats);
        
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    }, {
      timezone: "Europe/Istanbul"
    });

    console.log('✅ Scheduled backups started');
  }

  // For weekly backups
  startWeeklyBackups() {
    // Every Sunday at 2 AM
    this.startScheduledBackups('0 2 * * 0');
  }

  // For monthly backups
  startMonthlyBackups() {
    // First day of every month at 2 AM
    this.startScheduledBackups('0 2 1 * *');
  }
}

// Create singleton instance
export const backupService = new BackupService(
  process.env.BACKUP_DIR || 'backups',
  parseInt(process.env.BACKUP_MAX_COUNT || '30')
);

// Export function to start automatic backups
export const initializeBackupScheduler = (frequency?: 'daily' | 'weekly' | 'monthly') => {
  const backupFrequency = frequency || (process.env.BACKUP_FREQUENCY as 'daily' | 'weekly' | 'monthly') || 'weekly';
  console.log(`🚀 Initializing ${backupFrequency} backup scheduler...`);
  
  switch (backupFrequency) {
    case 'daily':
      backupService.startScheduledBackups('0 2 * * *'); // Daily at 2 AM
      break;
    case 'weekly':
      backupService.startWeeklyBackups(); // Weekly on Sunday at 2 AM
      break;
    case 'monthly':
      backupService.startMonthlyBackups(); // Monthly on 1st at 2 AM
      break;
  }

  // Create initial backup stats
  setTimeout(async () => {
    const stats = await backupService.getBackupStats();
    console.log('📊 Current backup stats:', stats);
  }, 1000);
};
