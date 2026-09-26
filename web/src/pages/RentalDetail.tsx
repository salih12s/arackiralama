import { ReactNode, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Box, Button, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowBack, CheckCircleOutline, KeyboardReturn, PaymentsOutlined, PrintOutlined } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import AddPaymentDialog from '../components/AddPaymentDialog';
import { rentalsApi, Payment } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { getRentalFinancials, getDisplayNote } from '../utils/rentalFinancials';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';
import { a, ease, fonts, monoSx } from '../admin/theme';
import { ConfirmDialog, DataTable, DefinitionList, EmptyState, Panel, Plate, Status, StatusBadge, Tone } from '../admin/ui';

const methodLabel = (method: Payment['method']) => (method === 'CASH' ? 'Nakit' : method === 'CARD' ? 'Kart' : 'Havale');

function dueInfo(endDate: string): { text: string; tone: Tone } {
  const diff = dayjs(endDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff < 0) return { text: `${-diff} gün gecikti`, tone: 'danger' };
  if (diff === 0) return { text: 'Bugün dönüyor', tone: 'warning' };
  return { text: `${diff} gün kaldı`, tone: 'neutral' };
}

/** Ödeme planında tek adım (zaman çizelgesi satırı). */
function PlanStep({ label, amount, date, last, extra }: { label: string; amount: number; date?: string | null; last?: boolean; extra?: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) auto', columnGap: 1.5, position: 'relative', pb: last ? 0 : 2 }}>
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.success, mt: '5px', boxShadow: `0 0 0 3px ${a.successSoft}` }} />
        {!last && <Box sx={{ position: 'absolute', top: 18, bottom: -4, width: '1px', bgcolor: a.line }} />}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{label}</Typography>
        <Typography sx={{ fontSize: 12.5, color: a.muted }}>{date ? dayjs(date).format('DD.MM.YYYY') : 'Ödendi'}{extra}</Typography>
      </Box>
      <Typography sx={{ ...monoSx, fontWeight: 500, fontSize: 14 }}>{formatCurrency(amount)}</Typography>
    </Box>
  );
}

