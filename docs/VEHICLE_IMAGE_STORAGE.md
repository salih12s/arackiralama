# Araç görsel depolama

Yeni araç görselleri artık `Vehicle.imageUrl` içine base64/data URL olarak yazılmaz. Admin paneli `multipart/form-data` ile `/api/vehicles/:vehicleId/images` endpointine yükler; API gerçek MIME imzasını doğrular ve seçilen storage provider'a yazar. `VehicleImage.imageUrl` yalnızca public URL, `storageKey` ise provider silme anahtarıdır.

## Provider seçimi

- Geliştirme: `IMAGE_STORAGE_PROVIDER=local`, `UPLOAD_DIR=./uploads`, `PUBLIC_UPLOAD_BASE_URL=http://localhost:3005/uploads`
- Cloudinary: `IMAGE_STORAGE_PROVIDER=cloudinary` ve Cloudinary credential değişkenleri
- S3 uyumlu: `IMAGE_STORAGE_PROVIDER=s3` ve `S3_*` değişkenleri

Railway ephemeral disk kalıcı production storage değildir. Production'da Cloudinary veya S3 uyumlu kalıcı object storage kullanılmalıdır. Provider credential'ları eksikse upload endpointi açık configuration hatası döndürür; local fallback yapmaz.

## Eski data URL kayıtlarını taşıma

Migration otomatik backfill çalıştırmaz. Önce storage credential, boş alan ve backup doğrulanır; ardından:

```bash
npm run backfill:vehicle-images --prefix api
```

Script yalnızca `data:image/...;base64,...` kayıtlarını tarar, binary MIME'ı doğrular, `VehicleImage` oluşturur ve başarılı transaction sonrasında eski `Vehicle.imageUrl` değerini temizler. Upload veya database hatasında yeni obje temizlenir ve araç eski haliyle raporlanır.

## Endpointler

- `POST /api/vehicles/:vehicleId/images` — `files` multipart alanı
- `POST /api/vehicles/:vehicleId/images/url` — doğrulanmış harici `http/https` URL
- `PATCH /api/vehicles/:vehicleId/images/:imageId`
- `PATCH /api/vehicles/:vehicleId/images/:imageId/primary`
- `PATCH /api/vehicles/:vehicleId/images/reorder`
- `DELETE /api/vehicles/:vehicleId/images/:imageId`

Tüm endpointler JWT korumalıdır. JPG/JPEG, PNG ve WebP kabul edilir; SVG, bozuk dosya, limit üstü dosya ve araç başına maksimum görsel sayısı reddedilir.
