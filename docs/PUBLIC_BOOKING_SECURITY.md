# Public Rezervasyon — Güvenlik Önlemleri

## Kimlik ve Yetki Ayrımı
- `/api/public/*` ayrı router'dadır ve `basicAuth`/JWT zincirinden ÖNCE mount edilir;
  admin uçlarına dokunmaz. Hiçbir admin ucu public hale getirilmemiştir.
- Public uçlar `select` ile yalnızca vitrin alanlarını çeker: maliyet, gider, borç,
  iç not, müşteri listesi, ödeme geçmişi, admin kullanıcıları asla sorgulanmaz.

## Veri Maskeleme
- Plaka her public yanıtta maskelenir: `34 ••• 07`.
- Rezervasyon sorgulama yalnızca kod + telefon eşleşmesiyle çalışır; eşleşmezse tek tip
  404 döner (enumeration koruması). Yanıtta başka müşteri verisi bulunmaz.

## Girdi Doğrulama (Zod)
- Tarihler regex + gerçek tarih kontrolü, en fazla 60 gün.
- Telefon TR cep formatı (`05xx`/`+905xx`) regex ile doğrulanır, normalize edilerek saklanır.
- Tüm string alanlarda maksimum uzunluk sınırı (ad 100, not 500, e-posta 120...).
- `termsAccepted: true` zorunludur; kabul zamanı `termsAcceptedAt` olarak kaydedilir.

## Rate Limiting
- Yazma ucu (POST /reservations): 15 dakikada 10 istek.
- Okuma uçları: dakikada 120 istek.

## Mükerrer / Yarış Koruması
- Rezervasyon oluşturma `Serializable` transaction içinde; müsaitlik içeride yeniden kontrol edilir.
- Aynı telefon + aynı araç + çakışan tarih → 409 (idempotent davranış: mevcut kod hatırlatılır).
- Serializable çakışması (P2034) müşteriye güvenli 409 mesajı olarak döner.

## Güvenli Hata Mesajları ve Loglama
- Müşteriye asla stack trace veya iç hata detayı dönmez.
- Loglara telefon/e-posta gibi hassas alanlar yazılmaz (`error.message` ile sınırlı).

## CORS ve Başlıklar
- Helmet tüm uygulamada aktif; API yanıtlarında `X-Robots-Tag: noindex`.
- CORS whitelist: `ALLOWED_ORIGIN` (admin) + `PUBLIC_SITE_ORIGIN` (müşteri sitesi),
  virgülle çoklu origin desteklenir. Geliştirmede yalnızca `localhost` origin'lerine izin verilir.

## Bilinen Sınırlar / Sonraki Adımlar
- Bot koruması şu an rate limit ile sınırlı; istenirse Cloudflare Turnstile/reCAPTCHA
  form gönderimine eklenebilir.
- E-posta/SMS doğrulaması yok — talepler zaten ekip tarafından telefonla teyit ediliyor.
