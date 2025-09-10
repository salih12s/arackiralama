import React, { useState } from 'react';
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
  Menu,
  ListItemIcon,
  ListItemText,
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
  MoreVert,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Layout from '../components/Layout';
import { rentalsApi, vehiclesApi, Rental } from '../api/client';
import { formatCurrency } from '../utils/currency';
import AddPaymentDialog from '../components/AddPaymentDialog';
import EditRentalDialog from '../components/EditRentalDialog';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';

export const AllRentals: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  
  // Dialog states
  const [detailDialog, setDetailDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
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
    queryFn: () => vehiclesApi.getAll(),
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

  // Filter rentals
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
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'COMPLETED': return 'success';
      case 'RETURNED': return 'success';
      case 'CANCELLED': return 'error';
      case 'RESERVED': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'KIRADA';
      case 'COMPLETED': return 'TESLİM EDİLDİ';
      case 'RETURNED': return 'TESLİM EDİLDİ';
      case 'CANCELLED': return 'İPTAL';
      case 'RESERVED': return 'REZERVE';
      default: return status;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, rental: Rental) => {
    setAnchorEl(event.currentTarget);
    setSelectedRental(rental);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRental(null);
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD.MM.YYYY');
  };

  const calculateBalance = (rental: Rental) => {
    const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
    const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
    return rental.totalDue - (paidFromRental + paidFromPayments);
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
          <Typography variant="h5" component="h1" sx={{ 
            fontWeight: 700,
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}>
            📋 Tüm Kiralamalar
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
              placeholder="Müşteri adı, araç markası/modeli veya plaka ile ara..."
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
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Durum</InputLabel>
              <Select
                value={selectedStatus}
                label="Durum"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="ACTIVE">Kirada</MenuItem>
                <MenuItem value="COMPLETED">Tamamlandı</MenuItem>
                <MenuItem value="RETURNED">Teslim Edildi</MenuItem>
                <MenuItem value="CANCELLED">İptal</MenuItem>
                <MenuItem value="RESERVED">Rezerve</MenuItem>
              </Select>
            </FormControl>
            {(selectedVehicle || selectedStatus) && (
              <Button
                size="small"
                onClick={() => {
                  setSelectedVehicle('');
                  setSelectedStatus('');
                }}
                color="secondary"
              >
                Filtreleri Temizle
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
                  {formatCurrency(filteredRentals.reduce((sum, r) => sum + r.totalDue, 0) / 100)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Toplam Ödenen</Typography>
                <Typography variant="h6" color="info.dark" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {formatCurrency(filteredRentals.reduce((sum, r) => {
                    const totalPaid = (r.upfront + r.pay1 + r.pay2 + r.pay3 + r.pay4) + 
                                    (r.payments || []).reduce((pSum, p) => pSum + p.amount, 0);
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
                    const totalRevenue = filteredRentals.reduce((sum, r) => sum + r.totalDue, 0);
                    const totalPaid = filteredRentals.reduce((sum, r) => {
                      const paidAmount = (r.upfront + r.pay1 + r.pay2 + r.pay3 + r.pay4) + 
                                        (r.payments || []).reduce((pSum, p) => pSum + p.amount, 0);
                      return sum + paidAmount;
                    }, 0);
                    return (totalRevenue - totalPaid) / 100;
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
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 85 }}>Telefon</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 75 }}>Başlangıç</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 75 }}>Bitiş</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'center', minWidth: 35 }}>Gün</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 60 }}>Günlük</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 50 }}>KM</TableCell>
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
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 100 }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRentals.map((rental) => {
                const totalPaidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
                const totalPaidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
                const totalPaid = totalPaidFromRental + totalPaidFromPayments;
                const balance = rental.totalDue - totalPaid;

                return (
                  <TableRow key={rental.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                      {rental.vehicle?.plate}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rental.customer?.fullName || 'İsimsiz'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rental.customer?.phone}
                    </TableCell>
                    <TableCell>
                      {formatDate(rental.startDate)}
                    </TableCell>
                    <TableCell>
                      {formatDate(rental.endDate)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {rental.days}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.dailyPrice)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(rental.kmDiff || 0)}
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
                      {formatCurrency(rental.totalDue / 100)}
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
                      {formatCurrency(balance / 100)}
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
                      <Tooltip title={rental.note || 'Not bulunmuyor'} arrow>
                        <span style={{ cursor: rental.note ? 'help' : 'default' }}>
                          {rental.note || '-'}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, rental)}
                        sx={{ padding: '2px' }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
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

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem 
            onClick={() => {
              if (selectedRental) {
                setDetailDialog({ open: true, rental: selectedRental });
              }
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>Detay Görüntüle</ListItemText>
          </MenuItem>
          
          <MenuItem 
            onClick={() => {
              console.log('🔧 Edit Click - selectedRental:', selectedRental?.id);
              console.log('🔧 Edit Click - Before state change');
              if (selectedRental) {
                setEditRentalDialog({ open: true, rental: selectedRental });
                console.log('🔧 Edit Click - After state change, setting open=true');
              }
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Düzenle</ListItemText>
          </MenuItem>

          {selectedRental && selectedRental.status === 'ACTIVE' && (
            <MenuItem 
              onClick={() => {
                if (selectedRental) {
                  setCompleteDialog({ open: true, rental: selectedRental });
                }
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <DirectionsCar fontSize="small" />
              </ListItemIcon>
              <ListItemText>Teslim Al</ListItemText>
            </MenuItem>
          )}

          {/* 
          <MenuItem 
            onClick={() => {
              console.log('💰 Payment Click - selectedRental:', selectedRental?.id);
              if (selectedRental) {
                setPaymentDialog({ open: true, rental: selectedRental });
              }
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ödeme Ekle</ListItemText>
          </MenuItem>
          */}

          <MenuItem 
            onClick={() => {
              if (selectedRental) {
                setDeleteDialog({ open: true, rental: selectedRental });
              }
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Sil</ListItemText>
          </MenuItem>
        </Menu>

        {/* Detail Dialog */}
        <Dialog 
          open={detailDialog.open} 
          onClose={() => setDetailDialog({ open: false, rental: null })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Kiralama Detayları - {detailDialog.rental?.vehicle?.plate}
          </DialogTitle>
          <DialogContent>
            {detailDialog.rental && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Müşteri:</strong> {detailDialog.rental.customer?.fullName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Telefon:</strong> {detailDialog.rental.customer?.phone}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Araç:</strong> {detailDialog.rental.vehicle?.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Plaka:</strong> {detailDialog.rental.vehicle?.plate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Başlangıç:</strong> {formatDate(detailDialog.rental.startDate)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Bitiş:</strong> {formatDate(detailDialog.rental.endDate)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Gün Sayısı:</strong> {detailDialog.rental.days}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Günlük Fiyat:</strong> {formatCurrency(detailDialog.rental.dailyPrice)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Toplam Tutar:</strong> {formatCurrency(detailDialog.rental.totalDue)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Kalan Bakiye:</strong> 
                    <span style={{ color: calculateBalance(detailDialog.rental) > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
                      {formatCurrency(calculateBalance(detailDialog.rental) / 100)}
                    </span>
                  </Typography>
                </Grid>
                {detailDialog.rental.note && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Not:</strong> {detailDialog.rental.note}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog({ open: false, rental: null })}>
              Kapat
            </Button>
          </DialogActions>
        </Dialog>

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
