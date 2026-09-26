import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Container, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { Check, Phone } from '@mui/icons-material';
import dayjs from 'dayjs';
import { publicApi } from '../api/client';
import { site } from '../config';
import { fonts, t } from '../theme';
import { formatSpec, formatTL, setPageMeta } from '../utils/format';
import VehicleCard, { VehicleImage, vehicleGridSx } from '../components/VehicleCard';
import { Overline, PageHeader, Segmented, SectionHeading, SpecList, StatusPill, panelSx } from '../components/common';

/** Teslim noktası kısa açıklaması (segment seçicide ipucu olarak). */
function pickupHint(location: string) {
  const lower = location.toLocaleLowerCase('tr-TR');
  if (lower.includes('havalimanı')) return 'Karşılama ile teslim';
  if (lower.includes('adres')) return 'Size getiririz';
  return 'Ofisten teslim';
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [start, setStart] = useState(searchParams.get('start') || dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [end, setEnd] = useState(searchParams.get('end') || dayjs().add(4, 'day').format('YYYY-MM-DD'));
  const [pickup, setPickup] = useState(() => {
    const fromUrl = searchParams.get('pickup');
    return fromUrl && site.pickupLocations.includes(fromUrl) ? fromUrl : site.pickupLocations[0];
  });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const validRange = Boolean(start && end && dayjs(end).isAfter(dayjs(start)));

  const vehicleQuery = useQuery({
    queryKey: ['vehicle', id, validRange ? start : null, validRange ? end : null],
    queryFn: () => publicApi.getVehicle(id!, validRange ? { start, end } : undefined),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const vehicle = vehicleQuery.data?.data.data;
  const similar = vehicleQuery.data?.data.similar || [];
  const gallery = vehicle?.gallery || [];
  const selectedImage = gallery.find((image) => image.id === selectedImageId) || gallery[0];
  const isService = vehicle?.unavailableReason === 'SERVICE';

  useEffect(() => {
    setPageMeta(
      vehicle ? `${vehicle.name} Kirala — ${site.brandName}` : `Araç Detayı — ${site.brandName}`,
      vehicle?.description || undefined
    );
  }, [vehicle]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);
  useEffect(() => { setSelectedImageId(gallery[0]?.id || null); }, [vehicle?.id, gallery[0]?.id]);

  const pickupTime = searchParams.get('pickupTime');
  const bookingLink = `/rezervasyon?arac=${id}&start=${start}&end=${end}${pickupTime ? `&pickupTime=${encodeURIComponent(pickupTime)}` : ''}&pickup=${encodeURIComponent(pickup)}`;
  const canBook = validRange && Boolean(vehicle?.available);
  const quote = validRange ? vehicle?.quote : null;

  const status = vehicle
    ? vehicle.available
      ? { label: 'Seçili tarihlerde müsait', tone: 'success' as const }
      : isService
        ? { label: 'Serviste', tone: 'warning' as const }
        : { label: 'Seçili tarihlerde dolu', tone: 'danger' as const }
    : null;

  const specRows = vehicle
    ? [
        vehicle.category && { label: 'Kategori', value: formatSpec(vehicle.category) },
        vehicle.year && { label: 'Model yılı', value: String(vehicle.year), mono: true },
        vehicle.fuelType && { label: 'Yakıt', value: formatSpec(vehicle.fuelType) },
        vehicle.transmission && { label: 'Vites', value: formatSpec(vehicle.transmission) },
        vehicle.seats && { label: 'Koltuk', value: `${vehicle.seats} kişi` },
        { label: 'Sigorta', value: 'Kasko + zorunlu trafik' },
      ].filter(Boolean) as { label: string; value: string; mono?: boolean }[]
    : [];

  return (
    <>
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 14, md: 10 } }}>
        {vehicleQuery.isLoading && (
          <Box sx={{ display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' } }}>
            <Box>
              <Skeleton width={220} height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" sx={{ width: '100%', height: 'auto', aspectRatio: '16 / 10', borderRadius: '18px' }} />
              <Skeleton width="55%" height={52} sx={{ mt: 3 }} />
              <Skeleton width="100%" height={22} />
              <Skeleton width="75%" height={22} />
            </Box>
            <Skeleton variant="rounded" height={440} sx={{ borderRadius: '18px', mt: { md: 5 } }} />
          </Box>
        )}

        {vehicleQuery.isError && (
          <Box sx={{ py: 6 }}>
            <Alert
              severity="warning"
              action={<Button component={RouterLink} to="/araclar" size="small">Araçlara dön</Button>}
            >
              Bu araç artık listede olmayabilir. Güncel filomuza göz atın.
            </Alert>
          </Box>
        )}

        {vehicle && status && (
          <>
            {/* Mobilde sıra: başlık+görsel → fiyat kutusu → özellikler; masaüstünde kutu sağda yapışkan. */}
            <Box sx={{ display: 'grid', columnGap: 6, rowGap: { xs: 4, md: 0 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'start' }}>
              {/* ---------- Sol üst: başlık + görsel ---------- */}
              <Box sx={{ minWidth: 0, gridColumn: { md: 1 }, gridRow: { md: 1 } }}>
                <PageHeader
                  crumbs={[{ label: 'Ana sayfa', to: '/' }, { label: 'Araçlar', to: `/araclar${validRange ? `?start=${start}&end=${end}` : ''}` }, { label: vehicle.name }]}
                  overline={vehicle.category ? formatSpec(vehicle.category) : undefined}
                  title={vehicle.name}
                />
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.75, mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
                  <StatusPill label={status.label} tone={status.tone} />
                  <Typography sx={{ color: t.muted, fontSize: 15 }}>
                    {[formatSpec(vehicle.transmission), formatSpec(vehicle.fuelType), vehicle.seats ? `${vehicle.seats} kişi` : ''].filter(Boolean).join(' · ')}
                  </Typography>
                </Stack>

                <Box sx={{ borderRadius: '18px', overflow: 'hidden', bgcolor: t.photo }}>
                  <VehicleImage vehicle={vehicle} aspectRatio="16 / 10" imageUrl={selectedImage?.imageUrl} alt={selectedImage?.altText || vehicle.name} eager />
                </Box>
                {gallery.length > 1 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', sm: 'repeat(6, minmax(0, 1fr))' }, gap: 1, mt: 1.25 }}>
                    {gallery.map((image) => {
                      const active = selectedImage?.id === image.id;
                      return (
                        <Box
                          key={image.id}
                          component="button"
                          type="button"
                          onClick={() => setSelectedImageId(image.id)}
                          aria-label={`${image.altText || vehicle.name} görselini göster`}
                          aria-pressed={active}
                          sx={{
                            p: 0,
                            cursor: 'pointer',
                            bgcolor: 'transparent',
                            overflow: 'hidden',
                            borderRadius: '10px',
                            border: 0,
                            outline: active ? `2px solid ${t.accent}` : `1px solid ${t.lineSoft}`,
                            outlineOffset: active ? 2 : -1,
                            opacity: active ? 1 : 0.72,
                            transition: 'opacity .15s ease',
                            '@media (hover: hover)': { '&:hover': { opacity: 1 } },
                          }}
                        >
                          <Box component="img" src={image.imageUrl} alt="" loading="lazy" decoding="async" sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* ---------- Sol alt: özellikler + açıklama + şartlar ---------- */}
              <Box sx={{ minWidth: 0, gridColumn: { md: 1 }, gridRow: { xs: 3, md: 2 } }}>
                <Box sx={{ mt: { xs: 1, md: 6 }, display: 'grid', gap: { xs: 4, md: 5 } }}>
                  <Box>
                    <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 26, md: 30 }, color: t.ink, mb: 2 }}>
                      Teknik özellikler
                    </Typography>
                    <SpecList rows={specRows} />
                  </Box>

                  {vehicle.description && (
                    <Box>
                      <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 26, md: 30 }, color: t.ink, mb: 1.5 }}>
                        Araç hakkında
                      </Typography>
                      <Typography sx={{ color: t.muted, whiteSpace: 'pre-line', maxWidth: 640 }}>{vehicle.description}</Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 26, md: 30 }, color: t.ink, mb: 2 }}>
                      Kiralama şartları
                    </Typography>
                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, borderTop: `1px solid ${t.ink}` }}>
                      {site.rentalTerms.map((term) => (
                        <Box component="li" key={term} sx={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: 1.5, py: 1.6, borderBottom: `1px solid ${t.line}` }}>
                          <Check sx={{ fontSize: 18, color: t.accent, mt: '3px' }} />
                          <Typography sx={{ color: t.ink, fontSize: 15.5 }}>{term}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* ---------- Sağ: fiyat + tarih + teslim noktası ---------- */}
              <Box id="rezervasyon-kutusu" sx={{ ...panelSx, boxShadow: t.shadow, gridColumn: { md: 2 }, gridRow: { xs: 2, md: '1 / span 2' }, position: { md: 'sticky' }, top: { md: 92 }, mt: { md: 9 } }}>
                <Overline sx={{ mb: 1 }}>Günlük fiyat</Overline>
                {vehicle.dailyRate != null ? (
                  <Stack direction="row" alignItems="baseline" spacing={0.75}>
                    <Typography sx={{ fontWeight: 800, color: t.ink, fontSize: 38, letterSpacing: '-.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                      {formatTL(vehicle.dailyRate)}
                    </Typography>
                    <Typography sx={{ color: t.muted }}>/ gün</Typography>
                  </Stack>
                ) : (
                  <Typography sx={{ fontWeight: 800, color: t.ink, fontSize: 24 }}>Fiyat için arayın</Typography>
                )}
                <Typography sx={{ color: t.muted, fontSize: 13.5, mt: 0.5, mb: 3 }}>
                  Kasko ve zorunlu trafik sigortası dahildir.
                </Typography>

                <Stack direction="row" spacing={1.25} sx={{ mb: 2.5 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Alış"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: dayjs().format('YYYY-MM-DD') }}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    label="İade"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: start }}
                    error={!validRange}
                  />
                </Stack>

                <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.ink, mb: 1 }}>Teslim noktası</Typography>
                <Segmented
                  label="Teslim noktası"
                  value={pickup}
                  onChange={setPickup}
                  options={site.pickupLocations.map((location) => ({ value: location, label: location, hint: pickupHint(location) }))}
                />

                <Box sx={{ mt: 3 }}>
                  {!validRange && (
                    <Alert severity="error" sx={{ mb: 2 }}>İade tarihi alış tarihinden sonra olmalı.</Alert>
                  )}
                  {quote && (
                    <Box sx={{ mb: 2.5 }}>
                      <SpecList
                        dense
                        emphasizeLast
                        rows={[
                          { label: `${formatTL(quote.dailyRateTL)} × ${quote.days} gün`, value: formatTL(quote.totalTL), mono: true },
                          { label: 'Tahmini toplam', value: formatTL(quote.totalTL), mono: true },
                        ]}
                      />
                    </Box>
                  )}
                  {!vehicle.available && validRange && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {isService
                        ? 'Bu araç şu anda serviste ve rezervasyona kapalı.'
                        : 'Bu araç seçtiğiniz tarihlerde dolu. Farklı tarih deneyin veya benzer araçlara bakın.'}
                    </Alert>
                  )}

                  <Button fullWidth variant="contained" size="large" disabled={!canBook} onClick={() => navigate(bookingLink)}>
                    Rezervasyon yap
                  </Button>
                  <Button fullWidth variant="outlined" href={`tel:${site.phone}`} startIcon={<Phone />} sx={{ mt: 1.25, fontFamily: fonts.mono, fontWeight: 500 }}>
                    {site.phoneDisplay}
                  </Button>
                  <Typography sx={{ mt: 1.75, color: t.muted, fontSize: 13, textAlign: 'center' }}>
                    Talebiniz ekibimiz telefonla onayladıktan sonra kesinleşir.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {similar.length > 0 && (
              <Box component="section" sx={{ mt: { xs: 8, md: 11 }, pt: { xs: 6, md: 8 }, borderTop: `1px solid ${t.line}` }}>
                <SectionHeading overline="Alternatifler" title="Benzer araçlar" align="left" />
                <Box sx={vehicleGridSx}>
                  {similar.map((item) => <VehicleCard key={item.id} vehicle={item} dateParams={validRange ? `start=${start}&end=${end}` : ''} />)}
                </Box>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Mobil: alta sabit fiyat + rezervasyon çubuğu */}
      {vehicle && (
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1040,
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            pt: 1.5,
            pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            bgcolor: t.glass,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: `1px solid ${t.lineSoft}`,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {quote ? (
              <>
                <Typography sx={{ font: `500 18px ${fonts.mono}`, color: t.ink, lineHeight: 1.2 }}>{formatTL(quote.totalTL)}</Typography>
                <Typography sx={{ fontSize: 12.5, color: t.muted }}>{quote.days} gün · tahmini toplam</Typography>
              </>
            ) : vehicle.dailyRate != null ? (
              <>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: t.ink, lineHeight: 1.2 }}>{formatTL(vehicle.dailyRate)}</Typography>
                <Typography sx={{ fontSize: 12.5, color: t.muted }}>günlük</Typography>
              </>
            ) : (
              <Typography sx={{ fontWeight: 700, color: t.ink }}>Fiyat için arayın</Typography>
            )}
          </Box>
          <Button variant="contained" disabled={!canBook} onClick={() => navigate(bookingLink)} sx={{ flex: 'none' }}>
            Rezervasyon yap
          </Button>
        </Box>
      )}
    </>
  );
}
