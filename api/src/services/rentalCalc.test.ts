import { calculateBalance, calculateRentBase, calculateRentalAmounts, calculateTotalDue } from './rentalCalc';

// Tüm tutarlar kuruş: 1.450 TL = 145_000
describe('rentalCalc (kuruş)', () => {
  it('toplamı kuruş girdisinden, ek çarpan olmadan hesaplar', () => {
    const totalDue = calculateTotalDue({ days: 3, dailyPrice: 145_000, kmDiff: 20_000, hgs: 5_000 });
    expect(totalDue).toBe(3 * 145_000 + 20_000 + 5_000); // 460 000 kuruş = 4.600 TL
  });

  it('ORIGINAL_TOTAL etiketi varsa kira bedeli olarak onu kullanır', () => {
    // Panel günlük ücreti 10 TL'ye yuvarlar (1.433,33 → 1.430); gerçek toplam 4.300 TL
    const input = { days: 3, dailyPrice: 143_000, note: 'ORIGINAL_TOTAL:430000|Müşteri notu' };
    expect(calculateRentBase(input)).toBe(430_000);
    expect(calculateTotalDue({ ...input, cleaning: 10_000 })).toBe(440_000);
  });

  it('bakiyeden peşinatı, taksitleri ve ek ödemeleri düşer', () => {
    const rental = { days: 5, dailyPrice: 100_000, upfront: 100_000, pay1: 50_000, pay2: 50_000 };
    const { totalDue, balance } = calculateRentalAmounts(rental, [{ amount: 75_000 }, { amount: 25_000 }]);
    expect(totalDue).toBe(500_000);
    expect(balance).toBe(500_000 - 200_000 - 100_000);
  });

  it('fazla ödemede negatif bakiye döner (web ile aynı kural)', () => {
    expect(calculateBalance(100_000, { days: 1, dailyPrice: 100_000, upfront: 120_000 })).toBe(-20_000);
  });

  it('veritabanı kaydıyla yeniden hesaplandığında aynı sonucu verir', () => {
    // Oluşturma anı ile teslim alma/ödeme sonrası yeniden hesap aynı birimde olmalı
    const created = calculateRentalAmounts({ days: 2, dailyPrice: 250_000, upfront: 100_000 });
    const stored = { days: 2, dailyPrice: 250_000, upfront: 100_000, totalDue: created.totalDue };
    expect(calculateRentalAmounts(stored)).toEqual(created);
  });
});
