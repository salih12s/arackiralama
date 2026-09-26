# Halka Açık Rezervasyon Sitesi — Mimari

## Genel Bakış

Monorepo üç uygulamadan oluşur; backend ve PostgreSQL ortaktır:

```
├── api/          → Express backend (ortak) — Railway
├── web/          → Yönetim paneli (JWT korumalı) — cPanel
└── web/src/public-site/  → Müşteri rezervasyon sitesi (halka açık) — aynı frontend/origin
```

Yönetim paneli ile müşteri sitesi **ayrı Vite uygulamalarıdır**: ayrı tema, ayrı bağımlılık
ağacı, ayrı build çıktısı. Müşteri sitesi hiçbir admin bileşenini import etmez; admin bundle'ı
müşteriye gitmez.

## Veri Akışı

```
web public routes ──HTTP──▶ /api/public/* ──▶ PostgreSQL ◀── /api/* (JWT) ◀──HTTP── web admin routes
```

- Müşteri sitesi yalnızca `/api/public/*` uçlarını kullanır (JWT yok).
- Sitedeki rezervasyon talepleri `reservations` tablosuna `source=WEB`, `status=PENDING`
  olarak yazılır → admin panelindeki Rezervasyonlar bölümünde anında görünür.
- Admin panelinden yapılan Onayla/İptal işlemleri aynı kaydı günceller; müşteri
  **Rezervasyon Sorgula** sayfasından kodu + telefonuyla güncel durumu görür.

## Merkezi Servisler (api/src/services)

| Servis | Sorumluluk |
|---|---|
| `availabilityService.ts` | Tek noktadan tarih çakışması: aktif kiralamalar (soft delete hariç), ONAYLI rezervasyonlar, servisteki/pasif araçlar. Hem listelemede hem rezervasyon oluşturmada aynı fonksiyonlar kullanılır. |
| `quoteService.ts` | Fiyat teklifi: gün sayısı × günlük fiyat (kuruş). Frontend'den gelen tutar asla kullanılmaz. |
| `rentalCalc.ts` | (Mevcut) kiralama tutar hesabı — gün hesaplama kuralı quoteService ile hizalıdır. |

## Müsaitlik Kuralları

- **Aktif kiralama** (deleted=false, status=ACTIVE) → bloke eder.
- **Onaylı (CONFIRMED) rezervasyon** → bloke eder.
- **Beklemedeki (PENDING) rezervasyon** → genel müsaitliği bloke ETMEZ (talep bazlı akış;
  onayı ekip verir). Ancak aynı telefondan aynı araç için çakışan ikinci talep 409 ile reddedilir.
- **Servisteki araç** → rezervasyona kapalı (servis bitiş tarihi sistemde tutulmadığından güvenli taraf).
- **Pasif / vitrine kapalı araç** → hiç listelenmez.
- Çakışma **gün seviyesinde ve kapsayıcıdır**: iade günü ile yeni teslim günü aynıysa çakışma
  sayılır (aynı gün devir manuel onay gerektirir).

## Yarış Durumu ve Mükerrer Talep

- Rezervasyon oluşturma `Serializable` izolasyonlu tek transaction içinde çalışır;
  müsaitlik **transaction içinde yeniden** kontrol edilir.
- Eşzamanlı çakışmada Prisma P2034 hatası müşteriye güvenli 409 mesajı olarak döner.
- Aynı telefon + aynı araç + çakışan tarih → mevcut kod hatırlatılarak 409.

## Saat Dilimi

Tüm tarih girdileri `parseIstanbulDate()` ile `+03:00` (Europe/Istanbul, DST yok) olarak
parse edilir; karşılaştırmalar gün seviyesine indirgenir. Sunucunun sistem saat dilimi
sonucu etkilemez.

## Para Birimi

Mevcut kural korunur: veritabanında **kuruş (integer)**, public API yanıtlarında TL.
`Reservation.quotedAmount` kuruş olarak saklanır.

## Bilinçli Kapsam Kararları

- **Ek hizmetler** (bebek koltuğu, ek sürücü, km paketi): veritabanında karşılığı olmadığı
  için rezervasyon akışına EKLENMEDİ — sahte veri gösterilmiyor. İleride `ReservationExtra`
  tablosuyla eklenebilir.
- **Çoklu araç görseli**: Vehicle.imageUrl tek görsel tutar (admin panelden yüklenir).
  Galeri ihtiyacı doğarsa `VehicleImage` modeli eklenmelidir.
- **T.C. kimlik / doğum tarihi**: talep aşamasında gerekmediği için formda YOK (KVKK'da
  veri minimizasyonu ilkesine de uygun).
