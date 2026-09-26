import { ReactNode, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Container, Stack, Typography } from '@mui/material';
import { ArrowForward, ExpandMore, FlightTakeoff, HeadsetMic, HomeOutlined, StorefrontOutlined, WhatsApp } from '@mui/icons-material';
import { publicApi } from '../api/client';
import { site } from '../config';
import { ease, fonts, t } from '../theme';
import { setPageMeta } from '../utils/format';
import SearchForm from '../components/SearchForm';
import VehicleCard, { VehicleCardSkeleton, vehicleGridSx } from '../components/VehicleCard';
import { EmptyState, SectionHeading } from '../components/common';

const steps = [
  { title: 'Tarihleri seçin', text: 'Alış ve iade tarihinizi girin; yalnız o tarihlerde gerçekten müsait araçları görün.' },
  { title: 'Aracı belirleyin', text: 'Günlük fiyatı, toplam tutarı ve teknik özellikleri baştan açıkça görün.' },
  { title: 'Onayınızı alın', text: 'Ekibimiz müsaitliği doğrular ve sizi arayarak rezervasyonu kesinleştirir.' },
];

/** Katalog dilinde koşullar: her satır tek bir gerçek kural. */
const terms: { label: string; value: string; included: boolean }[] = [
  { label: 'Kasko ve zorunlu trafik sigortası', value: 'Fiyata dahil', included: true },
  { label: 'Standart bakım', value: 'Fiyata dahil', included: true },
  { label: 'Yakıt', value: 'Teslim aldığınız seviyede iade', included: false },
  { label: 'HGS kullanımı', value: 'Kullanım size ait', included: false },
  { label: 'Sürücü', value: 'En az 21 yaş, 2 yıllık ehliyet', included: false },
  { label: 'Onay', value: 'Ekibimiz telefonla onaylar', included: true },
  { label: 'İptal', value: 'Onaylanmamış taleplerde ücretsiz', included: true },
];

const deliveryNote = 'Ekibimiz sizi arayarak teslimat saatini ve yerini planlar.';

function pickupMeta(location: string): { icon: ReactNode; text: string } {
  const lower = location.toLocaleLowerCase('tr-TR');
  if (lower.includes('havalimanı')) return { icon: <FlightTakeoff />, text: deliveryNote };
  if (lower.includes('adres')) return { icon: <HomeOutlined />, text: 'Araç belirttiğiniz adrese getirilir. ' + deliveryNote };
  return { icon: <StorefrontOutlined />, text: site.address };
}

const whatsappHref = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Merhaba, araç kiralama hakkında bilgi almak istiyorum.')}`;

