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

import { vehiclesApi, rentalsApi, formatCurrency, Rental, Vehicle } from '../api/client';

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
  const totalPaidTRY = (upfront || 0) + (pay1 || 0) + (pay2 || 0) + (pay3 || 0) + (pay4 || 0);
  const balanceTRY = totalDueTRY - totalPaidTRY;

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
                onChange={(newValue) => setStartDate(newValue)}
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
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                onChange={(newValue) => setEndDate(newValue)}
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
