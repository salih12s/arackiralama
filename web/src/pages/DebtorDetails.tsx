import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { ArrowForward, CheckCircleOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { formatCurrency } from '../utils/currency';
import { a, ease, monoSx } from '../admin/theme';
import { EmptyState, KpiTile, PageHeader, SearchField, Toolbar, panelSx, kpiRow3Sx } from '../admin/ui';

/** /reports/debtors kuruş döndürür; ekranda en yakın 10 TL'ye yuvarlanır. */
const toTL = (kurus: number) => Math.round((kurus / 100) / 10) * 10;

export default function DebtorDetails() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: debtorsData, isLoading, error } = useQuery({
    queryKey: ['debtors'],
    queryFn: () => reportsApi.getDebtors(),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const debtors = useMemo(
    () => (Array.isArray(debtorsData) ? debtorsData : []).map((debtor: any) => ({ id: debtor.customerId as string, name: debtor.customerName as string, debt: toTL(debtor.totalDebt || 0) })),
    [debtorsData],
  );
  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.debt, 0);
  const maxDebt = Math.max(0, ...debtors.map((debtor) => debtor.debt));
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const visible = query ? debtors.filter((debtor) => debtor.name.toLocaleLowerCase('tr-TR').includes(query)) : debtors;

  return (
    <>
      <PageHeader
        title="Borçlular"
        subtitle="Açık bakiyesi olan müşteriler, borç tutarına göre sıralı."
        actions={<Button variant="outlined" endIcon={<ArrowForward />} onClick={() => navigate('/panel/odenmeyen-borclar')}>Kalem kalem gör</Button>}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>Borçlu müşteri verileri yüklenemedi: {(error as Error).message}</Alert>}

      <Box sx={kpiRow3Sx}>
        <KpiTile label="Toplam alacak" loading={isLoading} value={<Box component="span" sx={{ color: totalDebt > 0 ? a.danger : a.ink }}>{formatCurrency(totalDebt)}</Box>} meta="En yakın 10 TL'ye yuvarlı" />
        <KpiTile label="Borçlu müşteri" loading={isLoading} value={debtors.length} meta="Açık bakiyesi olan" />
        <KpiTile label="En yüksek borç" loading={isLoading} value={formatCurrency(maxDebt)} meta={debtors[0]?.name || '—'} />
      </Box>

      <Box sx={panelSx}>
        <Toolbar>
          <Typography sx={{ fontWeight: 800, fontSize: 15.5 }}>Müşteri bazında borç</Typography>
          <Box sx={{ flex: 1 }} />
          <SearchField value={search} onChange={setSearch} placeholder="Müşteri ara" sx={{ width: { xs: '100%', sm: 240 } }} />
        </Toolbar>

        {isLoading ? (
          <Box sx={{ p: 2.5 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}</Box>
        ) : debtors.length === 0 ? (
          <EmptyState icon={<CheckCircleOutline />} title="Borçlu müşteri yok" subtitle="Tüm müşteriler ödemelerini yapmış durumda." />
        ) : visible.length === 0 ? (
          <EmptyState compact title="Aramaya uygun müşteri yok" />
        ) : (
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {visible.map((debtor) => {
              const rank = debtors.indexOf(debtor) + 1;
              const share = totalDebt ? debtor.debt / totalDebt : 0;
              return (
                <Box component="li" key={debtor.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '28px 36px minmax(0, 1fr) auto', sm: '32px 38px minmax(0, 1fr) minmax(120px, 2fr) auto' }, alignItems: 'center', columnGap: 1.5, px: 2.5, py: 1.5, borderTop: `1px solid ${a.lineSoft}`, '&:first-of-type': { borderTop: 0 } }}>
                  <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.subtle }}>{String(rank).padStart(2, '0')}</Typography>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: a.accentSoft, color: a.accent, fontSize: 14, fontWeight: 800 }}>{debtor.name.charAt(0).toLocaleUpperCase('tr-TR')}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5 }}>{debtor.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: a.muted }}>Toplam alacağın %{Math.round(share * 100)}'i</Typography>
                  </Box>
                  <Box aria-hidden sx={{ display: { xs: 'none', sm: 'block' }, height: 8, borderRadius: 999, bgcolor: a.surface, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${maxDebt ? (debtor.debt / maxDebt) * 100 : 0}%`, bgcolor: a.chart1, borderRadius: 999, transition: `width .6s ${ease}` }} />
                  </Box>
                  <Stack alignItems="flex-end">
                    <Typography sx={{ ...monoSx, fontWeight: 600, fontSize: 14.5, color: a.danger }}>{formatCurrency(debtor.debt)}</Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </>
  );
}
