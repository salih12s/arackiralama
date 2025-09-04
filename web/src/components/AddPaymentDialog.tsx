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
  Grid,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { rentalsApi, Rental, Payment } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';

interface AddPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  rental: Rental | null;
}

interface PaymentFormData {
  amount: string;
  method: 'CASH' | 'CARD' | 'TRANSFER';
  paidAt: string;
  paidTime: string;
}

export default function AddPaymentDialog({ open, onClose, rental }: AddPaymentDialogProps) {
  const now = new Date();
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    method: 'CASH',
    paidAt: now.toISOString().split('T')[0],
    paidTime: now.toTimeString().slice(0, 5), // HH:MM format
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Fresh rental data getir - prop'taki rental eski olabilir
  const { data: freshRentalResponse } = useQuery({
    queryKey: ['rental', rental?.id],
    queryFn: async () => {
      if (!rental) return null;
      const response = await rentalsApi.getById(rental.id);
      console.log('🔄 Fresh rental data loaded:', response.data || response);
      return response;
    },
    enabled: open && !!rental,
    staleTime: 0, // Her açılışta fresh data
    gcTime: 0,
  });

  // Fresh rental data kullan, yoksa prop'taki rental'ı kullan
  const currentRental = freshRentalResponse?.data || rental;
  
  console.log('💰 AddPaymentDialog rental comparison:', {
    propRental: rental ? {
      id: rental.id,
      totalDue: rental.totalDue,
      balance: rental.balance,
      upfront: rental.upfront,
      pay1: rental.pay1,
      pay2: rental.pay2,
      pay3: rental.pay3,
      pay4: rental.pay4
    } : null,
    freshRental: currentRental ? {
      id: currentRental.id,
      totalDue: currentRental.totalDue,
      balance: currentRental.balance,
      upfront: currentRental.upfront,
      pay1: currentRental.pay1,
      pay2: currentRental.pay2,
      pay3: currentRental.pay3,
      pay4: currentRental.pay4
    } : null
  });

  // Ödeme geçmişini getir
  const { data: paymentsResponse } = useQuery({
    queryKey: ['rental-payments', rental?.id],
    queryFn: async () => {
      if (!rental) return { data: [] };
      return await rentalsApi.getPayments(rental.id);
    },
    enabled: open && !!rental,
    staleTime: 0, // Hemen stale olsun, her açılışta fresh data getirsin
    gcTime: 0, // Cache'de tutma, her seferinde yeniden fetch et
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const payments: Payment[] = paymentsResponse?.data || [];

  // DOĞRU HESAPLAMA MANTIĞI - Dashboard ile aynı
  // Toplam = (Günlük × Gün) + KM + Temizlik + HGS + Kaza + Yakıt
  const totalDueCalculated = currentRental ? 
    (currentRental.days * currentRental.dailyPrice) + 
    (currentRental.kmDiff || 0) + 
    (currentRental.cleaning || 0) + 
    (currentRental.hgs || 0) + 
    (currentRental.damage || 0) + 
    (currentRental.fuel || 0) : 0;
  
  // TL STANDARDI - Her şey TL cinsinde hesaplanır
  const totalPaid = Array.isArray(payments) ? payments.reduce((sum, payment) => sum + payment.amount, 0) : 0; // TL
  
  // Planlı ödemeler API'dan TL cinsinde gelir
  const paidFromRental = currentRental ? ((currentRental.upfront || 0) + (currentRental.pay1 || 0) + (currentRental.pay2 || 0) + (currentRental.pay3 || 0) + (currentRental.pay4 || 0)) : 0;
  const totalAllPaid = totalPaid + paidFromRental; // TL
  
  // Doğru totalDue kullan ve floating point hatasını önle
  const remainingBalance = Math.max(0, Math.round((totalDueCalculated - totalAllPaid) * 100) / 100); // TL

  console.log('💰 AddPaymentDialog calculations:', {
    totalDueCalculated,
    totalPaid,
    paidFromRental, 
    totalAllPaid,
    remainingBalance,
    paymentsCount: payments?.length
  });

  console.log('🔍 Current rental details:', {
    id: currentRental?.id,
    upfront: currentRental?.upfront,
    pay1: currentRental?.pay1,
    pay2: currentRental?.pay2,
    pay3: currentRental?.pay3,
    pay4: currentRental?.pay4,
    days: currentRental?.days,
    dailyPrice: currentRental?.dailyPrice,
    kmDiff: currentRental?.kmDiff,
    cleaning: currentRental?.cleaning,
    hgs: currentRental?.hgs,
    damage: currentRental?.damage,
    fuel: currentRental?.fuel
  });

  console.log('💵 Payments data:', payments);

  // Araç geliri: sadece gün × fiyat + KM (TL cinsinde)
  const vehicleRevenue = currentRental ? (currentRental.days * currentRental.dailyPrice) + (currentRental.kmDiff || 0) : 0;

  // Real-time hesaplama için input amount'u parse et
  const currentInputAmount = formData.amount ? parseFloat(formData.amount.replace(',', '.')) || 0 : 0;
  const inputAmount = currentInputAmount;
  const balanceAfterPayment = Math.max(0, Math.round((remainingBalance - inputAmount) * 100) / 100); // TL cinsinden hesapla, floating point hatasını önle

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: 'CASH' | 'CARD' | 'TRANSFER'; paidAt: string }) => 
      rentalsApi.addPayment(currentRental!.id, data),
    onSuccess: async () => {
      // Önce payments query'sini anında yenile
      await queryClient.refetchQueries({ queryKey: ['rental-payments', currentRental!.id] });
      
      // Sonra tüm cache'leri invalidate et
      invalidateAllRentalCaches(queryClient);
      
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Payment creation error:', error);
    },
  });

  const resetForm = () => {
    const now = new Date();
    setFormData({
      amount: '',
      method: 'CASH',
      paidAt: now.toISOString().split('T')[0],
      paidTime: now.toTimeString().slice(0, 5),
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Eğer kiralama tamamen ödenmişse ödeme yapılamaz  
    if (remainingBalance <= 0) {
      newErrors.amount = 'Bu kiralama zaten tamamen ödenmiş. Ek ödeme yapılamaz.';
      setErrors(newErrors);
      return false;
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Ödeme tutarı gereklidir';
    } else {
      // Handle Turkish decimal separator (replace comma with dot)
      const normalizedAmount = formData.amount.replace(',', '.');
      const amount = parseFloat(normalizedAmount);
      
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Geçerli bir tutar giriniz';
      } else if (amount > remainingBalance) { // remainingBalance TL cinsinden
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
      const amountTL = parseFloat(normalizedAmount);
      
      await addPaymentMutation.mutateAsync({
        amount: amountTL, // TL olarak gönder
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
  const isDebtFullyPaid = remainingBalance <= 0;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          height: 'auto'
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Ödeme Ekle
          {rental && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Kiralama: {rental.customer?.fullName} - {rental.vehicle?.plate}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {rental && (
              <Alert severity={remainingBalance <= 0 ? "success" : "info"} sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Hesaplama Özeti
                </Typography>
                
                {/* Temel Mali Bilgiler Grid */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={2.4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Toplam Ödenecek
                      </Typography>
                      <Typography variant="h6" color="success.dark" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalDueCalculated)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={2.4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Toplam Ödenen
                      </Typography>
                      <Typography variant="h6" color="info.dark" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalAllPaid)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={2.4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Araç Geliri
                      </Typography>
                      <Typography variant="h6" color="warning.dark" sx={{ fontWeight: 700 }}>
                        {formatCurrency(vehicleRevenue)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={2.4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Kapora
                      </Typography>
                      <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 700 }}>
                        {formatCurrency((currentRental?.upfront || 0))}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={2.4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: remainingBalance > 0 ? 'error.100' : 'success.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Kalan Bakiye
                      </Typography>
                      <Typography variant="h6" color={remainingBalance > 0 ? 'error.dark' : 'success.dark'} sx={{ fontWeight: 700 }}>
                        {formatCurrency(remainingBalance)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Ek Maliyetler */}
                {((currentRental?.kmDiff || 0) > 0 || (currentRental?.cleaning || 0) > 0 || (currentRental?.hgs || 0) > 0 || (currentRental?.damage || 0) > 0 || (currentRental?.fuel || 0) > 0) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Ek Maliyetler
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {(currentRental?.kmDiff || 0) > 0 && (
                        <Chip label={`KM Farkı: ${formatCurrency(currentRental?.kmDiff || 0)}`} size="small" variant="outlined" />
                      )}
                      {(currentRental?.cleaning || 0) > 0 && (
                        <Chip label={`Temizlik: ${formatCurrency(currentRental?.cleaning || 0)}`} size="small" variant="outlined" />
                      )}
                      {(currentRental?.hgs || 0) > 0 && (
                        <Chip label={`HGS: ${formatCurrency(currentRental?.hgs || 0)}`} size="small" variant="outlined" />
                      )}
                      {(currentRental?.damage || 0) > 0 && (
                        <Chip label={`Hasar: ${formatCurrency(currentRental?.damage || 0)}`} size="small" variant="outlined" />
                      )}
                      {(currentRental?.fuel || 0) > 0 && (
                        <Chip label={`Yakıt: ${formatCurrency(currentRental?.fuel || 0)}`} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Real-time Hesaplama */}
                {currentInputAmount > 0 && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1, border: '2px dashed', borderColor: balanceAfterPayment <= 0 ? 'success.main' : 'warning.main' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      💡 Bu ödeme sonrası durum:
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, color: balanceAfterPayment <= 0 ? 'success.main' : 'warning.main', fontWeight: 700 }}>
                      Kalan bakiye: {formatCurrency(balanceAfterPayment)}
                      {balanceAfterPayment <= 0 && <span style={{color: 'green'}}> 🎉 Borç tamamen kapanacak!</span>}
                    </Typography>
                  </Box>
                )}

                {/* Borç kapanmış durumu */}
                {remainingBalance <= 0 && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.50', borderRadius: 1, border: '2px solid', borderColor: 'success.main' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.dark', textAlign: 'center' }}>
                      🎉 Bu kiralamanın borcu tamamen ödendi!
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            {/* Kiralama Detayları */}
            {rental && (
              <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
                <Typography variant="h6" gutterBottom>
                  Kiralama Detayları
                </Typography>
                <Divider sx={{ mb: 2 }} />
          

                {/* Mali Durum */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Mali Durum
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Tutar
                      </Typography>
                      <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency(totalDueCalculated)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Ödenen
                      </Typography>
                      <Typography variant="body1" color="info.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency(totalAllPaid)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Kapora
                      </Typography>
                      <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency((rental.upfront || 0))}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: remainingBalance > 0 ? 'error.50' : 'success.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Kalan Bakiye
                      </Typography>
                      <Typography variant="body1" color={remainingBalance > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 600 }}>
                        {formatCurrency(remainingBalance)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Ödeme Planı Detayları */}
                {(rental.upfront > 0 || rental.pay1 > 0 || rental.pay2 > 0 || rental.pay3 > 0 || rental.pay4 > 0) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Ödeme Planı Detayları
                    </Typography>
                    <Grid container spacing={1}>
                      {/* Peşin Ödeme */}
                      {rental.upfront > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1.5, border: 1, borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
                            <Typography variant="body2" color="text.secondary">
                              Peşin Ödeme
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.upfront)}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              ✓ Ödenmiş
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      
                      {/* 1. Ödeme */}
                      {rental.pay1 > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1.5, border: 1, borderColor: 'secondary.main', borderRadius: 1, bgcolor: 'secondary.50' }}>
                            <Typography variant="body2" color="text.secondary">
                              1. Ödeme
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.pay1)}
                            </Typography>
                            {rental.payDate1 && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                {dayjs(rental.payDate1).format('DD/MM/YYYY')}
                              </Typography>
                            )}
                            <Typography variant="caption" color="success.main">
                              ✓ Ödenmiş
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {/* 2. Ödeme */}
                      {rental.pay2 > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1.5, border: 1, borderColor: 'info.main', borderRadius: 1, bgcolor: 'info.50' }}>
                            <Typography variant="body2" color="text.secondary">
                              2. Ödeme
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.pay2)}
                            </Typography>
                            {rental.payDate2 && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                {dayjs(rental.payDate2).format('DD/MM/YYYY')}
                              </Typography>
                            )}
                            <Typography variant="caption" color="success.main">
                              ✓ Ödenmiş
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {/* 3. Ödeme */}
                      {rental.pay3 > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1.5, border: 1, borderColor: 'warning.main', borderRadius: 1, bgcolor: 'warning.50' }}>
                            <Typography variant="body2" color="text.secondary">
                              3. Ödeme
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.pay3)}
                            </Typography>
                            {rental.payDate3 && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                {dayjs(rental.payDate3).format('DD/MM/YYYY')}
                              </Typography>
                            )}
                            <Typography variant="caption" color="success.main">
                              ✓ Ödenmiş
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {/* 4. Ödeme */}
                      {rental.pay4 > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1.5, border: 1, borderColor: 'error.main', borderRadius: 1, bgcolor: 'error.50' }}>
                            <Typography variant="body2" color="text.secondary">
                              4. Ödeme
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.pay4)}
                            </Typography>
                            {rental.payDate4 && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                {dayjs(rental.payDate4).format('DD/MM/YYYY')}
                              </Typography>
                            )}
                            <Typography variant="caption" color="success.main">
                              ✓ Ödenmiş
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Ek Ödemeler */}
                {rental.payments && rental.payments.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Ek Ödemeler
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {rental.payments.map((payment: any) => (
                        <Chip
                          key={payment.id}
                          label={`${formatCurrency(payment.amount)} (${payment.method === 'CASH' ? 'Nakit' : payment.method === 'CARD' ? 'Kart' : 'Transfer'}) - ${dayjs(payment.paidAt).format('DD/MM/YYYY HH:mm')}`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Ek Maliyetler */}
                {(rental.kmDiff > 0 || rental.cleaning > 0 || rental.hgs > 0 || rental.damage > 0 || rental.fuel > 0) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Ek Maliyetler
                    </Typography>
                    <Grid container spacing={1}>
                      {rental.kmDiff > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              KM Farkı
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.kmDiff)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {rental.cleaning > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Temizlik
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.cleaning)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {rental.hgs > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              HGS
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.hgs)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {rental.damage > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Hasar
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.damage)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {rental.fuel > 0 && (
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Yakıt
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(rental.fuel)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {rental.note && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Notlar
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {rental.note}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Disable form if debt is fully paid */}
            {isDebtFullyPaid ? (
              <Alert severity="success">
                Bu kiralamanın borcu tamamen ödenmiştir. Yeni ödeme eklenemez.
              </Alert>
            ) : (
              <>
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

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Ödeme Tarihi"
                    type="date"
                    value={formData.paidAt}
                    onChange={handleChange('paidAt')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Saat"
                    type="time"
                    value={formData.paidTime}
                    onChange={handleChange('paidTime')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
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
