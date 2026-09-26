# Public API Referansı

Tüm uçlar `/api/public` altındadır, **kimlik doğrulama gerektirmez** ve yalnızca vitrine uygun
alanları döndürür. Plakalar maskelenir (`34 ••• 07`); maliyet, borç, iç not, müşteri listesi
gibi admin verileri asla dönmez.

## GET /api/public/vehicles

Vitrindeki araçları listeler. `start` ve `end` verilirse müsaitlik o aralığa göre hesaplanır
ve her araç için fiyat teklifi eklenir.

Query: `start=YYYY-MM-DD`, `end=YYYY-MM-DD` (opsiyonel, ikisi birlikte)

```json
{
  "data": [{
    "id": "cm...", "name": "Toyota Corolla", "plate": "35 ••• 88",
    "category": "KONFOR", "year": 2022, "fuelType": "HİBRİT",
    "transmission": "OTOMATİK", "seats": 5, "dailyRate": 2100,
    "imageUrl": null, "available": true,
    "quote": { "days": 3, "dailyRateTL": 2100, "totalTL": 6300, "totalKurus": 630000 }
  }]
}
```

## GET /api/public/vehicles/:id

Araç detayı (+ `description`) ve 3 benzer araç. `start`/`end` verilirse `available` ve `quote`
o aralığa göre döner.

## GET /api/public/categories

Filtreler için kategori listesi: `{ "data": ["EKONOMİK", "KONFOR", "PREMIUM", "SUV"] }`

## POST /api/public/reservations

Rezervasyon talebi oluşturur. **Rate limit: 15 dk / 10 istek.**

```json
{
  "vehicleId": "cm...",
  "fullName": "Ad Soyad",
  "phone": "05001234567",
  "email": "ops@ornek.com",
  "startDate": "2026-07-20",
  "endDate": "2026-07-23",
  "pickupTime": "10:00",
  "pickupLocation": "Ofis (Kadıköy)",
  "note": "opsiyonel",
  "termsAccepted": true
}
```

Kurallar:
- Tarih bugünden ileri, bitiş > başlangıç, en fazla 60 gün.
- Telefon TR cep formatı doğrulanır ve normalize edilir.
- Fiyat backend'de hesaplanır (`quotedAmount`, kuruş) — istekte tutar alanı yoktur/kabul edilmez.
- Müsaitlik transaction içinde yeniden kontrol edilir → dolu araç için `409`.
- Aynı telefondan aynı araç için çakışan mükerrer talep → `409` (mevcut kod hatırlatılır).

Başarılı yanıt (`201`):
```json
{
  "message": "Rezervasyon talebiniz alındı...",
  "reservation": { "code": "SS-K7M2P9", "status": "PENDING", "createdAt": "..." },
  "quote": { "days": 3, "dailyRateTL": 2100, "totalTL": 6300 }
}
```

## GET /api/public/reservations/:code?phone=...

Rezervasyon durumu sorgulama. Kod (`SS-XXXXXX`) + telefonun tamamı **veya son 4 hanesi**
eşleşmelidir. Eşleşmeyen kod/telefon kombinasyonları için tek tip `404` döner — hangi
bilginin yanlış olduğu sızdırılmaz.

Durumlar: `PENDING` (Beklemede) · `CONFIRMED` (Onaylandı) · `CANCELLED` (İptal) · `COMPLETED` (Tamamlandı)
