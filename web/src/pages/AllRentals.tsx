import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline,
  DownloadOutlined,
  EditOutlined,
  FilterAltOff,
  KeyboardReturn,
  PaymentsOutlined,
  PrintOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { rentalsApi, vehiclesApi, Rental, Vehicle } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/format';
import { getStatusText } from '../utils/status';
import { getRentalFinancials } from '../utils/rentalFinancials';
import AddPaymentDialog from '../components/AddPaymentDialog';
import EditRentalDialog from '../components/EditRentalDialog';
import NewRentalDialog from '../components/NewRentalDialog';
import RentalDetailDialog from '../components/RentalDetailDialog';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';
import { a, monoSx } from '../admin/theme';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterTabs,
  KpiTile,
  Money,
  PageHeader,
  Pager,
  Plate,
  RowActions,
  SearchField,
  Status,
  Sub,
  Toolbar,
  panelSx,
} from '../admin/ui';

type DebtFilter = '' | 'DEBT' | 'PAID';
type StatusFilter = '' | Rental['status'];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'ACTIVE', label: 'Kirada' },
  { value: 'RETURNED', label: 'Teslim alındı' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal' },
];

const period = (rental: Rental) => (
  <>
    <Box component="span" sx={{ ...monoSx, fontSize: 13, whiteSpace: 'nowrap' }}>
      {dayjs(rental.startDate).format('DD.MM.YY')} → {dayjs(rental.endDate).format('DD.MM.YY')}
    </Box>
    <Sub>{rental.days} gün · {formatCurrency(rental.dailyPrice)}/gün</Sub>
  </>
);

