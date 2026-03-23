import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Alert,
  Chip,
  DialogContentText,
  Button,
  Stack,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Visibility,
  Delete,
  DirectionsCar,
  Assignment as AssignmentIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Layout from '../components/Layout';
import { rentalsApi, vehiclesApi, Rental } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { formatDate, formatDateTime } from '../utils/format';
import { getStatusColor, getStatusText } from '../utils/status';
import AddPaymentDialog from '../components/AddPaymentDialog';
import EditRentalDialog from '../components/EditRentalDialog';
import NewRentalDialog from '../components/NewRentalDialog';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';

export const AllRentals: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Dialog states
  const [newRentalDialog, setNewRentalDialog] = useState(false);
  const [editRentalDialog, setEditRentalDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
  const [paymentDialog, setPaymentDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
  const [completeDialog, setCompleteDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });

  const queryClient = useQueryClient();

  // Fetch all rentals
  const { data: rentalsRes, isLoading, error } = useQuery({
    queryKey: ['all-rentals'],
    queryFn: async () => {
      console.log('🔄 Fetching all rentals...');
      const result = await rentalsApi.getAll({ limit: 1000 });
      console.log('📋 All rentals API response:', result);
      return result;
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Fetch vehicles for filter
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.getAll(undefined, 1000),
    staleTime: 60 * 1000,
  });

  // Mutations
  const completeRentalMutation = useMutation({
    mutationFn: async (rentalId: string) => {
      return rentalsApi.complete(rentalId);
    },
    onSuccess: () => {
      // Standart cache invalidation - tüm sayfalar senkronize çalışsın
      invalidateAllRentalCaches(queryClient);
      setCompleteDialog({ open: false, rental: null });
    },
    onError: (error) => {
      console.error('Complete rental error:', error);
    },
  });

  const deleteRentalMutation = useMutation({
    mutationFn: async (rentalId: string) => {
      return rentalsApi.delete(rentalId);
    },
    onSuccess: () => {
      // Standart cache invalidation - tüm sayfalar senkronize çalışsın
      invalidateAllRentalCaches(queryClient);
      setDeleteDialog({ open: false, rental: null });
    },
  });

  const rentals: Rental[] = rentalsRes?.data?.data || [];
  const vehicles = vehiclesRes?.data || [];

  // Filter and sort rentals
  const filteredRentals = rentals.filter(rental => {
    // Vehicle filter
    if (selectedVehicle && rental.vehicleId !== selectedVehicle) {
      return false;
    }

    // Status filter
    if (selectedStatus && rental.status !== selectedStatus) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        rental.customer?.fullName?.toLowerCase().includes(searchLower) ||
        rental.vehicle?.plate?.toLowerCase().includes(searchLower) ||
        rental.vehicle?.name?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  }).sort((a, b) => {
    // En son oluşturulan kiralar en üstte (chronological order - newest first)
    const dateA = dayjs(a.createdAt);
    const dateB = dayjs(b.createdAt);
    
    // En yeni tarih üstte (descending order)
    return dateB.diff(dateA);
  });



  const calculateBalance = (rental: Rental) => {
    // Note'dan orijinal toplam tutarı oku
    const noteMatch = rental.note?.match(/ORIGINAL_TOTAL:(\d+)/);
    const originalTotalTL = noteMatch ? parseInt(noteMatch[1]) / 100 : (rental.dailyPrice * rental.days);
    
    // Ek ücretler
    const kmPrice = rental.kmDiff || 0;
    const hgsFee = rental.hgs || 0;
    const cleaningFee = rental.cleaning || 0;
    const damageFee = rental.damage || 0;
    const fuelCost = rental.fuel || 0;
    
    // Toplam tutar - orijinal değeri kullan
    const totalAmount = originalTotalTL + kmPrice + hgsFee + cleaningFee + damageFee + fuelCost;
    
    // Ödemeler
    const installmentPayments = (rental.upfront || 0) + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0);
    const extraPayments = (rental.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalPaid = installmentPayments + extraPayments;
    
    return totalAmount - totalPaid;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // TODO: Export functionality
    console.log('Export functionality will be implemented');
  };

  if (isLoading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">Veriler yüklenirken hata oluştu</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth={false} sx={{ mt: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 }, px: { xs: 0.5, sm: 1 } }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }} 
          sx={{ mb: { xs: 2, sm: 3 } }}
          spacing={{ xs: 2, sm: 0 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h5" component="h1" sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}>
              📋 Tüm Kiralamalar
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant={selectedStatus === '' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedStatus('')}
                sx={{ 
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5
                }}
              >
                Tümü
              </Button>
              <Button
                variant={selectedStatus === 'ACTIVE' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedStatus('ACTIVE')}
                color={selectedStatus === 'ACTIVE' ? 'primary' : 'success'}
                sx={{ 
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5
                }}
              >
                Kirada
              </Button>
              <Button
                variant={selectedStatus === 'RETURNED' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedStatus('RETURNED')}
                color={selectedStatus === 'RETURNED' ? 'primary' : 'info'}
                sx={{ 
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5
                }}
              >
                Teslim Edildi
              </Button>
              <Button
                variant={selectedStatus === 'CANCELLED' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedStatus('CANCELLED')}
                color={selectedStatus === 'CANCELLED' ? 'primary' : 'error'}
                sx={{ 
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5
                }}
              >
                İptal
              </Button>
              <Button
                variant={selectedStatus === 'RESERVED' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedStatus('RESERVED')}
                color={selectedStatus === 'RESERVED' ? 'primary' : 'warning'}
                sx={{ 
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5
                }}
              >
                Rezerve
              </Button>
            </Stack>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewRentalDialog(true)}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 }
              }}
            >
              Yeni Kiralama
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              variant="outlined"
              size="small"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 }
              }}
            >
              Excel'e Aktar
            </Button>
            <Button
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              variant="outlined"
              size="small"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 }
              }}
            >
              Yazdır
            </Button>
          </Stack>
        </Stack>

        {/* Filters */}
        <Paper sx={{ mb: 2, p: { xs: 1, sm: 1.5 } }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1.5} 
            alignItems={{ xs: 'stretch', sm: 'center' }} 
            flexWrap="wrap"
          >
            <TextField
              placeholder="Müşteri adı, araç adı/modeli veya plaka ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 250 }, flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: 'auto', sm: 160 }, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>Araç Seçiniz</InputLabel>
              <Select
                value={selectedVehicle}
                label="Araç Seçiniz"
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                <MenuItem value="">Tüm Araçlar</MenuItem>
                {vehicles.map((vehicle: any) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedVehicle && (
              <Button
                size="small"
                onClick={() => {
                  setSelectedVehicle('');
                }}
                color="secondary"
              >
                Araç Filtresini Temizle
              </Button>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Toplam {filteredRentals.length} kiralama
            </Typography>
          </Stack>
        </Paper>

        {/* Summary Statistics */}
        <Paper sx={{ mb: 2, p: 1.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Toplam Gelir</Typography>
                <Typography variant="h6" color="success.dark" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {formatCurrency(filteredRentals.reduce((sum, r) => {
                    // Note'dan orijinal toplam tutarı oku
                    const noteMatch = r.note?.match(/ORIGINAL_TOTAL:(\d+)/);
                    const originalTotalTL = noteMatch ? parseInt(noteMatch[1]) / 100 : (r.dailyPrice * r.days);
                    const kmPrice = r.kmDiff || 0;
                    const hgsFee = r.hgs || 0;
                    const cleaningFee = r.cleaning || 0;
                    const damageFee = r.damage || 0;
                    const fuelCost = r.fuel || 0;
                    const totalAmount = originalTotalTL + kmPrice + hgsFee + cleaningFee + damageFee + fuelCost;
                    return sum + totalAmount;
                  }, 0))}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Toplam Ödenen</Typography>
                <Typography variant="h6" color="info.dark" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {formatCurrency(filteredRentals.reduce((sum, r) => {
                    const installmentPayments = (r.upfront || 0) + (r.pay1 || 0) + (r.pay2 || 0) + (r.pay3 || 0) + (r.pay4 || 0);
                    const extraPayments = (r.payments || []).reduce((pSum, p) => pSum + (p.amount || 0), 0);
                    const totalPaid = installmentPayments + extraPayments;
                    return sum + totalPaid;
                  }, 0))}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Kalan Borç</Typography>
                <Typography variant="h6" color="warning.dark" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {formatCurrency((() => {
                    const totalRevenue = filteredRentals.reduce((sum, r) => {
                      // Note'dan orijinal toplam tutarı oku
                      const noteMatch = r.note?.match(/ORIGINAL_TOTAL:(\d+)/);
                      const originalTotalTL = noteMatch ? parseInt(noteMatch[1]) / 100 : (r.dailyPrice * r.days);
                      const kmPrice = r.kmDiff || 0;
                      const hgsFee = r.hgs || 0;
                      const cleaningFee = r.cleaning || 0;
                      const damageFee = r.damage || 0;
                      const fuelCost = r.fuel || 0;
                      const totalAmount = originalTotalTL + kmPrice + hgsFee + cleaningFee + damageFee + fuelCost;
                      return sum + totalAmount;
                    }, 0);
                    const totalPaid = filteredRentals.reduce((sum, r) => {
                      const installmentPayments = (r.upfront || 0) + (r.pay1 || 0) + (r.pay2 || 0) + (r.pay3 || 0) + (r.pay4 || 0);
                      const extraPayments = (r.payments || []).reduce((pSum, p) => pSum + (p.amount || 0), 0);
                      const totalPaid = installmentPayments + extraPayments;
                      return sum + totalPaid;
                    }, 0);
                    return totalRevenue - totalPaid;
                  })())}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Aktif Kiralama</Typography>
                <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {filteredRentals.filter(r => r.status === 'ACTIVE').length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ 
            '& .MuiTableCell-root': { 
              padding: '2px 4px', 
              fontSize: '0.7rem',
              lineHeight: 1.2,
              border: '1px solid #e0e0e0'
            },
            '& .MuiTableCell-head': {
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '4px 6px'
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 70 }}>Plaka</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 120 }}>Müşteri</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 85 }}>Araç</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 95 }}>Tarih</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'center', minWidth: 35 }}>Gün</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 60 }}>Günlük</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 50 }}>KM</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 70 }}>Kira+KM</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 45 }}>HGS</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 60 }}>Temizlik</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 50 }}>Hasar</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 50 }}>Yakıt</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 70 }}>Toplam</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 55 }}>Peşin</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 55 }}>1.Tak</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 55 }}>2.Tak</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 55 }}>3.Tak</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 55 }}>4.Tak</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 60 }}>Ek Ödem</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 70 }}>T.Ödenen</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 65 }}>Kalan</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 65 }}>Durum</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 100 }}>Not</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 140 }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRentals.map((rental) => {
                // Note'dan orijinal toplam tutarı oku
                const noteMatch = rental.note?.match(/ORIGINAL_TOTAL:(\d+)/);
                const originalTotalTL = noteMatch ? parseInt(noteMatch[1]) / 100 : (rental.dailyPrice * rental.days);
                
                // Ek ücretler - API'dan TL cinsinde geliyor
                const kmPrice = rental.kmDiff || 0;
                const hgsFee = rental.hgs || 0;
                const cleaningFee = rental.cleaning || 0;
                const damageFee = rental.damage || 0;
                const fuelCost = rental.fuel || 0;
                
                // Toplam tutar hesaplama - orijinal değeri kullan
                const totalAmount = originalTotalTL + kmPrice + hgsFee + cleaningFee + damageFee + fuelCost;
                
                // Ödemeler - TL cinsinden
                const advancePayment = rental.upfront || 0;
                const pay1 = rental.pay1 || 0;
                const pay2 = rental.pay2 || 0;
                const pay3 = rental.pay3 || 0;
                const pay4 = rental.pay4 || 0;
                
                // Ek ödemeler (payments array'inden)
                const totalPaidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                
                // Taksit ödemeleri
                const installmentPayments = advancePayment + pay1 + pay2 + pay3 + pay4;
                
                // Toplam ödenen
                const totalPaid = installmentPayments + totalPaidFromPayments;
                
                // Bakiye hesaplama
                const balance = totalAmount - totalPaid;

                return (
                  <TableRow key={rental.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                      {rental.vehicle?.plate}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rental.customer?.fullName || 'İsimsiz'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rental.vehicle?.name || 'Bilinmiyor'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
                          {formatDate(rental.startDate)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
                          {formatDate(rental.endDate)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {rental.days}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(Math.round(rental.dailyPrice / 10) * 10)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.kmDiff || 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#f5f5f5' }}>
                      {formatCurrency((() => {
                        // Note'dan orijinal toplam tutarı oku
                        const noteMatch = rental.note?.match(/ORIGINAL_TOTAL:(\d+)/);
                        if (noteMatch) {
                          const originalTotal = parseInt(noteMatch[1]) / 100; // Kuruştan TL'ye
                          return originalTotal + ((rental.kmDiff || 0) / 100);
                        }
                        // Eski kayıtlar için standart hesaplama
                        return (rental.dailyPrice * (rental.days || 0)) + (rental.kmDiff || 0);
                      })())}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.hgs || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.cleaning || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.damage || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.fuel || 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(totalAmount)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.upfront)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.pay1)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.pay2)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.pay3)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.pay4)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(totalPaidFromPayments)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(totalPaid)}
                    </TableCell>
                    <TableCell align="right" sx={{ 
                        fontWeight: 600,
                        color: balance > 0 ? 'error.main' : balance < 0 ? 'warning.main' : 'success.main'
                      }}>
                      {formatCurrency(balance)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(rental.status)}
                        color={getStatusColor(rental.status)}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(() => {
                        // ORIGINAL_TOTAL kısmını gizle, sadece kullanıcı notunu göster
                        const displayNote = rental.note?.replace(/ORIGINAL_TOTAL:\d+\|?/, '') || '';
                        return (
                          <Tooltip title={displayNote || 'Not bulunmuyor'} arrow>
                            <span style={{ cursor: displayNote ? 'help' : 'default' }}>
                              {displayNote || '-'}
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Detay">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/rentals/${rental.id}`)}
                            sx={{ padding: '2px', color: 'primary.main' }}
                          >
                            <AssignmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Düzenle">
                          <IconButton
                            size="small"
                            onClick={() => {
                              console.log('🔧 Edit Click - rental:', rental.id);
                              setEditRentalDialog({ open: true, rental: rental });
                            }}
                            sx={{ padding: '2px', color: 'warning.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {rental.status === 'ACTIVE' && (
                          <Tooltip title="Teslim Al">
                            <IconButton
                              size="small"
                              onClick={() => setCompleteDialog({ open: true, rental: rental })}
                              sx={{ padding: '2px', color: 'success.main' }}
                            >
                              <DirectionsCar fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Sil">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, rental: rental })}
                            sx={{ padding: '2px', color: 'error.main' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredRentals.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm || selectedVehicle || selectedStatus 
                ? 'Filtrelere uygun kiralama bulunamadı' 
                : 'Herhangi bir kiralama bulunamadı'
              }
            </Typography>
          </Box>
        )}

        {/* Complete Dialog */}
        <Dialog open={completeDialog.open} onClose={() => setCompleteDialog({ open: false, rental: null })}>
          <DialogTitle>Kiralama Teslim Al</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {completeDialog.rental?.vehicle?.plate} plakali aracın kiralamasını teslim almak istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompleteDialog({ open: false, rental: null })}>
              İptal
            </Button>
            <Button 
              onClick={() => {
                if (completeDialog.rental) {
                  completeRentalMutation.mutate(completeDialog.rental.id);
                }
              }}
              autoFocus
              variant="contained"
            >
              Teslim Al
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, rental: null })}>
          <DialogTitle>Kiralama Sil</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteDialog.rental?.vehicle?.plate} plakali aracın kiralamasını silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, rental: null })}>
              İptal
            </Button>
            <Button 
              onClick={() => {
                if (deleteDialog.rental) {
                  deleteRentalMutation.mutate(deleteDialog.rental.id);
                }
              }}
              autoFocus
              variant="contained"
              color="error"
            >
              Sil
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Rental Dialog */}
        <NewRentalDialog
          open={newRentalDialog}
          onClose={() => setNewRentalDialog(false)}
        />

        {/* Payment Dialog */}
        <AddPaymentDialog
          open={paymentDialog.open}
          onClose={() => setPaymentDialog({ open: false, rental: null })}
          rental={paymentDialog.rental}
        />

        {/* Edit Rental Dialog */}
        <EditRentalDialog
          open={editRentalDialog.open}
          onClose={() => setEditRentalDialog({ open: false, rental: null })}
          rental={editRentalDialog.rental}
        />
      </Container>
    </Layout>
  );
};

export default AllRentals;
