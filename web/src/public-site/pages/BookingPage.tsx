import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, ArrowForward, Check, ContentCopy, DirectionsCar } from '@mui/icons-material';
import dayjs from 'dayjs';
import { apiErrorMessage, publicApi, PublicVehicle } from '../api/client';
import { site } from '../config';
import { ease, fonts, t } from '../theme';
import { formatDate, formatTL, setPageMeta } from '../utils/format';
import VehicleCard, { VehicleCardSkeleton, VehicleImage } from '../components/VehicleCard';
import { BrandBadge } from '../components/BrandLogo';
import { EmptyState, Overline, PageHeader, Segmented, SpecList, headerBandSx, panelSx } from '../components/common';

const steps = ['Tarih ve teslim', 'Araç seçimi', 'Bilgileriniz', 'Özet ve onay'];

const TIME_OPTIONS = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

const customerSchema = z.object({
  firstName: z.string().trim().min(2, 'Adınızı girin').max(50),
  lastName: z.string().trim().min(2, 'Soyadınızı girin').max(50),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .pipe(z.string().regex(/^(\+90|0)?5\d{9}$/, 'Geçerli bir cep telefonu girin (05xx...)')),
  email: z.string().trim().email('Geçerli bir e-posta girin').max(120).optional().or(z.literal('')),
  note: z.string().trim().max(500, 'Not en fazla 500 karakter olabilir').optional(),
  termsAccepted: z.boolean().refine((value) => value, 'Kiralama şartlarını kabul etmelisiniz'),
  privacyAccepted: z.boolean().refine((value) => value, 'KVKK aydınlatma metnini onaylamalısınız'),
});

type CustomerForm = z.infer<typeof customerSchema>;

function pickupHint(location: string) {
  const lower = location.toLocaleLowerCase('tr-TR');
  if (lower.includes('havalimanı')) return 'Ekibimiz arayıp saati planlar';
  if (lower.includes('adres')) return 'Araç adresinize getirilir';
  return site.address;
}

