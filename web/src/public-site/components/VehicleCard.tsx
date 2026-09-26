import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Skeleton, Stack, Typography } from '@mui/material';
import { Check, DirectionsCar } from '@mui/icons-material';
import { PublicVehicle } from '../api/client';
import { ease, fonts, t } from '../theme';
import { formatSpec, formatTL } from '../utils/format';

export const vehicleGridSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  columnGap: { xs: 2.5, md: 3.5 },
  rowGap: { xs: 5, md: 6 },
  '@media (min-width:700px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  '@media (min-width:1100px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
} as const;

interface VehicleImageProps {
  vehicle: PublicVehicle;
  height?: number | string | object;
  aspectRatio?: string;
  imageUrl?: string | null;
  alt?: string;
  eager?: boolean;
}

export function VehicleImage({ vehicle, height, aspectRatio, imageUrl, alt, eager = false }: VehicleImageProps) {
  const source = imageUrl === undefined ? vehicle.imageUrl : imageUrl;
  const mediaSx = {
    width: '100%',
    maxWidth: '100%',
    height: height ?? 'auto',
    aspectRatio,
    display: 'block',
    bgcolor: t.photo,
  };

  if (source) {
    return (
      <Box
        component="img"
        src={source}
        alt={alt || vehicle.name}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        sx={{ ...mediaSx, objectFit: 'cover', objectPosition: 'center' }}
      />
    );
  }

  return (
    <Box sx={{ ...mediaSx, display: 'grid', placeItems: 'center' }} role="img" aria-label={`${vehicle.name} için fotoğraf eklenecek`}>
      <Stack alignItems="center" spacing={1} sx={{ color: t.subtle }}>
        <DirectionsCar sx={{ fontSize: 34 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.muted }}>Fotoğraf eklenecek</Typography>
      </Stack>
    </Box>
  );
}

/** Kartın üstündeki durum rozeti. */
function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? t.success : tone === 'warning' ? t.warning : t.danger;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        bgcolor: t.glass,
        backdropFilter: 'blur(12px)',
        fontSize: 12.5,
        fontWeight: 700,
        color: t.ink,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
      {label}
    </Box>
  );
}

interface VehicleCardProps {
  vehicle: PublicVehicle;
  dateParams?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (vehicle: PublicVehicle) => void;
}