export default function HomePage() {
  useEffect(
    () =>
      setPageMeta(
        `${site.brandName} — Araç Kiralama`,
        'Müsait araçları gerçek zamanlı inceleyin ve rezervasyon talebinizi online oluşturun.',
      ),
    [],
  );
  const vehiclesQuery = useQuery({
    queryKey: ['home-vehicles'],
    queryFn: () => publicApi.getVehicles(),
    staleTime: 60_000,
  });
  const vehicles = vehiclesQuery.data?.data.data || [];
  const available = vehicles.filter((vehicle) => vehicle.available);
  const featured = available.slice(0, 6);
  const heroImage = site.heroImage || available.find((vehicle) => vehicle.imageUrl)?.imageUrl || vehicles.find((vehicle) => vehicle.imageUrl)?.imageUrl;

  return (
    <Box sx={{ overflowX: 'clip' }}>
      {/* ---------------- Hero: tam genişlik fotoğraf ---------------- */}
      <Box component="section" aria-labelledby="hero-title" sx={{ position: 'relative', bgcolor: '#1E1416', color: '#fff', overflow: 'hidden' }}>
        {heroImage && (
          <Box
            component="img"
            src={heroImage}
            srcSet={site.heroImage ? site.heroImageSrcSet || undefined : undefined}
            sizes="100vw"
            alt=""
            loading="eager"
            decoding="async"
            sx={{ position: { xs: 'relative', md: 'absolute' }, inset: { md: 0 }, display: 'block', width: '100%', height: { xs: 'auto', md: '100%' }, aspectRatio: { xs: '4 / 3', sm: '16 / 9', md: 'auto' }, objectFit: 'cover', objectPosition: site.heroImage ? { xs: site.heroImagePosition.mobile, md: site.heroImagePosition.desktop } : { xs: '60% center', md: '70% center' } }}
          />
        )}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: {
              xs: 'linear-gradient(180deg, rgba(30,20,22,0) 0%, rgba(30,20,22,0) 32%, rgba(30,20,22,.75) 48%, #1E1416 58%)',
              md: 'linear-gradient(90deg, rgba(24,14,16,.86) 0%, rgba(24,14,16,.55) 42%, rgba(24,14,16,.05) 78%), linear-gradient(180deg, transparent 60%, rgba(24,14,16,.45) 100%)',
            },
          }}
        />
        {site.heroImage && site.heroImageCredit && (
          <Box {...(site.heroImageCredit.url ? { component: 'a', href: site.heroImageCredit.url, target: '_blank', rel: 'noopener' } : { component: 'span' })} sx={{ position: 'absolute', right: 16, top: 14, zIndex: 1, display: { xs: 'none', md: 'block' }, fontSize: 11.5, color: 'rgba(255,255,255,.55)', textDecoration: 'none', '&:hover': { color: 'rgba(255,255,255,.85)' } }}>
            {site.heroImageCredit.label}
          </Box>
        )}
        <Container maxWidth="lg" sx={{ position: 'relative', minHeight: { md: 580 }, display: 'flex', alignItems: { md: 'center' }, mt: { xs: -9, sm: -12, md: 0 }, pt: { md: 6 }, pb: { xs: 10, md: 16 } }}>
          <Box sx={{ maxWidth: 620, display: 'grid', gap: 2 }}>
            {available.length > 0 && (
              <Box sx={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.6, borderRadius: 999, bgcolor: 'rgba(255,255,255,.14)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.18)', font: `500 12.5px ${fonts.mono}` }}>
                <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ADE80' }} />
                {available.length} araç şu an müsait
              </Box>
            )}
            <Typography id="hero-title" component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 40, sm: 54, md: 66 }, lineHeight: 1.04, letterSpacing: '-.02em', textShadow: '0 2px 24px rgba(0,0,0,.25)' }}>
              {site.brandName} Araç Kiralama
            </Typography>
            <Typography sx={{ fontSize: { xs: 17, md: 20 }, color: 'rgba(255,255,255,.86)', maxWidth: 520, lineHeight: 1.5 }}>
              İstanbul'da günlük, haftalık ve aylık kiralama. Seçtiğiniz tarihte gerçekten müsait araçlar, baştan belli toplam fiyat.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Rezervasyon kutusu hero'nun altına biner; flow-root negatif boşluğun gri zemini yukarı çekmesini engeller. */}
      <Box sx={{ bgcolor: t.surface, display: 'flow-root' }}>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, mt: { xs: -7, md: -11 } }}>
        <SearchForm showDurations submitLabel="Araçları Göster" />
      </Container>

      {/* ---------------- Filo ---------------- */}
      <Box component="section" aria-labelledby="fleet-title" sx={{ pt: { xs: 7, md: 9 }, pb: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: { xs: 4, md: 5 } }}>
            <Box id="fleet-title" sx={{ "& > div": { mb: 0 } }}>
              <SectionHeading overline="Filomuz" title="Her ihtiyaca uygun araç" subtitle="Yalnız aktif ve kiralamaya hazır araçlar listelenir." align="left" />
            </Box>
            <Button component={RouterLink} to="/araclar" variant="outlined" endIcon={<ArrowForward />} sx={{ flex: 'none', alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
              Tüm araçlar{vehicles.length ? ` (${vehicles.length})` : ''}
            </Button>
          </Stack>
          {vehiclesQuery.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>Araçlar yüklenemedi. Sayfayı yenileyip tekrar deneyin.</Alert>
          )}
          <Box sx={vehicleGridSx}>
            {vehiclesQuery.isLoading && [1, 2, 3].map((i) => <VehicleCardSkeleton key={i} />)}
            {featured.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
          </Box>
          {!vehiclesQuery.isLoading && !vehiclesQuery.isError && featured.length === 0 && (
            <EmptyState title="Şu anda müsait araç yok" subtitle="Tarih seçerek arama yapabilir ya da bizi arayabilirsiniz." />
          )}
        </Container>
      </Box>
      </Box>

      {/* ---------------- Teslim noktaları ---------------- */}
      <Box component="section" aria-labelledby="pickup-title" sx={{ py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Box id="pickup-title">
            <SectionHeading overline="Teslim noktaları" title="Aracınızı nereden alacaksınız?" subtitle="Ofisimizden, iki havalimanından ya da adresinize teslim." />
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {site.pickupLocations.map((location, index) => {
              const meta = pickupMeta(location);
              return (
                <Box
                  key={location}
                  component={RouterLink}
                  to={`/rezervasyon?pickup=${encodeURIComponent(location)}`}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 180, md: 250 },
                    p: 2.75,
                    borderRadius: '18px',
                    color: '#fff',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 2,
                    background: `linear-gradient(${150 + index * 12}deg, #8A2A3C 0%, #6E1F2F 55%, #481320 100%)`,
                    transition: `transform .25s ${ease}`,
                    '@media (hover: hover)': { '&:hover': { transform: 'translateY(-3px)' }, '&:hover .pickup-cta': { bgcolor: '#F4EDE2', color: '#6E1F2F' } },
                    // Logodaki yol şeritlerinden gelen ince çizgiler
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: -40,
                      bottom: -30,
                      width: 220,
                      height: 120,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,.12)',
                      borderLeftColor: 'transparent',
                      transform: 'rotate(-12deg)',
                    },
                  }}
                >
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.14)', '& svg': { fontSize: 24 } }}>
                    {meta.icon}
                  </Box>
                  <Box sx={{ display: 'grid', gap: 0.75, position: 'relative', zIndex: 1 }}>
                    <Typography component="h3" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 22, letterSpacing: '-.01em', lineHeight: 1.2 }}>{location}</Typography>
                    <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,.78)', lineHeight: 1.5 }}>{meta.text}</Typography>
                    <Box className="pickup-cta" component="span" sx={{ mt: 1, justifySelf: 'start', px: 2, py: 0.75, borderRadius: 999, border: '1px solid rgba(255,255,255,.55)', fontSize: 13.5, fontWeight: 700, transition: 'background-color .15s ease, color .15s ease' }}>
                      Buradan kirala
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* ---------------- Nasıl çalışır: gerçek bir sıra ---------------- */}
      <Box component="section" id="nasil-calisir" sx={{ bgcolor: t.surface, py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <SectionHeading overline="Nasıl çalışır" title="Üç adımda yola çıkın" />
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {steps.map((step, index) => (
              <Box component="li" key={step.title} sx={{ bgcolor: t.raised, borderRadius: '18px', border: `1px solid ${t.lineSoft}`, p: { xs: 3, md: 3.5 }, display: 'grid', gap: 1, alignContent: 'start' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: t.accentSoft, color: t.accent, font: `500 15px ${fonts.mono}`, mb: 1 }}>
                  {index + 1}
                </Box>
                <Typography component="h3" sx={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: t.ink }}>{step.title}</Typography>
                <Typography sx={{ color: t.muted, fontSize: 15.5 }}>{step.text}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ---------------- Koşullar: katalog tablosu ---------------- */}
      <Box component="section" aria-labelledby="terms-title" sx={{ py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gap: { xs: 3, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, alignItems: 'start' }}>
            <Box>
              <Typography sx={{ color: t.accent, fontWeight: 700, letterSpacing: '.14em', fontSize: 12, textTransform: 'uppercase', mb: 1.25 }}>Kiralama koşulları</Typography>
              <Typography id="terms-title" component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 30, md: 42 }, letterSpacing: '-.015em', lineHeight: 1.1, color: t.ink }}>
                Net koşullar, sürpriz yok.
              </Typography>
              <Typography sx={{ color: t.muted, mt: 1.5, maxWidth: 380 }}>
                Fiyata neyin dahil olduğunu rezervasyondan önce bilin.
              </Typography>
              <Button component={RouterLink} to="/sss" variant="outlined" sx={{ mt: 3 }}>Tüm sorular</Button>
            </Box>
            <Box component="dl" sx={{ m: 0, borderTop: `1px solid ${t.ink}` }}>
              {terms.map((row) => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1.1fr)' }, gap: { xs: 0.5, sm: 3 }, py: 2, borderBottom: `1px solid ${t.line}` }}>
                  <Box component="dt" sx={{ color: t.ink, fontWeight: 700 }}>{row.label}</Box>
                  <Box component="dd" sx={{ m: 0, color: t.muted, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', bgcolor: row.included ? t.accent : t.line }} />
                    {row.value}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ---------------- Sorular ---------------- */}
      <Box component="section" id="sss" sx={{ bgcolor: t.surface, py: { xs: 8, md: 11 } }}>
        <Container maxWidth="md">
          <SectionHeading title="Sıkça sorulan sorular" />
          <Box sx={{ bgcolor: t.raised, borderRadius: '18px', border: `1px solid ${t.lineSoft}`, px: { xs: 2, md: 3 }, py: 1 }}>
            {site.faq.map((item, index) => (
              <Accordion key={item.q} sx={{ borderBottom: index < site.faq.length - 1 ? `1px solid ${t.lineSoft}` : 0 }}>
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: t.muted }} />} sx={{ px: 0, py: 0.75 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 16.5, color: t.ink }}>{item.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                  <Typography sx={{ color: t.muted, fontSize: 15.5 }}>{item.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ---------------- İletişim şeridi ---------------- */}
      <Box component="section" aria-labelledby="contact-title" sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'auto minmax(0, 1fr) auto' },
              alignItems: 'center',
              gap: { xs: 2.5, md: 4 },
              p: { xs: 3, md: 4 },
              borderRadius: '22px',
              border: `1px solid ${t.lineSoft}`,
              bgcolor: t.raised,
              boxShadow: t.shadow,
            }}
          >
            <Box sx={{ width: 64, height: 64, borderRadius: '18px', display: 'grid', placeItems: 'center', bgcolor: t.accentSoft, color: t.accent, '& svg': { fontSize: 30 } }}>
              <HeadsetMic />
            </Box>
            <Box>
              <Typography id="contact-title" component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 24, md: 28 }, letterSpacing: '-.01em', color: t.ink }}>
                Rezervasyon ve destek hattı
              </Typography>
              <Typography sx={{ color: t.muted, mt: 0.5 }}>
                {site.workingHours}. Aklınıza takılan her şey için arayın ya da yazın.
              </Typography>
              <Typography component="a" href={`tel:${site.phone}`} sx={{ display: 'inline-block', mt: 1, font: `500 22px ${fonts.mono}`, color: t.accent, textDecoration: 'none' }}>
                {site.phoneDisplay}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button href={whatsappHref} target="_blank" rel="noopener" variant="contained" size="large" startIcon={<WhatsApp />}>
                WhatsApp'tan yazın
              </Button>
              <Button component={RouterLink} to="/rezervasyon-sorgula" variant="outlined" size="large">
                Rezervasyon sorgula
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
