import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { rentalsApi, formatCurrency, Rental, Payment } from '../api/client';

interface AddPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  rental: Rental | null;
}

interface PaymentFormData {
  amount: string;
  method: 'CASH' | 'CARD' | 'TRANSFER';
  paidAt: string;
}

export default function AddPaymentDialog({ open, onClose, rental }: AddPaymentDialogProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    method: 'CASH',
    paidAt: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Ödeme geçmişini getir
  const { data: paymentsResponse } = useQuery({
    queryKey: ['rental-payments', rental?.id],
    queryFn: async () => {
      if (!rental) return { data: [] };
      return await rentalsApi.getPayments(rental.id);
    },
    enabled: open && !!rental,
  });

  const payments: Payment[] = paymentsResponse?.data || [];

  // Debug için detaylı log
  if (rental && payments.length > 0) {
    console.log('� BORÇ HESAPLAMA DEBUG:');
    console.log('📋 Kiralama Bilgileri:', {
      id: rental.id,
      customer: rental.customer?.fullName,
      totalDue_kurus: rental.totalDue,
      totalDue_TL: (rental.totalDue / 100).toFixed(2) + ' TL'
    });
    console.log('💸 Ödemeler:');
    payments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${formatCurrency(payment.amount)} (${payment.method}) - ${new Date(payment.paidAt).toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
    });
    
    const totalPaidKurus = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingKurus = rental.totalDue - totalPaidKurus;
    
    console.log('📊 Hesaplama:');
    console.log(`  Toplam Ödenen: ${totalPaidKurus} kuruş = ${(totalPaidKurus / 100).toFixed(2)} TL`);
    console.log(`  Kalan Borç: ${remainingKurus} kuruş = ${(remainingKurus / 100).toFixed(2)} TL`);
    console.log('─'.repeat(50));
  }

  // Kalan borç hesapla (her ikisi de kuruş cinsinden)
  const totalPaid = Array.isArray(payments) ? payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
  
  // Kiralama içindeki ödemeleri de dahil et (upfront, pay1, pay2, pay3, pay4)
  const paidFromRental = rental ? (rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4) : 0;
  const totalAllPaid = totalPaid + paidFromRental;
  
  const remainingBalance = rental ? Math.max(0, rental.totalDue - totalAllPaid) : 0; // Balance cannot be negative
  const remainingAmountTL = remainingBalance / 100; // Convert to TL

  // Real-time hesaplama için input amount'u parse et
  const currentInputAmount = formData.amount ? parseFloat(formData.amount.replace(',', '.')) || 0 : 0;
  const inputAmountKurus = Math.round(currentInputAmount * 100);
  const balanceAfterPayment = Math.max(0, remainingBalance - inputAmountKurus);

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: 'CASH' | 'CARD' | 'TRANSFER'; paidAt: string }) => 
      rentalsApi.addPayment(rental!.id, data),
    onSuccess: () => {
      // Tüm ilgili cache'leri agresif şekilde yenile
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      queryClient.invalidateQueries({ queryKey: ['rental-payments', rental?.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      
      // Veriler güncellensin diye kısa bir gecikme ekle
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['rentals'] });
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
      }, 100);
      
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Payment creation error:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      amount: '',
      method: 'CASH',
      paidAt: new Date().toISOString().split('T')[0],
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Ödeme tutarı gereklidir';
    } else {
      // Handle Turkish decimal separator (replace comma with dot)
      const normalizedAmount = formData.amount.replace(',', '.');
      const amount = parseFloat(normalizedAmount);
      
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Geçerli bir tutar giriniz';
      } else if (amount > remainingAmountTL) {
        newErrors.amount = `Maksimum ödeme tutarı: ${formatCurrency(remainingBalance)}`;
      }
    }

    if (!formData.method) {
      newErrors.method = 'Ödeme yöntemi gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rental) return;

    if (!validateForm()) return;

    try {
      // Handle Turkish decimal separator (replace comma with dot)
      const normalizedAmount = formData.amount.replace(',', '.');
      const amount = parseFloat(normalizedAmount);
      
      await addPaymentMutation.mutateAsync({
        amount, // TL olarak gönder (örn. 5000)
        method: formData.method,
        paidAt: new Date(formData.paidAt).toISOString(),
      });
    } catch (error) {
      console.error('Ödeme eklenirken hata:', error);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (field: keyof PaymentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    let value = event.target.value;
    
    // Amount formatını özel olarak işle
    if (field === 'amount') {
      // Sadece rakam, virgül ve nokta karakterlerine izin ver
      value = value.replace(/[^\d.,]/g, '');
      
      // Virgülü noktaya çevir (Türk formatından Amerikan formatına)
      value = value.replace(',', '.');
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Check if debt is fully paid
  const isDebtFullyPaid = remainingAmountTL <= 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Ödeme Ekle
          {rental && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Kiralama: {rental.customer?.fullName} - {rental.vehicle?.plate}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {rental && (
              <Alert severity={remainingBalance <= 0 ? "success" : "info"} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Toplam Tutar:</strong> {formatCurrency(rental.totalDue)}<br/>
                  <strong>Ödenen:</strong> {formatCurrency(totalAllPaid)}<br/>
                  <strong>Kalan:</strong> {formatCurrency(remainingBalance)}
                  {currentInputAmount > 0 && (
                    <>
                      <br/>
                      <strong>Bu ödeme sonrası kalan:</strong> <span style={{color: balanceAfterPayment <= 0 ? 'green' : 'orange'}}>
                        {formatCurrency(balanceAfterPayment)}
                      </span>
                      {balanceAfterPayment <= 0 && <><br/><strong style={{color: 'green'}}>🎉 Bu ödeme ile borç tamamen kapanacak!</strong></>}
                    </>
                  )}
                  {remainingBalance <= 0 && <><br/><strong>🎉 Borç tamamen ödendi!</strong></>}
                </Typography>
              </Alert>
            )}

            {/* Disable form if debt is fully paid */}
            {isDebtFullyPaid ? (
              <Alert severity="success">
                Bu kiralamanın borcu tamamen ödenmiştir. Yeni ödeme eklenemez.
              </Alert>
            ) : (
              <>
                {/* Ödeme Geçmişi */}
                {payments.length > 0 && (
                  <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
                    <Typography variant="subtitle2" gutterBottom>
                      Ödeme Geçmişi
                    </Typography>
                    <List dense>
                      {payments.map((payment) => (
                        <ListItem key={payment.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={`${formatCurrency(payment.amount)} - ${
                              payment.method === 'CASH' ? 'Nakit' : 
                              payment.method === 'CARD' ? 'Kart' : 'Havale'
                            }`}
                            secondary={new Date(payment.paidAt).toLocaleString('tr-TR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                <TextField
                  label="Ödeme Tutarı"
                  type="text"
                  value={formData.amount}
                  onChange={handleChange('amount')}
                  error={!!errors.amount}
                  helperText={errors.amount || `Maksimum: ${formatCurrency(remainingBalance)}`}
                  fullWidth
                  required
                  placeholder="Örnek: 2.200,00 veya 1500"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                  }}
                />

                <FormControl fullWidth required error={!!errors.method}>
                  <InputLabel>Ödeme Yöntemi</InputLabel>
                  <Select
                    value={formData.method}
                    onChange={handleChange('method')}
                    label="Ödeme Yöntemi"
                  >
                    <MenuItem value="CASH">Nakit</MenuItem>
                    <MenuItem value="CARD">Kart</MenuItem>
                    <MenuItem value="TRANSFER">Havale</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Ödeme Tarihi"
                  type="date"
                  value={formData.paidAt}
                  onChange={handleChange('paidAt')}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          {!isDebtFullyPaid && (
            <Button 
              type="submit" 
              variant="contained"
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending ? 'Kaydediliyor...' : 'Ödeme Ekle'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
