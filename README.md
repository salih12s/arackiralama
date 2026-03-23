# 🚗 Araç Kiralama Yönetim Paneli

Full-stack araç kiralama işletmesi yönetim paneli. Araç filosu, müşteri takibi, kira sözleşmeleri, ödemeler, giderler ve detaylı raporlama özelliklerini tek bir platformda sunar.

> **Canlı:** Sistem aktif olarak bir araç kiralama firması tarafından kullanılmaktadır.

---

## Teknoloji Yığını

| Katman | Teknolojiler |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Material UI 5, React Query, React Hook Form, Recharts, Vite |
| **Backend** | Node.js, Express, TypeScript, Zod (validation) |
| **Veritabanı** | PostgreSQL, Prisma ORM |
| **Auth** | JWT (JSON Web Token), Bcrypt |
| **Deployment** | Railway (API), cPanel (Frontend) |

---

## Özellikler

### Araç Yönetimi
- Araç ekleme, düzenleme ve durumunu takip etme (Boşta / Kirada / Serviste / Rezerveli)
- Araç başına gelir-gider analizi ve performans metrikleri
- Konsinye araç desteği

### Kiralama İşlemleri
- Yeni kiralama oluşturma ve uzatma desteği
- Günlük ücret, km farkı, temizlik, HGS, hasar, yakıt gibi ek kalem hesaplamaları
- Çoklu ödeme takibi (Nakit / Havale / Kart)
- Kalan borç otomatik hesaplama
- Soft delete ile güvenli silme (veri kaybı önleme)

### Müşteri Yönetimi
- Müşteri kayıt ve düzenleme
- Müşteri bazlı kiralama geçmişi

### Rezervasyon Sistemi
- Tarih ve saat bazlı araç rezervasyonu
- Durum takibi: Beklemede → Onaylandı → Tamamlandı / İptal

### Raporlama ve Analitik
- Dashboard: Toplam gelir, aktif kiralama sayısı, doluluk oranı gibi KPI'lar
- Aylık gelir raporları ve araç bazlı performans analizi
- Borçlu müşteri listesi ve detaylı borç takibi
- PDF ve Excel export desteği

### Araç Giderleri
- Lastik, bakım, onarım, sigorta gibi gider kalemleri
- Araç bazlı gider analizi

### Yedekleme
- Manuel ve otomatik (cron) veritabanı yedekleme
- Son 30 yedeği saklama
- Yedekten geri yükleme

### Güvenlik
- JWT tabanlı kimlik doğrulama (24 saat geçerli)
- Bcrypt ile şifre hashleme (cost factor: 12)
- Helmet güvenlik başlıkları
- Rate limiting
- CORS whitelist

---

## Proje Yapısı

