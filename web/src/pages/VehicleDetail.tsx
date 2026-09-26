import { useMemo } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { ArrowBack, DirectionsCarOutlined, EventBusyOutlined } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { vehiclesApi } from '../api/client';
import { normalizeVehicleRentals, vehicleRentalStats } from '../utils/vehicleRentals';
import { formatCurrency } from '../utils/currency';
import { getRentalFinancials } from '../utils/rentalFinancials';
import { a, fonts, monoSx } from '../admin/theme';
import { DataTable, EmptyState, KpiTile, Money, Panel, Plate, Status, Sub } from '../admin/ui';

const titleCase = (value?: string | null) =>
  value ? value.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase('tr-TR')).replace(/\bSuv\b/, 'SUV') : '';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicleData, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.getById(id!),
    enabled: !!id,
  });

  const vehicle = vehicleData?.data;
  const rentals = useMemo(() => normalizeVehicleRentals(vehicle?.rentals), [vehicle?.rentals]);
  const stats = useMemo(() => vehicleRentalStats(rentals), [rentals]);

  const back = (
    <Button component={RouterLink} to="/panel/araclar" startIcon={<ArrowBack />} sx={{ color: a.muted, mb: 2, ml: -1 }}>
      Araçlar
    </Button>
  );

  if (isLoading) {
    return (
      <>
        {back}
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </>
    );
  }

  if (error || !vehicle) {
    return (
      <>
        {back}
        <Alert severity="error">Araç bulunamadı.</Alert>
      </>
    );
  }

  const cover = vehicle.images?.find((image) => image.isPrimary)?.imageUrl || vehicle.images?.[0]?.imageUrl || vehicle.imageUrl;
  const specs = [titleCase(vehicle.category), titleCase(vehicle.transmission), titleCase(vehicle.fuelType), vehicle.seats ? `${vehicle.seats} kişi` : '', vehicle.year ? String(vehicle.year) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      {back}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, alignItems: 'center', mb: 3 }}>
        <Box sx={{ width: { xs: '100%', sm: 220 }, aspectRatio: '16 / 10', borderRadius: '14px', overflow: 'hidden', bgcolor: a.surface, display: 'grid', placeItems: 'center', color: a.subtle, flex: 'none' }}>
          {cover ? <Box component="img" src={cover} alt={vehicle.name || vehicle.plate} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <DirectionsCarOutlined sx={{ fontSize: 36 }} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
            <Plate value={vehicle.plate} />
            <Status value={vehicle.status} />
          </Stack>
          <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 28, md: 34 }, lineHeight: 1.1 }}>
            {vehicle.name || 'Model belirtilmemiş'}
          </Typography>
          <Typography sx={{ color: a.muted, mt: 0.75 }}>
            {specs || 'Özellik girilmemiş'} · {dayjs(vehicle.createdAt).format('DD.MM.YYYY')} tarihinde eklendi
          </Typography>
          {vehicle.dailyRate != null && (
            <Typography sx={{ ...monoSx, mt: 0.75, fontSize: 14 }}>{formatCurrency(vehicle.dailyRate / 100)} <Box component="span" sx={{ color: a.muted, fontFamily: fonts.sans }}>/ gün vitrin fiyatı</Box></Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
        <KpiTile label="Toplam gelir" value={formatCurrency(stats.revenue)} meta="Tüm kalemler dahil" />
        <KpiTile label="Araç kazancı" value={formatCurrency(stats.rentAndKm)} meta={`Kira ${formatCurrency(stats.rentOnly)} · KM ${formatCurrency(stats.kmOnly)}`} />
        <KpiTile label="Son 90 gün doluluk" value={`%${Math.round(stats.utilization * 100)}`} progress={stats.utilization} meta={`${rentals.length} kiralama · ${stats.active} aktif`} />
        <KpiTile label="Kalan bakiye" value={<Box component="span" sx={{ color: stats.outstanding > 0 ? a.danger : a.ink }}>{formatCurrency(stats.outstanding)}</Box>} meta={stats.outstanding > 0 ? 'Tahsil edilecek' : 'Açık bakiye yok'} />
      </Box>

      <Panel title="Kiralama geçmişi" subtitle={`${rentals.length} kayıt, en yeniden eskiye`} padded={false}>
        <DataTable
          rows={rentals}
          rowKey={(rental) => rental.id}
          onRowClick={(rental) => navigate(`/panel/kiralamalar/${rental.id}`)}
          empty={<EmptyState icon={<EventBusyOutlined />} title="Henüz kiralama yok" subtitle="Bu araç daha önce kiralanmamış." />}
          columns={[
            {
              key: 'period',
              header: 'Dönem',
              render: (rental) => (
                <>
                  <Box component="span" sx={{ ...monoSx, fontSize: 13, whiteSpace: 'nowrap' }}>{dayjs(rental.startDate).format('DD.MM.YY')} → {dayjs(rental.endDate).format('DD.MM.YY')}</Box>
                  <Sub>{rental.days} gün</Sub>
                </>
              ),
            },
            { key: 'customer', header: 'Müşteri', render: (rental) => <><Box component="span" sx={{ fontWeight: 700 }}>{rental.customer?.fullName || '—'}</Box>{rental.customer?.phone && <Sub>{rental.customer.phone}</Sub>}</> },
            { key: 'rent', header: 'Kira', align: 'right', hideBelow: 'lg', render: (rental) => <Money value={getRentalFinancials(rental).rentBase} tone="muted" /> },
            {
              key: 'extras',
              header: 'Ekler',
              align: 'right',
              hideBelow: 'lg',
              render: (rental) => {
                const { extras } = getRentalFinancials(rental);
                const total = extras.kmDiff + extras.hgs + extras.cleaning + extras.damage + extras.fuel;
                return total ? <Money value={total} tone="muted" /> : <Box component="span" sx={{ color: a.subtle }}>—</Box>;
              },
            },
            { key: 'total', header: 'Toplam', align: 'right', hideBelow: 'md', render: (rental) => <Money value={getRentalFinancials(rental).totalAmount} /> },
            { key: 'paid', header: 'Ödenen', align: 'right', hideBelow: 'sm', render: (rental) => <Money value={getRentalFinancials(rental).totalPaid} tone="success" /> },
            { key: 'balance', header: 'Kalan', align: 'right', render: (rental) => { const { balance } = getRentalFinancials(rental); return <Money value={balance} tone={balance > 0 ? 'danger' : 'muted'} strong={balance > 0} />; } },
            { key: 'status', header: 'Durum', render: (rental) => <Status value={rental.status} /> },
          ]}
          mobileRow={(rental) => {
            const { balance } = getRentalFinancials(rental);
            return (
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>{rental.customer?.fullName || '—'}</Typography>
                  <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.muted }}>{dayjs(rental.startDate).format('DD.MM.YY')} → {dayjs(rental.endDate).format('DD.MM.YY')}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Money value={balance} tone={balance > 0 ? 'danger' : 'muted'} strong={balance > 0} />
                  <Box sx={{ mt: 0.5 }}><Status value={rental.status} /></Box>
                </Box>
              </Stack>
            );
          }}
        />
      </Panel>
    </>
  );
}
