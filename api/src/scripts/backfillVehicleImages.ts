import { prisma } from '../db/prisma';
import { detectImageMime, getImageStorageProvider, isLegacyDataUrl } from '../services/imageStorageService';

/**
 * Explicit, operator-run migration helper. It is intentionally not called by
 * server start/migrate deploy because production storage credentials and a
 * rollback plan must be verified first.
 */
async function main() {
  const vehicles = await prisma.vehicle.findMany({ where: { imageUrl: { startsWith: 'data:image/' } }, select: { id: true, imageUrl: true } });
  const storage = getImageStorageProvider();
  const report: Array<{ vehicleId: string; status: string; message?: string }> = [];

  for (const vehicle of vehicles) {
    try {
      if (!isLegacyDataUrl(vehicle.imageUrl)) throw new Error('Desteklenmeyen data URL formatı.');
      const match = vehicle.imageUrl!.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
      if (!match) throw new Error('Data URL çözümlenemedi.');
      const buffer = Buffer.from(match[2], 'base64');
      const mime = detectImageMime(buffer);
      if (!mime) throw new Error('Binary MIME doğrulaması başarısız.');
      const stored = await storage.uploadVehicleImage({ buffer, mimeType: mime, vehicleId: vehicle.id });
      try {
        await prisma.$transaction(async (tx) => {
          const count = await tx.vehicleImage.count({ where: { vehicleId: vehicle.id } });
          if (count === 0) await tx.vehicleImage.create({ data: { vehicleId: vehicle.id, imageUrl: stored.imageUrl, storageKey: stored.storageKey, isPrimary: true, sortOrder: 0 } });
          else await tx.vehicleImage.create({ data: { vehicleId: vehicle.id, imageUrl: stored.imageUrl, storageKey: stored.storageKey, sortOrder: count } });
          await tx.vehicle.update({ where: { id: vehicle.id }, data: { imageUrl: null } });
        });
        report.push({ vehicleId: vehicle.id, status: 'migrated' });
      } catch (error) {
        await storage.deleteVehicleImage(stored);
        throw error;
      }
    } catch (error) {
      report.push({ vehicleId: vehicle.id, status: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }

  console.table(report);
  const failed = report.filter((item) => item.status === 'failed');
  console.log(`Backfill tamamlandı: ${report.length - failed.length} başarılı, ${failed.length} başarısız.`);
  if (failed.length) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