```
├── api/                          # Backend (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma         # Veritabanı şeması (13 tablo)
│   │   └── migrations/           # Veritabanı migration geçmişi
│   └── src/
│       ├── server.ts             # Uygulama giriş noktası
│       ├── app.ts                # Express konfigürasyonu, route tanımları
│       ├── seed.ts               # Test verisi oluşturma
│       ├── db/prisma.ts          # Prisma client instance
│       ├── lib/currency.ts       # TL/kuruş dönüşüm yardımcıları
│       ├── middleware/
│       │   ├── auth.ts           # JWT doğrulama middleware
│       │   └── basicAuth.ts      # Basic Auth middleware
│       ├── routes/
│       │   ├── auth.ts           # Giriş / kayıt
│       │   ├── vehicles.ts       # Araç CRUD + performans
│       │   ├── rentals.ts        # Kiralama CRUD + soft delete
│       │   ├── payments.ts       # Ödeme kayıt
│       │   ├── customers.ts      # Müşteri CRUD
│       │   ├── reservations.ts   # Rezervasyon CRUD
│       │   ├── vehicleExpenses.ts# Araç giderleri
│       │   ├── notes.ts          # Not CRUD
│       │   ├── reports.ts        # Raporlar
│       │   ├── analytics.ts      # Dashboard istatistikleri
│       │   └── backup.ts         # Yedekleme işlemleri
│       └── services/
│           ├── rentalCalc.ts     # Kiralama tutar hesaplama
│           ├── backupService.ts  # Otomatik yedekleme servisi
│           └── report.ts         # Rapor oluşturma
│
├── web/                          # Frontend (React + MUI)
│   ├── src/
│   │   ├── App.tsx               # Route tanımları, protected routes
│   │   ├── main.tsx              # Uygulama giriş noktası
│   │   ├── theme.ts              # MUI tema konfigürasyonu
│   │   ├── api/                  # API istemci katmanı (Axios)
│   │   │   ├── client.ts         # Axios instance, tipler, API fonksiyonları
│   │   │   ├── analytics.ts
│   │   │   ├── rentals.ts
│   │   │   ├── vehicles.ts
│   │   │   ├── vehicleExpenses.ts
│   │   │   ├── reports.ts
│   │   │   └── notes.ts
│   │   ├── components/           # Yeniden kullanılabilir bileşenler
│   │   │   ├── Layout.tsx        # Yan menü + üst bar
│   │   │   ├── NewRentalDialog.tsx
│   │   │   ├── EditRentalDialog.tsx
│   │   │   ├── AddPaymentDialog.tsx
│   │   │   ├── ReservationDialog.tsx
│   │   │   ├── ConsignmentRentalDialog.tsx
│   │   │   ├── NewVehicleDialog.tsx
│   │   │   ├── NewCustomerDialog.tsx
│   │   │   ├── RentalTable.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── StatusChip.tsx
│   │   ├── pages/                # Sayfa bileşenleri
│   │   │   ├── Dashboard.tsx     # Ana sayfa - KPI'lar ve genel bakış
│   │   │   ├── AllRentals.tsx    # Kiralama listesi ve yönetimi
│   │   │   ├── RentalDetail.tsx  # Kiralama detay sayfası
│   │   │   ├── Vehicles.tsx      # Araç listesi
│   │   │   ├── VehicleDetail.tsx # Araç detayı ve performansı
│   │   │   ├── Customers.tsx     # Müşteri yönetimi
│   │   │   ├── Reports.tsx       # Aylık raporlar
│   │   │   ├── DetailedReport.tsx# Detaylı rapor
│   │   │   ├── DebtorDetails.tsx # Borçlu listesi
│   │   │   ├── UnpaidDebtsDetail.tsx
│   │   │   ├── VehicleExpenses.tsx
│   │   │   ├── Notes.tsx
│   │   │   ├── Backup.tsx
│   │   │   └── Login.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.tsx       # Authentication context
│   │   └── utils/
│   │       ├── currency.ts       # TL formatlama
│   │       └── cacheInvalidation.ts
│   └── vite.config.ts
│
└── package.json                  # Monorepo workspace konfigürasyonu
```

---

## Database Schema

```
User ─────────────── Authentication (JWT)
Vehicle ──┬──────── Fleet inventory
          ├── Rental ──── Payment (1:N payment records)
          ├── Reservation
          ├── VehicleExpense
          └── ConsignmentDeduction
Customer ─┬── Rental
          ├── Reservation
          └── ExternalPayment
ConsignmentRental ─┬── ConsignmentDeduction
                   └── ExternalPayment
Note ────────────── Admin notes
```

**Currency convention:** All monetary values are stored as **kuruş** (integer cents) in the database to avoid floating-point rounding errors. The API layer handles TL ↔ kuruş conversion via `tlToKurus()` / `kurusToTlNumber()`.

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL
- npm

### 1. Clone

```bash
git clone https://github.com/salih12s/arackiralama.git
cd arackiralama
```

### 2. Install Dependencies

```bash
npm run install-all
```

### 3. Configure Environment

Create **api/.env**:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/arackiralama
JWT_SECRET=your-secret-key
PORT=3005
ALLOWED_ORIGIN=http://localhost:5173
```

Create **web/.env**:
```env
VITE_API_URL=http://localhost:3005/api
```

### 4. Initialize Database

```bash
npm run api:migrate
npm run api:seed        # Optional: seed sample data
```

### 5. Run Development Servers

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:3005 |
| Frontend | http://localhost:5173 |

---

## Key Design Decisions

- **Monorepo with npm workspaces** — single `npm run dev` starts both API and frontend
- **Integer currency (kuruş)** — eliminates floating-point errors in financial calculations
- **Soft delete on rentals** — `deleted` flag instead of hard delete preserves audit trail
- **React Query caching** — centralized cache invalidation via `utils/cacheInvalidation.ts`
- **Shared utility layer** — `utils/format.ts`, `utils/status.ts` eliminate code duplication across 10+ pages
- **Centralized error handling** — `errorHandler.ts` middleware handles Zod validation + Prisma errors globally

---

## Screenshots

> *Screenshots will be added soon.*

---

## License

This project is for private use.
