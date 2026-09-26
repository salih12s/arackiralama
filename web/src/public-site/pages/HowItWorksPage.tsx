import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { fonts, t } from '../theme';
import { site } from '../config';
import { setPageMeta } from '../utils/format';
import { PageHeader, headerBandSx } from '../components/common';

const steps = [
  { title: 'Tarihleri seçin', text: 'Teslim alma ve dönüş tarihlerinizi girerek güncel filoyu görüntüleyin.' },
  { title: 'Aracınızı belirleyin', text: 'Araç özelliklerini, günlük fiyatı ve seçtiğiniz tarihlerdeki müsaitliği inceleyin.' },
  { title: 'Onayınızı alın', text: 'Talebiniz ekibimize ulaşır; müsaitlik son kez kontrol edilir ve sizinle iletişime geçilir.' },
];

export default function HowItWorksPage() {
  useEffect(() => setPageMeta(`Nasıl Çalışır? — ${site.brandName}`, 'Araç kiralama sürecinin üç kolay adımı.'), []);
  return (
    <>
      <Box component="section" sx={headerBandSx}>
        <Container maxWidth="lg">
          <PageHeader
            crumbs={[{ label: 'Ana sayfa', to: '/' }, { label: 'Nasıl çalışır' }]}
            overline="Nasıl çalışır"
            title="Aracınız üç adımda hazır."
            subtitle="Online talep, gerçek müsaitlik ve doğrudan iletişim ile kiralama sürecini sade ve şeffaf tutuyoruz."
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {steps.map((step, index) => (
            <Box component="li" key={step.title} sx={{ bgcolor: t.raised, borderRadius: '18px', border: `1px solid ${t.lineSoft}`, p: { xs: 3, md: 3.5 }, display: 'grid', gap: 1, alignContent: 'start' }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: t.accentSoft, color: t.accent, font: `500 15px ${fonts.mono}`, mb: 1 }}>
                {index + 1}
              </Box>
              <Typography component="h2" sx={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: t.ink }}>{step.title}</Typography>
              <Typography sx={{ color: t.muted, fontSize: 15.5 }}>{step.text}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: { xs: 6, md: 8 }, display: 'grid', gap: { xs: 3, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, alignItems: 'start' }}>
          <Box>
            <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 28, md: 36 }, lineHeight: 1.1, color: t.ink }}>
              Bilmeniz gerekenler
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
              <Button component={RouterLink} to="/araclar" variant="contained" size="large" endIcon={<ArrowForward />}>Araçları gör</Button>
              <Button component={RouterLink} to="/sss" variant="outlined" size="large">Tüm sorular</Button>
            </Stack>
          </Box>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, borderTop: `1px solid ${t.ink}` }}>
            {site.rentalTerms.map((term) => (
              <Box component="li" key={term} sx={{ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr)', gap: 1.5, alignItems: 'baseline', py: 1.75, borderBottom: `1px solid ${t.line}` }}>
                <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.accent, transform: 'translateY(-2px)' }} />
                <Typography sx={{ color: t.ink, fontSize: 15.5 }}>{term}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </>
  );
}
