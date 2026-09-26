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
  Collapse,
  Stack,
} from '@mui/material';
import { CalculateOutlined } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { vehiclesApi, rentalsApi, customersApi, Customer } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';
import { a, monoSx } from '../admin/theme';
import { BalanceHero, DialogHeader, FormSection, SummaryPanel, SummaryRow, dialogBodySx, fieldGrid, moneyInputProps } from '../admin/dialogParts';

const rentalSchema = z.object({
  vehicleId: z.string().min(1, 'Araç seçimi gereklidir'),
  customerName: z.string().min(1, 'Müşteri adı gereklidir'),
  startDate: z.date(),
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

  
  // Hesaplama alanları (sadece görsel hesaplama için)
  const [calculationTotalAmount, setCalculationTotalAmount] = useState<string>('');
  const [calculationDailyRate, setCalculationDailyRate] = useState<string>('');
  const [calculationDays, setCalculationDays] = useState<string>('1');
  const [helperOpen, setHelperOpen] = useState(false);

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

  const createRentalMutation = useMutation({
    mutationFn: (data: RentalFormData) => {
      // Create payload that matches backend schema
      const payload = {
        vehicleId: data.vehicleId,
        customerName: data.customerName,
        startDate: startDate ? 
          dayjs(`${startDate.format('YYYY-MM-DD')}T09:00:00`).toISOString() :
          dayjs(data.startDate).toISOString(),
        endDate: endDate ? 
          dayjs(`${endDate.format('YYYY-MM-DD')}T18:00:00`).toISOString() :
          dayjs(data.endDate).toISOString(),
        days: data.days,
        dailyPrice: Math.round((data.totalAmount / data.days) / 10) * 10 * 100, // Rounded to nearest 10
        originalTotal: Math.round(data.totalAmount * 100), // Hesaplamalar için sakla
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

      setCalculationTotalAmount('');
      setCalculationDailyRate('');
      setCalculationDays('1');
      setHelperOpen(false);
      onClose();
    }
  };

  // Özet paneli için seçimler ve türetilen değerler
  const vehicleList: any[] = vehicles?.data || [];
  const selectedVehicleId = watch('vehicleId');
  const selectedVehicle = vehicleList.find((vehicle) => vehicle.id === selectedVehicleId);
  const customerName = watch('customerName');
  const extrasTRY = (kmDiff || 0) + (cleaning || 0) + (hgs || 0) + (damage || 0) + (fuel || 0);
  // Kayda geçecek günlük ücret (API'ye giden hesapla aynı: 10'a yuvarlı)
  const dailyRateTRY = days ? Math.round(((totalAmount || 0) / days) / 10) * 10 : 0;

  const applyHelper = () => {
    const helperDays = parseInt(calculationDays) || 1;
    const helperTotal = parseFloat(calculationTotalAmount);
    if (helperDays >= 1) handleDaysChange(helperDays);
    if (!Number.isNaN(helperTotal)) setValue('totalAmount', Math.round(helperTotal / 10) * 10, { shouldValidate: true });
    setHelperOpen(false);
  };

  const moneyField = (name: 'kmDiff' | 'cleaning' | 'hgs' | 'damage' | 'fuel' | 'upfront' | 'pay1' | 'pay2' | 'pay3' | 'pay4', label: string, allowNegative = false) => (
    <Controller
      key={name}
      name={name}
      control={control}
      render={({ field: formField }) => (
        <TextField
          {...formField}
          fullWidth
          label={label}
          type="number"
          inputProps={allowNegative ? { step: 0.01 } : { min: 0, step: 0.01 }}
          InputProps={moneyInputProps}
          onChange={(e) => handleNumericChange(formField, e.target.value, true)}
          onBlur={(e) => handleNumericBlur(formField, e.target.value, true)}
        />
      )}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth PaperProps={{ sx: { m: { xs: 1.5, sm: 3 }, width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 48px)' }, maxHeight: { xs: 'calc(100% - 24px)', sm: '92vh' } } }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'contents' }}>
        <DialogHeader title="Yeni kiralama" subtitle="Araç, müşteri, tarih ve ödeme bilgilerini girin; özet yazdıkça güncellenir." onClose={handleClose} disabled={createRentalMutation.isPending} />

        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
          {createRentalMutation.error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {(createRentalMutation.error as any)?.response?.data?.error || 'Kiralama oluşturulurken hata oluştu'}
            </Alert>
          )}

          <Box sx={dialogBodySx}>
            <Box sx={{ minWidth: 0 }}>
              <FormSection step={1} title="Araç ve müşteri" hint="Yalnızca müsait araçlar listelenir">
                <Box sx={fieldGrid({ xs: 1, sm: 2 })}>
                  <Controller
                    name="vehicleId"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <TextField {...field} select fullWidth label="Araç" error={!!errors.vehicleId} helperText={errors.vehicleId?.message}>
                        {vehicleList.map((vehicle: any) => (
                          <MenuItem key={vehicle.id} value={vehicle.id}>
                            <Box component="span" sx={{ ...monoSx, mr: 1 }}>{vehicle.plate}</Box>
                            {vehicle.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  <Controller
                    name="customerName"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <Autocomplete<Customer, false, false, true>
                        options={customers}
                        getOptionLabel={(option) => (typeof option === 'string' ? option : option.fullName)}
                        freeSolo
                        value={field.value}
                        onChange={(_event, value) => field.onChange(typeof value === 'string' ? value : value?.fullName || '')}
                        onInputChange={(_event, inputValue) => field.onChange(inputValue)}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth label="Müşteri" error={!!errors.customerName} helperText={errors.customerName?.message || 'Listede yoksa yeni müşteri olarak kaydedilir'} />
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
                </Box>
              </FormSection>

              <FormSection
                step={2}
                title="Tarih ve kira bedeli"
                hint="Tarih değişince gün, gün değişince bitiş tarihi güncellenir"
                action={
                  <Button size="small" startIcon={<CalculateOutlined sx={{ fontSize: 17 }} />} onClick={() => setHelperOpen((value) => !value)} sx={{ flex: 'none' }}>
                    Hesaplama yardımcısı
                  </Button>
                }
              >
                <Collapse in={helperOpen} unmountOnExit>
                  <Box sx={{ mb: 2, p: 2, borderRadius: '12px', bgcolor: a.surface }}>
                    <Box sx={fieldGrid({ xs: 1, sm: 3 })}>
                      <TextField
                        label="Gün"
                        type="number"
                        value={calculationDays}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCalculationDays(value);
                          if (calculationTotalAmount && value && parseInt(value) > 0) {
                            setCalculationDailyRate((Math.round(parseFloat(calculationTotalAmount) / parseInt(value) / 10) * 10).toString());
                          } else if (calculationDailyRate && value && parseInt(value) > 0) {
                            setCalculationTotalAmount(Math.round(parseFloat(calculationDailyRate) * parseInt(value)).toString());
                          }
                        }}
                        inputProps={{ min: 1, step: 1 }}
                      />
                      <TextField
                        label="Toplam tutar"
                        type="number"
                        value={calculationTotalAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCalculationTotalAmount(value);
                          const helperDays = parseInt(calculationDays) || 1;
                          setCalculationDailyRate(value && helperDays > 0 ? (Math.round(parseFloat(value) / helperDays / 10) * 10).toString() : '');
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={moneyInputProps}
                      />
                      <TextField
                        label="Günlük ücret"
                        type="number"
                        value={calculationDailyRate}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCalculationDailyRate(value);
                          const helperDays = parseInt(calculationDays) || 1;
                          setCalculationTotalAmount(value && helperDays > 0 ? Math.round(parseFloat(value) * helperDays).toString() : '');
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={moneyInputProps}
                      />
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mt: 1.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: a.muted }}>Günlük ücretten toplamı ya da toplamdan günlüğü bulun.</Typography>
                      <Button size="small" variant="outlined" onClick={applyHelper} disabled={!calculationTotalAmount}>Forma uygula</Button>
                    </Stack>
                  </Box>
                </Collapse>

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
                        inputProps={{ min: 1, step: 1 }}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange('');
                            return;
                          }
                          const newDays = Math.max(1, parseInt(value) || 1);
                          field.onChange(newDays);
                          handleDaysChange(newDays);
                        }}
                        onBlur={(e) => {
                          const finalDays = Math.max(1, parseInt(e.target.value) || 1);
                          field.onChange(finalDays);
                          handleDaysChange(finalDays);
                        }}
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
                        fullWidth
                        label="Kira bedeli (toplam)"
                        type="number"
                        inputProps={{ min: 0, step: 10 }}
                        InputProps={moneyInputProps}
                        onChange={(e) => handleNumericChange(field, e.target.value, false)}
                        onBlur={(e) => {
                          // 10'lara yuvarla
                          const roundedValue = Math.round((parseFloat(e.target.value) || 0) / 10) * 10;
                          field.onChange(roundedValue);
                          handleNumericBlur(field, roundedValue.toString(), false);
                        }}
                        error={!!errors.totalAmount}
                        helperText={errors.totalAmount?.message || "10'a yuvarlanır"}
                      />
                    )}
                  />
                </Box>
              </FormSection>

              <FormSection step={3} title="Ek ücretler" hint="Boş bırakılanlar sıfır sayılır">
                <Box sx={fieldGrid({ xs: 2, sm: 3, md: 5 })}>
                  {moneyField('kmDiff', 'KM farkı')}
                  {moneyField('cleaning', 'Temizlik')}
                  {moneyField('hgs', 'HGS')}
                  {moneyField('damage', 'Kaza / sürtme')}
                  {moneyField('fuel', 'Yakıt')}
                </Box>
              </FormSection>

              <FormSection step={4} title="Alınan ödemeler" hint="Peşin ve taksitler">
                <Box sx={fieldGrid({ xs: 2, sm: 3, md: 5 })}>
                  {moneyField('upfront', 'Peşin', true)}
                  {moneyField('pay1', '1. ödeme', true)}
                  {moneyField('pay2', '2. ödeme', true)}
                  {moneyField('pay3', '3. ödeme', true)}
                  {moneyField('pay4', '4. ödeme', true)}
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
              <SummaryRow label="Araç" mono={false} value={selectedVehicle ? <><Box component="span" sx={monoSx}>{selectedVehicle.plate}</Box> · {selectedVehicle.name}</> : <Box component="span" sx={{ color: a.subtle }}>Seçilmedi</Box>} />
              <SummaryRow label="Müşteri" mono={false} value={customerName || <Box component="span" sx={{ color: a.subtle }}>Girilmedi</Box>} />
              <SummaryRow label="Tarih" value={startDate && endDate ? `${startDate.format('DD.MM')} → ${endDate.format('DD.MM.YY')}` : '—'} />
              <SummaryRow label="Süre" mono={false} value={`${days || 0} gün`} />
              <Box sx={{ my: 1, borderTop: `1px solid ${a.line}` }} />
              <SummaryRow label="Günlük ücret" value={formatCurrency(dailyRateTRY)} muted />
              <SummaryRow label="Kira bedeli" value={formatCurrency(Math.round(totalAmount || 0))} />
              <SummaryRow label="Ek ücretler" value={formatCurrency(Math.round(extrasTRY))} />
              <SummaryRow label="Genel toplam" value={formatCurrency(Math.round(totalDueTRY))} strong />
              <SummaryRow label="Ödenen" value={formatCurrency(Math.round(totalPaidTRY))} tone="success" />
              <BalanceHero balance={Math.round(balanceTRY)} total={totalDueTRY} paid={totalPaidTRY} />
            </SummaryPanel>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, py: 2, gap: 1, borderTop: `1px solid ${a.lineSoft}` }}>
          <Button variant="outlined" onClick={handleClose} disabled={createRentalMutation.isPending}>Vazgeç</Button>
          <Button type="submit" variant="contained" disabled={createRentalMutation.isPending}>
            {createRentalMutation.isPending ? 'Oluşturuluyor…' : 'Kiralamayı oluştur'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
