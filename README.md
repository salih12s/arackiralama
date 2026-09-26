<p align="center">
  <img src="docs/media/banner.png" alt="SS Filo — araç kiralama sitesi ve filo yönetim paneli" width="100%">
</p>

<p align="center">
  <b>Araç kiralama işletmeleri için müşteri sitesi ve operasyon paneli.</b><br>
  Müşteri müsait aracı bulup rezervasyon talebi bırakır; ekip kiralamayı, tahsilatı ve filoyu aynı yerden yönetir.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6E1F2F?style=flat-square&logo=typescript&logoColor=F4EDE2" alt="TypeScript">
  <img src="https://img.shields.io/badge/React_18-6E1F2F?style=flat-square&logo=react&logoColor=F4EDE2" alt="React 18">
  <img src="https://img.shields.io/badge/MUI-6E1F2F?style=flat-square&logo=mui&logoColor=F4EDE2" alt="MUI">
  <img src="https://img.shields.io/badge/Node.js-6E1F2F?style=flat-square&logo=nodedotjs&logoColor=F4EDE2" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-6E1F2F?style=flat-square&logo=postgresql&logoColor=F4EDE2" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Prisma-6E1F2F?style=flat-square&logo=prisma&logoColor=F4EDE2" alt="Prisma">
</p>

<p align="center">
  <a href="#kiralama-sitesi">Kiralama sitesi</a> ·
  <a href="#yönetim-paneli">Yönetim paneli</a> ·
  <a href="#açık-ve-koyu-mod">Açık / koyu mod</a> ·
  <a href="#mobil">Mobil</a> ·
  <a href="#tasarım">Tasarım</a> ·
  <a href="#teknik-kararlar">Teknik kararlar</a> ·
  <a href="#teknoloji">Teknoloji</a>
</p>

---

## Neden SS Filo

Küçük ve orta ölçekli kiralama işletmeleri genellikle iki ayrı dertle uğraşır: müşteri telefonla "şu tarihte hangi araç boş?" diye sorar, ekip ise kiralamaları, taksitleri ve borçları Excel'de takip eder.

SS Filo ikisini tek üründe birleştirir. **Kiralama sitesinde** müşteri seçtiği tarihte gerçekten müsait olan araçları ve baştan belli toplam fiyatı görür, dört adımda rezervasyon talebi bırakır. Talep **yönetim paneline** düşer; ekip onaylar, kiralamayı başlatır, ödemeleri alır ve filonun durumunu tek ekrandan izler.

> Bu depo bir ürün vitrinidir. Görsellerdeki müşteri adları, plakalar ve tutarlar demo verisidir.

---

## Kiralama sitesi

<p align="center">
  <img src="docs/media/demo-site.gif" alt="Kiralama sitesi: tarih seçme, filoyu filtreleme, araç detayı ve dört adımlı rezervasyon" width="100%">
  <br><sub>Tarih seç → müsait araçları filtrele → aracı incele → dört adımda rezervasyon talebi</sub>
</p>

- **Gerçek müsaitlik.** Seçilen tarihlerde kirada, rezervli ya da serviste olan araçlar "dolu" görünür; fiyat ve toplam tutar sunucuda hesaplanır.
- **Dört adımlı rezervasyon.** Tarih ve teslim noktası → araç → iletişim bilgileri → özet. Sağdaki özet her adımda güncellenir.
- **Kodla takip.** Talep sonrası müşteriye `SS-XXXXXX` biçiminde bir kod verilir; durum telefon numarasıyla sorgulanır.
- **Teslim noktası seçimi.** Ofis, iki havalimanı ya da adrese teslim; araç detayından rezervasyona taşınır.
- **Filo sayfası.** Kategori, vites, yakıt, koltuk ve fiyat filtreleri; masaüstünde yan panel, mobilde alttan açılan çekmece.

<table>
  <tr>
    <td width="50%"><img src="docs/media/site-home.png" alt="Ana sayfa"><br><sub><b>Ana sayfa</b> · süre sekmeli arama kutusu, teslim noktaları, koşullar</sub></td>
    <td width="50%"><img src="docs/media/site-fleet.png" alt="Araç filosu"><br><sub><b>Filo</b> · seçili tarihlere göre müsaitlik ve toplam fiyat</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/media/site-detail.png" alt="Araç detayı"><br><sub><b>Araç detayı</b> · teknik özellikler, teslim noktası, anlık fiyat hesabı</sub></td>
    <td width="50%"><img src="docs/media/site-booking.png" alt="Rezervasyon özeti"><br><sub><b>Rezervasyon</b> · adım göstergesi ve sabit özet kartı</sub></td>
  </tr>
