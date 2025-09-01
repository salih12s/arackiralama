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

import { vehiclesApi, rentalsApi, customersApi, formatCurrency, Rental, Vehicle, Customer } from '../api/client';

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
    queryFn: () => customersApi.getAll()
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
  
  // Toplam ödenen = Planlanan ödemeler + Ek ödemeler
  const plannedPaidTRY = (upfront || 0) + (pay1 || 0) + (pay2 || 0) + (pay3 || 0) + (pay4 || 0);
  const additionalPaidTRY = rental?.payments ? rental.payments.reduce((sum, p) => sum + (p.amount / 100), 0) : 0; // payments kuruş cinsinden
  const totalPaidTRY = plannedPaidTRY + additionalPaidTRY;
  const balanceTRY = totalDueTRY - totalPaidTRY;
  
  // Borç tamamen kapanmış mı kontrolü
  const isDebtFullyPaid = balanceTRY <= 0;

  // Fetch rental details (only if we need fresh data, but we already have it)
  const { data: rentalResponse } = useQuery({
    queryKey: ['rental', rentalId],
    queryFn: () => rentalsApi.getById(rentalId!),
    enabled: false, // Disable since we already have rental data from props
  });

  const rentalData = rental || (rentalResponse?.data || rentalResponse) as Rental;

  // Fetch all vehicles (for changing vehicle if needed)
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(),
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
      setValue('dailyPrice', rentalData.dailyPrice / 100); // Convert from kuruş to TRY
      setValue('kmDiff', rentalData.kmDiff / 100);
      setValue('cleaning', rentalData.cleaning / 100);
      setValue('hgs', rentalData.hgs / 100);
      setValue('damage', rentalData.damage / 100);
      setValue('fuel', rentalData.fuel / 100);
      setValue('upfront', rentalData.upfront / 100);
      setValue('pay1', rentalData.pay1 / 100);
      setValue('pay2', rentalData.pay2 / 100);
      setValue('pay3', rentalData.pay3 / 100);
      setValue('pay4', rentalData.pay4 / 100);
      setValue('note', rentalData.note || '');
    }
  }, [rentalData, setValue, rental]);

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

  const updateRentalMutation = useMutation({
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
      return rentalsApi.update(rentalId!, payload);
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
      queryClient.invalidateQueries({ queryKey: ['rental', rentalId] });
      
      // Veriler güncellensin diye kısa bir gecikme ekle
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['rentals'] });
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
        queryClient.refetchQueries({ queryKey: ['vehicles'] });
      }, 100);
      
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
              <DatePicker
                label="Başlangıç Tarihi"
                value={startDate}
                onChange={handleStartDateChange}
                sx={{ width: '100%', mt: 2, mb: 1 }}
              />
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
                      field.onChange(newDays);
                      handleDaysChange(newDays);
                    }}
                    error={!!errors.days}
                    helperText={errors.days?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <DatePicker
                label="Bitiş Tarihi"
                value={endDate}
                onChange={handleEndDateChange}
                sx={{ width: '100%', mt: 2, mb: 1 }}
                disabled
              />
            </Grid>

            {/* Daily Price */}
            <Grid item xs={12} md={6}>
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
                      disabled={isDebtFullyPaid && field.name !== 'upfront'} // Peşin hariç diğerleri disable
                      inputProps={{ step: 0.01 }}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          formField.onChange('');
                        } else {
                          const numValue = parseFloat(value);
                          formField.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            ))}

            {/* Debt Fully Paid Warning */}
            {isDebtFullyPaid && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    💰 Bu kiralama tamamen ödenmiştir. Ek ödemeler (1-4. Ödeme) değiştirilemez.
                  </Typography>
                </Alert>
              </Grid>
            )}

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

                {/* Ek Ödemeler (Ara Ödemeler) */}
                {rental?.payments && rental.payments.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ color: 'info.main', fontWeight: 600 }}>
                      Ek Ödemeler ({rental.payments.length} adet)
                    </Typography>
                    <Grid container spacing={1}>
                      {rental.payments.map((payment, index) => (
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
                      Ek Ödemeler Toplamı: {formatCurrency(rental.payments.reduce((sum, p) => sum + p.amount, 0))}
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