/** Numaralı adım göstergesi; tamamlanan adımlara geri dönülebilir. */
function StepIndicator({ active, onJump, locked }: { active: number; onJump: (step: number) => void; locked: boolean }) {
  return (
    <Box component="ol" aria-label="Rezervasyon adımları" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: { xs: 0.75, sm: 1.5 } }}>
      {steps.map((label, index) => {
        const done = index < active;
        const current = index === active;
        const content = (
          <>
            <Box sx={{ height: 3, borderRadius: 3, bgcolor: done || current ? t.accent : t.line, transition: `background-color .3s ${ease}` }} />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }}>
              <Box
                component="span"
                sx={{
                  width: 24,
                  height: 24,
                  flex: 'none',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  font: `500 12px ${fonts.mono}`,
                  bgcolor: done ? t.accentFill : current ? t.accentSoft : 'transparent',
                  color: done ? t.onAccent : current ? t.accent : t.subtle,
                  border: done || current ? 0 : `1px solid ${t.line}`,
                }}
              >
                {done ? <Check sx={{ fontSize: 14 }} /> : index + 1}
              </Box>
              <Box component="span" sx={{ display: { xs: current ? 'inline' : 'none', sm: 'inline' }, fontSize: 14, fontWeight: current ? 800 : 600, color: current ? t.ink : t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </Box>
            </Stack>
          </>
        );
        return (
          <Box component="li" key={label} aria-current={current ? 'step' : undefined} sx={{ minWidth: 0 }}>
            {done && !locked ? (
              <Box component="button" type="button" onClick={() => onJump(index)} aria-label={`${label} adımına dön`} sx={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer', borderRadius: '6px', '&:focus-visible': { outline: `2px solid ${t.accent}`, outlineOffset: 4 } }}>
                {content}
              </Box>
            ) : content}
          </Box>
        );
      })}
    </Box>
  );
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const preselectedVehicleId = searchParams.get('arac');

  const [activeStep, setActiveStep] = useState(0);
  const [start, setStart] = useState(searchParams.get('start') || dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [end, setEnd] = useState(searchParams.get('end') || dayjs().add(4, 'day').format('YYYY-MM-DD'));
  const [pickupTime, setPickupTime] = useState(searchParams.get('pickupTime') || '10:00');
  const [pickupLocation, setPickupLocation] = useState(searchParams.get('pickup') || site.pickupLocations[0]);
  const [selectedVehicle, setSelectedVehicle] = useState<PublicVehicle | null>(null);
  const [customer, setCustomer] = useState<CustomerForm | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPageMeta(`Rezervasyon — ${site.brandName}`, 'Online araç rezervasyon talebi oluşturun.');
    window.scrollTo({ top: 0 });
  }, [activeStep]);

  const validRange = Boolean(start && end && dayjs(end).isAfter(dayjs(start)));

  // Araç listesi — 2. adımda tarihe göre müsaitlik + teklif içerir
  const vehiclesQuery = useQuery({
    queryKey: ['booking-vehicles', start, end],
    queryFn: () => publicApi.getVehicles({ start, end }),
    enabled: validRange && (activeStep >= 1 || Boolean(preselectedVehicleId)),
    staleTime: 15_000,
  });
  const vehicles = vehiclesQuery.data?.data.data || [];

  // Karttan gelindiyse aracı otomatik seç
  useEffect(() => {
    if (preselectedVehicleId && !selectedVehicle && vehicles.length > 0) {
      const match = vehicles.find((vehicle) => vehicle.id === preselectedVehicleId);
      if (match?.available) setSelectedVehicle(match);
    }
  }, [preselectedVehicleId, vehicles, selectedVehicle]);

  // Tarih değişirse seçili aracın müsaitliği/teklifi tazelensin
  useEffect(() => {
    if (selectedVehicle) {
      const fresh = vehicles.find((vehicle) => vehicle.id === selectedVehicle.id);
      if (fresh && fresh !== selectedVehicle) setSelectedVehicle(fresh.available ? fresh : null);
    }
  }, [vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', note: '', termsAccepted: false, privacyAccepted: false },
  });

  const reservationMutation = useMutation({
    mutationFn: () =>
      publicApi.createReservation({
        vehicleId: selectedVehicle!.id,
        fullName: `${customer!.firstName} ${customer!.lastName}`.trim(),
        phone: customer!.phone,
        email: customer!.email || undefined,
        startDate: start,
        endDate: end,
        pickupTime,
        pickupLocation,
        note: customer!.note || undefined,
        termsAccepted: true,
      }),
  });

  const quote = selectedVehicle?.quote ?? null;
  const days = useMemo(() => Math.max(1, dayjs(end).diff(dayjs(start), 'day')), [start, end]);
  const errors = form.formState.errors;

  // ------------------------- BAŞARI EKRANI -------------------------
  if (reservationMutation.isSuccess) {
    const result = reservationMutation.data.data;
    const copyCode = () => {
      navigator.clipboard?.writeText(result.reservation.code).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }, () => undefined);
    };
    return (
      <Box sx={{ bgcolor: t.surface, py: { xs: 5, md: 9 }, minHeight: '70vh' }}>
        <Container maxWidth="sm">
          <Box sx={{ ...panelSx, p: 0, boxShadow: t.shadow, overflow: 'hidden' }}>
            <Box sx={{ p: { xs: 3, md: 4.5 }, textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 1.5 }}>
              <BrandBadge size={84} />
              <Overline sx={{ mt: 1 }}>Talebiniz alındı</Overline>
              <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 30, md: 36 }, lineHeight: 1.1, color: t.ink }}>
                Teşekkürler, {customer?.firstName}.
              </Typography>
              <Typography sx={{ color: t.muted, maxWidth: 420 }}>
                Talebiniz <strong>onay bekliyor</strong>. Ekibimiz müsaitliği doğrulayıp en kısa sürede sizi arayarak rezervasyonunuzu kesinleştirecek.
              </Typography>
            </Box>

            {/* Bilet delikli ayırıcı */}
            <Box aria-hidden sx={{ position: 'relative', height: 0, borderTop: `1.5px dashed ${t.line}`, mx: 3, '&::before, &::after': { content: '""', position: 'absolute', top: -13, width: 26, height: 26, borderRadius: '50%', bgcolor: t.surface } , '&::before': { left: -38 }, '&::after': { right: -38 } }} />

            <Box sx={{ p: { xs: 3, md: 4.5 } }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: t.muted, textTransform: 'uppercase' }}>Rezervasyon kodunuz</Typography>
                <Typography sx={{ font: `500 34px ${fonts.mono}`, letterSpacing: '.06em', color: t.accent, mt: 0.5 }}>
                  {result.reservation.code}
                </Typography>
                <Button size="small" onClick={copyCode} startIcon={copied ? <Check sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 15 }} />} sx={{ mt: 0.5 }}>
                  {copied ? 'Kopyalandı' : 'Kodu kopyala'}
                </Button>
              </Box>
              <SpecList
                dense
                emphasizeLast={Boolean(result.quote)}
                rows={[
                  { label: 'Araç', value: selectedVehicle?.name || '-' },
                  { label: 'Alış', value: `${formatDate(start)} · ${pickupTime}` },
                  { label: 'İade', value: formatDate(end) },
                  { label: 'Teslim noktası', value: pickupLocation },
                  { label: 'Süre', value: `${days} gün` },
                  ...(result.quote ? [{ label: 'Tahmini toplam', value: formatTL(result.quote.totalTL), mono: true }] : []),
                ]}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3.5 }}>
                <Button fullWidth variant="contained" size="large" component={RouterLink} to={`/rezervasyon-sorgula?kod=${result.reservation.code}`}>
                  Durumu sorgula
                </Button>
                <Button fullWidth variant="outlined" size="large" component={RouterLink} to="/">Ana sayfa</Button>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  // ------------------------- ADIM İÇERİKLERİ -------------------------
  const stepTitleSx = { fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 24, md: 28 }, color: t.ink, mb: 0.5 } as const;
  const stepLeadSx = { color: t.muted, fontSize: 15.5, mb: 3 } as const;

  const stepContent = [
    // 1) Tarih & teslim
    <Box key="step1" sx={panelSx}>
      <Typography component="h2" sx={stepTitleSx}>Ne zaman, nereden?</Typography>
      <Typography sx={stepLeadSx}>Tarihlerinizi ve aracı teslim alacağınız noktayı seçin.</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' } }}>
        <TextField
          fullWidth type="date" label="Alış tarihi" value={start}
          onChange={(e) => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }} inputProps={{ min: dayjs().format('YYYY-MM-DD') }}
        />
        <TextField select fullWidth label="Alış saati" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}>
          {TIME_OPTIONS.map((time) => <MenuItem key={time} value={time}>{time}</MenuItem>)}
        </TextField>
        <TextField
          fullWidth type="date" label="İade tarihi" value={end}
          onChange={(e) => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }} inputProps={{ min: start }}
          error={!validRange} helperText={!validRange ? 'İade, alıştan sonra olmalı' : `${days} günlük kiralama`}
        />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.ink, mt: 3, mb: 1 }}>Teslim noktası</Typography>
      <Segmented
        label="Teslim noktası"
        value={pickupLocation}
        onChange={setPickupLocation}
        options={site.pickupLocations.map((location) => ({ value: location, label: location, hint: pickupHint(location) }))}
      />
    </Box>,

    // 2) Araç seçimi
    <Box key="step2">
      <Typography component="h2" sx={stepTitleSx}>Aracınızı seçin</Typography>
      <Typography sx={stepLeadSx}>
        <Box component="span" sx={{ color: t.ink, fontWeight: 700 }}>{formatDate(start)} – {formatDate(end)}</Box> için müsaitlik ve toplam fiyat.
      </Typography>
      {vehiclesQuery.isError && <Alert severity="error" sx={{ mb: 2 }}>Araçlar yüklenemedi. Lütfen tekrar deneyin.</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', columnGap: 3, rowGap: 5, '@media (min-width:640px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } }}>
        {vehiclesQuery.isLoading && Array.from({ length: 4 }).map((_, i) => <VehicleCardSkeleton key={i} />)}
        {[...vehicles].sort((a, b) => Number(b.available) - Number(a.available)).map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            selectable
            selected={selectedVehicle?.id === vehicle.id}
            onSelect={setSelectedVehicle}
          />
        ))}
      </Box>
      {!vehiclesQuery.isLoading && !vehiclesQuery.isError && vehicles.filter((v) => v.available).length === 0 && (
        <EmptyState
          icon={<DirectionsCar />}
          title="Bu tarihlerde müsait araç bulunamadı"
          subtitle="Farklı tarihler deneyebilir veya bizi arayabilirsiniz."
        />
      )}
    </Box>,

    // 3) Müşteri bilgileri
    <Box key="step3" sx={panelSx}>
      <Typography component="h2" sx={stepTitleSx}>İletişim bilgileriniz</Typography>
      <Typography sx={stepLeadSx}>Onay için sizi bu numaradan arayacağız.</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        <TextField fullWidth label="Adınız" autoComplete="given-name" {...form.register('firstName')} error={!!errors.firstName} helperText={errors.firstName?.message} />
        <TextField fullWidth label="Soyadınız" autoComplete="family-name" {...form.register('lastName')} error={!!errors.lastName} helperText={errors.lastName?.message} />
        <TextField fullWidth label="Cep telefonu" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" {...form.register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
        <TextField fullWidth label="E-posta (isteğe bağlı)" type="email" autoComplete="email" {...form.register('email')} error={!!errors.email} helperText={errors.email?.message} />
        <TextField fullWidth multiline minRows={2} label="Notunuz (isteğe bağlı)" {...form.register('note')} error={!!errors.note} helperText={errors.note?.message} sx={{ gridColumn: { sm: '1 / -1' } }} />
      </Box>
      <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${t.lineSoft}`, display: 'grid', gap: 0.5 }}>
        <Box>
          <FormControlLabel
            control={<Checkbox {...form.register('termsAccepted')} />}
            label={<Typography sx={{ fontSize: 14.5 }}>Kiralama şartlarını okudum, kabul ediyorum.</Typography>}
          />
          {errors.termsAccepted && <FormHelperText error sx={{ ml: 4 }}>{errors.termsAccepted.message}</FormHelperText>}
        </Box>
        <Box>
          <FormControlLabel
            control={<Checkbox {...form.register('privacyAccepted')} />}
            label={<Typography sx={{ fontSize: 14.5 }}>Kişisel verilerimin rezervasyon amacıyla işlenmesine onay veriyorum (KVKK).</Typography>}
          />
          {errors.privacyAccepted && <FormHelperText error sx={{ ml: 4 }}>{errors.privacyAccepted.message}</FormHelperText>}
        </Box>
      </Box>
    </Box>,

    // 4) Özet
    <Box key="step4" sx={panelSx}>
      <Typography component="h2" sx={stepTitleSx}>Son kontrol</Typography>
      <Typography sx={stepLeadSx}>Bilgileriniz doğruysa talebinizi gönderin.</Typography>
      <SpecList
        rows={[
          { label: 'Araç', value: selectedVehicle?.name || '-' },
          { label: 'Alış', value: `${formatDate(start)} · ${pickupTime}` },
          { label: 'İade', value: formatDate(end) },
          { label: 'Teslim noktası', value: pickupLocation },
          { label: 'Süre', value: `${days} gün` },
          { label: 'Ad soyad', value: customer ? `${customer.firstName} ${customer.lastName}` : '-' },
          { label: 'Telefon', value: customer?.phone || '-', mono: true },
          ...(customer?.email ? [{ label: 'E-posta', value: customer.email }] : []),
          ...(customer?.note ? [{ label: 'Not', value: customer.note }] : []),
        ]}
      />
      <Box sx={{ mt: 3 }}>
        {quote ? (
          <SpecList
            emphasizeLast
            rows={[
              { label: `${formatTL(quote.dailyRateTL)} × ${quote.days} gün`, value: formatTL(quote.totalTL), mono: true },
              { label: 'Tahmini toplam', value: formatTL(quote.totalTL), mono: true },
            ]}
          />
        ) : (
          <Typography sx={{ color: t.muted, fontSize: 15 }}>
            Bu araç için fiyat, ekibimiz tarafından telefonla iletilecektir.
          </Typography>
        )}
      </Box>
      <Alert severity="info" sx={{ mt: 3 }}>
        Bu bir <strong>rezervasyon talebidir</strong>, kesin rezervasyon değildir. Tutar sistemimizde hesaplanır ve ekibimiz onay aramasında sizinle teyit eder.
      </Alert>
      {reservationMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>{apiErrorMessage(reservationMutation.error)}</Alert>
      )}
    </Box>,
  ];

  // ------------------------- ADIM GEÇİŞLERİ -------------------------
  const canProceed = [
    validRange,
    Boolean(selectedVehicle?.available),
    true, // form kendi validasyonunu yapar
    !reservationMutation.isPending,
  ][activeStep];

  const handleNext = async () => {
    if (activeStep === 2) {
      const valid = await form.trigger();
      if (!valid) return;
      setCustomer(form.getValues());
    }
    if (activeStep === 3) {
      reservationMutation.mutate();
      return;
    }
    setActiveStep((step) => step + 1);
  };

  const nextLabel = activeStep === 3
    ? reservationMutation.isPending ? 'Gönderiliyor…' : 'Talebi gönder'
    : activeStep === 1 && !selectedVehicle ? 'Önce bir araç seçin' : 'Devam et';

  const summary = (
    <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
      <Overline sx={{ mb: 1.5 }}>Rezervasyonunuz</Overline>
      {selectedVehicle ? (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ width: 88, flex: 'none', borderRadius: '10px', overflow: 'hidden' }}>
            <VehicleImage vehicle={selectedVehicle} aspectRatio="4 / 3" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: t.ink, lineHeight: 1.25 }}>{selectedVehicle.name}</Typography>
            {selectedVehicle.dailyRate != null && (
              <Typography sx={{ color: t.muted, fontSize: 14 }}>{formatTL(selectedVehicle.dailyRate)} / gün</Typography>
            )}
          </Box>
        </Stack>
      ) : (
        <Typography sx={{ color: t.muted, fontSize: 14.5, mb: 2 }}>Araç henüz seçilmedi.</Typography>
      )}
      <SpecList
        dense
        emphasizeLast={Boolean(quote)}
        rows={[
          { label: 'Alış', value: validRange ? `${dayjs(start).format('DD MMM')} · ${pickupTime}` : '-' },
          { label: 'İade', value: validRange ? dayjs(end).format('DD MMM') : '-' },
          { label: 'Nokta', value: pickupLocation },
          { label: 'Süre', value: validRange ? `${days} gün` : '-' },
          ...(quote ? [{ label: 'Tahmini toplam', value: formatTL(quote.totalTL), mono: true }] : []),
        ]}
      />
      <Typography sx={{ mt: 2, fontSize: 13, color: t.muted }}>
        Sorunuz mu var?{' '}
        <Box component="a" href={`tel:${site.phone}`} sx={{ color: t.accent, fontWeight: 700, textDecoration: 'none', fontFamily: fonts.mono }}>{site.phoneDisplay}</Box>
      </Typography>
    </Box>
  );

  return (
    <>
      <Box sx={{ ...headerBandSx, pb: { xs: 3.5, md: 4.5 } }}>
        <Container maxWidth="lg">
          <PageHeader crumbs={[{ label: 'Ana sayfa', to: '/' }, { label: 'Rezervasyon' }]} title="Online rezervasyon">
            <StepIndicator active={activeStep} onJump={setActiveStep} locked={reservationMutation.isPending} />
          </PageHeader>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3.5, md: 5 } }}>
        <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 340px' }, alignItems: 'start' }}>
          <Box sx={{ minWidth: 0 }}>
            {stepContent[activeStep]}

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ mt: 3 }}>
              <Button
                variant="text"
                startIcon={<ArrowBack />}
                disabled={activeStep === 0 || reservationMutation.isPending}
                onClick={() => setActiveStep((step) => step - 1)}
                sx={{ color: t.muted, visibility: activeStep === 0 ? 'hidden' : 'visible' }}
              >
                Geri
              </Button>
              <Button
                variant="contained"
                size="large"
                endIcon={activeStep < 3 && canProceed ? <ArrowForward /> : undefined}
                disabled={!canProceed}
                onClick={handleNext}
                sx={{ minWidth: { sm: 220 } }}
              >
                {nextLabel}
              </Button>
            </Stack>
          </Box>

          <Box component="aside" aria-label="Rezervasyon özeti" sx={{ position: { md: 'sticky' }, top: { md: 92 } }}>
            {summary}
          </Box>
        </Box>
      </Container>
    </>
  );
}