export default function RentalDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [confirm, setConfirm] = useState<'return' | 'complete' | null>(null);

  const { data: rental, isLoading, error } = useQuery({
    queryKey: ['rental', id],
    queryFn: async () => (await rentalsApi.getById(id!)).data,
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: ['rental', id] });
    invalidateAllRentalCaches(queryClient);
    setConfirm(null);
  };

  const returnRentalMutation = useMutation({ mutationFn: (rentalId: string) => rentalsApi.returnRental(rentalId), onSuccess: onDone });
  const completeRentalMutation = useMutation({ mutationFn: (rentalId: string) => rentalsApi.complete(rentalId), onSuccess: onDone });

  const back = (
    <Button component={RouterLink} to="/panel/kiralamalar" startIcon={<ArrowBack />} sx={{ color: a.muted, mb: 2, ml: -1 }}>
      Kiralamalar
    </Button>
  );

  if (isLoading) {
    return (
      <>
        {back}
        <Skeleton width={260} height={48} />
        <Box sx={{ display: 'grid', gap: 2, mt: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Skeleton variant="rounded" height={280} />
          <Skeleton variant="rounded" height={280} />
        </Box>
      </>
    );
  }

  if (error || !rental) {
    return (
      <>
        {back}
        <Alert severity="error">Kiralama bulunamadı veya yüklenirken hata oluştu.</Alert>
      </>
    );
  }

  const fin = getRentalFinancials(rental);
  const paidRatio = fin.totalAmount > 0 ? Math.min(1, fin.totalPaid / fin.totalAmount) : 0;
  const note = getDisplayNote(rental.note);
  const isActive = rental.status === 'ACTIVE';
  const due = dueInfo(rental.endDate);
  const extrasRows = [
    fin.extras.kmDiff > 0 && { label: 'KM farkı', value: formatCurrency(fin.extras.kmDiff), mono: true },
    fin.extras.cleaning > 0 && { label: 'Temizlik', value: formatCurrency(fin.extras.cleaning), mono: true },
    fin.extras.hgs > 0 && { label: 'HGS', value: formatCurrency(fin.extras.hgs), mono: true },
    fin.extras.damage > 0 && { label: 'Hasar', value: formatCurrency(fin.extras.damage), mono: true },
    fin.extras.fuel > 0 && { label: 'Yakıt', value: formatCurrency(fin.extras.fuel), mono: true },
  ];
  const installments = [
    { label: 'Peşin ödeme', amount: rental.upfront || 0, date: null as string | null | undefined },
    { label: '1. ödeme', amount: rental.pay1 || 0, date: rental.payDate1 },
    { label: '2. ödeme', amount: rental.pay2 || 0, date: rental.payDate2 },
    { label: '3. ödeme', amount: rental.pay3 || 0, date: rental.payDate3 },
    { label: '4. ödeme', amount: rental.pay4 || 0, date: rental.payDate4 },
  ].filter((step) => step.amount > 0);
  const payments: Payment[] = rental.payments || [];

  return (
    <>
      {back}

      {/* Başlık */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
            <Plate value={rental.vehicle?.plate} />
            <Status value={rental.status} />
            {isActive && <StatusBadge label={due.text} tone={due.tone} />}
          </Stack>
          <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 28, md: 34 }, lineHeight: 1.1 }}>
            {rental.customer?.fullName || 'Müşteri adı yok'}
          </Typography>
          <Typography sx={{ color: a.muted, mt: 0.75 }}>
            {rental.vehicle?.name || 'Araç'} · {dayjs(rental.startDate).format('DD MMM')} – {dayjs(rental.endDate).format('DD MMM YYYY')} · {rental.days} gün
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Tooltip title="Yazdır">
            <IconButton onClick={() => window.print()} aria-label="Yazdır" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}><PrintOutlined fontSize="small" /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<PaymentsOutlined />} onClick={() => setPaymentDialogOpen(true)} disabled={!isActive}>Ödeme ekle</Button>
          {isActive && (
            <>
              <Button variant="outlined" startIcon={<KeyboardReturn />} onClick={() => setConfirm('return')}>Teslim et</Button>
              <Button variant="contained" startIcon={<CheckCircleOutline />} onClick={() => setConfirm('complete')}>Tamamla</Button>
            </>
          )}
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'start' }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Panel title="Kiralama">
            <DefinitionList
              rows={[
                { label: 'Başlangıç', value: dayjs(rental.startDate).format('DD.MM.YYYY HH:mm'), mono: true },
                { label: 'Bitiş', value: dayjs(rental.endDate).format('DD.MM.YYYY HH:mm'), mono: true },
                { label: 'Süre', value: `${rental.days} gün` },
                { label: 'Günlük ücret', value: formatCurrency(rental.dailyPrice), mono: true },
                { label: 'Oluşturulma', value: dayjs(rental.createdAt).format('DD.MM.YYYY HH:mm'), mono: true },
              ]}
            />
            {note && (
              <Box sx={{ mt: 1.5, p: 1.75, borderRadius: '10px', bgcolor: a.surface }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: a.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>Not</Typography>
                <Typography sx={{ fontSize: 14, whiteSpace: 'pre-line' }}>{note}</Typography>
              </Box>
            )}
          </Panel>

          <Panel title="Müşteri">
            <DefinitionList
              rows={[
                { label: 'Ad soyad', value: rental.customer?.fullName || '—' },
                rental.customer?.phone ? { label: 'Telefon', value: <Box component="a" href={`tel:${rental.customer.phone}`} sx={{ color: 'inherit', textDecoration: 'none' }}>{rental.customer.phone}</Box>, mono: true } : null,
                rental.customer?.email ? { label: 'E-posta', value: rental.customer.email } : null,
              ]}
            />
          </Panel>

          <Panel title="Ödeme geçmişi" subtitle="Plan dışı ek ödemeler" padded={false} action={<Button size="small" startIcon={<PaymentsOutlined />} onClick={() => setPaymentDialogOpen(true)} disabled={!isActive}>Yeni ödeme</Button>}>
            <DataTable
              dense
              rows={payments}
              rowKey={(payment) => payment.id}
              empty={<EmptyState compact title="Henüz ek ödeme yok" />}
              columns={[
                { key: 'date', header: 'Tarih', render: (payment) => <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{dayjs(payment.paidAt).format('DD.MM.YYYY HH:mm')}</Box> },
                { key: 'method', header: 'Yöntem', render: (payment) => <StatusBadge label={methodLabel(payment.method)} tone="neutral" /> },
                { key: 'amount', header: 'Tutar', align: 'right', render: (payment) => <Box component="span" sx={{ ...monoSx, fontWeight: 600, color: a.success }}>{formatCurrency(payment.amount)}</Box> },
              ]}
            />
          </Panel>
        </Stack>

        <Stack spacing={2} sx={{ minWidth: 0, position: { lg: 'sticky' }, top: { lg: 84 } }}>
          <Panel title="Finansal durum">
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, color: a.muted, fontWeight: 700 }}>Kalan bakiye</Typography>
              <Typography sx={{ ...monoSx, fontSize: 32, fontWeight: 500, color: fin.balance > 0 ? a.danger : a.success, lineHeight: 1.2 }}>{formatCurrency(fin.balance)}</Typography>
              <Box sx={{ height: 6, borderRadius: 999, bgcolor: a.surface, overflow: 'hidden', mt: 1.25 }} aria-hidden>
                <Box sx={{ height: '100%', width: `${paidRatio * 100}%`, bgcolor: a.success, borderRadius: 999, transition: `width .6s ${ease}` }} />
              </Box>
              <Typography sx={{ fontSize: 12.5, color: a.muted, mt: 0.75 }}>Toplamın %{Math.round(paidRatio * 100)}'i ödendi</Typography>
            </Box>
            <DefinitionList
              rows={[
                { label: `Kira bedeli (${rental.days} gün)`, value: formatCurrency(fin.rentBase), mono: true },
                ...extrasRows,
                { label: 'Genel toplam', value: formatCurrency(fin.totalAmount), mono: true, strong: true },
                { label: 'Ödenen', value: formatCurrency(fin.totalPaid), mono: true, tone: 'success' },
                { label: 'Kalan', value: formatCurrency(fin.balance), mono: true, strong: true, tone: fin.balance > 0 ? 'danger' : 'success' },
              ]}
            />
          </Panel>

          <Panel title="Ödeme planı" subtitle={`${installments.length + payments.length} ödeme`}>
            {installments.length === 0 && payments.length === 0 ? (
              <Typography sx={{ color: a.muted, fontSize: 14 }}>Henüz ödeme alınmadı.</Typography>
            ) : (
              <Box>
                {installments.map((step, index) => (
                  <PlanStep key={step.label} label={step.label} amount={step.amount} date={step.date} last={index === installments.length - 1 && payments.length === 0} />
                ))}
                {payments.map((payment, index) => (
                  <PlanStep key={payment.id} label="Ek ödeme" amount={payment.amount} date={payment.paidAt} extra={` · ${methodLabel(payment.method)}`} last={index === payments.length - 1} />
                ))}
              </Box>
            )}
          </Panel>
        </Stack>
      </Box>

      <AddPaymentDialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} rental={rental} />

      <ConfirmDialog
        open={confirm === 'return'}
        title="Aracı teslim et"
        body={<><strong>{rental.vehicle?.plate}</strong> kiralaması "Teslim alındı" durumuna geçecek.</>}
        confirmLabel="Teslim et"
        pending={returnRentalMutation.isPending}
        error={returnRentalMutation.isError ? 'İşlem başarısız oldu.' : undefined}
        onConfirm={() => returnRentalMutation.mutate(rental.id)}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'complete'}
        title="Kiralamayı tamamla"
        body={<><strong>{rental.vehicle?.plate}</strong> kiralaması kapatılacak ve araç müsait duruma geçecek. Bu işlem geri alınamaz.</>}
        confirmLabel="Tamamla"
        pending={completeRentalMutation.isPending}
        error={completeRentalMutation.isError ? 'İşlem başarısız oldu.' : undefined}
        onConfirm={() => completeRentalMutation.mutate(rental.id)}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

