import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { fonts, t } from '../theme';
import { site } from '../config';
import { setPageMeta } from '../utils/format';

export default function NotFoundPage() {
  useEffect(() => setPageMeta(`Sayfa bulunamadı — ${site.brandName}`), []);
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 10, md: 14 } }}>
      <Stack alignItems="center" spacing={1.5} textAlign="center">
        <Typography aria-hidden sx={{ fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 700, fontSize: { xs: 110, md: 150 }, lineHeight: 0.9, color: t.accent, letterSpacing: '-.04em' }}>
          404
        </Typography>
        <Box sx={{ width: 48, height: 2, bgcolor: t.line, my: 1 }} />
        <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, color: t.ink, fontSize: { xs: 28, md: 34 } }}>
          Bu yol bir yere çıkmıyor.
        </Typography>
        <Typography sx={{ color: t.muted, maxWidth: 380 }}>
          Aradığınız sayfa taşınmış veya kaldırılmış olabilir.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ pt: 2 }}>
          <Button variant="contained" size="large" component={RouterLink} to="/">Ana sayfaya dön</Button>
          <Button variant="outlined" size="large" component={RouterLink} to="/araclar">Araçları gör</Button>
        </Stack>
      </Stack>
    </Container>
  );
}
