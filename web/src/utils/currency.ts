export function formatCurrency(amountInKurus: number): string {
  const amountInTL = amountInKurus / 100;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInTL);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}
