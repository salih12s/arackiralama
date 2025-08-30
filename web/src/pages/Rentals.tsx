import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
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
import { rentalsApi, formatCurrency, formatDate, Rental } from '../api/client';

export default function Rentals() {
  const navigate = useNavigate();
  const [newRentalOpen, setNewRentalOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
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
      // Tüm ilgili cache'leri agresif şekilde yenile
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      
      // Veriler güncellensin diye kısa bir gecikme ekle
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['rentals'] });
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
        queryClient.refetchQueries({ queryKey: ['vehicles'] });
      }, 100);
      
      setAnchorEl(null);
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, rental: Rental) => {
    setAnchorEl(event.currentTarget);
    setSelectedRental(rental);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRental(null);
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
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Araç</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Müşteri</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tarihler</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Süre</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Günlük Ücret</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Toplam Tutar</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Kalan Bakiye</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ödeme</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">İşlemler</TableCell>
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
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {rental.vehicle.plate}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rental.vehicle.name || 'Araç Adı Yok'}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {rental.customer.fullName}
                            </Typography>
                            {rental.customer.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {rental.customer.phone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatDate(rental.startDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(rental.endDate)}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {rental.days} gün
                          </Typography>
                          {statusInfo && rental.status === 'ACTIVE' && (
                            <Chip 
                              label={statusInfo} 
                              size="small" 
                              color={statusColor as any}
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20, mt: 0.5 }}
                            />
                          )}
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(rental.dailyPrice)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {formatCurrency(rental.totalDue)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: rental.balance > 0 ? 'error.main' : 'success.main'
                            }}
                          >
                            {formatCurrency(rental.balance)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {rental.payments?.length || 0} ödeme
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={getStatusText(rental.status)}
                            color={getStatusColor(rental.status) as any}
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        
                        <TableCell align="center">
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
                              >
                                <PaymentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Detayları Görüntüle">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/rentals/${rental.id}`)}
                                color="info"
                              >
                                <AssignmentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Daha Fazla">
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, rental)}
                              >
                                <MoreVertIcon fontSize="small" />
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
        <MenuItem onClick={() => console.log('Edit rental')}>
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
    </Layout>
  );
}