export default function VehicleCard({ vehicle, dateParams = '', selectable, selected, onSelect }: VehicleCardProps) {
  const detailTo = `/araclar/${vehicle.id}${dateParams ? `?${dateParams}` : ''}`;
  const bookTo = `/rezervasyon?arac=${vehicle.id}${dateParams ? `&${dateParams}` : ''}`;
  const isService = vehicle.unavailableReason === 'SERVICE';
  const hasDateSelection = Boolean(dateParams) || selectable;
  const statusLabel = vehicle.available
    ? 'Müsait'
    : isService
      ? 'Serviste'
      : hasDateSelection
        ? 'Seçili tarihlerde dolu'
        : 'Şu anda müsait değil';
  const specs = [
    formatSpec(vehicle.transmission),
    formatSpec(vehicle.fuelType),
    vehicle.seats ? `${vehicle.seats} kişi` : '',
    vehicle.year ? String(vehicle.year) : '',
  ].filter(Boolean);

  const media = (
    <Box sx={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', bgcolor: t.photo, outline: selected ? `2px solid ${t.accent}` : 'none', outlineOffset: 3 }}>
      <Box sx={{ transition: `transform .5s ${ease}`, '@media (hover: hover)': { '.vehicle-card:hover &': { transform: 'scale(1.03)' } } }}>
        <VehicleImage vehicle={vehicle} aspectRatio="16 / 10" />
      </Box>
      <StatusBadge label={statusLabel} tone={vehicle.available ? 'success' : isService ? 'warning' : 'danger'} />
    </Box>
  );

  return (
    <Card component="article" className="vehicle-card" sx={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.75, opacity: vehicle.available ? 1 : 0.78 }}>
      {selectable ? media : (
        <Box component={RouterLink} to={detailTo} tabIndex={-1} sx={{ display: 'block', borderRadius: '18px', textDecoration: 'none' }}>
          {media}
        </Box>
      )}

      <Box sx={{ display: 'grid', gap: 0.5, px: 0.25 }}>
        {vehicle.category && (
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.subtle }}>
            {formatSpec(vehicle.category)}
          </Typography>
        )}
        <Typography
          component="h3"
          sx={{ fontSize: { xs: 20, md: 21 }, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.2, color: t.ink }}
        >
          {selectable ? vehicle.name : (
            <Box component={RouterLink} to={detailTo} sx={{ color: 'inherit', textDecoration: 'none', '@media (hover: hover)': { '&:hover': { color: t.accent } } }}>
              {vehicle.name}
            </Box>
          )}
        </Typography>
        {specs.length > 0 && (
          <Typography sx={{ fontSize: 14.5, color: t.muted, fontWeight: 500 }}>{specs.join(' · ')}</Typography>
        )}
      </Box>

      <Box sx={{ px: 0.25, mt: 'auto', display: 'grid', gap: 1.5 }}>
        <Box>
          {vehicle.dailyRate != null ? (
            <Stack direction="row" alignItems="baseline" spacing={0.75}>
              <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: t.ink, fontVariantNumeric: 'tabular-nums' }}>
                {formatTL(vehicle.dailyRate)}
              </Typography>
              <Typography sx={{ fontSize: 14, color: t.muted }}>/ gün</Typography>
            </Stack>
          ) : (
            <Typography sx={{ fontWeight: 700, color: t.ink }}>Fiyat için arayın</Typography>
          )}
          {vehicle.quote && (
            <Typography sx={{ fontSize: 13.5, color: t.accent, fontWeight: 700, mt: 0.25 }}>
              {vehicle.quote.days} gün için tahmini{' '}
              <Box component="span" sx={{ fontFamily: fonts.mono, fontWeight: 500 }}>{formatTL(vehicle.quote.totalTL)}</Box>
            </Typography>
          )}
          {isService && (
            <Typography sx={{ fontSize: 13.5, color: t.warning, fontWeight: 600, mt: 0.25 }}>
              Şu anda rezervasyona kapalı
            </Typography>
          )}
        </Box>

        {!selectable ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component={RouterLink} to={bookTo} variant="contained" size="small" disabled={!vehicle.available} sx={{ px: 2.25 }}>
              Rezervasyon Yap
            </Button>
            <Button component={RouterLink} to={detailTo} variant="text" size="small" sx={{ fontWeight: 700 }}>
              Detaylar ›
            </Button>
          </Stack>
        ) : (
          <Button
            variant={selected ? 'contained' : 'outlined'}
            fullWidth
            startIcon={selected ? <Check /> : undefined}
            disabled={!vehicle.available}
            onClick={() => vehicle.available && onSelect?.(vehicle)}
          >
            {selected ? 'Seçildi' : vehicle.available ? 'Bu Aracı Seç' : isService ? 'Serviste' : 'Bu tarihlerde dolu'}
          </Button>
        )}
      </Box>
    </Card>
  );
}

export function VehicleCardSkeleton() {
  return (
    <Box sx={{ display: 'grid', gap: 1.75 }}>
      <Skeleton variant="rounded" sx={{ width: '100%', height: 'auto', aspectRatio: '16 / 10', borderRadius: '18px' }} />
      <Box>
        <Skeleton width="30%" height={18} />
        <Skeleton width="62%" height={30} />
        <Skeleton width="80%" height={20} />
      </Box>
      <Skeleton width="38%" height={34} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={150} height={36} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={90} height={36} sx={{ borderRadius: 999 }} />
      </Stack>
    </Box>
  );
}
