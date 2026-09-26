# Public Rezervasyon Sitesi — Deployment

Mevcut Railway (API) ve cPanel (admin) kurulumu **değişmez**. Müşteri sitesi ikinci bir
statik build olarak cPanel'e eklenir.

## 1) Backend (Railway) — mevcut akış korunur

- `npm start` zaten `prisma migrate deploy` çalıştırır; yeni migration'lar
  (`add_vehicle_showcase_fields`, `add_public_booking_fields`) deploy sırasında otomatik uygulanır.
  Tüm yeni kolonlar nullable/default'lu olduğundan mevcut veri bozulmaz.
- Railway ortam değişkenlerine ekleyin:

```env
PUBLIC_SITE_ORIGIN=https://www.ssfilo-siteniz.com
```

(Birden fazla origin gerekirse virgülle ayırın.)

## 2) Tek frontend — cPanel

```bash
# yerelde derleyin
cd web
# .env.production oluşturun:
#   VITE_API_URL=https://<railway-api-adresiniz>/api
npm run build
```

- `web/dist/` içeriğini cPanel'de sitenin köküne yükleyin. Bu build hem `/` hem `/panel` rotalarını içerir.
  Örn: `kirala.ssfilo.com` ya da ayrı bir domain.
- SPA yönlendirmesi için `.htaccess` ekleyin:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 3) Yönetim paneli (web) — mevcut akış + 1 env

- `web/.env.production` dosyasına ekleyin:

```env
```

- Yeniden derleyip (`npm run web:build`) mevcut cPanel konumuna yükleyin.
- Admin `robots.txt` artık tamamen `Disallow: /` (panel indexlenmez);
  müşteri sitesinin `robots.txt`'i `Allow: /`.

## 4) Yayın öncesi kontrol listesi

- [ ] `web/src/public-site/config.ts` içindeki telefon/adres/e-posta gerçek bilgilerle güncellendi
- [ ] Araçlara panelden fotoğraf ve günlük fiyat girildi (fiyatsız araç "Fiyat için arayın" görünür)
- [ ] `PUBLIC_SITE_ORIGIN` Railway'e eklendi (CORS)
- [ ] Sitede test rezervasyonu oluşturuldu → panelde "Web Sitesi" kaynağıyla düştü
- [ ] Rezervasyon Sorgula sayfası kod+telefonla doğru sonuç veriyor

## Ortam Değişkenleri Özeti

| Uygulama | Değişken | Açıklama |
|---|---|---|
| api | `PUBLIC_SITE_ORIGIN` | Müşteri sitesi origin'i (CORS) |
| web | `VITE_API_URL` | Public ve admin API adresi (`.../api`) |
