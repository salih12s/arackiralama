import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, DeleteOutline, EditOutlined, ReceiptLongOutlined } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import { vehicleExpensesApi, VehicleExpense, CreateVehicleExpenseData } from '../api/vehicleExpenses';
import { vehiclesApi } from '../api/vehicles';
import { formatCurrency } from '../utils/currency';
import { a, monoSx } from '../admin/theme';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  KpiTile,
  PageHeader,
  Plate,
  RowActions,
  SearchField,
  StatusBadge,
  Sub,
  Toolbar,
  panelSx, kpiRow3Sx } from '../admin/ui';

interface Vehicle {
  id: string;
  plate: string;
  name?: string;
  active?: boolean;
}

const EXPENSE_TYPES = [
  'YAĞ BAKIM',
  'ELEKTRİK',
  'AKÜ',
  'LASTİK',
  'ŞANZUMAN',
  'KLİMA',
  'FREN',
  'GENEL BAKIM',
  'DÖŞEME',
  'ARIZA',
  'SİGORTA',
  'KASKO',
  'DİĞER'
];

const typeLabel = (value: string) => value.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase('tr-TR'));

export default function VehicleExpenses() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VehicleExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [formData, setFormData] = useState({
    date: dayjs(),
    vehicleId: '',
    expenseType: '',
    location: '',
    amount: 0,
    description: '',
  });

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['vehicle-expenses'],
    queryFn: vehicleExpensesApi.getAll,
  });

  // Ayrı anahtar: bu modül düz dizi döndürür; ['vehicles'] önbelleğini diğer sayfalarla paylaşmasın.
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'expense-options'],
    queryFn: () => vehiclesApi.getAll(),
  });

  const vehicles: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : ((vehiclesData as any)?.data || []);

  const filteredExpenses = useMemo(() => {
    const query = searchTerm.toLocaleLowerCase('tr-TR');
    return expenses
      .filter((expense) => {
        const plateMatch = expense.vehicle.plate.toLocaleLowerCase('tr-TR').includes(query) || (expense.vehicle.name || '').toLocaleLowerCase('tr-TR').includes(query);
        const typeMatch = !filterExpenseType || expense.expenseType === filterExpenseType;
        return plateMatch && typeMatch;
      })
      .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
  }, [expenses, searchTerm, filterExpenseType]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateVehicleExpenseData) => vehicleExpensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVehicleExpenseData> }) => vehicleExpensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setModalOpen(false);
      setEditingExpense(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vehicleExpensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setDeleteTarget(null);
    },
  });

  const resetForm = () => {
    setFormData({ date: dayjs(), vehicleId: '', expenseType: '', location: '', amount: 0, description: '' });
  };

  const handleOpenModal = (expense?: VehicleExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        date: dayjs(expense.date),
        vehicleId: expense.vehicleId,
        expenseType: expense.expenseType,
        location: expense.location,
        amount: expense.amount,
        description: expense.description || '',
      });
    } else {
      setEditingExpense(null);
      resetForm();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExpense(null);
    resetForm();
  };

  const handleSubmit = () => {
    const submitData = {
      date: formData.date.toISOString(),
      vehicleId: formData.vehicleId,
      expenseType: formData.expenseType,
      location: formData.location,
      amount: formData.amount,
      description: formData.description || undefined,
    };
    if (editingExpense) updateMutation.mutate({ id: editingExpense.id, data: submitData });
    else createMutation.mutate(submitData);
  };

  // Özet: filtrelenen kayıtlar üzerinden
  const total = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const thisMonth = filteredExpenses
    .filter((expense) => dayjs(expense.date).isSame(dayjs(), 'month'))
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const topVehicle = useMemo(() => {
    const byPlate = new Map<string, number>();
    for (const expense of filteredExpenses) byPlate.set(expense.vehicle.plate, (byPlate.get(expense.vehicle.plate) || 0) + (expense.amount || 0));
    return [...byPlate.entries()].sort((x, y) => y[1] - x[1])[0];
  }, [filteredExpenses]);

  const hasFilter = Boolean(searchTerm || filterExpenseType);
  const saving = createMutation.isPending || updateMutation.isPending;
  const formInvalid = !formData.vehicleId || !formData.expenseType || !formData.location || !formData.amount || formData.amount <= 0;

  const actionsFor = (expense: VehicleExpense) => [
    { label: 'Düzenle', icon: <EditOutlined />, onClick: () => handleOpenModal(expense) },
    { label: 'Sil', icon: <DeleteOutline />, danger: true, onClick: () => { deleteMutation.reset(); setDeleteTarget(expense); } },
  ];

  return (
    <>
      <PageHeader
        title="Araç giderleri"
        subtitle="Bakım, onarım ve sigorta harcamaları."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>Gider ekle</Button>}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>Veriler yüklenirken hata oluştu</Alert>}

      <Box sx={kpiRow3Sx}>
        <KpiTile label="Toplam gider" loading={isLoading} value={formatCurrency(total)} meta={`${filteredExpenses.length} kayıt${hasFilter ? ' · filtreli' : ''}`} />
        <KpiTile label={`${dayjs().format('MMMM')} ayı`} loading={isLoading} value={formatCurrency(thisMonth)} meta="Bu ay yapılan harcama" />
        <KpiTile label="En çok harcanan" loading={isLoading} value={topVehicle ? topVehicle[0] : '—'} meta={topVehicle ? formatCurrency(topVehicle[1]) : 'Kayıt yok'} />
      </Box>

      <Box sx={panelSx}>
        <Toolbar>
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Plaka veya araç ara" sx={{ width: { xs: '100%', sm: 240 } }} />
          <TextField select value={filterExpenseType} onChange={(e) => setFilterExpenseType(e.target.value)} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Gider türü' }} sx={{ width: { xs: '100%', sm: 200 } }}>
            <MenuItem value="">Tüm gider türleri</MenuItem>
            {EXPENSE_TYPES.map((type) => <MenuItem key={type} value={type}>{typeLabel(type)}</MenuItem>)}
          </TextField>
          {hasFilter && <Button size="small" onClick={() => { setSearchTerm(''); setFilterExpenseType(''); }} sx={{ color: a.muted }}>Temizle</Button>}
        </Toolbar>

        <DataTable
          rows={filteredExpenses}
          rowKey={(expense) => expense.id}
          loading={isLoading}
          onRowClick={(expense) => handleOpenModal(expense)}
          empty={
            <EmptyState
              icon={<ReceiptLongOutlined />}
              title={expenses.length === 0 ? 'Henüz gider kaydı yok' : 'Filtreye uygun gider yok'}
              subtitle={expenses.length === 0 ? 'İlk gideri "Gider ekle" ile kaydedin.' : 'Filtreleri temizlemeyi deneyin.'}
            />
          }
          columns={[
            { key: 'date', header: 'Tarih', render: (expense) => <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{dayjs(expense.date).format('DD.MM.YYYY')}</Box> },
            { key: 'vehicle', header: 'Araç', render: (expense) => <><Plate value={expense.vehicle.plate} size="sm" /><Sub>{expense.vehicle.name}</Sub></> },
            { key: 'type', header: 'Tür', render: (expense) => <StatusBadge label={typeLabel(expense.expenseType)} tone="neutral" /> },
            { key: 'location', header: 'Yapıldığı yer', hideBelow: 'md', render: (expense) => expense.location },
            { key: 'amount', header: 'Tutar', align: 'right', render: (expense) => <Box component="span" sx={{ ...monoSx, fontWeight: 600 }}>{formatCurrency(expense.amount)}</Box> },
            {
              key: 'description',
              header: 'Açıklama',
              hideBelow: 'lg',
              render: (expense) => expense.description ? (
                <Tooltip title={expense.description}>
                  <Typography sx={{ fontSize: 13, color: a.muted, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.description}</Typography>
                </Tooltip>
              ) : <Box component="span" sx={{ color: a.subtle }}>—</Box>,
            },
            { key: 'actions', header: '', align: 'right', width: 56, render: (expense) => <RowActions items={actionsFor(expense)} /> },
          ]}
          mobileRow={(expense) => (
            <Stack spacing={0.6}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Plate value={expense.vehicle.plate} size="sm" />
                  <StatusBadge label={typeLabel(expense.expenseType)} tone="neutral" />
                </Stack>
                <RowActions items={actionsFor(expense)} />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography sx={{ fontSize: 13, color: a.muted }}>{dayjs(expense.date).format('DD.MM.YYYY')} · {expense.location}</Typography>
                <Box component="span" sx={{ ...monoSx, fontWeight: 600 }}>{formatCurrency(expense.amount)}</Box>
              </Stack>
            </Stack>
          )}
        />
      </Box>

      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingExpense ? 'Gideri düzenle' : 'Yeni gider'}
          <IconButton onClick={handleCloseModal} size="small" aria-label="Kapat"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {(createMutation.isError || updateMutation.isError) && <Alert severity="error" sx={{ mb: 2 }}>Gider kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.</Alert>}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, pt: 1 }}>
            <DatePicker
              label="Tarih"
              value={formData.date}
              onChange={(newValue: Dayjs | null) => setFormData((prev) => ({ ...prev, date: newValue || dayjs() }))}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
            <TextField select label="Araç" value={formData.vehicleId} onChange={(e) => setFormData((prev) => ({ ...prev, vehicleId: e.target.value }))} fullWidth required>
              {[...vehicles].sort((x, y) => x.plate.localeCompare(y.plate)).map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.plate}{vehicle.name ? ` · ${vehicle.name}` : ''}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Gider türü" value={formData.expenseType} onChange={(e) => setFormData((prev) => ({ ...prev, expenseType: e.target.value }))} fullWidth required>
              {EXPENSE_TYPES.map((type) => <MenuItem key={type} value={type}>{typeLabel(type)}</MenuItem>)}
            </TextField>
            <TextField
              label="Tutar"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
              InputProps={{ endAdornment: <InputAdornment position="end">₺</InputAdornment> }}
            />
            <TextField label="İşin yapıldığı yer" value={formData.location} onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))} fullWidth required sx={{ gridColumn: '1 / -1' }} />
            <TextField label="Açıklama" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={3} sx={{ gridColumn: '1 / -1' }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={handleCloseModal}>Vazgeç</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={formInvalid || saving}>
            {saving ? 'Kaydediliyor…' : editingExpense ? 'Kaydet' : 'Gider ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title="Gideri sil"
        body={<><strong>{deleteTarget?.vehicle.plate}</strong> için {deleteTarget ? dayjs(deleteTarget.date).format('DD.MM.YYYY') : ''} tarihli {deleteTarget ? formatCurrency(deleteTarget.amount) : ''} tutarındaki gider silinecek.</>}
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        pending={deleteMutation.isPending}
        error={deleteMutation.isError ? 'Gider silinemedi.' : undefined}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
