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
  startDate: z.date(),
  startTime: z.string().default('09:00'),
  endDate: z.date(),
  days: z.number().int().min(1, 'Minimum 1 gün olmalıdır'),
  totalAmount: z.number().min(0, 'Toplam tutar negatif olamaz'),
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
  
  // Hesaplama alanları (sadece görsel hesaplama için)
  const [calculationTotalAmount, setCalculationTotalAmount] = useState<string>('');
  const [calculationDailyRate, setCalculationDailyRate] = useState<string>('');
  const [calculationDays, setCalculationDays] = useState<string>('1');

  // Fetch customers for autocomplete
  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(undefined, 1000)
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
      totalAmount: 150, // 150 TRY
      startTime: '09:00',
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
    'totalAmount',
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
  const [days, totalAmount, kmDiff, cleaning, hgs, damage, fuel, upfront, pay1, pay2, pay3, pay4] = watchedValues;
  const totalDueTRY = (totalAmount || 0) + (kmDiff || 0) + (cleaning || 0) + (hgs || 0) + (damage || 0) + (fuel || 0);
  const totalPaidTRY = (upfront || 0) + (pay1 || 0) + (pay2 || 0) + (pay3 || 0) + (pay4 || 0);
  const balanceTRY = totalDueTRY - totalPaidTRY;

  // Fetch available vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-available'],
    queryFn: () => vehiclesApi.getAll('IDLE', 1000),
    enabled: open,
  });

  // Date calculation handlers - no useEffect to prevent infinite loops
  const handleStartDateChange = (newStartDate: Dayjs | null) => {
    if (!newStartDate) return;
    
    setStartDate(newStartDate);
    setValue('startDate', newStartDate.toDate(), { shouldValidate: false });
    
    // Calculate end date based on current days
    const currentDays = watch('days') || 1;
    const newEndDate = newStartDate.add(currentDays, 'day'); // 1 gün = başlangıç + 1 gün
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
  };

  const handleEndDateChange = (newEndDate: Dayjs | null) => {
    if (!newEndDate || !startDate) return;
    
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
    
    // Calculate days based on date difference (consecutive days)
    if (newEndDate.isAfter(startDate)) {
      const calculatedDays = newEndDate.diff(startDate, 'day'); // No +1, consecutive counting
      setValue('days', calculatedDays > 0 ? calculatedDays : 1, { shouldValidate: false });
    } else {
      setValue('days', 1, { shouldValidate: false }); // Minimum 1 day
    }
  };

  const handleDaysChange = (newDays: number) => {
    if (!startDate || newDays < 1) return;
    
    setValue('days', newDays, { shouldValidate: false });
    
    // Calculate end date based on new days (consecutive counting)
    // newDays = 1 means start day + 1 day
    // newDays = 2 means start day + 2 days
    const newEndDate = startDate.add(newDays, 'day');
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

  // Set current system time when dialog opens
  useEffect(() => {
    if (open) {
      const now = dayjs();
      const currentTime = now.format('HH:mm');
      setStartTime(currentTime);
    }
  }, [open, setValue]);

  const createRentalMutation = useMutation({
    mutationFn: (data: RentalFormData) => {
      // Create payload that matches backend schema
      const payload = {
        vehicleId: data.vehicleId,
        customerName: data.customerName,
        startDate: startDate && startTime ? 
          dayjs(`${startDate.format('YYYY-MM-DD')}T${startTime}:00`).toISOString() :
          dayjs(data.startDate).toISOString(),
        endDate: endDate ? 
          dayjs(`${endDate.format('YYYY-MM-DD')}T18:00:00`).toISOString() :
          dayjs(data.endDate).toISOString(),
        days: data.days,
        dailyPrice: Math.ceil(data.totalAmount / data.days * 100), // Calculate dailyPrice from totalAmount
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
        note: data.note,
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
      setCalculationTotalAmount('');
      setCalculationDailyRate('');
      setCalculationDays('1');
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

            {/* Hesaplama Yardımcısı */}
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Hesaplama Yardımcısı
                </Typography>
                
                {/* Gün Sayısı */}
                <Box sx={{ mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Gün Sayısı"
                    type="number"
                    value={calculationDays}
                    onChange={(e) => {
                      const days = e.target.value;
                      setCalculationDays(days);
                      
                      // Toplam tutar varsa günlük ücreti hesapla
                      if (calculationTotalAmount && days && parseInt(days) > 0) {
                        const dailyRate = (parseFloat(calculationTotalAmount) / parseInt(days)).toFixed(2);
                        setCalculationDailyRate(dailyRate);
                      }
                      // Günlük ücret varsa toplam tutarı hesapla
                      else if (calculationDailyRate && days && parseInt(days) > 0) {
                        const totalAmount = (parseFloat(calculationDailyRate) * parseInt(days)).toFixed(2);
                        setCalculationTotalAmount(totalAmount);
                      }
                    }}
                    inputProps={{ min: 1, step: 1 }}
                    size="small"
                  />
                </Box>

                {/* Toplam Tutar ve Günlük Ücret */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Toplam Tutar (TRY)"
                    type="number"
                    value={calculationTotalAmount}
                    onChange={(e) => {
                      const totalAmount = e.target.value;
                      setCalculationTotalAmount(totalAmount);
                      
                      const days = parseInt(calculationDays) || 1;
                      if (totalAmount && days > 0) {
                        const dailyRate = (parseFloat(totalAmount) / days).toFixed(2);
                        setCalculationDailyRate(dailyRate);
                      } else {
                        setCalculationDailyRate('');
                      }
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Günlük Ücret (TRY)"
                    type="number"
                    value={calculationDailyRate}
                    onChange={(e) => {
                      const dailyRate = e.target.value;
                      setCalculationDailyRate(dailyRate);
                      
                      const days = parseInt(calculationDays) || 1;
                      if (dailyRate && days > 0) {
                        const totalAmount = (parseFloat(dailyRate) * days).toFixed(2);
                        setCalculationTotalAmount(totalAmount);
                      } else {
                        setCalculationTotalAmount('');
                      }
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    size="small"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Bu alanlar sadece hesaplama içindir, form verilerini etkilemez.
                </Typography>
              </Box>
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
                      sx: {
                        '& .MuiInputLabel-root': {
                          fontSize: '1rem',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '1rem',
                        }
                      }
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
              <DatePicker
                label="Bitiş Tarihi"
                value={endDate}
                onChange={handleEndDateChange}
                minDate={startDate || undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                    sx: {
                      '& .MuiInputLabel-root': {
                        fontSize: '1rem',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1rem',
                      }
                    }
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
                name="totalAmount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Toplam Ücret (TRY)"
                    type="number"
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(e) => handleNumericChange(field, e.target.value, false)}
                    onBlur={(e) => handleNumericBlur(field, e.target.value, false)}
                    error={!!errors.totalAmount}
                    helperText={errors.totalAmount?.message}
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
