import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Container, Stack, TextField, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import { apiErrorMessage, publicApi, ReservationLookupResult } from '../api/client';
import { site } from '../config';
import { fonts, t } from '../theme';
import { formatDate, formatTL, setPageMeta } from '../utils/format';
import { PageHeader, SpecList, StatusPill, Tone, headerBandSx, panelSx } from '../components/common';

const statusMap: Record<ReservationLookupResult['status'], { label: string; tone: Tone; note: string }> = {
  PENDING: { label: 'Onay bekliyor', tone: 'warning', note: 'Talebiniz inceleniyor. Ekibimiz en kısa sürede sizi arayacak.' },
  CONFIRMED: { label: 'Onaylandı', tone: 'success', note: 'Rezervasyonunuz kesinleşti. Teslim günü görüşmek üzere.' },
  CANCELLED: { label: 'İptal edildi', tone: 'danger', note: 'Bu rezervasyon iptal edildi. Yeni bir talep oluşturabilirsiniz.' },
  COMPLETED: { label: 'Tamamlandı', tone: 'neutral', note: 'Kiralama tamamlandı. Bizi tercih ettiğiniz için teşekkürler.' },
};

export default function LookupPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('kod') || '');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setPageMeta(`Rezervasyon Sorgula — ${site.brandName}`, 'Rezervasyon kodunuz ve telefonunuzla talebinizin durumunu sorgulayın.');
  }, []);

  const lookupMutation = useMutation({
    mutationFn: () => publicApi.lookupReservation(code.trim().toUpperCase().replace(/\s/g, ''), phone.trim()),
  });

  const result = lookupMutation.data?.data.data;
  // Kod: SS-XXXXXX (eski talepler EF-XXXXXX); tire ve boşluk isteğe bağlı.
  const codeValid = /^(SS|EF)[A-Z0-9]{6}$/.test(code.trim().toUpperCase().replace(/[\s-]/g, ''));
  const canSubmit = codeValid && phone.replace(/\D/g, '').length >= 4;

  const status = result ? statusMap[result.status] : null;

  return (
    <>
      <Box sx={headerBandSx}>
        <Container maxWidth="md">
          <PageHeader
            crumbs={[{ label: 'Ana sayfa', to: '/' }, { label: 'Rezervasyon sorgula' }]}
            title="Rezervasyon sorgula"
            subtitle="Talebinizi oluştururken verilen kod ve telefon numaranızla (veya son 4 hanesiyle) durumu görün."
          />
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: result ? 'minmax(0, 5fr) minmax(0, 6fr)' : 'minmax(0, 1fr)' }, alignItems: 'start', maxWidth: result ? 'none' : 520 }}>
          <Box
            component="form"
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); if (canSubmit) lookupMutation.mutate(); }}
            sx={panelSx}
          >
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Rezervasyon kodu"
                placeholder="SS-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                inputProps={{ autoCapitalize: 'characters', spellCheck: false, style: { fontFamily: fonts.mono, letterSpacing: '.06em' } }}
              />
              <TextField
                fullWidth
                label="Telefon veya son 4 hanesi"
                placeholder="05xx xxx xx xx"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button type="submit" variant="contained" size="large" startIcon={<Search />} disabled={!canSubmit || lookupMutation.isPending}>
                {lookupMutation.isPending ? 'Sorgulanıyor…' : 'Sorgula'}
              </Button>
            </Stack>
            {lookupMutation.isError && (
              <Alert severity="warning" sx={{ mt: 2.5 }}>
                {apiErrorMessage(lookupMutation.error, 'Bu bilgilerle bir rezervasyon bulunamadı.')}
              </Alert>
            )}
          </Box>

          {result && status && (
            <Box aria-live="polite" sx={{ ...panelSx, boxShadow: t.shadow }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: t.muted, textTransform: 'uppercase' }}>Kod</Typography>
                  <Typography sx={{ font: `500 24px ${fonts.mono}`, color: t.accent, letterSpacing: '.05em' }}>{result.code}</Typography>
                </Box>
                <StatusPill label={status.label} tone={status.tone} />
              </Stack>
              <SpecList
                dense
                emphasizeLast={result.totalTL != null}
                rows={[
                  { label: 'Araç', value: result.vehicleName },
                  { label: 'Alış', value: `${formatDate(result.startDate)} · ${result.pickupTime}` },
                  { label: 'İade', value: formatDate(result.endDate) },
                  { label: 'Süre', value: `${result.days} gün` },
                  ...(result.pickupLocation ? [{ label: 'Teslim noktası', value: result.pickupLocation }] : []),
                  ...(result.totalTL != null ? [{ label: 'Tahmini toplam', value: formatTL(result.totalTL), mono: true }] : []),
                ]}
              />
              <Typography sx={{ mt: 2.5, color: t.muted, fontSize: 14.5 }}>
                {status.note}
                {result.status === 'PENDING' && (
                  <>
                    {' '}Dilerseniz{' '}
                    <Box component="a" href={`tel:${site.phone}`} sx={{ color: t.accent, fontWeight: 700, textDecoration: 'none', fontFamily: fonts.mono }}>
                      {site.phoneDisplay}
                    </Box>{' '}
                    numarasından bize ulaşın.
                  </>
                )}
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}
