/**
 * Tek para standardı: HER ŞEY KURUŞ (minor unit) olarak saklanır
 * Database'de tüm para alanları integer (kuruş) olarak tutulur
 * Kullanıcı arayüzünde TL olarak gösterilir ve girilir
 */

// TL string/number -> kuruş (integer)
export function tlToKurus(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100);

  // "1.234,56" / "1234.56" / "1 234,56" vs: tüm formatları temizle
  const normalized = input
    .replace(/\s/g, '')        // boşlukları sil
    .replace(/\./g, '')        // binlik noktaları sil
    .replace(/,/g, '.');       // virgülü noktaya çevir
    
  const n = Number(normalized);
  if (Number.isNaN(n)) throw new Error(`Geçersiz TL: ${input}`);
  return Math.round(n * 100);
}

// kuruş -> TL number (örn. 123456 -> 1234.56)
export function kurusToTlNumber(kurus: number | bigint): number {
  const k = typeof kurus === 'bigint' ? Number(kurus) : kurus;
  return k / 100;
}

// kuruş -> "₺1.234,56"
export function formatTRY(kurus: number | bigint): string {
  const n = kurusToTlNumber(kurus);
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
}

// kuruş -> TL string without currency symbol (örn. "1.234,56")
export function formatTLAmount(kurus: number | bigint): string {
  const n = kurusToTlNumber(kurus);
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// Validation: kuruş değeri geçerli mi?
export function isValidKurus(value: any): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
