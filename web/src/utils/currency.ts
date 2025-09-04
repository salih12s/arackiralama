/**
 * SADECE TL STANDARDINI KULLANIYORUZ - KURUŞ YOK!
 * Tüm para değerleri TL cinsinden saklanır ve gösterilir
 */

// TL string/number input -> TL number çıktı
export function parseTL(input: string | number): number {
  if (typeof input === 'number') return input;

  // "1.234,56" / "1234.56" / "1 234,56" formatlarını temizle
  const normalized = input
    .replace(/\s/g, '')        // boşlukları sil
    .replace(/\./g, '')        // binlik noktaları sil (1.234 -> 1234)
    .replace(/,/g, '.');       // virgülü noktaya çevir (1234,56 -> 1234.56)
    
  const n = Number(normalized);
  if (Number.isNaN(n)) throw new Error(`Geçersiz TL değeri: ${input}`);
  return n;
}

// TL number -> "₺1.234,56" formatında string - backend TL gönderir
export function formatTRY(value: number | bigint): string {
  const tlValue = typeof value === 'bigint' ? Number(value) : value;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(tlValue);
}

// TL number -> "1.234,56" formatında string (₺ işareti olmadan) - backend TL gönderir
export function formatTLAmount(value: number | bigint): string {
  const tlValue = typeof value === 'bigint' ? Number(value) : value;
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tlValue);
}

// Ana formatCurrency fonksiyonu - TL için
export const formatCurrency = formatTRY;

// Sayı formatı (binlik ayıraçlarla)
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

// TL değeri geçerli mi?
export function isValidTL(value: any): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0;
}

// Geriye uyumluluk için eski fonksiyon adları - artık TL döndürür/kabul eder
export const tlToKurus = parseTL;  // Artık TL döndürür
export const kurusToTlNumber = (value: number | bigint): number => typeof value === 'bigint' ? Number(value) : value;  // Artık direkt döndürür
export const isValidKurus = isValidTL;
