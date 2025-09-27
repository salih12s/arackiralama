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
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowUpward } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { vehiclesApi, rentalsApi, customersApi, Rental, Vehicle, Customer } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';

const rentalSchema = z.object({
  vehicleId: z.string().min(1, 'Araç seçimi gereklidir'),
  customerName: z.string().min(1, 'Müşteri adı gereklidir'),
  customerPhone: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  days: z.number().int().positive(),
  totalAmount: z.number(),
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

interface EditRentalDialogProps {
  open: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export default function EditRentalDialog({ open, onClose, rental }: EditRentalDialogProps) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().add(1, 'day'));

  // Fetch customers for autocomplete
  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(undefined, 1000)
  });

  const customers = customersResponse?.data?.data || [];

  const rentalId = rental?.id;
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
      totalAmount: 150, // 150 TRY default total
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
  const watchedValues = watch();

  // Fetch fresh rental data for current calculations
  const { data: freshRentalResponse } = useQuery({
    queryKey: ['rental', rentalId],
    queryFn: async () => {
      if (!rentalId || typeof rentalId !== 'string' || rentalId.length < 10) {
        console.warn('⚠️ Invalid rental ID:', rentalId);
        return null;
      }
      const response = await rentalsApi.getById(rentalId);
      return response.data;
    },
    enabled: open && !!rentalId && typeof rentalId === 'string' && rentalId.length >= 10,
    staleTime: 0,
    gcTime: 0,
  });

  // Fresh payments data kullan
  const { data: paymentsResponse } = useQuery({
    queryKey: ['rental-payments', rentalId],
    queryFn: async () => {
      if (!rentalId || typeof rentalId !== 'string' || rentalId.length < 10) {
        console.warn('⚠️ Invalid rental ID for payments:', rentalId);
        return { data: [] };
      }
      return await rentalsApi.getPayments(rentalId);
    },
    enabled: open && !!rentalId && typeof rentalId === 'string' && rentalId.length >= 10,
    staleTime: 0,
    gcTime: 0,
  });

  const payments = paymentsResponse?.data || [];
  const currentRental = freshRentalResponse || rental;

  // Calculate totals using WATCH VALUES for real-time updates with safe fallbacks
  const totalDueTRYRaw = 
    (watchedValues?.totalAmount || 0) + 
    (watchedValues?.kmDiff || 0) + 
    (watchedValues?.cleaning || 0) + 
    (watchedValues?.hgs || 0) + 
    (watchedValues?.damage || 0) + 
    (watchedValues?.fuel || 0);
  
  // Otomatik üste yuvarla (4999.99 → 5000)
  const totalDueTRY = Math.ceil(totalDueTRYRaw);
  
  // TL STANDARDI - Payments API'dan TL cinsinde gelir
  const totalPaid = Array.isArray(payments) ? payments.reduce((sum, payment) => sum + payment.amount, 0) : 0; // TL
  
  // Planlı ödemeler WATCH VALUES'dan (real-time) with safe fallbacks
  const paidFromRental = 
    (watchedValues?.upfront || 0) + 
    (watchedValues?.pay1 || 0) + 
    (watchedValues?.pay2 || 0) + 
    (watchedValues?.pay3 || 0) + 
    (watchedValues?.pay4 || 0);
  
  const totalPaidTRY = totalPaid + paidFromRental; // TL
  const balanceTRY = totalDueTRY - totalPaidTRY;
  
  console.log('🔧 EditRentalDialog calculations:', {
    totalDueTRY,
    totalPaid,
    paidFromRental, 
    totalPaidTRY,
    balanceTRY,
    paymentsCount: payments?.length,
    currentRentalId: currentRental?.id
  });
  
  // Borç tamamen kapanmış mı kontrolü
  const isDebtFullyPaid = balanceTRY <= 0;

  // Use fresh rental data if available, otherwise use prop data
  const rentalData = currentRental || rental;

  // Fetch all vehicles (for changing vehicle if needed)
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(undefined, 1000),
    enabled: true, // Always load vehicles
  });

  const vehicles = (vehiclesResponse?.data || vehiclesResponse) as Vehicle[];

  // Set form data when rental loads
  useEffect(() => {
    if (rentalData) {
      const startDateObj = dayjs(rentalData.startDate);
      const endDateObj = dayjs(rentalData.endDate);
      
      setStartDate(startDateObj);
      setEndDate(endDateObj);
      
      setValue('vehicleId', rentalData.vehicle?.id || rentalData.vehicleId);
      setValue('customerName', rentalData.customer?.fullName || rentalData.customerName);
      setValue('customerPhone', rentalData.customer?.phone || rentalData.customerPhone || '');
      setValue('startDate', startDateObj.toDate());
      setValue('endDate', endDateObj.toDate());

      setValue('days', rentalData.days);
      
      // Backend'den TL cinsinde geliyor, direkt kullan
      const convertToTL = (value: number | undefined | null): number => {
        if (!value) return 0;
        return value; // Backend zaten TL gönderiyor
      };
      
      // Orijinal toplam tutarı note'dan oku, yoksa hesapla
      const noteMatch = rentalData.note?.match(/ORIGINAL_TOTAL:(\d+)/);
      const originalTotal = noteMatch ? parseInt(noteMatch[1]) / 100 : (rentalData.days || 1) * (rentalData.dailyPrice || 0);
      setValue('totalAmount', originalTotal);
      setValue('kmDiff', convertToTL(rentalData.kmDiff));
      setValue('cleaning', convertToTL(rentalData.cleaning));
      setValue('hgs', convertToTL(rentalData.hgs));
      setValue('damage', convertToTL(rentalData.damage));
      setValue('fuel', convertToTL(rentalData.fuel));
      setValue('upfront', convertToTL(rentalData.upfront));
      setValue('pay1', convertToTL(rentalData.pay1));
      setValue('pay2', convertToTL(rentalData.pay2));
      setValue('pay3', convertToTL(rentalData.pay3));
      setValue('pay4', convertToTL(rentalData.pay4));
      setValue('note', rentalData.note || '');
    }
  }, [rentalData, setValue, rental]);

  // Date calculation handlers - no useEffect to prevent infinite loops
  const handleStartDateChange = (newStartDate: Dayjs | null) => {
    if (!newStartDate) return;
    
    setStartDate(newStartDate);
    setValue('startDate', newStartDate.toDate(), { shouldValidate: false });
    
    // Calculate end date based on current days (same as backend logic)
    const currentDays = watch('days') || 1;
    const newEndDate = newStartDate.add(currentDays, 'day'); // Match backend calculation
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
  };

  const handleEndDateChange = (newEndDate: Dayjs | null) => {
    if (!newEndDate || !startDate) return;
    
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
    
    // Calculate days based on date difference (same as backend)
    if (newEndDate.isAfter(startDate) || newEndDate.isSame(startDate, 'day')) {
      const calculatedDays = newEndDate.diff(startDate, 'day') || 1; // Remove +1 to match backend calculation
      setValue('days', calculatedDays, { shouldValidate: false });
    }
  };

  const handleDaysChange = (newDays: number) => {
    if (!startDate || newDays < 1) return;
    
    // Mevcut toplam ödemeden günlük ücreti hesapla (10'un katlarına yuvarlama ile)
    const currentTotalAmount = watch('totalAmount') || 0;
    const currentDays = watch('days') || 1;
    const dailyRate = currentDays > 0 ? Math.round(currentTotalAmount / currentDays / 10) * 10 : 0;
    
    // Yeni toplam ödemeyi hesapla (yuvarlama ile)
    const newTotalAmount = Math.round(dailyRate * newDays);
    
    setValue('days', newDays, { shouldValidate: false });
    setValue('totalAmount', newTotalAmount, { shouldValidate: false });
    
    // Calculate end date based on new days (same as backend logic)
    // newDays = 1 means end date is same as start date
    // newDays = 2 means end date is start + 1 day
    const newEndDate = startDate.add(newDays, 'day');
    setEndDate(newEndDate);
    setValue('endDate', newEndDate.toDate(), { shouldValidate: false });
  };

  const updateRentalMutation = useMutation({
    mutationFn: (data: RentalFormData) => {
      // Backend'in beklediği format için uygun payload oluştur
      
      // Bitiş tarihini güncelle
      const updatedEndDate = dayjs(data.endDate);
      
      const payload: Partial<any> = {
        startDate: dayjs(data.startDate).toISOString(),
        endDate: updatedEndDate.toISOString(),
        days: data.days,
        note: data.note,
      };

      // Optional fields - sadece değer varsa ekle
      if (data.vehicleId) payload.vehicleId = data.vehicleId;
      if (data.customerName) payload.customerName = data.customerName;
      if (data.customerPhone) payload.customerPhone = data.customerPhone;
      // Toplam ödemeden günlük ücreti hesapla (10'un katlarına yuvarlama ile)
      if (data.totalAmount !== undefined && data.days) {
        payload.dailyPrice = Math.round((data.totalAmount / data.days) / 10) * 10 * 100;
      }
      if (data.kmDiff !== undefined) payload.kmDiff = data.kmDiff;
      if (data.cleaning !== undefined) payload.cleaning = data.cleaning;
      if (data.hgs !== undefined) payload.hgs = data.hgs;
      if (data.damage !== undefined) payload.damage = data.damage;
      if (data.fuel !== undefined) payload.fuel = data.fuel;
      if (data.upfront !== undefined) payload.upfront = data.upfront;
      if (data.pay1 !== undefined) payload.pay1 = data.pay1;
      if (data.pay2 !== undefined) payload.pay2 = data.pay2;
      if (data.pay3 !== undefined) payload.pay3 = data.pay3;
      if (data.pay4 !== undefined) payload.pay4 = data.pay4;
      
      console.log('🚀 Update Payload Debug (TL values):', {
        totalAmount: data.totalAmount,
        calculatedDailyPrice: data.totalAmount && data.days ? data.totalAmount / data.days : 0,
        cleaning: payload.cleaning,
        hgs: payload.hgs,
        updatedEndDate: updatedEndDate.format('YYYY-MM-DD HH:mm')
      });
      
      return rentalsApi.update(rentalId!, payload);
    },
    onSuccess: () => {
      // Standart cache invalidation - tüm sayfalar senkronize çalışsın
      invalidateAllRentalCaches(queryClient);
      
      onClose();
    },
  });

  const onSubmit = (data: RentalFormData) => {
    updateRentalMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!rentalData) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Typography>Kiralama bilgileri yükleniyor...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          Kiralama Düzenle - {rentalData?.vehicle?.plate || rentalData?.vehiclePlate || 'Bilinmeyen Araç'}
        </DialogTitle>
        <DialogContent>
          {updateRentalMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Kiralama güncellenirken bir hata oluştu.
            </Alert>
          )}
          
          <Grid container spacing={2}>
            {/* Vehicle Selection */}
            <Grid item xs={12} md={6}>
              <Controller
                name="vehicleId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth margin="normal" error={!!errors.vehicleId}>
                    <InputLabel>Araç</InputLabel>
                    <Select
                      {...field}
                      label="Araç"
                    >
                      {Array.isArray(vehicles) ? vehicles.map((vehicle) => (
                        <MenuItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name || vehicle.plate} - {vehicle.plate}
                        </MenuItem>
                      )) : null}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Customer Info */}
            <Grid item xs={12} md={6}>
              <Controller
                name="customerName"
                control={control}
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

            {/* Date Selection */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <DatePicker
                  label="Başlangıç Tarihi"
                  value={startDate}
                  onChange={handleStartDateChange}
                  sx={{ width: '100%', mt: 2, mb: 1 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
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
                    onChange={(e) => {
                      const newDays = parseInt(e.target.value) || 0;
                      handleDaysChange(newDays);
                    }}
                    error={!!errors.days}
                    helperText={errors.days?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <DatePicker
                  label="Bitiş Tarihi"
                  value={endDate}
                  onChange={handleEndDateChange}
                  sx={{ width: '100%', mt: 2, mb: 1 }}
                  minDate={startDate || undefined}
                />

              </Box>
            </Grid>

            {/* Total Amount */}
            <Grid item xs={12} md={6}>
              <Controller
                name="totalAmount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value === 0 ? '' : field.value}
                    fullWidth
                    label="Toplam Ödeme (TRY)"
                    type="number"
                    margin="normal"
                    inputProps={{ 
                      step: 10,
                      min: undefined 
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        field.onChange('');
                      } else {
                        const numValue = parseFloat(value);
                        field.onChange(isNaN(numValue) ? '' : numValue);
                      }
                    }}
                    onBlur={(e) => {
                      // Yuvarlama sistemi: 10'lara yuvarla
                      const value = parseFloat(e.target.value) || 0;
                      const roundedValue = Math.round(value / 10) * 10;
                      field.onChange(roundedValue);
                    }}
                    error={!!errors.totalAmount}
                    helperText={errors.totalAmount?.message || "Otomatik olarak 10'lara yuvarlanır"}
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
                      value={formField.value === 0 ? '' : formField.value}
                      fullWidth
                      label={field.label}
                      type="number"
                      margin="normal"
                      inputProps={{ 
                        step: 0.01,
                        min: undefined 
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          formField.onChange('');
                        } else {
                          const numValue = parseFloat(value);
                          formField.onChange(isNaN(numValue) ? '' : numValue);
                        }
                      }}
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
                
                {/* Ana mali bilgiler */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      <strong>Toplam Ödenecek: {formatCurrency(totalDueTRY)}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Toplam Ödenen: {formatCurrency(totalPaidTRY)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: balanceTRY > 0 ? 'error.main' : 'success.main' }}>
                      <strong>Kalan Bakiye: {formatCurrency(balanceTRY)}</strong>
                    </Typography>
                  </Grid>
                </Grid>

                {/* Ek Ödemeler (Ara Ödemeler) */}
                {payments && payments.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ color: 'info.main', fontWeight: 600 }}>
                      Ek Ödemeler ({payments.length} adet)
                    </Typography>
                    <Grid container spacing={1}>
                      {payments.map((payment, index) => (
                        <Grid item xs={12} sm={6} md={4} key={payment.id}>
                          <Box sx={{ 
                            p: 1, 
                            bgcolor: 'white', 
                            borderRadius: 0.5, 
                            border: '1px solid', 
                            borderColor: 'grey.300',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                              {index + 1}. {formatCurrency(payment.amount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payment.method === 'CASH' ? 'Nakit' : payment.method === 'CARD' ? 'Kart' : 'Transfer'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(payment.paidAt).format('DD.MM.YYYY HH:mm')}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: 'info.dark' }}>
                      Ek Ödemeler Toplamı: {formatCurrency(totalPaid)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={updateRentalMutation.isPending}>
            İptal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={updateRentalMutation.isPending}
          >
            {updateRentalMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