export const AllRentals: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('');
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialog durumları — detay modalı id üzerinden bağlanır ki
  // ödeme eklendiğinde invalidation sonrası taze veri gösterilsin
  const [newRentalDialog, setNewRentalDialog] = useState(false);
  const [detailRentalId, setDetailRentalId] = useState<string | null>(null);
  const [editRentalDialog, setEditRentalDialog] = useState<{ open: boolean; rental: Rental | null }>({ open: false, rental: null });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; rental: Rental | null }>({ open: false, rental: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rental: Rental | null }>({ open: false, rental: null });
  const [completeDialog, setCompleteDialog] = useState<{ open: boolean; rental: Rental | null }>({ open: false, rental: null });

  const queryClient = useQueryClient();

  const { data: rentalsRes, isLoading, error } = useQuery({
    queryKey: ['all-rentals'],
    queryFn: () => rentalsApi.getAll({ limit: 1000 }),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.getAll(undefined, 1000),
    staleTime: 60 * 1000,
  });

  const completeRentalMutation = useMutation({
    mutationFn: (rentalId: string) => rentalsApi.complete(rentalId),
    onSuccess: () => {
      invalidateAllRentalCaches(queryClient);
      setCompleteDialog({ open: false, rental: null });
    },
  });

  const deleteRentalMutation = useMutation({
    mutationFn: (rentalId: string) => rentalsApi.delete(rentalId),
    onSuccess: () => {
      invalidateAllRentalCaches(queryClient);
      setDeleteDialog({ open: false, rental: null });
    },
  });

  const rentals: Rental[] = rentalsRes?.data?.data || [];
  const vehicles: Vehicle[] = vehiclesRes?.data || [];

  // Durum dışındaki filtreler (sekme sayıları bunlara göre hesaplanır)
  const baseFiltered = useMemo(() => {
    return rentals
      .filter((rental) => {
        if (selectedVehicle && rental.vehicleId !== selectedVehicle) return false;

        if (debtFilter) {
          const { balance } = getRentalFinancials(rental);
          if (debtFilter === 'DEBT' && balance <= 0) return false;
          if (debtFilter === 'PAID' && balance > 0) return false;
        }

        // Tarih aralığı: kiralama dönemi ile seçilen aralık kesişsin
        if (dateFrom && dayjs(rental.endDate).isBefore(dayjs(dateFrom), 'day')) return false;
        if (dateTo && dayjs(rental.startDate).isAfter(dayjs(dateTo), 'day')) return false;

        if (searchTerm) {
          const query = searchTerm.toLocaleLowerCase('tr-TR');
          return (
            rental.customer?.fullName?.toLocaleLowerCase('tr-TR').includes(query) ||
            rental.vehicle?.plate?.toLocaleLowerCase('tr-TR').includes(query) ||
            rental.vehicle?.name?.toLocaleLowerCase('tr-TR').includes(query)
          );
        }
        return true;
      })
      .sort((x, y) => dayjs(y.createdAt).diff(dayjs(x.createdAt)));
  }, [rentals, selectedVehicle, debtFilter, dateFrom, dateTo, searchTerm]);

  const filteredRentals = useMemo(
    () => (selectedStatus ? baseFiltered.filter((rental) => rental.status === selectedStatus) : baseFiltered),
    [baseFiltered, selectedStatus],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': baseFiltered.length };
    for (const rental of baseFiltered) counts[rental.status] = (counts[rental.status] || 0) + 1;
    return counts;
  }, [baseFiltered]);

  const summary = useMemo(() => {
    return filteredRentals.reduce(
      (acc, rental) => {
        const fin = getRentalFinancials(rental);
        acc.total += fin.totalAmount;
        acc.paid += fin.totalPaid;
        acc.balance += fin.balance;
        if (rental.status === 'ACTIVE') acc.active += 1;
        return acc;
      },
      { total: 0, paid: 0, balance: 0, active: 0 }
    );
  }, [filteredRentals]);

  const pagedRentals = filteredRentals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const detailRental = detailRentalId ? rentals.find((rental) => rental.id === detailRentalId) || null : null;

  const hasActiveFilter = Boolean(searchTerm || selectedVehicle || selectedStatus || debtFilter || dateFrom || dateTo);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicle('');
    setSelectedStatus('');
    setDebtFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const withReset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  // xlsx (~280 KB) yalnızca dışa aktarırken yüklenir
  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const data = filteredRentals.map((rental) => {
      const fin = getRentalFinancials(rental);
      return {
        Plaka: rental.vehicle?.plate || '',
        'Müşteri': rental.customer?.fullName || '',
        'Araç': rental.vehicle?.name || '',
        'Başlangıç': formatDate(rental.startDate),
        'Bitiş': formatDate(rental.endDate),
        'Gün': rental.days,
        'Günlük Ücret': rental.dailyPrice,
        'Toplam Tutar': fin.totalAmount,
        'Tahsil Edilen': fin.totalPaid,
        'Kalan Bakiye': fin.balance,
        Durum: getStatusText(rental.status),
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kiralamalar');
    XLSX.writeFile(wb, `kiralamalar-${dayjs().format('DD-MM-YYYY')}.xlsx`);
  };

  const actionsFor = (rental: Rental) => ({
    primary: rental.status === 'ACTIVE'
      ? { label: 'Teslim al', icon: <KeyboardReturn />, onClick: () => setCompleteDialog({ open: true, rental }) }
      : null,
    items: [
      { label: 'Detayı aç', icon: <VisibilityOutlined />, onClick: () => setDetailRentalId(rental.id) },
      { label: 'Düzenle', icon: <EditOutlined />, onClick: () => setEditRentalDialog({ open: true, rental }) },
      { label: 'Ödeme ekle', icon: <PaymentsOutlined />, onClick: () => setPaymentDialog({ open: true, rental }) },
      { label: 'Sil', icon: <DeleteOutline />, danger: true, onClick: () => setDeleteDialog({ open: true, rental }) },
    ],
  });

  const collectedRatio = summary.total ? summary.paid / summary.total : 0;

  return (
    <>
      <PageHeader
        title="Kiralamalar"
        subtitle={`${filteredRentals.length} kayıt${hasActiveFilter ? ' · filtre uygulandı' : ''}`}
        actions={
          <>
            <Tooltip title="Excel'e aktar">
              <IconButton onClick={handleExport} aria-label="Excel'e aktar" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}>
                <DownloadOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Yazdır">
              <IconButton onClick={() => window.print()} aria-label="Yazdır" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}>
                <PrintOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewRentalDialog(true)}>Yeni kiralama</Button>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>Veriler yüklenirken hata oluştu</Alert>}

      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
        <KpiTile label="Toplam tutar" loading={isLoading} value={formatCurrency(summary.total)} meta={hasActiveFilter ? 'Filtrelenen kayıtlar' : 'Tüm kayıtlar'} />
        <KpiTile label="Tahsil edilen" loading={isLoading} value={formatCurrency(summary.paid)} progress={collectedRatio} meta={`Toplamın %${Math.round(collectedRatio * 100)}'i`} />
        <KpiTile label="Kalan bakiye" loading={isLoading} value={<Box component="span" sx={{ color: summary.balance > 0 ? a.danger : a.ink }}>{formatCurrency(summary.balance)}</Box>} meta={summary.balance > 0 ? 'Tahsil edilecek' : 'Açık bakiye yok'} />
        <KpiTile label="Aktif kiralama" loading={isLoading} value={summary.active} meta="Şu an kirada" />
      </Box>

      <Box sx={panelSx}>
        <Toolbar>
          <FilterTabs
            label="Kiralama durumu"
            value={selectedStatus}
            onChange={withReset(setSelectedStatus)}
            options={STATUS_TABS.map((tab) => ({ ...tab, count: statusCounts[tab.value] || 0 }))}
          />
          <Box sx={{ flex: 1 }} />
          <SearchField value={searchTerm} onChange={withReset(setSearchTerm)} placeholder="Müşteri, plaka, araç" sx={{ width: { xs: '100%', sm: 240 } }} />
        </Toolbar>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, px: 2.5, py: 1.5, borderBottom: `1px solid ${a.lineSoft}` }}>
          <TextField select value={selectedVehicle} onChange={(e) => withReset(setSelectedVehicle)(e.target.value)} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Araç' }} sx={{ width: { xs: '100%', sm: 220 } }}>
            <MenuItem value="">Tüm araçlar</MenuItem>
            {vehicles.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.name}</MenuItem>)}
          </TextField>
          <TextField select value={debtFilter} onChange={(e) => withReset(setDebtFilter)(e.target.value as DebtFilter)} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Bakiye' }} sx={{ width: { xs: 'calc(50% - 5px)', sm: 150 } }}>
            <MenuItem value="">Tüm bakiyeler</MenuItem>
            <MenuItem value="DEBT">Borçlu</MenuItem>
            <MenuItem value="PAID">Ödendi</MenuItem>
          </TextField>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField type="date" value={dateFrom} onChange={(e) => withReset(setDateFrom)(e.target.value)} inputProps={{ 'aria-label': 'Başlangıç tarihi' }} sx={{ flex: 1, width: { sm: 150 } }} />
            <Typography sx={{ color: a.subtle }}>–</Typography>
            <TextField type="date" value={dateTo} onChange={(e) => withReset(setDateTo)(e.target.value)} inputProps={{ 'aria-label': 'Bitiş tarihi' }} sx={{ flex: 1, width: { sm: 150 } }} />
          </Stack>
          {hasActiveFilter && (
            <Button size="small" startIcon={<FilterAltOff sx={{ fontSize: 17 }} />} onClick={clearFilters} sx={{ color: a.muted }}>Temizle</Button>
          )}
        </Box>

        <DataTable
          rows={pagedRentals}
          rowKey={(rental) => rental.id}
          loading={isLoading}
          onRowClick={(rental) => setDetailRentalId(rental.id)}
          empty={
            <EmptyState
              title={hasActiveFilter ? 'Filtrelere uygun kiralama yok' : 'Henüz kiralama kaydı yok'}
              subtitle={hasActiveFilter ? 'Filtreleri gevşetmeyi deneyin.' : 'İlk kiralamayı başlatmak için "Yeni kiralama" düğmesini kullanın.'}
              action={hasActiveFilter ? <Button variant="outlined" size="small" onClick={clearFilters}>Filtreleri temizle</Button> : undefined}
            />
          }
          columns={[
            { key: 'plate', header: 'Plaka', render: (rental) => <Plate value={rental.vehicle?.plate} /> },
            {
              key: 'customer',
              header: 'Müşteri',
              render: (rental) => (
                <>
                  <Box component="span" sx={{ fontWeight: 700 }}>{rental.customer?.fullName || 'İsimsiz'}</Box>
                  <Sub>{rental.vehicle?.name || '—'}</Sub>
                </>
              ),
            },
            { key: 'period', header: 'Dönem', render: period, hideBelow: 'md' },
            { key: 'total', header: 'Toplam', align: 'right', render: (rental) => <Money value={getRentalFinancials(rental).totalAmount} />, hideBelow: 'lg' },
            { key: 'paid', header: 'Tahsil', align: 'right', render: (rental) => <Money value={getRentalFinancials(rental).totalPaid} tone="muted" />, hideBelow: 'lg' },
            {
              key: 'balance',
              header: 'Kalan',
              align: 'right',
              render: (rental) => {
                const { balance } = getRentalFinancials(rental);
                return <Money value={balance} tone={balance > 0 ? 'danger' : balance < 0 ? undefined : 'muted'} strong={balance > 0} />;
              },
            },
            { key: 'status', header: 'Durum', render: (rental) => <Status value={rental.status} /> },
            { key: 'actions', header: '', align: 'right', width: 150, render: (rental) => <RowActions {...actionsFor(rental)} /> },
          ]}
          mobileRow={(rental) => {
            const { balance } = getRentalFinancials(rental);
            return (
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Plate value={rental.vehicle?.plate} size="sm" />
                    <Status value={rental.status} />
                  </Stack>
                  <RowActions items={actionsFor(rental).items} />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5, minWidth: 0 }}>{rental.customer?.fullName || 'İsimsiz'}</Typography>
                  <Money value={balance} tone={balance > 0 ? 'danger' : 'muted'} strong={balance > 0} />
                </Stack>
                <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.muted }}>
                  {dayjs(rental.startDate).format('DD.MM.YY')} → {dayjs(rental.endDate).format('DD.MM.YY')} · {rental.days} gün
                </Typography>
              </Stack>
            );
          }}
        />
        <Pager
          page={page}
          pageSize={rowsPerPage}
          total={filteredRentals.length}
          onPage={setPage}
          onPageSize={(size) => { setRowsPerPage(size); setPage(0); }}
        />
      </Box>

      {/* Kiralama Detay Modalı */}
      <RentalDetailDialog
        open={Boolean(detailRental)}
        rental={detailRental}
        onClose={() => setDetailRentalId(null)}
        onEdit={(rental) => setEditRentalDialog({ open: true, rental })}
        onAddPayment={(rental) => setPaymentDialog({ open: true, rental })}
        onComplete={(rental) => setCompleteDialog({ open: true, rental })}
      />

      <ConfirmDialog
        open={completeDialog.open}
        title="Aracı teslim al"
        body={<><strong>{completeDialog.rental?.vehicle?.plate}</strong> plakalı aracın kiralaması kapatılacak ve araç müsait duruma geçecek. Bu işlem geri alınamaz.</>}
        confirmLabel="Teslim al"
        pendingLabel="İşleniyor…"
        pending={completeRentalMutation.isPending}
        error={completeRentalMutation.isError ? 'Teslim alma işlemi başarısız oldu.' : undefined}
        onConfirm={() => completeDialog.rental && completeRentalMutation.mutate(completeDialog.rental.id)}
        onClose={() => setCompleteDialog({ open: false, rental: null })}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        danger
        title="Kiralamayı sil"
        body={<><strong>{deleteDialog.rental?.vehicle?.plate}</strong> plakalı aracın bu kiralama kaydı silinecek. Bu işlem geri alınamaz.</>}
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        pending={deleteRentalMutation.isPending}
        error={deleteRentalMutation.isError ? 'Kayıt silinemedi.' : undefined}
        onConfirm={() => deleteDialog.rental && deleteRentalMutation.mutate(deleteDialog.rental.id)}
        onClose={() => setDeleteDialog({ open: false, rental: null })}
      />

      <NewRentalDialog open={newRentalDialog} onClose={() => setNewRentalDialog(false)} />
      <AddPaymentDialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, rental: null })}
        rental={paymentDialog.rental}
      />
      <EditRentalDialog
        open={editRentalDialog.open}
        onClose={() => setEditRentalDialog({ open: false, rental: null })}
        rental={editRentalDialog.rental}
      />
    </>
  );
};

export default AllRentals;
