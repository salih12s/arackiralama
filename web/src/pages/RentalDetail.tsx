import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Stack,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Payment as PaymentIcon,
  Assignment as AssignmentIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import AddPaymentDialog from '../components/AddPaymentDialog';
import { rentalsApi } from '../api/client';
import { formatCurrency } from '../utils/currency';

export default function RentalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch rental details
  const { data: rental, isLoading, error } = useQuery({
    queryKey: ['rental', id],
    queryFn: async () => {
      const response = await rentalsApi.getById(id!);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Return rental mutation
  const returnRentalMutation = useMutation({
    mutationFn: (rentalId: string) => 
      fetch(`https://arackiralama-production.up.railway.app/api/rentals/${rentalId}/return`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });

  // Complete rental mutation
  const completeRentalMutation = useMutation({
    mutationFn: (rentalId: string) => 
      fetch(`https://arackiralama-production.up.railway.app/api/rentals/${rentalId}/complete`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'RETURNED': return 'default';
      case 'CANCELLED': return 'error';
      case 'COMPLETED': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'RETURNED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      case 'COMPLETED': return 'Teslim Edildi';
      default: return status;
    }
  };

  const handleReturnRental = () => {
    if (rental) {
      returnRentalMutation.mutate(rental.id);
    }
  };

  const handleCompleteRental = () => {
    if (rental) {
      completeRentalMutation.mutate(rental.id);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Kiralama Detayı">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Kiralama detayları yükleniyor...</Typography>
        </Paper>
      </Layout>
    );
  }

  if (error || !rental) {
    return (
      <Layout title="Kiralama Detayı">
        <Alert severity="error" sx={{ mb: 3 }}>
          Kiralama bulunamadı veya yüklenirken hata oluştu.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/rentals')}
        >
          Geri Dön
        </Button>
      </Layout>
    );
  }

  return (
    <Layout title={`Kiralama Detayı${rental.vehicle?.plate ? ` - ${rental.vehicle?.plate}` : ''}`}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: { xs: 2, sm: 4 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/rentals')}
            variant="outlined"
            size="small"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 1.5 }
            }}
          >
            Geri Dön
          </Button>
          
          <Box>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}>
              {rental.vehicle?.plate || 'Araç Plakası Yok'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}>
              {rental.vehicle?.name || 'Araç Adı Yok'}
            </Typography>
          </Box>
        </Box>
        
        <Stack 
          direction={{ xs: 'row', sm: 'row' }} 
          spacing={1} 
          alignItems="center"
          justifyContent={{ xs: 'flex-end', sm: 'flex-start' }}
        >
          <Chip
            label={getStatusText(rental.status)}
            color={getStatusColor(rental.status) as any}
            size="small"
            sx={{
              fontSize: { xs: '0.65rem', sm: '0.75rem' }
            }}
          />
          
          <IconButton
            onClick={() => setPaymentDialogOpen(true)}
            disabled={rental.status !== 'ACTIVE'}
            color="primary"
            title="Ödeme Ekle"
            size="small"
            sx={{ p: { xs: 0.5, sm: 1 } }}
          >
            <PaymentIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
          </IconButton>
          
          <IconButton
            onClick={() => window.print()}
            color="default"
            title="Yazdır"
            size="small"
            sx={{ p: { xs: 0.5, sm: 1 } }}
          >
            <PrintIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
          </IconButton>
        </Stack>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Customer Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}>
                <AssignmentIcon />
                Müşteri Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Ad Soyad
                </Typography>
                <Typography variant="h6">
                  {rental.customer?.fullName || 'Müşteri Adı Yok'}
                </Typography>
              </Box>
              
              {rental.customer?.phone && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Telefon
                  </Typography>
                  <Typography variant="body1">
                    {rental.customer.phone}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Rental Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon />
                Kiralama Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Başlangıç Tarihi
                  </Typography>
                  <Typography variant="body1">
                    {dayjs(rental.startDate).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Bitiş Tarihi
                  </Typography>
                  <Typography variant="body1">
                    {dayjs(rental.endDate).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Süre
                  </Typography>
                  <Typography variant="body1">
                    {rental.days} gün
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Günlük Ücret
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(rental.dailyPrice)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Oluşturulma Tarihi
                  </Typography>
                  <Typography variant="body1">
                    {dayjs(rental.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Grid>
                
                {rental.note && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Not
                    </Typography>
                    <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                      "{rental.note}"
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mali Durum
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Günlük Ücret
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {formatCurrency(rental.dailyPrice)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Toplam Tutar
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(rental.totalDue / 100)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Toplam Ödenen
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {formatCurrency(
                        ((rental.upfront || 0) + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0)) + 
                        (rental.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0)
                      )}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: rental.balance > 0 ? 'error.50' : 'success.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Kalan Bakiye
                    </Typography>
                    <Typography variant="h6" color={rental.balance > 0 ? 'error.main' : 'success.main'}>
                      {formatCurrency(rental.balance / 100)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Payment Plan Details */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Ödeme Planı Detayları
                </Typography>
                <Grid container spacing={2}>
                  {/* Upfront Payment */}
                  <Grid item xs={6} sm={4} md={2.4}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'primary.main', 
                        borderRadius: 1,
                        bgcolor: 'primary.50' 
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Peşin Ödeme
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {formatCurrency(rental.upfront || 0)}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        ✓ Ödenmiş
                      </Typography>
                    </Box>
                  </Grid>

                  {/* 1st Payment */}
                  {rental.pay1 > 0 && (
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'secondary.main', 
                          borderRadius: 1,
                          bgcolor: 'secondary.50' 
                        }}
                      >
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

                  {/* 2nd Payment */}
                  {rental.pay2 > 0 && (
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'info.main', 
                          borderRadius: 1,
                          bgcolor: 'info.50' 
                        }}
                      >
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

                  {/* 3rd Payment */}
                  {rental.pay3 > 0 && (
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'warning.main', 
                          borderRadius: 1,
                          bgcolor: 'warning.50' 
                        }}
                      >
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

                  {/* 4th Payment */}
                  {rental.pay4 > 0 && (
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'error.main', 
                          borderRadius: 1,
                          bgcolor: 'error.50' 
                        }}
                      >
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

                  {/* Additional Payments if any */}
                  {rental.payments && rental.payments.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Ek Ödemeler:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {rental.payments.map((payment: any) => (
                          <Chip
                            key={payment.id}
                            label={`${formatCurrency(payment.amount)} (${payment.method === 'CASH' ? 'Nakit' : payment.method === 'CARD' ? 'Kart' : 'Transfer'}) - ${dayjs(payment.paidAt).format('DD/MM/YYYY HH:mm')}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Box>

              {/* Extra Costs */}
              {(rental.kmDiff > 0 || rental.cleaning > 0 || rental.hgs > 0 || rental.damage > 0 || rental.fuel > 0) && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Ek Maliyetler
                  </Typography>
                  <Grid container spacing={2}>
                    {rental.kmDiff > 0 && (
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Typography variant="body2" color="text.secondary">
                          KM Farkı
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(rental.kmDiff)}
                        </Typography>
                      </Grid>
                    )}
                    {rental.cleaning > 0 && (
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Typography variant="body2" color="text.secondary">
                          Temizlik
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(rental.cleaning)}
                        </Typography>
                      </Grid>
                    )}
                    {rental.hgs > 0 && (
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Typography variant="body2" color="text.secondary">
                          HGS
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(rental.hgs)}
                        </Typography>
                      </Grid>
                    )}
                    {rental.damage > 0 && (
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Typography variant="body2" color="text.secondary">
                          Hasar
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(rental.damage)}
                        </Typography>
                      </Grid>
                    )}
                    {rental.fuel > 0 && (
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Typography variant="body2" color="text.secondary">
                          Yakıt
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(rental.fuel)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Payment History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Ödeme Geçmişi
                </Typography>
                <Button
                  startIcon={<PaymentIcon />}
                  onClick={() => setPaymentDialogOpen(true)}
                  disabled={rental.status !== 'ACTIVE'}
                  variant="outlined"
                  size="small"
                >
                  Yeni Ödeme
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {rental.payments && rental.payments.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tarih</TableCell>
                        <TableCell>Tutar</TableCell>
                        <TableCell>Yöntem</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rental.payments.map((payment: any) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>
                            {dayjs(payment.paidAt).format('DD/MM/YYYY HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                              {formatCurrency(payment.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={payment.method === 'CASH' ? 'Nakit' : payment.method === 'CARD' ? 'Kart' : 'Transfer'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    Henüz ödeme kaydı bulunmuyor
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        {rental.status === 'ACTIVE' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleReturnRental}
                  disabled={returnRentalMutation.isPending}
                >
                  {returnRentalMutation.isPending ? 'Teslim Ediliyor...' : 'Teslim Et'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleCompleteRental}
                  disabled={completeRentalMutation.isPending}
                >
                  {completeRentalMutation.isPending ? 'Tamamlanıyor...' : 'Tamamla'}
                </Button>
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        rental={rental}
      />
    </Layout>
  );
}
