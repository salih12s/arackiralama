/** Ana tablolarda kişisel veriyi gereksiz yere açık göstermemek için telefon maskesi. */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)} *** ** ${digits.slice(-2)}`;
}
