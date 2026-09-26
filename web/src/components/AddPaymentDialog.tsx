import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { AccountBalanceOutlined, CheckCircleOutline, CreditCardOutlined, PaymentsOutlined } from '@mui/icons-material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { rentalsApi, Rental, Payment } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { getDisplayNote, getRentalFinancials } from '../utils/rentalFinancials';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';
import { a, monoSx } from '../admin/theme';
import { BalanceHero, DialogHeader, FormSection, SegmentedControl, SummaryPanel, SummaryRow, dialogBodySx, fieldGrid } from '../admin/dialogParts';

interface AddPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  rental: Rental | null;
}

type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

interface PaymentFormData {
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  paidTime: string;
}

const methodLabel = (method: PaymentMethod) => (method === 'CASH' ? 'Nakit' : method === 'CARD' ? 'Kart' : 'Havale');

function initialForm(): PaymentFormData {
  const now = new Date();
  return { amount: '', method: 'CASH', paidAt: dayjs(now).format('YYYY-MM-DD'), paidTime: now.toTimeString().slice(0, 5) };
}

export default function AddPaymentDialog({ open, onClose, rental }: AddPaymentDialogProps) {
  const [formData, setFormData] = useState<PaymentFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Güncel kiralama (prop'taki eski olabilir)
  const { data: freshRentalResponse } = useQuery({
    queryKey: ['rental', rental?.id],
    queryFn: async () => (rental ? rentalsApi.getById(rental.id) : null),
    enabled: open && !!rental,
    staleTime: 0,
    gcTime: 0,
  });
  const currentRental = freshRentalResponse?.data || rental;

  // Ödeme geçmişi
  const { data: paymentsResponse } = useQuery({
    queryKey: ['rental-payments', rental?.id],
    queryFn: async () => (rental ? rentalsApi.getPayments(rental.id) : { data: [] }),
    enabled: open && !!rental,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  const payments: Payment[] = paymentsResponse?.data || [];

  // Kiralamalar, detay ve borç sayfalarıyla aynı hesap (özgün toplam dahil); ek ödemeler güncel listeden
  const fin = currentRental ? getRentalFinancials({ ...currentRental, payments }) : null;
  const totalDue = fin?.totalAmount || 0;
  const totalAllPaid = fin?.totalPaid || 0;
  const remainingBalance = Math.max(0, Math.round(((fin?.balance || 0)) * 100) / 100);
  const vehicleRevenue = fin ? fin.rentBase + fin.extras.kmDiff : 0;
  const isDebtFullyPaid = remainingBalance <= 0;

  const inputAmount = formData.amount ? parseFloat(formData.amount.replace(',', '.')) || 0 : 0;
  const balanceAfterPayment = Math.max(0, Math.round((remainingBalance - inputAmount) * 100) / 100);

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: PaymentMethod; paidAt: string }) => rentalsApi.addPayment(currentRental!.id, data),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['rental-payments', currentRental!.id] });
      invalidateAllRentalCaches(queryClient);
      onClose();
      resetForm();
    },
    onError: (error: any) => console.error('Payment creation error:', error),
  });

  const resetForm = () => {
    setFormData(initialForm());
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (remainingBalance <= 0) {
      newErrors.amount = 'Bu kiralama zaten tamamen ödenmiş. Ek ödeme yapılamaz.';
      setErrors(newErrors);
      return false;
    }
    if (!formData.amount) {
      newErrors.amount = 'Ödeme tutarı gereklidir';
    } else {
      const amount = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) newErrors.amount = 'Geçerli bir tutar girin';
      else if (amount > remainingBalance) newErrors.amount = `En fazla ${formatCurrency(remainingBalance)} alınabilir`;
    }
    if (!formData.method) newErrors.method = 'Ödeme yöntemi gereklidir';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental || !validateForm()) return;
    try {
      await addPaymentMutation.mutateAsync({
        amount: parseFloat(formData.amount.replace(',', '.')),
        method: formData.method,
        paidAt: new Date(`${formData.paidAt}T${formData.paidTime}:00`).toISOString(),
      });
    } catch (error) {
      console.error('Ödeme eklenirken hata:', error);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const setAmount = (value: string) => {
    // Yalnızca rakam, virgül ve nokta; virgül ondalık ayırıcıya çevrilir
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setFormData((prev) => ({ ...prev, amount: cleaned }));
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
  };

  const planSteps = currentRental
    ? [
        { label: 'Peşin', amount: currentRental.upfront || 0 },
        { label: '1. ödeme', amount: currentRental.pay1 || 0 },
        { label: '2. ödeme', amount: currentRental.pay2 || 0 },
        { label: '3. ödeme', amount: currentRental.pay3 || 0 },
        { label: '4. ödeme', amount: currentRental.pay4 || 0 },
      ].filter((step) => step.amount > 0)
    : [];
  const note = getDisplayNote(currentRental?.note);
  const half = Math.round((remainingBalance / 2) * 100) / 100;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { m: { xs: 1.5, sm: 3 }, width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 48px)' }, maxHeight: { xs: 'calc(100% - 24px)', sm: '92vh' } } }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <DialogHeader
          title="Ödeme al"
          subtitle={rental ? <>{rental.customer?.fullName} · <Box component="span" sx={monoSx}>{rental.vehicle?.plate}</Box></> : undefined}
          onClose={handleClose}
          disabled={addPaymentMutation.isPending}
        />

        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
          {addPaymentMutation.isError && (
            <Alert severity="error" sx={{ mb: 2.5 }}>{(addPaymentMutation.error as any)?.response?.data?.error || 'Ödeme kaydedilemedi.'}</Alert>
          )}

          <Box sx={dialogBodySx}>
            <Box sx={{ minWidth: 0 }}>
              {isDebtFullyPaid ? (
                <Box sx={{ py: 5, px: 3, textAlign: 'center', borderRadius: '14px', bgcolor: a.successSoft, display: 'grid', justifyItems: 'center', gap: 1 }}>
                  <CheckCircleOutline sx={{ fontSize: 40, color: a.success }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 17 }}>Borç tamamen ödendi</Typography>
                  <Typography sx={{ color: a.muted, fontSize: 14, maxWidth: 340 }}>Bu kiralama için alınacak ödeme kalmadı. Yeni ödeme eklenemez.</Typography>
                </Box>
              ) : (
                <>
                  <FormSection step={1} title="Tutar" hint={`En fazla ${formatCurrency(remainingBalance)}`}>
                    <TextField
                      autoFocus
                      fullWidth
                      value={formData.amount}
                      onChange={(e) => setAmount(e.target.value)}
                      error={!!errors.amount}
                      helperText={errors.amount || 'Virgül veya nokta ile kuruş girebilirsiniz'}
                      placeholder="0,00"
                      inputProps={{ inputMode: 'decimal', 'aria-label': 'Ödeme tutarı', style: { ...monoSx, fontSize: 24, fontWeight: 500 } }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Box component="span" sx={{ ...monoSx, fontSize: 22, color: a.muted }}>₺</Box></InputAdornment> }}
                      sx={{ '& .MuiOutlinedInput-root': { minHeight: 64 } }}
                    />
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                      <Button size="small" variant="outlined" onClick={() => setAmount(String(remainingBalance))}>Kalanın tamamı · {formatCurrency(remainingBalance)}</Button>
                      {half > 0 && <Button size="small" variant="outlined" onClick={() => setAmount(String(half))}>Yarısı · {formatCurrency(half)}</Button>}
                    </Stack>
                  </FormSection>

                  <FormSection step={2} title="Ödeme yöntemi">
                    <SegmentedControl
                      label="Ödeme yöntemi"
                      value={formData.method}
                      onChange={(method) => setFormData((prev) => ({ ...prev, method }))}
                      options={[
                        { value: 'CASH', label: 'Nakit', icon: <PaymentsOutlined /> },
                        { value: 'CARD', label: 'Kart', icon: <CreditCardOutlined /> },
                        { value: 'TRANSFER', label: 'Havale', icon: <AccountBalanceOutlined /> },
                      ]}
                    />
                  </FormSection>

                  <FormSection step={3} title="Ödeme zamanı">
                    <Box sx={fieldGrid({ xs: 2 })}>
                      <TextField label="Tarih" type="date" value={formData.paidAt} onChange={(e) => setFormData((prev) => ({ ...prev, paidAt: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                      <TextField label="Saat" type="time" value={formData.paidTime} onChange={(e) => setFormData((prev) => ({ ...prev, paidTime: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                    </Box>
                  </FormSection>

                  {inputAmount > 0 && (
                    <Box sx={{ mt: 3, p: 2, borderRadius: '12px', border: `1px dashed ${balanceAfterPayment <= 0 ? a.success : a.line}`, bgcolor: balanceAfterPayment <= 0 ? a.successSoft : 'transparent' }}>
                      <Typography sx={{ fontSize: 13, color: a.muted }}>Bu ödemeden sonra</Typography>
                      <Typography sx={{ fontWeight: 700, color: balanceAfterPayment <= 0 ? a.success : a.ink }}>
                        {balanceAfterPayment <= 0 ? 'Borç tamamen kapanacak' : <>Kalan bakiye <Box component="span" sx={monoSx}>{formatCurrency(balanceAfterPayment)}</Box></>}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>

            <SummaryPanel title="Kiralama">
              <SummaryRow label="Genel toplam" value={formatCurrency(totalDue)} strong />
              {fin && <SummaryRow label={`Kira bedeli (${currentRental?.days || 0} gün)`} value={formatCurrency(fin.rentBase)} muted />}
              {fin && fin.extras.kmDiff > 0 && <SummaryRow label="KM farkı" value={formatCurrency(fin.extras.kmDiff)} muted />}
              {fin && fin.extras.cleaning > 0 && <SummaryRow label="Temizlik" value={formatCurrency(fin.extras.cleaning)} muted />}
              {fin && fin.extras.hgs > 0 && <SummaryRow label="HGS" value={formatCurrency(fin.extras.hgs)} muted />}
              {fin && fin.extras.damage > 0 && <SummaryRow label="Hasar" value={formatCurrency(fin.extras.damage)} muted />}
              {fin && fin.extras.fuel > 0 && <SummaryRow label="Yakıt" value={formatCurrency(fin.extras.fuel)} muted />}
              <SummaryRow label="Araç geliri" value={formatCurrency(vehicleRevenue)} muted />
              <SummaryRow label="Ödenen" value={formatCurrency(totalAllPaid)} tone="success" />
              <BalanceHero balance={remainingBalance} total={totalDue} paid={totalAllPaid} />

              {(planSteps.length > 0 || payments.length > 0) && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${a.line}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: a.muted, mb: 0.75 }}>Alınan ödemeler</Typography>
                  {planSteps.map((step) => (
                    <Stack key={step.label} direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                      <Typography sx={{ fontSize: 12.5, color: a.muted }}>{step.label}</Typography>
                      <Typography sx={{ ...monoSx, fontSize: 12.5 }}>{formatCurrency(step.amount)}</Typography>
                    </Stack>
                  ))}
                  {payments.map((payment) => (
                    <Stack key={payment.id} direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                      <Typography sx={{ fontSize: 12.5, color: a.muted }}>{dayjs(payment.paidAt).format('DD.MM.YY')} · {methodLabel(payment.method)}</Typography>
                      <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.success }}>{formatCurrency(payment.amount)}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}

              {note && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${a.line}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: a.muted, mb: 0.5 }}>Not</Typography>
                  <Typography sx={{ fontSize: 13, whiteSpace: 'pre-line' }}>{note}</Typography>
                </Box>
              )}
            </SummaryPanel>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, py: 2, gap: 1, borderTop: `1px solid ${a.lineSoft}` }}>
          <Button variant="outlined" onClick={handleClose}>{isDebtFullyPaid ? 'Kapat' : 'Vazgeç'}</Button>
          {!isDebtFullyPaid && (
            <Button type="submit" variant="contained" disabled={addPaymentMutation.isPending}>
              {addPaymentMutation.isPending ? 'Kaydediliyor…' : inputAmount > 0 ? `${formatCurrency(inputAmount)} ödeme al` : 'Ödemeyi kaydet'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
