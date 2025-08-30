# Araç Kiralama Admin Paneli

Bu proje, özel araç kiralama işletmeleri için geliştirilmiş tam özellikli bir admin panelidir. Node.js + Express API ve React frontend kullanarak mono-repo mimarisiyle oluşturulmuştur.

## 🏗️ Proje Yapısı

```
arackiralama-monorepo/
├── api/                 # Backend API (Node.js + Express + Prisma)
│   ├── prisma/         # Veritabanı şeması ve migrations
│   ├── src/
│   │   ├── routes/     # API rotaları
│   │   ├── services/   # İş mantığı servisleri
│   │   ├── middleware/ # Authentication ve güvenlik
│   │   └── db/         # Veritabanı bağlantısı
│   └── package.json
├── web/                # Frontend (React + TypeScript + MUI)
│   ├── src/
│   │   ├── pages/      # Sayfa bileşenleri
│   │   ├── components/ # Yeniden kullanılabilir bileşenler
│   │   ├── hooks/      # React hooks
│   │   └── api/        # API client
│   └── package.json
└── package.json        # Mono-repo root
```

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+ 
- PostgreSQL 12+
- npm veya yarn

### 1. Depoyu Klonlayın

```bash
git clone <repo-url>
cd arackiralama-monorepo
```

### 2. Bağımlılıkları Yükleyin

```bash
# Root bağımlılıklarını yükle
npm install

# API bağımlılıklarını yükle
cd api && npm install

# Web bağımlılıklarını yükle
cd ../web && npm install
```

### 3. Veritabanını Hazırlayın

PostgreSQL veritabanı oluşturun:

```sql
CREATE DATABASE arackiralama;
CREATE USER arackiralama_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE arackiralama TO arackiralama_user;
```

### 4. Ortam Değişkenlerini Yapılandırın

API klasöründe `.env` dosyası oluşturun:

```bash
cd api
cp .env.sample .env
```

`.env` dosyasını düzenleyin:

```env
DATABASE_URL=postgresql://arackiralama_user:your_password@localhost:5432/arackiralama?schema=public
JWT_SECRET=super-secret-jwt-key-change-in-production
ALLOWED_ORIGIN=http://localhost:3000
PORT=3005
NODE_ENV=development

# Opsiyonel Basic Auth
# BASIC_USER=admin
# BASIC_PASS=secret123
```

### 5. Veritabanı Migration ve Seed

```bash
cd api
npm run migrate
npm run seed
```

### 6. Uygulamayı Çalıştırın

```bash
# Root dizinde (hem API hem de Web aynı anda çalışır)
npm run dev

# Veya ayrı ayrı:
# Terminal 1 - API
cd api && npm run dev

# Terminal 2 - Web
cd web && npm run dev
```

### 7. Uygulamaya Erişin

- **Web Frontend**: http://localhost:3000
- **API Backend**: http://localhost:3005
- **Veritabanı Admin**: http://localhost:3005/studio (Prisma Studio)

**Varsayılan Giriş Bilgileri:**
- Email: `admin@arackiralama.com`
- Şifre: `admin123`

## 📊 Özellikler

### Backend (API)

- **Authentication**: JWT tabanlı güvenli kimlik doğrulama
- **Database**: PostgreSQL + Prisma ORM
- **Security**: Helmet, CORS, Rate Limiting, Optional Basic Auth
- **Validation**: Zod şeması doğrulama
- **Business Logic**: Kiralama hesaplamaları, raporlama servisleri

#### API Endpoints

```
Authentication:
POST /api/auth/login

Vehicles:
GET    /api/vehicles
POST   /api/vehicles
PATCH  /api/vehicles/:id
GET    /api/vehicles/:id

Rentals:
GET    /api/rentals
POST   /api/rentals
POST   /api/rentals/:id/return
POST   /api/rentals/:id/payments

Reports:
GET    /api/stats/today
GET    /api/reports/monthly?year=2024
GET    /api/reports/vehicle-income
GET    /api/reports/debtors
```

### Frontend (Web)

- **Framework**: React 18 + TypeScript + Vite
- **UI**: Material-UI (MUI) + MUI X DataGrid
- **State**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Date**: dayjs (Turkish locale)
- **Routing**: React Router v6

#### Sayfa Yapısı

- **Dashboard**: KPI kartları ve günlük kiralama listesi
- **Rentals**: Tüm kiralamalar, yeni kiralama formu
- **Vehicles**: Araç listesi ve durum yönetimi  
- **Reports**: Aylık gelir grafikleri, borçlu listesi
- **Vehicle Detail**: Araç geçmişi ve detayları

### İş Mantığı

#### Kiralama Hesaplamaları

