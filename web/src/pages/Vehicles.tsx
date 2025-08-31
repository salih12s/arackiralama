import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  Search as SearchIcon,
  Add as AddIcon,
  DirectionsCar as CarIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { vehiclesApi, reportsApi, formatCurrency, Vehicle } from '../api/client';

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', name: '' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; vehicle: Vehicle | null}>({
    open: false,
    vehicle: null
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all vehicles
  const { data: vehiclesData, isLoading, error } = useQuery({
    queryKey: ['vehicles', statusFilter],
    queryFn: () => vehiclesApi.getAll(statusFilter === 'ALL' ? undefined : statusFilter),
    staleTime: 45 * 1000, // 45 saniye fresh
    gcTime: 3 * 60 * 1000, // 3 dakika cache
  });

  // Fetch vehicle income report for revenue data
  const { data: incomeResponse } = useQuery({
    queryKey: ['vehicle-income'],
    queryFn: () => reportsApi.getVehicleIncomeReport(),
    staleTime: 2 * 60 * 1000, // 2 dakika fresh
    gcTime: 5 * 60 * 1000, // 5 dakika cache
  });

  const incomeData = incomeResponse?.data;

  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: (data: { plate: string; name?: string }) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setNewVehicleOpen(false);
      setNewVehicle({ plate: '', name: '' });
    },
  });

  // Update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => 
      vehiclesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setAnchorEl(null);
    },
  });

  // Delete vehicle mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-income'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteDialog({ open: false, vehicle: null });
    },
    onError: (error: any) => {
      console.error('Vehicle delete error:', error);
      alert(error.response?.data?.message || 'Araç silme hatası');
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, vehicle: Vehicle) => {
    setAnchorEl(event.currentTarget);
    setSelectedVehicle(vehicle);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVehicle(null);
  };

  const handleAddVehicle = () => {
    if (newVehicle.plate.trim()) {
      createVehicleMutation.mutate({
        plate: newVehicle.plate.trim().toUpperCase(),
        name: newVehicle.name.trim() || undefined,
      });
    }
  };

  const handleStatusChange = (status: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE') => {
    if (selectedVehicle) {
      updateVehicleMutation.mutate({
        id: selectedVehicle.id,
        data: { status }
      });
    }
  };

  const filteredVehicles = vehiclesData?.data?.filter((vehicle: Vehicle) => {
    const matchesSearch = search === '' || 
      vehicle.plate.toLowerCase().includes(search.toLowerCase()) ||
      vehicle.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE': return 'success';
      case 'RENTED': return 'primary';
      case 'RESERVED': return 'warning';
      case 'SERVICE': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IDLE': return 'Uygun';
      case 'RENTED': return 'Kirada';
      case 'RESERVED': return 'Rezerve';
      case 'SERVICE': return 'Serviste';
      default: return status;
    }
  };

  const getVehicleIncome = (vehicleId: string) => {
    // Debug: Check the structure of incomeData
    console.log('🔍 incomeData:', incomeData);
    console.log('🔍 incomeData type:', typeof incomeData);
    console.log('🔍 incomeData is array:', Array.isArray(incomeData));
    
    if (!incomeData || !Array.isArray(incomeData)) {
      return { billed: 0, collected: 0, outstanding: 0 };
    }
    
    const income = incomeData.find((item: any) => item.vehicleId === vehicleId);
    return income || { billed: 0, collected: 0, outstanding: 0 };
  };

  // Manuel refresh fonksiyonu
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle-income'] });
  };

  return (
    <Layout title="Araç Yönetimi">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Araç Yönetimi
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
            Araç filonuzu yönetin ve performanslarını takip edin
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
            onClick={() => setNewVehicleOpen(true)}
            size="large"
            sx={{ borderRadius: 2 }}
          >
            Yeni Araç
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                    {vehiclesData?.data?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Araç
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <CarIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                    {vehiclesData?.data?.filter((v: Vehicle) => v.status === 'RENTED').length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kiradaki Araçlar
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <TrendingUpIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                    {vehiclesData?.data?.filter((v: Vehicle) => v.status === 'IDLE').length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uygun Araçlar
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <StarIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>
                    {incomeData?.reduce((total: number, item: any) => total + (item.collected || 0), 0) 
                      ? formatCurrency(incomeData.reduce((total: number, item: any) => total + (item.collected || 0), 0))
                      : '₺0'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Gelir
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <AssessmentIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Plaka veya araç adı ile ara..."
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
            {['ALL', 'IDLE', 'RENTED', 'RESERVED', 'SERVICE'].map((status) => (
              <Chip
                key={status}
                label={status === 'ALL' ? 'Tümü' : getStatusText(status)}
                onClick={() => setStatusFilter(status)}
                color={statusFilter === status ? 'primary' : 'default'}
                variant={statusFilter === status ? 'filled' : 'outlined'}
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
          <Typography>Araç verileri yükleniyor...</Typography>
        </Paper>
      )}

      {/* Vehicles Table */}
      {!isLoading && (
        <Paper sx={{ mt: 3 }}>
          {filteredVehicles.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
                <CarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {search ? 'Arama kriterlerinize uygun araç bulunamadı' : 'Henüz araç kaydı bulunmuyor'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {search ? 'Farklı anahtar kelimeler deneyebilirsiniz' : 'İlk aracınızı sisteme ekleyin'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setNewVehicleOpen(true)}
                >
                  Yeni Araç Ekle
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Araç Bilgileri</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Toplam Fatura</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Tahsil Edilen</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Kalan Bakiye</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Kiralama Sayısı</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVehicles.map((vehicle: Vehicle) => {
                    const income = getVehicleIncome(vehicle.id);
                    const rentalCount = vehicle._count?.rentals || 0;
                    
                    return (
                      <TableRow 
                        key={vehicle.id}
                        sx={{ 
                          '&:hover': { backgroundColor: 'grey.50' },
                          '& .MuiTableCell-root': { 
                            borderBottom: '1px solid',
                            borderColor: 'grey.200'
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                              <CarIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                {vehicle.plate}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {vehicle.name || 'Araç Adı Yok'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={getStatusText(vehicle.status)}
                            color={getStatusColor(vehicle.status) as any}
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {formatCurrency(income.billed)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {formatCurrency(income.collected)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: income.outstanding > 0 ? 'error.main' : 'success.main'
                            }}
                          >
                            {formatCurrency(income.outstanding)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {rentalCount} kiralama
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Detayları Görüntüle">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                                color="info"
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Performans Raporu">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                                color="success"
                              >
                                <AssessmentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            {vehicle.status === 'IDLE' && (
                              <Tooltip title="Sil">
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteDialog({ open: true, vehicle })}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            <Tooltip title="Daha Fazla">
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, vehicle)}
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
        <MenuItem onClick={() => navigate(`/vehicles/${selectedVehicle?.id}`)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Detayları Gör</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('IDLE')} disabled={selectedVehicle?.status === 'IDLE'}>
          <ListItemIcon>
            <CarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Uygun Yap</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('SERVICE')} disabled={selectedVehicle?.status === 'SERVICE'}>
          <ListItemIcon>
            <BuildIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Servise Gönder</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('RESERVED')} disabled={selectedVehicle?.status === 'RESERVED'}>
          <ListItemIcon>
            <ScheduleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rezerve Et</ListItemText>
        </MenuItem>
      </Menu>

      {/* New Vehicle Dialog */}
      <Dialog open={newVehicleOpen} onClose={() => setNewVehicleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Araç Ekle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Plaka"
            fullWidth
            value={newVehicle.plate}
            onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
            placeholder="Örn: 34 ABC 123"
            required
          />
          <TextField
            margin="normal"
            label="Araç Adı (Opsiyonel)"
            fullWidth
            value={newVehicle.name}
            onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
            placeholder="Örn: BMW 3.20i"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewVehicleOpen(false)}>İptal</Button>
          <Button 
            onClick={handleAddVehicle} 
            variant="contained"
            disabled={!newVehicle.plate.trim() || createVehicleMutation.isPending}
          >
            {createVehicleMutation.isPending ? 'Ekleniyor...' : 'Araç Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, vehicle: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Araç Silme Onayı</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteDialog.vehicle?.plate} - {deleteDialog.vehicle?.name}</strong> aracını silmek istediğinizden emin misiniz?
            <br /><br />
            <Alert severity="warning" sx={{ mt: 2 }}>
              Bu işlem geri alınamaz. Araç kalıcı olarak silinecektir, ancak geçmiş kiralama gelirleri korunacaktır.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ open: false, vehicle: null })}
            disabled={deleteVehicleMutation.isPending}
          >
            İptal
          </Button>
          <Button 
            onClick={() => {
              if (deleteDialog.vehicle) {
                deleteVehicleMutation.mutate(deleteDialog.vehicle.id);
              }
            }}
            color="error"
            variant="contained"
            disabled={deleteVehicleMutation.isPending}
          >
            {deleteVehicleMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
