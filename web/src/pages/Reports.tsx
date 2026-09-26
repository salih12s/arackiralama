import { useMemo, useState } from 'react';
import { Alert, Box, Button, IconButton, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DownloadOutlined, Refresh } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { rentalsApi } from '../api/rentals';
import { formatCurrency } from '../utils/currency';
import { a, ease, monoSx } from '../admin/theme';
import { DataTable, EmptyState, KpiTile, Money, PageHeader, Panel, Plate, Sub } from '../admin/ui';
import { FleetBar, RevenueChart } from '../admin/charts';

const monthNames = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const ALL_MONTHS = 'Tüm Aylar';

/** Durum dağılımı: doğrulanmış palet (bordo, yeşil, bal, gri). */
const statusMeta: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Kirada', color: '#9B2F45' },
  COMPLETED: { label: 'Tamamlandı', color: '#3F8A5A' },
  RETURNED: { label: 'Teslim alındı', color: '#D4914A' },
  CANCELLED: { label: 'İptal', color: '#968984' },
};

const calculatePaid = (rental: any) => {
  const legacyPayments = (rental.upfront || 0) + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0);
  const additionalPayments = (rental.payments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  return legacyPayments + additionalPayments;
};

export default function Reports() {
  const currentYear = dayjs().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string | number>(ALL_MONTHS);

  const rentalsQuery = useQuery({
    queryKey: ['all-rentals-revenue-analysis'],
    queryFn: () => rentalsApi.getAll({ limit: 10_000, page: 1 }),
    staleTime: 60_000,
    gcTime: 120_000,
  });

  const rentals = rentalsQuery.data?.data || [];

  const yearRentals = useMemo(
    () => rentals.filter((rental: any) => dayjs(rental.startDate).year() === selectedYear),
    [rentals, selectedYear],
  );

  const periodRentals = useMemo(() => {
    if (selectedMonth === ALL_MONTHS) return yearRentals;
    return yearRentals.filter((rental: any) => dayjs(rental.startDate).month() + 1 === Number(selectedMonth));
  }, [yearRentals, selectedMonth]);

  const monthlyData = useMemo(() => monthNames.map((month, index) => {
    const items = yearRentals.filter((rental: any) => dayjs(rental.startDate).month() === index);
    const billed = items.reduce((sum: number, rental: any) => sum + (rental.totalDue || 0), 0);
    const collected = items.reduce((sum: number, rental: any) => sum + calculatePaid(rental), 0);
    return { month, label: month.slice(0, 3), billed, collected, rentals: items.length };
  }), [yearRentals]);

  const summary = useMemo(() => {
    const billed = periodRentals.reduce((sum: number, rental: any) => sum + (rental.totalDue || 0), 0);
    const collected = periodRentals.reduce((sum: number, rental: any) => sum + calculatePaid(rental), 0);
    const outstanding = periodRentals.reduce((sum: number, rental: any) => sum + Math.max((rental.totalDue || 0) - calculatePaid(rental), 0), 0);
    const completed = periodRentals.filter((rental: any) => ['COMPLETED', 'RETURNED'].includes(rental.status)).length;
    return {
      billed,
      collected,
      outstanding,
      count: periodRentals.length,
      completed,
      average: periodRentals.length ? billed / periodRentals.length : 0,
      collectionRate: billed > 0 ? Math.min((collected / billed) * 100, 100) : 0,
    };
  }, [periodRentals]);

  const vehicleData = useMemo(() => {
    const map = new Map<string, { key: string; plate: string; name: string; billed: number; collected: number; rentals: number }>();
    periodRentals.forEach((rental: any) => {
      const key = rental.vehicle?.id || rental.vehicleId || 'unknown';
      const current = map.get(key) || {
        key,
        plate: rental.vehicle?.plate || 'Plakasız',
        name: rental.vehicle?.name || [rental.vehicle?.brand, rental.vehicle?.model].filter(Boolean).join(' ') || 'Araç',
        billed: 0,
        collected: 0,
        rentals: 0,
      };
      current.billed += rental.totalDue || 0;
      current.collected += calculatePaid(rental);
      current.rentals += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((x, y) => y.billed - x.billed);
  }, [periodRentals]);

  const statusSegments = useMemo(() => {
    const counts = new Map<string, number>();
    periodRentals.forEach((rental: any) => counts.set(rental.status, (counts.get(rental.status) || 0) + 1));
    return Object.entries(statusMeta).map(([key, meta]) => ({ key, label: meta.label, color: meta.color, value: counts.get(key) || 0 }));
  }, [periodRentals]);

  const bestMonth = monthlyData.reduce((best, month) => (month.billed > best.billed ? month : best), monthlyData[0]);
  const topBilled = vehicleData[0]?.billed || 0;

  const exportCsv = () => {
    const rows = [
      ['Plaka', 'Araç', 'Kiralama Sayısı', 'Faturalanan', 'Tahsil Edilen', 'Kalan'],
      ...vehicleData.map((vehicle) => [
        vehicle.plate,
        vehicle.name,
        vehicle.rentals,
        vehicle.billed.toFixed(2),
        vehicle.collected.toFixed(2),
        Math.max(vehicle.billed - vehicle.collected, 0).toFixed(2),
      ]),
    ];
    const csv = `﻿${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `arac-raporu-${selectedYear}-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = selectedMonth === ALL_MONTHS ? `${selectedYear} yılı` : `${monthNames[Number(selectedMonth) - 1]} ${selectedYear}`;
  const loading = rentalsQuery.isLoading;

  return (
    <>
      <PageHeader
        title="Raporlar"
        subtitle={`${periodLabel} için gelir, tahsilat ve filo verimliliği`}
        actions={
          <>
            <TextField select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} inputProps={{ 'aria-label': 'Yıl' }} sx={{ minWidth: 96 }}>
              {Array.from({ length: 7 }, (_, index) => currentYear - 3 + index).map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
            </TextField>
            <TextField select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} inputProps={{ 'aria-label': 'Dönem' }} sx={{ minWidth: 136 }}>
              <MenuItem value={ALL_MONTHS}>Tüm aylar</MenuItem>
              {monthNames.map((month, index) => <MenuItem key={month} value={index + 1}>{month}</MenuItem>)}
            </TextField>
            <Tooltip title="Yenile">
              <IconButton onClick={() => rentalsQuery.refetch()} aria-label="Yenile" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}><Refresh fontSize="small" /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<DownloadOutlined />} onClick={exportCsv} disabled={loading}>CSV indir</Button>
          </>
        }
      />

      {rentalsQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => rentalsQuery.refetch()}>Tekrar dene</Button>}>
          Rapor verileri yüklenirken hata oluştu.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
        <KpiTile label="Faturalanan" loading={loading} value={formatCurrency(summary.billed)} meta={`${summary.count} kiralama`} />
        <KpiTile label="Tahsil edilen" loading={loading} value={formatCurrency(summary.collected)} progress={summary.collectionRate / 100} meta={`%${summary.collectionRate.toFixed(1)} tahsilat oranı`} />
        <KpiTile label="Bekleyen alacak" loading={loading} value={<Box component="span" sx={{ color: summary.outstanding > 0 ? a.danger : a.ink }}>{formatCurrency(summary.outstanding)}</Box>} meta={summary.outstanding > 0 ? 'Takip edilmesi gereken' : 'Bekleyen alacak yok'} />
        <KpiTile label="Ortalama kiralama" loading={loading} value={formatCurrency(summary.average)} meta={`${summary.completed} tamamlanan işlem`} />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
        <Panel
          title={`${selectedYear} aylık gelir`}
          subtitle={bestMonth && bestMonth.billed > 0 ? `Kiralama başlangıcına göre · en güçlü ay ${bestMonth.month}` : 'Kiralama başlangıcına göre'}
        >
          {loading ? <Skeleton variant="rounded" height={280} /> : <RevenueChart data={monthlyData} height={260} />}
        </Panel>

        <Panel title="Kiralama durumları" subtitle={`${periodLabel} · ${summary.count} işlem`}>
          {loading ? <Skeleton height={90} /> : summary.count === 0 ? (
            <EmptyState compact title="Bu dönem için veri yok" />
          ) : (
            <FleetBar segments={statusSegments} />
          )}
        </Panel>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 5fr) minmax(0, 7fr)' }, alignItems: 'start' }}>
        <Panel title="Araç gelir sıralaması" subtitle="Seçili dönemde en yüksek ciro" padded={false}>
          {loading ? <Box sx={{ p: 2.5 }}><Skeleton height={200} /></Box> : vehicleData.length === 0 ? (
            <EmptyState compact title="Seçili dönemde veri yok" />
          ) : (
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, pb: 1 }}>
              {vehicleData.slice(0, 7).map((vehicle, index) => (
                <Box component="li" key={vehicle.key} sx={{ display: 'grid', gridTemplateColumns: '24px 96px minmax(0, 1fr) auto', alignItems: 'center', columnGap: 1.5, px: 2.5, py: 1.1 }}>
                  <Typography sx={{ ...monoSx, fontSize: 12, color: a.subtle }}>{index + 1}</Typography>
                  <Plate value={vehicle.plate} size="sm" />
                  <Tooltip title={`${vehicle.name} · ${vehicle.rentals} kiralama`}>
                    <Box aria-hidden sx={{ height: 10, borderRadius: '0 4px 4px 0', bgcolor: a.surface }}>
                      <Box sx={{ height: '100%', width: `${topBilled ? (vehicle.billed / topBilled) * 100 : 0}%`, bgcolor: a.chart1, borderRadius: '0 4px 4px 0', transition: `width .6s ${ease}` }} />
                    </Box>
                  </Tooltip>
                  <Typography sx={{ ...monoSx, fontSize: 12.5, fontWeight: 500, textAlign: 'right', minWidth: 96 }}>{formatCurrency(vehicle.billed)}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Panel>

        <Panel title="Araç performans tablosu" subtitle={`Gelir, tahsilat ve açık bakiye · ${vehicleData.length} araç`} padded={false}>
          <DataTable
            dense
            rows={vehicleData.slice(0, 10)}
            rowKey={(vehicle) => vehicle.key}
            loading={loading}
            empty={<EmptyState compact title="Seçili dönemde araç performans verisi yok" />}
            columns={[
              { key: 'vehicle', header: 'Araç', render: (vehicle) => <><Plate value={vehicle.plate} size="sm" /><Sub>{vehicle.name}</Sub></> },
              { key: 'rentals', header: 'Kiralama', align: 'center', render: (vehicle) => <Box component="span" sx={monoSx}>{vehicle.rentals}</Box> },
              { key: 'billed', header: 'Faturalanan', align: 'right', render: (vehicle) => <Money value={vehicle.billed} /> },
              { key: 'collected', header: 'Tahsilat', align: 'right', hideBelow: 'sm', render: (vehicle) => <Money value={vehicle.collected} tone="success" /> },
              { key: 'left', header: 'Kalan', align: 'right', render: (vehicle) => { const left = Math.max(vehicle.billed - vehicle.collected, 0); return <Money value={left} tone={left > 0 ? 'danger' : 'muted'} strong={left > 0} />; } },
            ]}
            mobileRow={(vehicle) => (
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box><Plate value={vehicle.plate} size="sm" /><Sub>{vehicle.rentals} kiralama</Sub></Box>
                <Box sx={{ textAlign: 'right' }}><Money value={vehicle.billed} /><Sub>Kalan {formatCurrency(Math.max(vehicle.billed - vehicle.collected, 0))}</Sub></Box>
              </Stack>
            )}
          />
        </Panel>
      </Box>
    </>
  );
}
