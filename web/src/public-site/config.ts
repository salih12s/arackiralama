/**
 * İşletme bilgileri — kendi bilgilerinizle güncelleyin.
 * Sitedeki tüm iletişim/şart metinleri buradan beslenir.
 */
export const site = {
  brandName: "SS Filo",
  tagline: "Araç Kiralama",
  heroMessage: "İhtiyacınıza uygun araç birkaç adım uzağınızda.",
  description:
    "SS Filo, bakımlı ve sigortalı araç filosuyla günlük, haftalık ve aylık kiralama çözümleri sunar.",

  phone: "+905550000000",
  phoneDisplay: "0555 000 00 00",
  whatsapp: "905550000000",
  email: "info@ssfilo.com",
  address: "Örnek Mah. Atatürk Cad. No:12, Kadıköy / İstanbul",
  workingHours: "Her gün 09:00 – 21:00",

  /**
   * Ana sayfa hero fotoğrafı (tam genişlik). En az 2400 px genişlikte, aracın
   * yolda/manzarada göründüğü yatay bir fotoğraf önerilir; web/public altına
   * koyup yolunu yazın (örn. "/brand/hero.jpg"). Boşsa filodaki ilk fotoğraf kullanılır.
   */
  heroImage: "/brand/hero-mercedes-1916.jpg",
  /** Ekran genişliğine göre tarayıcının seçeceği sürümler (isteğe bağlı). */
  heroImageSrcSet: "/brand/hero-mercedes-1200.jpg 1200w, /brand/hero-mercedes-1916.jpg 1916w",
  /** Kırpma odağı: araç sağda kalsın. */
  heroImagePosition: { mobile: "80% center", desktop: "center center" },
  /** Görselin kaynağı hero'nun köşesinde küçük yazıyla gösterilir; url isteğe bağlı. */
  heroImageCredit: {
    label: "Görsel yapay zekâ ile oluşturulmuştur.",
    url: "",
  },

  pickupLocations: [
    "Ofis (Kadıköy)",
    "İstanbul Havalimanı",
    "Sabiha Gökçen Havalimanı",
    "Adrese Teslim",
  ],

  // Kiralama şartları özeti — detay sayfası ve rezervasyon adımında gösterilir
  rentalTerms: [
    "Sürücünün en az 21 yaşında ve 2 yıllık ehliyet sahibi olması gerekir.",
    "Araçlar kasko ve zorunlu trafik sigortasıyla teslim edilir.",
    "Teslimde alınan yakıt seviyesiyle iade edilmesi rica olunur.",
    "Rezervasyon talepleri ekibimizce telefonla onaylandıktan sonra kesinleşir.",
  ],

  faq: [
    {
      q: "Rezervasyonum hemen kesinleşir mi?",
      a: "Hayır. Online oluşturduğunuz talep ekibimize düşer; müsaitlik doğrulandıktan sonra sizi arayarak rezervasyonu kesinleştiririz.",
    },
    {
      q: "Fiyata neler dahil?",
      a: "Günlük fiyata kasko, zorunlu trafik sigortası ve standart bakım dahildir. Yakıt ve HGS kullanımı müşteriye aittir.",
    },
    {
      q: "Aracı farklı bir noktada teslim alabilir miyim?",
      a: "Evet. Rezervasyon adımında teslim noktası seçebilirsiniz; havalimanı ve adrese teslim seçeneklerinde ekibimiz sizi arayarak detayları planlar.",
    },
    {
      q: "Rezervasyonumu nasıl takip ederim?",
      a: 'Talebiniz oluşturulduğunda size özel bir rezervasyon kodu verilir. "Rezervasyon Sorgula" sayfasından kodunuz ve telefon numaranızla durumu görebilirsiniz.',
    },
    {
      q: "İptal etmek istersem ne yapmalıyım?",
      a: "Bizi telefonla aramanız yeterli. Onaylanmamış talepler için herhangi bir ücret alınmaz.",
    },
  ],
};
