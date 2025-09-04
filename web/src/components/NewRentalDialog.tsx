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
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { vehiclesApi, rentalsApi, customersApi, Customer } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';

const rentalSchema = z.object({
  vehicleId: z.string().min(1, 'Araç seçimi gereklidir'),
  customerName: z.string().min(1, 'Müşteri adı gereklidir'),
  customerPhone: z.string().optional(),
  startDate: z.date(),
  startTime: z.string().default('09:00'),
  endDate: z.date(),
  endTime: z.string().default('18:00'),
  days: z.number().int().min(1, 'Minimum 1 gün olmalıdır'),
  dailyPrice: z.number().min(0, 'Günlük ücret negatif olamaz'),
  kmDiff: z.number().min(0).default(0),
  cleaning: z.number().min(0).default(0),
  hgs: z.number().min(0).default(0),
  damage: z.number().min(0).default(0),
  fuel: z.number().min(0).default(0),
  upfront: z.number().min(0).default(0),
  pay1: z.number().min(0).default(0),
  pay2: z.number().min(0).default(0),
  pay3: z.number().min(0).default(0),
  pay4: z.number().min(0).default(0),
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
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // Fetch customers for autocomplete
  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll()
  });

  const customers = customersResponse?.data?.data || [];

  // Helper function for numeric inputs
  const handleNumericChange = (field: any, value: string, allowZero: boolean = true) => {
    if (value === '') {
      field.onChange('');
      return;
    }
    const numValue = parseFloat(value) || 0;
    const finalValue = allowZero ? Math.max(0, numValue) : Math.max(1, numValue);
    field.onChange(finalValue);
  };

  const handleNumericBlur = (field: any, value: string, allowZero: boolean = true) => {
    const numValue = parseFloat(value) || 0;
    const finalValue = allowZero ? Math.max(0, numValue) : Math.max(1, numValue);
    field.onChange(finalValue);
  };

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
      startTime: '09:00',
      endTime: '18:00',
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

  // Date calculation handlers - no useEffect to prevent infinite loops
  const handleStartDateChange = (newStartDate: Dayjs | null) => {
    if (!newStartDate) return;
    
    setStartDate(newStartDate);
    setValue('startDate', newStartDate.toDate(), { shouldValidate: false });
    
    // Calculate end date based on current days
    const currentDays = watch('days') || 1;
    const newEndDate = newStartDate.add(currentDays - 1, 'day'); // -1 because days include both start and end
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
  };

  const handleEndDateChange = (newEndDate: Dayjs | null) => {
    if (!newEndDate || !startDate) return;
    
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
    
    // Calculate days based on date difference (inclusive)
    if (newEndDate.isAfter(startDate) || newEndDate.isSame(startDate, 'day')) {
      const calculatedDays = newEndDate.diff(startDate, 'day') + 1; // +1 to include both start and end days
      setValue('days', calculatedDays, { shouldValidate: false });
    }
  };

  const handleDaysChange = (newDays: number) => {
    if (!startDate || newDays < 1) return;
    
    setValue('days', newDays, { shouldValidate: false });
    
    // Calculate end date based on new days
    // newDays = 1 means same day (start and end same)
    // newDays = 2 means start day + 1 day = 2 days total
    const newEndDate = startDate.add(newDays - 1, 'day');
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
  };

  // Set preselected vehicle when dialog opens
  useEffect(() => {
    if (preselectedVehicle && open) {
      setValue('vehicleId', preselectedVehicle.id);
    }
  }, [preselectedVehicle, open, setValue]);

  // Initialize form dates when dialog opens
  useEffect(() => {
    if (open) {
      setValue('startDate', startDate?.toDate() || dayjs().toDate(), { shouldValidate: false });
      setValue('endDate', endDate?.toDate() || dayjs().add(1, 'day').toDate(), { shouldValidate: false });
    }
  }, [open, setValue]); // Only depend on open and setValue, not the date states

  const createRentalMutation = useMutation({
    mutationFn: (data: RentalFormData) => {
      // TL values - no conversion needed
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
        startDate: startDate && startTime ? 
          dayjs(`${startDate.format('YYYY-MM-DD')}T${startTime}:00`).toISOString() :
          dayjs(data.startDate).toISOString(),
        endDate: endDate && endTime ? 
          dayjs(`${endDate.format('YYYY-MM-DD')}T${endTime}:00`).toISOString() :
          dayjs(data.endDate).toISOString(),
      };
      return rentalsApi.create(payload);
    },
    onSuccess: () => {
      // Standart cache invalidation - tüm sayfalar senkronize çalışsın
      invalidateAllRentalCaches(queryClient);
      
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
      setStartTime('09:00');
      setEndTime('18:00');
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
                  <Autocomplete<Customer, false, false, true>
                    options={customers}
                    getOptionLabel={(option) => 
                      typeof option === 'string' ? option : option.fullName
                    }
                    freeSolo
                    value={field.value}
                    onChange={(_event, value) => {
                      const name = typeof value === 'string' ? value : value?.fullName || '';
                      field.onChange(name);
                      // If customer is selected, populate phone field
                      if (value && typeof value === 'object') {
                        setValue('customerPhone', value.phone || '');
                      }
                    }}
                    onInputChange={(_event, inputValue) => {
                      field.onChange(inputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Müşteri Adı"
                        margin="normal"
                        error={!!errors.customerName}
                        helperText={errors.customerName?.message}
                        placeholder="Müşteri adı yazın veya seçin..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2">
                            {typeof option === 'string' ? option : (option as Customer).fullName}
                          </Typography>
                          {typeof option === 'object' && (option as Customer).phone && (
                            <Typography variant="caption" color="text.secondary">
                              {(option as Customer).phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
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
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <DatePicker
                  label="Başlangıç Tarihi"
                  value={startDate}
                  onChange={handleStartDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                    },
                  }}
                />
                <TextField
                  label="Saat"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  margin="normal"
                  sx={{ minWidth: 120 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <DatePicker
                  label="Bitiş Tarihi"
                  value={endDate}
                  onChange={handleEndDateChange}
                  minDate={startDate || undefined}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                    },
                  }}
                />
                <TextField
                  label="Saat"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  margin="normal"
                  sx={{ minWidth: 120 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
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
                    inputProps={{ min: 1, step: 1 }}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for deletion, but set minimum 1 when focusing out
                      if (value === '') {
                        field.onChange('');
                        return;
                      }
                      const newDays = Math.max(1, parseInt(value) || 1);
                      field.onChange(newDays);
                      handleDaysChange(newDays);
                    }}
                    onBlur={(e) => {
                      // Ensure minimum 1 when user leaves the field
                      const value = parseInt(e.target.value) || 1;
                      const finalDays = Math.max(1, value);
                      field.onChange(finalDays);
                      handleDaysChange(finalDays);
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
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(e) => handleNumericChange(field, e.target.value, false)}
                    onBlur={(e) => handleNumericBlur(field, e.target.value, false)}
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
                      inputProps={{ min: 0, step: 0.01 }}
                      onChange={(e) => handleNumericChange(formField, e.target.value, true)}
                      onBlur={(e) => handleNumericBlur(formField, e.target.value, true)}
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
                      inputProps={{ step: 0.01 }}
                      onChange={(e) => handleNumericChange(formField, e.target.value, true)}
                      onBlur={(e) => handleNumericBlur(formField, e.target.value, true)}
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
                      <strong>Toplam Ödenecek: {formatCurrency(Math.round(totalDueTRY))}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Toplam Ödenen: {formatCurrency(Math.round(totalPaidTRY))}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: balanceTRY > 0 ? 'error.main' : 'success.main' }}>
                      <strong>Kalan Bakiye: {formatCurrency(Math.round(balanceTRY))}</strong>
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
