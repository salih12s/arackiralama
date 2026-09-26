import { useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { site } from '../config';
import { photoCredits } from '../photoCredits';
import { fonts, t } from '../theme';
import { setPageMeta } from '../utils/format';
import { PageHeader, headerBandSx } from '../components/common';

export default function PhotoCreditsPage() {
  useEffect(() => setPageMeta(`Görsel kaynakları — ${site.brandName}`, 'Sitede kullanılan araç fotoğraflarının yazar ve lisans bilgileri.'), []);

  return (
    <>
      <Box component="section" sx={headerBandSx}>
        <Container maxWidth="md">
          <PageHeader
            crumbs={[{ label: 'Ana sayfa', to: '/' }, { label: 'Görsel kaynakları' }]}
            title="Görsel kaynakları"
            subtitle="Araç fotoğrafları Wikimedia Commons'tan, yazarlarının seçtiği Creative Commons lisanslarıyla kullanılmıştır. Ana sayfadaki kapak görseli yapay zekâ ile oluşturulmuştur."
          />
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
        <Box component="dl" sx={{ m: 0, borderTop: `1px solid ${t.ink}` }}>
          {photoCredits.map((credit) => (
            <Box
              key={credit.vehicle}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1.4fr)' }, gap: { xs: 0.5, sm: 3 }, py: 2, borderBottom: `1px solid ${t.line}` }}
            >
              <Box component="dt" sx={{ fontWeight: 700, color: t.ink }}>{credit.vehicle}</Box>
              <Box component="dd" sx={{ m: 0, color: t.muted, fontSize: 15 }}>
                <Box component="a" href={credit.source} target="_blank" rel="noopener" sx={{ color: t.ink, textDecorationColor: t.line, textUnderlineOffset: 3 }}>
                  Fotoğraf: {credit.author}
                </Box>
                {' · '}
                {credit.licenseUrl ? (
                  <Box component="a" href={credit.licenseUrl} target="_blank" rel="noopener license" sx={{ color: t.muted, fontFamily: fonts.mono, fontSize: 13 }}>
                    {credit.license}
                  </Box>
                ) : (
                  <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 13 }}>{credit.license}</Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
        <Typography sx={{ color: t.subtle, fontSize: 13.5, mt: 3 }}>
          Fotoğraflar kırpılmış ve yeniden boyutlandırılmıştır. Görseller ilgili modelin temsilidir; kiralanan aracın kendisi farklı renk ve donanımda olabilir.
        </Typography>
      </Container>
    </>
  );
}
