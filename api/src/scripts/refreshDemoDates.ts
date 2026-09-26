/**
 * Demo verisini bugüne taşır.
 *
 * Seed, tarihleri "bugünden X gün önce" diye göreli yazar; aradan zaman geçince
 * aktif kiralamalar haftalarca gecikmiş görünür. Bu betik veriyi silmeden
 * (araç fotoğrafları dahil her şey korunur) tüm tarih alanlarını seed gününden
 * bugüne kaydırır. Referans: en eski kiralamanın oluşturulma günü (seed günü).
 * Tekrar çalıştırmak güvenlidir; fark 0 ise hiçbir şey değişmez.
 *
 *   npm run demo:refresh --prefix api
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

// Kaydırılacak tarih sütunları (tablo -> sütunlar). Yalnızca iş tarihleri; kullanıcı hesapları hariç.
const COLUMNS: Record<string, string[]> = {
  rentals: ['start_date', 'end_date', 'completed_at', 'deleted_at', 'created_at'],
  payments: ['paid_at'],
  reservations: ['reservation_date', 'created_at', 'updated_at', 'terms_accepted_at'],
  vehicle_expenses: ['date', 'created_at', 'updated_at'],
  consignment_rentals: ['created_at'],
  consignment_deductions: ['created_at'],
  external_payments: ['created_at'],
  notes: ['created_at', 'updated_at'],
};

async function main() {
  const oldest = await prisma.rental.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
  if (!oldest) {
    console.log('Kiralama kaydı yok; kaydırılacak veri bulunamadı.');
    return;
  }

  const seedDay = new Date(oldest.createdAt);
  seedDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offsetDays = Math.round((today.getTime() - seedDay.getTime()) / DAY);

  if (offsetDays <= 0) {
    console.log('Demo verisi zaten güncel (fark 0 gün).');
    return;
  }

  console.log(`Seed günü ${seedDay.toLocaleDateString('tr-TR')} → tarihler ${offsetDays} gün ileri kaydırılıyor…`);
  await prisma.$transaction(async (tx) => {
    for (const [table, columns] of Object.entries(COLUMNS)) {
      const assignments = columns.map((column) => `"${column}" = "${column}" + make_interval(days => ${offsetDays})`).join(', ');
      const count = await tx.$executeRawUnsafe(`UPDATE "${table}" SET ${assignments}`);
      console.log(`  ${table}: ${count} satır`);
    }
  });
  console.log('Tamam. Panel ve site artık bugüne göre güncel görünür.');
}

main()
  .catch((error) => {
    console.error('Demo tarihleri güncellenemedi:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
