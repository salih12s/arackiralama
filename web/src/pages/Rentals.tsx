import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import NewRentalDialog from '../components/NewRentalDialog';
import AddPaymentDialog from '../components/AddPaymentDialog';
import EditRentalDialog from '../components/EditRentalDialog';
import { rentalsApi, formatDate } from '../api/client';
import { Rental } from '../api/rentals';
import { formatCurrency } from '../utils/currency';
import { invalidateAllRentalCaches } from '../utils/cacheInvalidation';

export default function Rentals() {
  const navigate = useNavigate();
  const [newRentalOpen, setNewRentalOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editRentalOpen, setEditRentalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);

  const queryClient = useQueryClient();

  // Fetch rentals
  const { data: rentalsData, isLoading, error } = useQuery({
    queryKey: ['rentals', search],
    queryFn: () => rentalsApi.getAll({ 
      search: search || undefined,
      limit: 200 
    }),
    staleTime: 30 * 1000, // 30 saniye fresh
    gcTime: 2 * 60 * 1000, // 2 dakika cache
  });

  // Return rental mutation
  const returnRentalMutation = useMutation({
    mutationFn: (id: string) => rentalsApi.returnRental(id),
    onSuccess: () => {
      // Standart cache invalidation - tüm sayfalar senkronize çalışsın
      invalidateAllRentalCaches(queryClient);
      
      setAnchorEl(null);
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, rental: Rental) => {
    setAnchorEl(event.currentTarget);
    setSelectedRental(rental);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // selectedRental'ı null yapma, dialog'da kullanılacak
  };

  const handleReturnRental = () => {
    if (selectedRental) {
      returnRentalMutation.mutate(selectedRental.id);
    }
  };

  const handleAddPayment = () => {
    setPaymentDialogOpen(true);
    setAnchorEl(null);
  };

  // Filter rentals based on status filter
  const allRentals = rentalsData?.data.data || [];
  
  const filteredRentals = allRentals.filter((rental: Rental) => {
    // Status filter
    if (statusFilter !== 'ALL' && rental.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesPlate = rental.vehicle?.plate?.toLowerCase().includes(searchLower);
      const matchesCustomer = rental.customer?.fullName?.toLowerCase().includes(searchLower);
      const matchesPhone = rental.customer?.phone?.toLowerCase().includes(searchLower);
      
      return matchesPlate || matchesCustomer || matchesPhone;
    }
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'RETURNED': return 'info';
      case 'COMPLETED': return 'primary';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'RETURNED': return 'Teslim Edildi';
      case 'COMPLETED': return 'Tamamlandı';
      case 'CANCELLED': return 'İptal Edildi';
      default: return status;
    }
  };

  // Manuel refresh fonksiyonu
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rentals'] });
  };

  return (
    <Layout title="Kiralama İşlemleri">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Kiralama İşlemleri
            {isLoading && (
              <Chip 
                label="Yükleniyor..." 
                size="small" 
                color="info" 
                sx={{ ml: 2, fontSize: '0.7rem' }}
              />
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tüm kiralama işlemlerini görüntüleyin ve yönetin
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1.5}>
          <IconButton
            onClick={handleRefresh}
            disabled={isLoading}
            sx={{ 
              bgcolor: 'grey.100', 
              '&:hover': { bgcolor: 'grey.200' },
              borderRadius: 2 
            }}
            title="Verileri Yenile"
          >
            <RefreshIcon />
          </IconButton>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewRentalOpen(true)}
            size="large"
            sx={{ borderRadius: 2 }}
          >
            Yeni Kiralama
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Araç plakası, müşteri adı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
          />
          
          <Stack direction="row" spacing={1}>
            {[
              { key: 'ALL', label: 'Tümü' },
              { key: 'ACTIVE', label: 'Aktif' },
              { key: 'RETURNED', label: 'Teslim Edildi' },
              { key: 'COMPLETED', label: 'Tamamlandı' },
              { key: 'CANCELLED', label: 'İptal Edildi' }
            ].map((status) => (
              <Chip
                key={status.key}
                label={status.label}
                onClick={() => setStatusFilter(status.key)}
                color={statusFilter === status.key ? 'primary' : 'default'}
                variant={statusFilter === status.key ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Veriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Kiralama verileri yükleniyor...</Typography>
        </Paper>
      )}

      {/* Rentals Table */}
      {!isLoading && (
        <Paper sx={{ mt: 3 }}>
          {filteredRentals.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {search ? 'Arama kriterlerinize uygun kiralama bulunamadı' : 'Henüz kiralama kaydı bulunmuyor'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {search ? 'Farklı anahtar kelimeler deneyebilirsiniz' : 'İlk kiralama işleminizi oluşturun'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewRentalOpen(true)}
              >
                Yeni Kiralama
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, minWidth: 80, fontSize: '0.75rem', padding: '4px 8px' }}>Araç</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 100, fontSize: '0.75rem', padding: '4px 8px' }}>Müşteri</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 80, fontSize: '0.75rem', padding: '4px 8px' }}>Tarihler</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 40, fontSize: '0.75rem', padding: '4px 8px' }}>Süre</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 60, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Günlük</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 60, fontSize: '0.75rem', padding: '4px 8px' }} align="right">KM</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">HGS</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 60, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Temizlik</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Hasar</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Yakıt</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Peşin</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">1.Taksit</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">2.Taksit</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">3.Taksit</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 50, fontSize: '0.75rem', padding: '4px 8px' }} align="right">4.Taksit</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 70, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Toplam</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 60, fontSize: '0.75rem', padding: '4px 8px' }} align="right">Bakiye</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 70, fontSize: '0.75rem', padding: '4px 8px' }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 80, fontSize: '0.75rem', padding: '4px 8px' }}>Not</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 60, fontSize: '0.75rem', padding: '4px 8px' }} align="center">İşlem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRentals.map((rental: Rental) => {
                    const today = dayjs();
                    const endDate = dayjs(rental.endDate);
                    const daysLeft = endDate.diff(today, 'day');
                    let statusInfo = '';
                    let statusColor = 'default';
                    
                    if (rental.status === 'ACTIVE') {
                      if (daysLeft < 0) {
                        statusInfo = `${Math.abs(daysLeft)} gün gecikmiş`;
                        statusColor = 'error';
                      } else if (daysLeft === 0) {
                        statusInfo = 'Bugün bitiyor';
                        statusColor = 'warning';
                      } else if (daysLeft <= 3) {
                        statusInfo = `${daysLeft} gün kaldı`;
                        statusColor = 'warning';
                      }
                    }

                    return (
                      <TableRow 
                        key={rental.id}
                        sx={{ 
                          '&:hover': { backgroundColor: 'grey.50' },
                          '& .MuiTableCell-root': { 
                            borderBottom: '1px solid',
                            borderColor: 'grey.200'
                          }
                        }}
                      >
                        <TableCell sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.75rem' }}>
                            {rental.vehicle.plate}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {rental.vehicle.name || '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {rental.customer.fullName}
                          </Typography>
                          {rental.customer.phone && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {rental.customer.phone}
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {formatDate(rental.startDate)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {formatDate(rental.endDate)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {rental.days}g
                          </Typography>
                          {statusInfo && rental.status === 'ACTIVE' && (
                            <Chip 
                              label={statusInfo} 
                              size="small" 
                              color={statusColor as any}
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: 18, mt: 0.5 }}
                            />
                          )}
                        </TableCell>
                        
                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency(rental.dailyPrice)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.kmDiff || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.hgs || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.cleaning || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.damage || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.fuel || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.upfront || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.pay1 || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.pay2 || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.pay3 || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatCurrency((rental.pay4 || 0))}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          {(() => {
                            // Toplam Ödenecek = (günlük kira × gün) + km farkı + hgs + temizlik + hasar + yakıt
                            const totalDue = (rental.dailyPrice * rental.days) + 
                                           (rental.kmDiff || 0) + 
                                           (rental.hgs || 0) + 
                                           (rental.cleaning || 0) + 
                                           (rental.damage || 0) + 
                                           (rental.fuel || 0);
                            
                            return (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.75rem' }}>
                                {formatCurrency(totalDue)}
                              </Typography>
                            );
                          })()}
                        </TableCell>
                        
                        <TableCell align="right" sx={{ padding: '4px 8px' }}>
                          {(() => {
                            // Toplam Ödenecek hesapla (günlük kira × gün + ek maliyetler)
                            const totalDue = (rental.dailyPrice * rental.days) + 
                                           (rental.kmDiff || 0) + 
                                           (rental.hgs || 0) + 
                                           (rental.cleaning || 0) + 
                                           (rental.damage || 0) + 
                                           (rental.fuel || 0);
                            
                            // Taksit ödemelerini hesapla
                            const installmentPayments = (rental.upfront || 0) + 
                                                       (rental.pay1 || 0) + 
                                                       (rental.pay2 || 0) + 
                                                       (rental.pay3 || 0) + 
                                                       (rental.pay4 || 0);
                            
                            // Ek ödemeleri hesapla (payments array'inden)
                            const extraPayments = rental.payments ? 
                              rental.payments.reduce((total, payment) => total + payment.amount, 0) : 0;
                            
                            // Toplam ödenen = taksitler + ek ödemeler
                            const totalPaid = installmentPayments + extraPayments;
                            
                            // Kalan Bakiye = Toplam Ödenecek - Toplam Ödenen
                            const remainingBalance = totalDue - totalPaid;
                            
                            return (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: remainingBalance > 0 ? 'error.main' : 'success.main'
                                }}
                              >
                                {formatCurrency(remainingBalance)}
                              </Typography>
                            );
                          })()}
                        </TableCell>
                        
                        <TableCell sx={{ padding: '4px 8px' }}>
                          <Chip
                            label={getStatusText(rental.status)}
                            color={getStatusColor(rental.status) as any}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        </TableCell>

                        <TableCell sx={{ padding: '4px 8px' }}>
                          <Typography variant="body2" sx={{ maxWidth: 80, wordWrap: 'break-word', fontSize: '0.75rem' }}>
                            {rental.note || '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center" sx={{ padding: '4px 8px' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Ödeme Ekle">
                              <IconButton
                                size="small"
                                disabled={rental.status !== 'ACTIVE'}
                                onClick={() => {
                                  setSelectedRental(rental);
                                  setPaymentDialogOpen(true);
                                }}
                                color="primary"
                                sx={{ padding: '2px' }}
                              >
                                <PaymentIcon sx={{ fontSize: '16px' }} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Detay">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/rentals/${rental.id}`)}
                                color="info"
                                sx={{ padding: '2px' }}
                              >
                                <AssignmentIcon sx={{ fontSize: '16px' }} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Menu">
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, rental)}
                                sx={{ padding: '2px' }}
                              >
                                <MoreVertIcon sx={{ fontSize: '16px' }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setEditRentalOpen(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Düzenle</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleReturnRental}
          disabled={selectedRental?.status !== 'ACTIVE' || returnRentalMutation.isPending}
        >
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {returnRentalMutation.isPending ? 'Teslim Ediliyor...' : 'Teslim Et'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAddPayment}>
          <ListItemIcon>
            <PaymentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ödeme Ekle</ListItemText>
        </MenuItem>
      </Menu>

      {/* New Rental Dialog */}
      <NewRentalDialog 
        open={newRentalOpen} 
        onClose={() => setNewRentalOpen(false)} 
      />

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        rental={selectedRental}
      />

      {/* Edit Rental Dialog */}
      <EditRentalDialog
        open={editRentalOpen}
        onClose={() => {
          setEditRentalOpen(false);
          setSelectedRental(null);
        }}
        rental={selectedRental}
      />
    </Layout>
  );
}
