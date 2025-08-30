import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { vehiclesApi, rentalsApi, formatCurrency } from '../api/client';

const rentalSchema = z.object({
  vehicleId: z.string().min(1, 'Araç seçimi gereklidir'),
  customerName: z.string().min(1, 'Müşteri adı gereklidir'),
  customerPhone: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  days: z.number().int().positive(),
  dailyPrice: z.number().positive('Günlük ücret pozitif olmalıdır'),
  kmDiff: z.number().default(0),
  cleaning: z.number().default(0),
  hgs: z.number().default(0),
  damage: z.number().default(0),
  fuel: z.number().default(0),
  upfront: z.number().default(0),
  pay1: z.number().default(0),
  pay2: z.number().default(0),
  pay3: z.number().default(0),
  pay4: z.number().default(0),
  note: z.string().optional(),
});

type RentalFormData = z.infer<typeof rentalSchema>;

interface NewRentalDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedVehicle?: { id: string; plate: string; } | null;
}

export default function NewRentalDialog({ open, onClose, preselectedVehicle }: NewRentalDialogProps) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().add(1, 'day'));

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RentalFormData>({
    resolver: zodResolver(rentalSchema),
    defaultValues: {
      days: 1,
      dailyPrice: 150, // 150 TRY
      kmDiff: 0,
      cleaning: 0,
      hgs: 0,
      damage: 0,
      fuel: 0,
      upfront: 0,
      pay1: 0,
      pay2: 0,
      pay3: 0,
      pay4: 0,
    },
  });

  // Watch form values for calculations
  const watchedValues = watch([
    'days',
    'dailyPrice',
    'kmDiff',
    'cleaning',
    'hgs',
    'damage',
    'fuel',
    'upfront',
    'pay1',
    'pay2',
    'pay3',
    'pay4',
  ]);

  // Calculate totals (in TRY)
  const [days, dailyPrice, kmDiff, cleaning, hgs, damage, fuel, upfront, pay1, pay2, pay3, pay4] = watchedValues;
  const totalDueTRY = (days || 0) * (dailyPrice || 0) + (kmDiff || 0) + (cleaning || 0) + (hgs || 0) + (damage || 0) + (fuel || 0);
  const totalPaidTRY = (upfront || 0) + (pay1 || 0) + (pay2 || 0) + (pay3 || 0) + (pay4 || 0);
  const balanceTRY = totalDueTRY - totalPaidTRY;

  // Fetch available vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-available'],
    queryFn: () => vehiclesApi.getAll('IDLE'),
    enabled: open,
  });

  // Calculate days when dates change
  useEffect(() => {
    if (startDate && endDate && endDate.isAfter(startDate)) {
      const calculatedDays = endDate.diff(startDate, 'day');
      setValue('days', calculatedDays);
      setValue('startDate', startDate.toDate());
      setValue('endDate', endDate.toDate());
    }
  }, [startDate, endDate, setValue]);

  // Update end date when days change
  useEffect(() => {
    if (startDate && days && days > 0) {
      const newEndDate = startDate.add(days, 'day');
      setEndDate(newEndDate);
      setValue('endDate', newEndDate.toDate());
    }
  }, [days, startDate, setValue]);

  // Update end date when start date changes (keeping the same number of days)
  useEffect(() => {
    if (startDate && days && days > 0) {
      const newEndDate = startDate.add(days, 'day');
      setEndDate(newEndDate);
      setValue('startDate', startDate.toDate());
      setValue('endDate', newEndDate.toDate());
    }
  }, [startDate]);

  // Set preselected vehicle when dialog opens
  useEffect(() => {
    if (preselectedVehicle && open) {
      setValue('vehicleId', preselectedVehicle.id);
    }
  }, [preselectedVehicle, open, setValue]);

  const createRentalMutation = useMutation({
    mutationFn: (data: RentalFormData) => {
      // Convert TRY to kuruş for currency fields
      const payload = {
        ...data,
        dailyPrice: Math.round(data.dailyPrice * 100),
        kmDiff: Math.round((data.kmDiff || 0) * 100),
        cleaning: Math.round((data.cleaning || 0) * 100),
        hgs: Math.round((data.hgs || 0) * 100),
        damage: Math.round((data.damage || 0) * 100),
        fuel: Math.round((data.fuel || 0) * 100),
        upfront: Math.round((data.upfront || 0) * 100),
        pay1: Math.round((data.pay1 || 0) * 100),
        pay2: Math.round((data.pay2 || 0) * 100),
        pay3: Math.round((data.pay3 || 0) * 100),
        pay4: Math.round((data.pay4 || 0) * 100),
        startDate: dayjs(data.startDate).toISOString(),
        endDate: dayjs(data.endDate).toISOString(),
      };
      return rentalsApi.create(payload);
    },
    onSuccess: () => {
      // Tüm ilgili cache'leri agresif şekilde yenile
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      
      // Veriler güncellensin diye kısa bir gecikme ekle
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['rentals'] });
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
        queryClient.refetchQueries({ queryKey: ['vehicles'] });
      }, 100);
      
      reset();
      setStartDate(dayjs());
      setEndDate(dayjs().add(1, 'day'));
      onClose();
    },
  });

  const onSubmit = (data: RentalFormData) => {
    createRentalMutation.mutate(data);
  };

  const handleClose = () => {
    if (!createRentalMutation.isPending) {
      reset();
      setStartDate(dayjs());
      setEndDate(dayjs().add(1, 'day'));
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Yeni Kiralama İşlemi</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {createRentalMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(createRentalMutation.error as any)?.response?.data?.error || 'Kiralama oluşturulurken hata oluştu'}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Vehicle Selection */}
            <Grid item xs={12} md={6}>
              <Controller
                name="vehicleId"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <FormControl fullWidth margin="normal" error={!!errors.vehicleId}>
                    <InputLabel>Araç</InputLabel>
                    <Select {...field} label="Araç">
                      {vehicles?.data?.map((vehicle: any) => (
                        <MenuItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} {vehicle.name && `- ${vehicle.name}`}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.vehicleId && (
                      <Typography variant="caption" color="error">
                        {errors.vehicleId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Customer Name */}
            <Grid item xs={12} md={6}>
              <Controller
                name="customerName"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Müşteri Adı"
                    margin="normal"
                    error={!!errors.customerName}
                    helperText={errors.customerName?.message}
                  />
                )}
              />
            </Grid>

            {/* Customer Phone */}
            <Grid item xs={12} md={6}>
              <Controller
                name="customerPhone"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Telefon (Opsiyonel)"
                    margin="normal"
                  />
                )}
              />
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Başlangıç Tarihi"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <DatePicker
                label="Bitiş Tarihi"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate || undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </Grid>

            {/* Days and Daily Price */}
            <Grid item xs={6} md={3}>
              <Controller
                name="days"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Gün Sayısı"
                    type="number"
                    margin="normal"
                    inputProps={{ min: 1 }}
                    onChange={(e) => {
                      const newDays = parseInt(e.target.value) || 1;
                      field.onChange(newDays);
                      setValue('days', newDays);
                    }}
                    error={!!errors.days}
                    helperText={errors.days?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={6} md={3}>
              <Controller
                name="dailyPrice"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Günlük Ücret (TRY)"
                    type="number"
                    margin="normal"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    error={!!errors.dailyPrice}
                    helperText={errors.dailyPrice?.message}
                  />
                )}
              />
            </Grid>

            {/* Additional Costs */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Ek Ücretler (TRY)
              </Typography>
            </Grid>

            {[
              { name: 'kmDiff' as const, label: 'KM Farkı' },
              { name: 'cleaning' as const, label: 'Temizlik' },
              { name: 'hgs' as const, label: 'HGS' },
              { name: 'damage' as const, label: 'Kaza/Sürtme' },
              { name: 'fuel' as const, label: 'Yakıt Bedeli' },
            ].map((field) => (
              <Grid item xs={6} md={2.4} key={field.name}>
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: formField }) => (
                    <TextField
                      {...formField}
                      fullWidth
                      label={field.label}
                      type="number"
                      margin="normal"
                      onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </Grid>
            ))}

            {/* Payments */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Ödemeler (TRY)
              </Typography>
            </Grid>

            {[
              { name: 'upfront' as const, label: 'Peşin' },
              { name: 'pay1' as const, label: '1. Ödeme' },
              { name: 'pay2' as const, label: '2. Ödeme' },
              { name: 'pay3' as const, label: '3. Ödeme' },
              { name: 'pay4' as const, label: '4. Ödeme' },
            ].map((field) => (
              <Grid item xs={6} md={2.4} key={field.name}>
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: formField }) => (
                    <TextField
                      {...formField}
                      fullWidth
                      label={field.label}
                      type="number"
                      margin="normal"
                      onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </Grid>
            ))}

            {/* Note */}
            <Grid item xs={12}>
              <Controller
                name="note"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Açıklama (Opsiyonel)"
                    multiline
                    rows={2}
                    margin="normal"
                  />
                )}
              />
            </Grid>

            {/* Totals */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Hesaplama Özeti
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      <strong>Toplam Ödenecek: {formatCurrency(Math.round(totalDueTRY * 100))}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Toplam Ödenen: {formatCurrency(Math.round(totalPaidTRY * 100))}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: balanceTRY > 0 ? 'error.main' : 'success.main' }}>
                      <strong>Kalan Bakiye: {formatCurrency(Math.round(balanceTRY * 100))}</strong>
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={createRentalMutation.isPending}>
            İptal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createRentalMutation.isPending}
          >
            {createRentalMutation.isPending ? 'Oluşturuluyor...' : 'Kiralama Oluştur'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
