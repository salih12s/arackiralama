import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Create backup directory if it doesn't exist
const backupDir = path.join(process.cwd(), 'backups');
const ensureBackupDir = async () => {
  try {
    await fs.access(backupDir);
  } catch {
    await fs.mkdir(backupDir, { recursive: true });
  }
};

// Export all data as JSON backup
router.post('/export', authenticateToken, async (req, res) => {
  try {
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

    // Ensure backup directory exists
    await ensureBackupDir();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Write backup to file
    await fs.writeFile(filepath, JSON.stringify(backup, null, 2));

    // Return backup info and data
    res.json({
      success: true,
      message: 'Yedek başarıyla oluşturuldu',
      backup: {
        filename,
        timestamp: backup.timestamp,
        size: JSON.stringify(backup).length,
        recordCounts: backup.data,
      },
      downloadData: backup, // For immediate download
    });

  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Yedek oluşturulurken hata',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    });
  }
});

// Get backup history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
    
    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const filepath = path.join(backupDir, file);
        const stats = await fs.stat(filepath);
        
        try {
          const content = await fs.readFile(filepath, 'utf8');
          const backup = JSON.parse(content);
          
          return {
            filename: file,
            timestamp: backup.timestamp || stats.ctime.toISOString(),
            size: stats.size,
            recordCounts: backup.data || {},
            created: stats.ctime.toISOString(),
          };
        } catch {
          return {
            filename: file,
            timestamp: stats.ctime.toISOString(),
            size: stats.size,
            recordCounts: {},
            created: stats.ctime.toISOString(),
            error: 'Dosya okunamadı',
          };
        }
      })
    );

    // Sort by creation date, newest first
    backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    res.json({
      success: true,
      backups,
    });

  } catch (error) {
    console.error('❌ Failed to get backup history:', error);
    res.status(500).json({
      success: false,
      message: 'Yedek geçmişi alınamadı',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    });
  }
});

// Download specific backup file
router.get('/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz dosya adı',
      });
    }

    const filepath = path.join(backupDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Yedek dosyası bulunamadı',
      });
    }

    // Read and return file
    const content = await fs.readFile(filepath, 'utf8');
    JSON.parse(content); // bozuk yedek dosyası indirilmesin

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error('❌ Failed to download backup:', error);
    res.status(500).json({
      success: false,
      message: 'Yedek indirilemedi',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    });
  }
});

// Delete backup file
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz dosya adı',
      });
    }

    const filepath = path.join(backupDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Yedek dosyası bulunamadı',
      });
    }

    // Delete file
    await fs.unlink(filepath);

    res.json({
      success: true,
      message: 'Yedek dosyası silindi',
    });

  } catch (error) {
    console.error('❌ Failed to delete backup:', error);
    res.status(500).json({
      success: false,
      message: 'Yedek silinemedi',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    });
  }
});

export default router;
