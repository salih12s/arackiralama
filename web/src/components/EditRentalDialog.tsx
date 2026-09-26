import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  Alert,
  Autocomplete,
  Skeleton,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { vehiclesApi, rentalsApi, customersApi, Rental, Vehicle, Customer } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';
import { a, monoSx } from '../admin/theme';
import { BalanceHero, DialogHeader, FormSection, SummaryPanel, SummaryRow, dialogBodySx, fieldGrid, moneyInputProps } from '../admin/dialogParts';

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
      // ORIGINAL_TOTAL kısmını gizle, sadece kullanıcı notunu göster
      const displayNote = rentalData.note?.replace(/ORIGINAL_TOTAL:\d+\|?/, '') || '';
      setValue('note', displayNote);
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
        payload.dailyPrice = Math.round((data.totalAmount / data.days) / 10) * 10;
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
      
      // Orijinal toplam tutarı note'a ekle
      if (data.note !== undefined && data.totalAmount !== undefined) {
        const originalTotalInCents = Math.round(data.totalAmount * 100);
        const existingNote = data.note.replace(/ORIGINAL_TOTAL:\d+\|?/, '');
        payload.note = existingNote ? `ORIGINAL_TOTAL:${originalTotalInCents}|${existingNote}` : `ORIGINAL_TOTAL:${originalTotalInCents}`;
      }
      
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

  const paperProps = { sx: { m: { xs: 1.5, sm: 3 }, width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 48px)' }, maxHeight: { xs: 'calc(100% - 24px)', sm: '92vh' } } };

  if (!rentalData) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth PaperProps={paperProps}>
        <DialogHeader title="Kiralamayı düzenle" onClose={handleClose} />
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={160} />
        </DialogContent>
      </Dialog>
    );
  }

  const selectedVehicle = Array.isArray(vehicles) ? vehicles.find((vehicle) => vehicle.id === watchedValues?.vehicleId) : undefined;
  const extrasTRY = (watchedValues?.kmDiff || 0) + (watchedValues?.cleaning || 0) + (watchedValues?.hgs || 0) + (watchedValues?.damage || 0) + (watchedValues?.fuel || 0);
  const dailyRateTRY = watchedValues?.days ? Math.round(((watchedValues?.totalAmount || 0) / watchedValues.days) / 10) * 10 : 0;
  const plate = rentalData?.vehicle?.plate || rentalData?.vehiclePlate || 'Bilinmeyen araç';

  // Ek ücret alanları: boş bırakılırsa 0
  const extraField = (name: 'kmDiff' | 'cleaning' | 'hgs' | 'damage' | 'fuel', label: string) => (
    <Controller
      key={name}
      name={name}
      control={control}
      render={({ field: formField }) => (
        <TextField {...formField} fullWidth label={label} type="number" InputProps={moneyInputProps} onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)} />
      )}
    />
  );

  // Ödeme alanları: 0 boş görünür, silinebilir
  const paymentField = (name: 'upfront' | 'pay1' | 'pay2' | 'pay3' | 'pay4', label: string) => (
    <Controller
      key={name}
      name={name}
      control={control}
      render={({ field: formField }) => (
        <TextField
          {...formField}
          value={formField.value === 0 ? '' : formField.value}
          fullWidth
          label={label}
          type="number"
          placeholder="0"
          inputProps={{ step: 0.01 }}
          InputProps={moneyInputProps}
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
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth PaperProps={paperProps}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'contents' }}>
        <DialogHeader
          title="Kiralamayı düzenle"
          subtitle={<><Box component="span" sx={monoSx}>{plate}</Box>{rentalData?.customer?.fullName ? ` · ${rentalData.customer.fullName}` : ''}</>}
          onClose={handleClose}
          disabled={updateRentalMutation.isPending}
        />

        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
          {updateRentalMutation.isError && (
            <Alert severity="error" sx={{ mb: 2.5 }}>Kiralama güncellenirken bir hata oluştu.</Alert>
          )}

          <Box sx={dialogBodySx}>
            <Box sx={{ minWidth: 0 }}>
              <FormSection step={1} title="Araç ve müşteri">
                <Box sx={fieldGrid({ xs: 1, sm: 2 })}>
                  <Controller
                    name="vehicleId"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} value={field.value ?? ''} select fullWidth label="Araç" error={!!errors.vehicleId} helperText={errors.vehicleId?.message}>
                        {Array.isArray(vehicles) ? vehicles.map((vehicle) => (
                          <MenuItem key={vehicle.id} value={vehicle.id}>
                            <Box component="span" sx={{ ...monoSx, mr: 1 }}>{vehicle.plate}</Box>
                            {vehicle.name}
                          </MenuItem>
                        )) : null}
                      </TextField>
                    )}
                  />
                  <Controller
                    name="customerName"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete<Customer, false, false, true>
                        options={customers}
                        getOptionLabel={(option) => (typeof option === 'string' ? option : option.fullName)}
                        freeSolo
                        value={field.value}
                        onChange={(_event, value) => {
                          field.onChange(typeof value === 'string' ? value : value?.fullName || '');
                          // Listeden seçilirse telefonu da doldur
                          if (value && typeof value === 'object') setValue('customerPhone', value.phone || '');
                        }}
                        onInputChange={(_event, inputValue) => field.onChange(inputValue)}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth label="Müşteri" error={!!errors.customerName} helperText={errors.customerName?.message} />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{typeof option === 'string' ? option : (option as Customer).fullName}</Typography>
                              {typeof option === 'object' && (option as Customer).phone && (
                                <Typography sx={{ fontSize: 12.5, color: a.muted, ...monoSx }}>{(option as Customer).phone}</Typography>
                              )}
                            </Box>
                          </Box>
                        )}
                      />
                    )}
                  />
                  <Controller
                    name="customerPhone"
                    control={control}
                    defaultValue=""
                    render={({ field }) => <TextField {...field} fullWidth label="Telefon" type="tel" placeholder="İsteğe bağlı" sx={{ gridColumn: { sm: '1 / -1' } }} />}
                  />
                </Box>
              </FormSection>

              <FormSection step={2} title="Tarih ve kira bedeli" hint="Gün değişince toplam, mevcut günlük ücrete göre yeniden hesaplanır">
                <Box sx={fieldGrid({ xs: 1, sm: 2 })}>
                  <DatePicker label="Başlangıç" value={startDate} onChange={handleStartDateChange} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
                  <DatePicker label="Bitiş" value={endDate} onChange={handleEndDateChange} minDate={startDate || undefined} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
                  <Controller
                    name="days"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Gün sayısı"
                        type="number"
                        onChange={(e) => handleDaysChange(parseInt(e.target.value) || 0)}
                        error={!!errors.days}
                        helperText={errors.days?.message}
                      />
                    )}
                  />
                  <Controller
                    name="totalAmount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value === 0 ? '' : field.value}
                        fullWidth
                        label="Kira bedeli (toplam)"
                        type="number"
                        inputProps={{ step: 10 }}
                        InputProps={moneyInputProps}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange('');
                          } else {
                            const numValue = parseFloat(value);
                            field.onChange(isNaN(numValue) ? '' : numValue);
                          }
                        }}
                        onBlur={(e) => field.onChange(Math.round((parseFloat(e.target.value) || 0) / 10) * 10)}
                        error={!!errors.totalAmount}
                        helperText={errors.totalAmount?.message || "10'a yuvarlanır"}
                      />
                    )}
                  />
                </Box>
              </FormSection>

              <FormSection step={3} title="Ek ücretler">
                <Box sx={fieldGrid({ xs: 2, sm: 3, md: 5 })}>
                  {extraField('kmDiff', 'KM farkı')}
                  {extraField('cleaning', 'Temizlik')}
                  {extraField('hgs', 'HGS')}
                  {extraField('damage', 'Kaza / sürtme')}
                  {extraField('fuel', 'Yakıt')}
                </Box>
              </FormSection>

              <FormSection step={4} title="Alınan ödemeler" hint="Peşin ve taksitler; plan dışı ödemeler özette listelenir">
                <Box sx={fieldGrid({ xs: 2, sm: 3, md: 5 })}>
                  {paymentField('upfront', 'Peşin')}
                  {paymentField('pay1', '1. ödeme')}
                  {paymentField('pay2', '2. ödeme')}
                  {paymentField('pay3', '3. ödeme')}
                  {paymentField('pay4', '4. ödeme')}
                </Box>
              </FormSection>

              <FormSection step={5} title="Not">
                <Controller
                  name="note"
                  control={control}
                  defaultValue=""
                  render={({ field }) => <TextField {...field} fullWidth multiline minRows={2} placeholder="İsteğe bağlı açıklama" />}
                />
              </FormSection>
            </Box>

            <SummaryPanel>
              <SummaryRow label="Araç" mono={false} value={selectedVehicle ? <><Box component="span" sx={monoSx}>{selectedVehicle.plate}</Box> · {selectedVehicle.name}</> : '—'} />
              <SummaryRow label="Müşteri" mono={false} value={watchedValues?.customerName || '—'} />
              <SummaryRow label="Tarih" value={startDate && endDate ? `${startDate.format('DD.MM')} → ${endDate.format('DD.MM.YY')}` : '—'} />
              <SummaryRow label="Süre" mono={false} value={`${watchedValues?.days || 0} gün`} />
              <Box sx={{ my: 1, borderTop: `1px solid ${a.line}` }} />
              <SummaryRow label="Günlük ücret" value={formatCurrency(dailyRateTRY)} muted />
              <SummaryRow label="Kira bedeli" value={formatCurrency(watchedValues?.totalAmount || 0)} />
              <SummaryRow label="Ek ücretler" value={formatCurrency(extrasTRY)} />
              <SummaryRow label="Genel toplam" value={formatCurrency(totalDueTRY)} strong />
              <SummaryRow label="Peşin + taksitler" value={formatCurrency(paidFromRental)} tone="success" />
              {payments.length > 0 && <SummaryRow label={`Ek ödemeler (${payments.length})`} value={formatCurrency(totalPaid)} tone="success" />}
              <BalanceHero balance={balanceTRY} total={totalDueTRY} paid={totalPaidTRY} label={isDebtFullyPaid ? 'Borç kapandı' : 'Kalan bakiye'} />

              {payments.length > 0 && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${a.line}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: a.muted, mb: 0.75 }}>Plan dışı ek ödemeler</Typography>
                  {payments.map((payment) => (
                    <Stack key={payment.id} direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                      <Typography sx={{ fontSize: 12.5, color: a.muted }}>
                        {dayjs(payment.paidAt).format('DD.MM.YY')} · {payment.method === 'CASH' ? 'Nakit' : payment.method === 'CARD' ? 'Kart' : 'Havale'}
                      </Typography>
                      <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.success }}>{formatCurrency(payment.amount)}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </SummaryPanel>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, py: 2, gap: 1, borderTop: `1px solid ${a.lineSoft}` }}>
          <Button variant="outlined" onClick={handleClose} disabled={updateRentalMutation.isPending}>Vazgeç</Button>
          <Button type="submit" variant="contained" disabled={updateRentalMutation.isPending}>
            {updateRentalMutation.isPending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