</table>

---

## Yönetim paneli

<p align="center">
  <img src="docs/media/demo-panel.gif" alt="Yönetim paneli: genel bakış, gelir grafiği, kiralamalar, ödeme alma ve araç galerisi" width="100%">
  <br><sub>Demo girişi → genel bakış ve gelir grafiği → kiralamalar → ödeme alma → araç galerisi</sub>
</p>

- **Genel bakış.** "Bugün" şeridi gecikmiş iadeleri, bugün dönecek ve teslim edilecek araçları, onay bekleyen web taleplerini öne çıkarır. Doluluk, tahsilat oranı ve aylık gelir tek bakışta görünür.
- **Kiralamalar.** Durum sekmeleri, araç, bakiye ve tarih filtreleri, Excel'e aktarma. Her satırda tek ana işlem (teslim al), geri kalanı "⋯" menüsünde.
- **Ödeme alma.** Kalanın tamamını ya da yarısını tek tıkla doldurma, nakit / kart / havale, ödeme sonrası bakiyenin önizlemesi.
- **Yeni kiralama.** Numaralı form bölümleri ve yazdıkça güncellenen özet; toplamdan günlük ücrete çeviren hesaplama yardımcısı.
- **Araçlar.** Galeri ve liste görünümü, sitede yayınla / gizle anahtarı, fotoğraf yönetimi, servise alma, arşiv.
- **Web talepleri.** Siteden gelen rezervasyonları onaylama ya da iptal etme; başlangıca kalan süre.
- **Finans.** Aylık raporlar, müşteri bazında borçlar, kalem kalem ödenmeyen borç tablosu, araç giderleri.
- **Sistem.** Satır satır not defteri; Excel, PDF ve teknik (JSON) yedek; sunucuda zamanlanmış otomatik yedekleme.

<table>
  <tr>
    <td width="50%"><img src="docs/media/panel-dashboard.png" alt="Genel bakış"><br><sub><b>Genel bakış</b> · bugün şeridi, göstergeler, aktif kiralamalar</sub></td>
    <td width="50%"><img src="docs/media/panel-rentals.png" alt="Kiralamalar"><br><sub><b>Kiralamalar</b> · sayılı durum sekmeleri ve filtreler</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/media/panel-rental-detail.png" alt="Kiralama detayı"><br><sub><b>Kiralama detayı</b> · finansal durum ve ödeme planı</sub></td>
    <td width="50%"><img src="docs/media/panel-payment.png" alt="Ödeme al penceresi"><br><sub><b>Ödeme al</b> · hızlı doldurma ve bakiye önizlemesi</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/media/panel-new-rental.png" alt="Yeni kiralama penceresi"><br><sub><b>Yeni kiralama</b> · canlı özet paneli</sub></td>
    <td width="50%"><img src="docs/media/panel-vehicles.png" alt="Araçlar galerisi"><br><sub><b>Araçlar</b> · galeri görünümü ve yayın anahtarı</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/media/panel-reports.png" alt="Raporlar"><br><sub><b>Raporlar</b> · aylık gelir, durum dağılımı, araç sıralaması</sub></td>
    <td width="50%"><img src="docs/media/panel-unpaid.png" alt="Ödenmeyen borçlar"><br><sub><b>Ödenmeyen borçlar</b> · tüm ücret kalemleri tek tabloda</sub></td>
  </tr>
</table>

---

## Açık ve koyu mod

<p align="center">
  <img src="docs/media/themes.png" alt="Yönetim paneli açık ve koyu modda" width="100%">
</p>

Site ve panelin her ekranı iki modda da çalışır. Koyu mod açık temanın tersine çevrilmiş hali değildir; zemin, çizgi ve durum renkleri ayrı ayarlanmıştır, butonlar krem zemin üzerinde bordo yazıya döner. Tercih hatırlanır ve sayfa açılışında beyaz parlama olmaz.

<p align="center">
  <img src="docs/media/demo-theme.gif" alt="Panelde ve sitede koyu moda geçiş" width="100%">
