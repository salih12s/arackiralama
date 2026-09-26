import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Stack, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { fonts, t } from '../theme';
import { site } from '../config';
import { setPageMeta } from '../utils/format';
import { PageHeader, headerBandSx } from '../components/common';

export default function FaqPage() {
  useEffect(() => setPageMeta(`Sık Sorulan Sorular — ${site.brandName}`, 'Araç kiralama ve rezervasyon süreci hakkında sık sorulan sorular.'), []);
  return (
    <>
      <Box component="section" sx={headerBandSx}>
        <Container maxWidth="md">
          <PageHeader
            crumbs={[{ label: 'Ana sayfa', to: '/' }, { label: 'Sık sorulan sorular' }]}
            overline="S.S.S."
            title="Merak edilenler."
            subtitle="Rezervasyon öncesi en sık sorulan soruların cevapları."
          />
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ bgcolor: t.raised, borderRadius: '18px', border: `1px solid ${t.lineSoft}`, px: { xs: 2, md: 3 }, py: 1 }}>
          {site.faq.map((item, index) => (
            <Accordion key={item.q} defaultExpanded={index === 0} sx={{ borderBottom: index < site.faq.length - 1 ? `1px solid ${t.lineSoft}` : 0 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: t.muted }} />} sx={{ px: 0, py: 0.75 }}>
                <Typography component="h2" sx={{ fontWeight: 700, fontSize: 16.5, color: t.ink }}>{item.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                <Typography sx={{ color: t.muted, fontSize: 15.5 }}>{item.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mt: 4, pt: 3, borderTop: `1px solid ${t.line}` }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: t.ink }}>Cevabını bulamadınız mı?</Typography>
            <Typography sx={{ color: t.muted, fontSize: 15 }}>
              {site.workingHours} ·{' '}
              <Box component="a" href={`tel:${site.phone}`} sx={{ color: t.accent, fontFamily: fonts.mono, textDecoration: 'none' }}>{site.phoneDisplay}</Box>
            </Typography>
          </Box>
          <Button component={RouterLink} to="/iletisim" variant="outlined">İletişime geçin</Button>
        </Stack>
      </Container>
    </>
  );
}
