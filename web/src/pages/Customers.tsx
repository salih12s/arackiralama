import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, DeleteOutline, EditOutlined, PeopleAltOutlined } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { customersApi, Customer } from '../api/client';
import { maskPhone } from '../utils/privacy';
import { a, monoSx } from '../admin/theme';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterTabs,
  PageHeader,
  RowActions,
  SearchField,
  StatusBadge,
  Toolbar,
  panelSx,
} from '../admin/ui';

type Segment = 'ALL' | 'ACTIVE' | 'NONE';

// Müşteri kaydı yalnızca ad soyad ve telefon tutar.
const emptyForm = { fullName: '', phone: '' };

export default function Customers() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [segment, setSegment] = useState<Segment>('ALL');
  const [customerDialog, setCustomerDialog] = useState<{ open: boolean; customer?: Customer; mode: 'create' | 'edit' }>({ open: false, mode: 'create' });
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: customersRes, isLoading, isError } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => customersApi.getAll(searchTerm || undefined, 1000),
    staleTime: 30 * 1000,
  });

  const customers: Customer[] = customersRes?.data?.data || [];

  const createCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.error || 'Müşteri oluşturulurken hata oluştu' });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Customer>) => customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['all-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.error || 'Müşteri güncellenirken hata oluştu' });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteTarget(null);
    },
  });

  const handleOpenDialog = (mode: 'create' | 'edit', customer?: Customer) => {
    setCustomerDialog({ open: true, mode, customer });
    setFormData(mode === 'edit' && customer
      ? { fullName: customer.fullName, phone: customer.phone || '' }
      : emptyForm);
    setErrors({});
  };

  const handleCloseDialog = () => {
    setCustomerDialog({ open: false, mode: 'create' });
    setFormData(emptyForm);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Ad soyad gereklidir';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      if (customerDialog.mode === 'create') {
        await createCustomerMutation.mutateAsync(formData);
      } else if (customerDialog.customer) {
        await updateCustomerMutation.mutateAsync({ id: customerDialog.customer.id, ...formData });
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleChange = (field: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const hasRentals = (customer: Customer) => (customer.rentalCount || 0) > 0;
  const counts = useMemo(() => ({
    ALL: customers.length,
    ACTIVE: customers.filter(hasRentals).length,
    NONE: customers.filter((customer) => !hasRentals(customer)).length,
  }), [customers]);
  const visible = customers.filter((customer) =>
    segment === 'ALL' ? true : segment === 'ACTIVE' ? hasRentals(customer) : !hasRentals(customer),
  );

  const pending = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  const actionsFor = (customer: Customer) => [
    { label: 'Düzenle', icon: <EditOutlined />, onClick: () => handleOpenDialog('edit', customer) },
    { label: 'Sil', icon: <DeleteOutline />, danger: true, onClick: () => { deleteCustomerMutation.reset(); setDeleteTarget(customer); } },
  ];

  const avatar = (customer: Customer, size = 34) => (
    <Avatar sx={{ width: size, height: size, bgcolor: a.accentSoft, color: a.accent, fontSize: size * 0.4, fontWeight: 800 }}>
      {customer.fullName.charAt(0).toLocaleUpperCase('tr-TR')}
    </Avatar>
  );

  return (
    <>
      <PageHeader
        title="Müşteriler"
        subtitle={`${customers.length} kayıtlı müşteri`}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog('create')}>Yeni müşteri</Button>}
      />

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Müşteriler yüklenemedi.</Alert>}

      <Box sx={panelSx}>
        <Toolbar>
          <FilterTabs
            label="Müşteri grubu"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'ALL', label: 'Tümü', count: counts.ALL },
              { value: 'ACTIVE', label: 'Kiralama yapanlar', count: counts.ACTIVE },
              { value: 'NONE', label: 'Hiç kiralamayanlar', count: counts.NONE },
            ]}
          />
          <Box sx={{ flex: 1 }} />
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="İsimle ara" sx={{ width: { xs: '100%', sm: 240 } }} />
        </Toolbar>

        <DataTable
          rows={visible}
          rowKey={(customer) => customer.id}
          loading={isLoading}
          onRowClick={(customer) => handleOpenDialog('edit', customer)}
          empty={
            <EmptyState
              icon={<PeopleAltOutlined />}
              title={searchTerm ? 'Aramaya uygun müşteri yok' : 'Henüz müşteri kaydı yok'}
              subtitle={searchTerm ? 'Farklı bir isim deneyin.' : 'Kiralama oluştururken de müşteri ekleyebilirsiniz.'}
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Müşteri',
              render: (customer) => (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {avatar(customer)}
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, minWidth: 0 }}>{customer.fullName}</Typography>
                </Stack>
              ),
            },
            { key: 'phone', header: 'Telefon', hideBelow: 'sm', render: (customer) => <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{maskPhone(customer.phone)}</Box> },
            {
              key: 'rentals',
              header: 'Kiralama',
              render: (customer) => (customer.rentalCount || 0) > 0
                ? <StatusBadge label={`${customer.rentalCount} kiralama`} tone="success" />
                : <StatusBadge label="Henüz yok" tone="neutral" />,
            },
            { key: 'actions', header: '', align: 'right', width: 56, render: (customer) => <RowActions items={actionsFor(customer)} /> },
          ]}
          mobileRow={(customer) => (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {avatar(customer, 38)}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5 }}>{customer.fullName}</Typography>
                <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.muted }}>{maskPhone(customer.phone)} · {customer.rentalCount || 0} kiralama</Typography>
              </Box>
              <RowActions items={actionsFor(customer)} />
            </Stack>
          )}
        />
      </Box>

      <Dialog open={customerDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          {customerDialog.mode === 'create' ? 'Yeni müşteri' : 'Müşteriyi düzenle'}
          <IconButton onClick={handleCloseDialog} size="small" aria-label="Kapat"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {errors.submit && <Alert severity="error" sx={{ mb: 2 }}>{errors.submit}</Alert>}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, pt: 1 }}>
            <TextField
              fullWidth
              autoFocus
              label="Ad soyad"
              required
              value={formData.fullName}
              onChange={handleChange('fullName')}
              error={!!errors.fullName}
              helperText={errors.fullName}
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField fullWidth label="Telefon" type="tel" placeholder="05xx xxx xx xx" value={formData.phone} onChange={handleChange('phone')} sx={{ gridColumn: '1 / -1' }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={handleCloseDialog}>Vazgeç</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={pending}>
            {pending ? 'Kaydediliyor…' : customerDialog.mode === 'create' ? 'Müşteri ekle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title="Müşteriyi sil"
        body={<><strong>{deleteTarget?.fullName}</strong> kaydı silinecek. Kiralama geçmişi olan müşteriler güvenlik nedeniyle silinemez.</>}
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        pending={deleteCustomerMutation.isPending}
        error={deleteCustomerMutation.isError ? (deleteCustomerMutation.error as any)?.response?.data?.error || 'Müşteri silinemedi.' : undefined}
        onConfirm={() => deleteTarget && deleteCustomerMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