</p>

---

## Mobil

<p align="center">
  <img src="docs/media/mobile.png" alt="Site ve panelin telefon görünümleri" width="100%">
</p>

Tüm ekranlar telefona göre yeniden düzenlenir: sitede araç detayında alta sabit bir fiyat ve rezervasyon çubuğu, filo sayfasında alttan açılan filtre çekmecesi; panelde alt sekme çubuğu ve tablolar yerine kart listeleri.

---

## Tasarım

<p align="center">
  <img src="docs/media/identity.png" alt="Logo, renk paleti ve yazı tipleri" width="100%">
</p>

- **Kimlik.** "Rozet" logosu ve bordo–krem palet sitenin de panelin de temelini oluşturur. Başlıklarda Playfair Display, arayüzde Manrope, tutar, plaka ve tarihlerde alt alta hizalanan JetBrains Mono kullanılır.
- **Tasarım token'ları.** Renkler CSS değişkeni olarak iki palette (açık / koyu) tanımlıdır; bileşenler sabit renk yerine bu token'ları kullanır.
- **Grafikler.** Gelir ve filo grafikleri projeye özel SVG bileşenleridir; renkleri renk körlüğü testlerinden geçirilmiş paletten gelir, her seri etiketle de belirtilir.
- **Ayrıntılar.** Klavye odağı görünür, dokunma hedefleri büyük, durum rozetleri renk + metinle anlatılır.

---

## Teknik kararlar

### Para kuruş cinsinden tamsayı olarak tutulur

Veritabanındaki bütün tutarlar (günlük ücret, ek ücretler, ödemeler, bakiye) `Int` tipinde ve **kuruş** cinsindendir. TL'ye çevirme yalnızca API yanıtında ve arayüzde yapılır ([`lib/currency.ts`](api/src/lib/currency.ts)).

Neden: JavaScript'te `0.1 + 0.2 === 0.30000000000000004`. Bir kiralamanın bakiyesi peşinat, taksitler ve ek ödemeler toplanıp tutardan çıkarılarak hesaplanır. Ondalıklı sayılarla bu toplamlar zamanla kuruş kayar ve borcu kapanmış bir müşteri "0,01 ₺ borçlu" görünür. Tamsayı toplama ise her zaman kesin sonuç verir.

### Aynı araç iki kez kiralanamaz

- **Tek kural, tek yer.** Tarih çakışması kontrolü [`availabilityService.ts`](api/src/services/availabilityService.ts) içinde yapılır; site listesi, araç detayı, rezervasyon oluşturma ve onaylama hep aynı `rangesOverlap` fonksiyonunu kullanır. Karşılaştırma gün düzeyinde ve kapsayıcıdır: bir aracın iade edildiği gün aynı araç başkasına teslim edilemez. Aynı gün devir bilinçli olarak ekibin elle onayına bırakılmıştır.
- **Listeleme anındaki bilgiye güvenilmez.** Müşteri filo sayfasında aracı "müsait" gördükten sonra formu doldururken araç başkasına gitmiş olabilir. Bu yüzden `POST /api/public/reservations` ucu müsaitliği yeniden, **Serializable** bir transaction içinde kontrol eder. Aynı araç için iki talep aynı anda gelirse PostgreSQL biri için serileştirme hatası verir (`P2034`). Kullanıcı bunu çöken bir istek olarak değil, "tekrar deneyin" diyen bir `409` olarak görür.
- **Bekleyen talep aracı kilitlemez, onay kilitler.** Siteden gelen talep `PENDING` durumunda başlar ve genel müsaitliği etkilemez. Aksi halde tek bir sahte form aracı günlerce kilitleyebilirdi. Kontrol, ekip talebi onaylarken aynı transaction düzeniyle tekrarlanır; aynı tarihler için ikinci onay reddedilir. Aynı telefon numarasından aynı araca çakışan ikinci talep ise en baştan kabul edilmez.
- **Serviste olan araç tamamen kapalıdır.** Servis dönüş tarihi sistemde tutulmadığı için güvenli olan taraf seçildi: serviste olan araç hiçbir tarih için kiralanamaz.

### Fiyat sunucuda hesaplanır