```javascript
totalDue = days * dailyPrice + kmDiff + cleaning + hgs + damage + fuel
balance = totalDue - (upfront + pay1 + pay2 + pay3 + pay4 + sum(payments.amount))
```

#### Araç Durumları

- **IDLE**: Boşta (yeni kiralama için uygun)
- **RENTED**: Kiralandı (aktif kiralama)
- **RESERVED**: Rezerve (gelecek tarihli kiralama)
- **SERVICE**: Serviste (bakım/onarım)

#### Kiralama Durumları

- **ACTIVE**: Aktif kiralama
- **RETURNED**: Teslim edildi
- **CANCELLED**: İptal edildi

## 🔒 Güvenlik

- JWT token tabanlı kimlik doğrulama
- CORS whitelist (sadece belirtilen domain)
- Rate limiting (IP başına 100 req/15dk)
- Helmet güvenlik headers
- Opsiyonel Basic Authentication
- SEO koruması (`noindex` meta tags)
- Input validation (Zod)

## 🚀 Deployment

### Production Build

```bash
# API build
cd api
npm run build

# Web build  
cd web
npm run build
```

### Docker (Opsiyonel)

```dockerfile
# API Dockerfile örneği
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3005
CMD ["npm", "start"]
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🧪 Testing

```bash
# API testleri
cd api
npm test

# Web testleri  
cd web
npm test
```

## 📝 Scripts

### Root Level
- `npm run dev` - API ve Web'i aynı anda çalıştır
- `npm run install-all` - Tüm bağımlılıkları yükle

### API
- `npm run dev` - Development server
- `npm run start` - Production server
- `npm run build` - TypeScript build
- `npm run migrate` - Database migration
- `npm run seed` - Sample data yükle
- `npm run studio` - Prisma Studio

### Web  
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Production preview

## 🎨 Konfigürasyon

### Para Birimi & Locale
- **Currency**: TRY (Turkish Lira)
- **Locale**: tr-TR
- **Timezone**: Europe/Istanbul
- **Date Format**: DD.MM.YYYY

### Theme
- **Primary Color**: #0D3282 (Koyu mavi)
- **Font**: Roboto
- **Design**: Material Design 3

## 💾 Veri Yedekleme

Sistem, manuel ve otomatik veri yedekleme özelliklerine sahiptir:

### Manuel Yedekleme
- Admin panelindeki **Yedekleme** sayfasından manual yedek oluşturabilirsiniz
- Yedek dosyası JSON formatında indirilir
- Tüm sistem verileri (araçlar, müşteriler, kiralamalar, ödemeler) dahildir

### Otomatik Yedekleme
Sistem otomatik olarak periyodik yedek alır:

```bash
# .env dosyasında konfigürasyon
BACKUP_FREQUENCY=weekly     # daily, weekly, monthly
BACKUP_MAX_COUNT=30         # Saklanacak maksimum yedek sayısı
BACKUP_DIR=backups         # Yedek klasörü
```

#### Yedekleme Sıklığı Seçenekleri:
- **daily**: Her gün saat 02:00'da
- **weekly**: Her Pazar saat 02:00'da (varsayılan)
- **monthly**: Her ayın 1'inde saat 02:00'da

### Yedekleme API Endpoints:
- `POST /api/backup/export` - Manual yedek oluştur
- `GET /api/backup/history` - Yedek geçmişini görüntüle  
- `GET /api/backup/download/:filename` - Yedek dosyasını indir
- `DELETE /api/backup/:filename` - Yedek dosyasını sil

### Production'da Yedekleme:
```bash
# Sistem servisi olarak kurulum için (Linux)
sudo systemctl enable arackiralama
sudo systemctl start arackiralama

# Cron job kontrolü
sudo crontab -l | grep backup
```

### Yedek Dosya Formatı:
```json
{
  "timestamp": "2025-08-29T10:00:00.000Z",
  "version": "1.0",
  "type": "automated",
  "data": {
    "users": 5,
    "vehicles": 25,
    "customers": 150,
    "rentals": 320,
    "payments": 890
  },
  "tables": {
    "users": [...],
    "vehicles": [...],
    "customers": [...],
    "rentals": [...],
    "payments": [...]
  }
}
```

## 🐛 Troubleshooting

### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL çalışıyor mu kontrol et
sudo service postgresql status

# Prisma client regenerate
cd api && npx prisma generate
```

### Port Çakışması
```bash
# Port kullanımını kontrol et
lsof -i :3000
lsof -i :3005
```

### Build Hataları
```bash
# Node modules temizle ve yeniden yükle
rm -rf node_modules package-lock.json
npm install
```

## 📞 Destek

Bu uygulama özel bir proje olarak geliştirilmiştir. Teknik destek için proje geliştiricisine ulaşın.

## 📄 Lisans

Bu proje özel mülkiyettir ve ticari kullanım için tasarlanmıştır.