Rezervasyon isteğinde tutar alanı yoktur; gönderilse bile doğrulama şeması onu atar. Toplam tutar sunucuda, aracın veritabanındaki günlük ücretinden hesaplanır ([`quoteService.ts`](api/src/services/quoteService.ts)).

- Tarayıcıdan gelen hiçbir tutara güvenilemez; geliştirici araçlarıyla değiştirilebilir.
- Filo listesi, araç detayı ve rezervasyon ucu aynı `buildQuote` fonksiyonunu çağırır; ekranlar arasında fiyat farkı çıkamaz.
- Hesaplanan tutar rezervasyona `quotedAmount` olarak yazılır. Ekip daha sonra fiyatı değiştirse de müşteriye söylenen tutar kayıtta kalır.
- Tarihler sunucunun saat diliminden bağımsız olarak İstanbul saatine (`+03:00`) sabitlenerek okunur; bulut sunucusu UTC'de çalışsa bile gün sayısı değişmez.

### Herkese açık uçlar

- Rezervasyon oluşturma IP başına 15 dakikada 10 istekle, okuma uçları dakikada 120 istekle sınırlıdır.
- Sitede plakalar maskelenir (`34 ••• 07`).
- Rezervasyon sorgulamak için kod ve telefonun birlikte doğru olması gerekir. Kod yanlış da olsa telefon yanlış da olsa aynı hata mesajı döner; böylece sorgulama ucundan hangi kodların var olduğu öğrenilemez.
- Rezervasyon kodlarında birbirine karışan karakterler (`0/O`, `1/I/L`) kullanılmaz; kod telefonda harf harf okunabilir.

### Bilinen sınırlar

- Panelden elle açılan kiralamalar henüz müsaitlik servisinden geçmiyor. Çakışma kontrolü şimdilik yalnızca web talepleri ve onay akışında yapılıyor.
- Ödeme planındaki `pay1`–`pay4` sütunları ilk sürümden kaldı. Yeni ödemeler ayrı `Payment` tablosuna yazılıyor; eski sütunların bu tabloya taşınması planlanıyor.

---

## Teknoloji

**Arayüz**
- [React 18](https://react.dev) ve [TypeScript](https://www.typescriptlang.org) – uygulama
- [Vite](https://vitejs.dev) – geliştirme ve derleme
- [MUI](https://mui.com) – bileşen altyapısı, üzerine projeye özel tasarım sistemi
- [TanStack Query](https://tanstack.com/query) – sunucu verisi ve önbellek
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) – formlar ve doğrulama
- [React Router](https://reactrouter.com) – site ve panel yönlendirmesi

**Sunucu**
- [Node.js](https://nodejs.org) + [Express](https://expressjs.com) – REST API
- [Zod](https://zod.dev) – istek doğrulama
- [JWT](https://jwt.io) – panel oturumu; [Helmet](https://helmetjs.github.io) ve [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) – güvenlik başlıkları ve istek sınırı
- [Multer](https://github.com/expressjs/multer) – araç fotoğrafı yükleme; yerel, [Cloudinary](https://cloudinary.com) ya da S3 uyumlu depolama
- [node-cron](https://github.com/node-cron/node-cron) – zamanlanmış yedekleme

**Veri**
- [PostgreSQL](https://www.postgresql.org) – veritabanı
- [Prisma](https://www.prisma.io) – ORM ve migration'lar

**Dışa aktarma, test ve kod kalitesi**
- [SheetJS](https://sheetjs.com) – Excel; [jsPDF](https://github.com/parallax/jsPDF) – PDF rapor
- [Vitest](https://vitest.dev) ve [Jest](https://jestjs.io) – arayüz ve servis testleri
- [ESLint](https://eslint.org) + [typescript-eslint](https://typescript-eslint.io) – API'de `any` yasak, `console.log` uyarı verir

---

## Künye

- Araç fotoğrafları [Wikimedia Commons](https://commons.wikimedia.org)'tan, yazarlarının seçtiği CC BY / CC BY-SA lisanslarıyla kullanılmıştır. Yazar ve lisans listesi: [`docs/brand/vehicle-photo-credits.md`](docs/brand/vehicle-photo-credits.md). Görseller ilgili modelin temsilidir.
- Ana sayfadaki kapak görseli yapay zekâ ile oluşturulmuştur.
- Uygulamadaki müşteri, plaka, tutar ve iletişim bilgileri kurgusal demo verisidir.
