import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { NewCustomerDialog } from '../components/NewCustomerDialog';
import { customersApi } from '../api/client';
import client from '../api/client';

interface Vehicle {
  id: string;
  plate: string;
  name?: string;
}

interface Customer {
  id: string;
  fullName: string;
  phone?: string;
  full_name?: string; // fallback for compatibility
  name?: string; // fallback for compatibility
}

export default function Tanimalar() {
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', name: '' });
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  
  // Edit states
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Delete confirmation states
  const [deleteVehicleOpen, setDeleteVehicleOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Error modal states
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const queryClient = useQueryClient();

  // Fetch vehicles
  const { data: vehiclesData, isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      try {
        const response = await client.get('/vehicles');
        return response.data;
      } catch (error) {
        console.error('Vehicles API Error:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000,
    retry: 3,
  });

  // Fetch customers - using the same API as Customers.tsx
  const { data: customersData, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
    staleTime: 30 * 1000,
    retry: 3,
  });

  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: async (data: { plate: string; name: string }) => {
      try {
        console.log('🔄 Creating vehicle:', data);
        const response = await client.post('/vehicles', {
          plate: data.plate,
          name: data.name,
          status: 'IDLE',
          active: true,
          isConsignment: false
        });
        console.log('✅ Vehicle creation response:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Vehicle creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setNewVehicleOpen(false);
      setNewVehicle({ plate: '', name: '' });
    },
    onError: (error: any) => {
      console.error('Vehicle creation error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Araç ekleme hatası';
      setErrorMessage(errorMsg);
      setErrorDialogOpen(true);
    },
  });

  // Update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { id: string; plate: string; name: string }) => {
      console.log('🔄 Updating vehicle:', data);
      const response = await client.put(`/vehicles/${data.id}`, {
        plate: data.plate,
        name: data.name,
      });
      console.log('✅ Vehicle update response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      setEditVehicleOpen(false);
      setEditingVehicle(null);
    },
    onError: (error: any) => {
      console.error('❌ Vehicle update error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Araç güncelleme hatası';
      setErrorMessage(errorMsg);
      setErrorDialogOpen(true);
    },
  });

  // Delete vehicle mutation with safety check
  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🔄 Checking vehicle rentals before deletion:', id);
      // First check if vehicle has any rentals
      try {
        const response = await client.get(`/vehicles/${id}/rentals`);
        const rentals = response.data;
        console.log('📋 Vehicle rentals check result:', rentals);
        
        if (rentals && rentals.length > 0) {
          throw new Error('Bu araç daha önce kiralanmış. Güvenlik nedeniyle silinemez.');
        }
        
        console.log('🗑️ Proceeding with vehicle deletion:', id);
        const deleteResponse = await client.delete(`/vehicles/${id}`);
        console.log('✅ Vehicle deletion response:', deleteResponse.data);
        return deleteResponse.data;
      } catch (error) {
        console.error('❌ Vehicle deletion error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteVehicleOpen(false);
      setDeletingVehicle(null);
    },
    onError: (error: any) => {
      console.error('❌ Vehicle deletion error:', error);
      const errorMsg = error.message || error.response?.data?.error || error.response?.data?.message || 'Araç silme hatası';
      setErrorMessage(errorMsg);
      setErrorDialogOpen(true);
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { id: string; fullName: string; phone: string }) => {
      console.log('🔄 Updating customer:', data);
      const response = await client.put(`/customers/${data.id}`, {
        fullName: data.fullName,
        phone: data.phone,
      });
      console.log('✅ Customer update response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      setEditCustomerOpen(false);
      setEditingCustomer(null);
    },
    onError: (error: any) => {
      console.error('❌ Customer update error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Müşteri güncelleme hatası';
      setErrorMessage(errorMsg);
      setErrorDialogOpen(true);
    },
  });

  // Delete customer mutation with safety check
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🔄 Checking customer rentals before deletion:', id);
      // First check if customer has any rentals
      try {
        const response = await client.get(`/customers/${id}/rentals`);
        const rentals = response.data;
        console.log('📋 Customer rentals check result:', rentals);
        
        if (rentals && rentals.length > 0) {
          throw new Error('Bu müşteri daha önce araç kiralamış. Güvenlik nedeniyle silinemez.');
        }
        
        console.log('🗑️ Proceeding with customer deletion:', id);
        const deleteResponse = await client.delete(`/customers/${id}`);
        console.log('✅ Customer deletion response:', deleteResponse.data);
        return deleteResponse.data;
      } catch (error) {
        console.error('❌ Customer deletion error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteCustomerOpen(false);
      setDeletingCustomer(null);
    },
    onError: (error: any) => {
      console.error('❌ Customer deletion error:', error);
      const errorMsg = error.message || error.response?.data?.error || error.response?.data?.message || 'Müşteri silme hatası';
      setErrorMessage(errorMsg);
      setErrorDialogOpen(true);
    },
  });

  const handleAddVehicle = () => {
    if (newVehicle.plate.trim() && newVehicle.name.trim()) {
      createVehicleMutation.mutate({
        plate: newVehicle.plate.trim().toUpperCase(),
        name: newVehicle.name.trim(),
      });
    }
  };

  // Vehicle handlers
  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditVehicleOpen(true);
  };

  const handleUpdateVehicle = () => {
    if (editingVehicle && editingVehicle.plate.trim() && editingVehicle.name?.trim()) {
      updateVehicleMutation.mutate({
        id: editingVehicle.id,
        plate: editingVehicle.plate.trim().toUpperCase(),
        name: editingVehicle.name.trim(),
      });
    }
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    setDeletingVehicle(vehicle);
    setDeleteVehicleOpen(true);
  };

  const confirmDeleteVehicle = () => {
    if (deletingVehicle) {
      deleteVehicleMutation.mutate(deletingVehicle.id);
    }
  };

  // Customer handlers
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomerOpen(true);
  };

  const handleUpdateCustomer = () => {
    if (editingCustomer && editingCustomer.fullName?.trim()) {
      updateCustomerMutation.mutate({
        id: editingCustomer.id,
        fullName: editingCustomer.fullName.trim(),
        phone: editingCustomer.phone || '',
      });
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteCustomerOpen(true);
  };

  const confirmDeleteCustomer = () => {
    if (deletingCustomer) {
      deleteCustomerMutation.mutate(deletingCustomer.id);
    }
  };

  // Extract data from API responses - using same structure as Customers.tsx
  const vehicles = Array.isArray(vehiclesData?.data?.data) ? vehiclesData.data.data : 
                   Array.isArray(vehiclesData?.data) ? vehiclesData.data : 
                   Array.isArray(vehiclesData) ? vehiclesData : [];
                   
  const customers = customersData?.data?.data || [];

  // Debug logging
  console.log('📊 Debug - vehiclesData:', vehiclesData);
  console.log('👥 Debug - customersData:', customersData);
  console.log('🚗 Debug - vehicles array:', vehicles);
  console.log('👤 Debug - customers array:', customers);

  return (
    <Layout title="Tanımalar">

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Sol Taraf - Araçlar */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 }
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}>
                Araçlar
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewVehicleOpen(true)}
                size="small"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 1.5 }
                }}
              >
                Araç Ekle
              </Button>
            </Box>

            {vehiclesError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Araçlar yüklenirken hata oluştu.
              </Alert>
            )}

            {vehiclesLoading ? (
              <Typography>Araçlar yükleniyor...</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Plaka</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(vehicles) && vehicles.length > 0 ? (
                      vehicles.map((vehicle: Vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell>{vehicle.plate}</TableCell>
                          <TableCell>{vehicle.name || '-'}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEditVehicle(vehicle)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteVehicle(vehicle)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            Henüz araç eklenmemiş
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Sağ Taraf - Müşteriler */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 }
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}>
                Müşteriler
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewCustomerOpen(true)}
                size="small"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 1.5 }
                }}
              >
                Müşteri Ekle
              </Button>
            </Box>

            {customersError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Müşteriler yüklenirken hata oluştu.
              </Alert>
            )}

            {customersLoading ? (
              <Typography>Müşteriler yükleniyor...</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Müşteri Adı</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Telefon</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(customers) && customers.length > 0 ? (
                      customers.map((customer: Customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>{customer.fullName || customer.full_name || customer.name || '-'}</TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEditCustomer(customer)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCustomer(customer)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            Henüz müşteri eklenmemiş
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Araç Ekleme Dialog */}
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
            label="Model"
            fullWidth
            value={newVehicle.name}
            onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
            placeholder="Örn: BMW 3.20i"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewVehicleOpen(false)}>İptal</Button>
          <Button 
            onClick={handleAddVehicle} 
            variant="contained"
            disabled={!newVehicle.plate.trim() || !newVehicle.name.trim() || createVehicleMutation.isPending}
          >
            {createVehicleMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Araç Düzenleme Dialog */}
      <Dialog open={editVehicleOpen} onClose={() => setEditVehicleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Araç Düzenle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Plaka"
            fullWidth
            variant="outlined"
            value={editingVehicle?.plate || ''}
            onChange={(e) => setEditingVehicle(prev => prev ? {...prev, plate: e.target.value} : null)}
          />
          <TextField
            margin="normal"
            label="Model"
            fullWidth
            variant="outlined"
            value={editingVehicle?.name || ''}
            onChange={(e) => setEditingVehicle(prev => prev ? {...prev, name: e.target.value} : null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditVehicleOpen(false)}>İptal</Button>
          <Button 
            onClick={handleUpdateVehicle} 
            variant="contained"
            disabled={updateVehicleMutation.isPending}
          >
            {updateVehicleMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Araç Silme Onay Dialog */}
      <Dialog open={deleteVehicleOpen} onClose={() => setDeleteVehicleOpen(false)}>
        <DialogTitle>⚠️ Araç Sil</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            "<strong>{deletingVehicle?.plate} - {deletingVehicle?.name}</strong>" aracını silmek istediğinizden emin misiniz?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Dikkat:</strong> Bu araçla daha önce kiralama yapılmışsa silme işlemi engellenecektir.
              Geçmiş kiralamalar ve raporlar korunacaktır.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteVehicleOpen(false)}>İptal</Button>
          <Button 
            onClick={confirmDeleteVehicle} 
            color="error" 
            variant="contained"
            disabled={deleteVehicleMutation.isPending}
          >
            {deleteVehicleMutation.isPending ? 'Kontrol ediliyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Müşteri Düzenleme Dialog */}
      <Dialog open={editCustomerOpen} onClose={() => setEditCustomerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Müşteri Düzenle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Ad Soyad"
            fullWidth
            variant="outlined"
            value={editingCustomer?.fullName || ''}
            onChange={(e) => setEditingCustomer(prev => prev ? {...prev, fullName: e.target.value} : null)}
          />
          <TextField
            margin="normal"
            label="Telefon"
            fullWidth
            variant="outlined"
            value={editingCustomer?.phone || ''}
            onChange={(e) => setEditingCustomer(prev => prev ? {...prev, phone: e.target.value} : null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCustomerOpen(false)}>İptal</Button>
          <Button 
            onClick={handleUpdateCustomer} 
            variant="contained"
            disabled={updateCustomerMutation.isPending}
          >
            {updateCustomerMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Müşteri Silme Onay Dialog */}
      <Dialog open={deleteCustomerOpen} onClose={() => setDeleteCustomerOpen(false)}>
        <DialogTitle>⚠️ Müşteri Sil</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            "<strong>{deletingCustomer?.fullName || deletingCustomer?.full_name || deletingCustomer?.name}</strong>" müşterisini silmek istediğinizden emin misiniz?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Dikkat:</strong> Bu müşteri daha önce araç kiralamışsa silme işlemi engellenecektir.
              Geçmiş kiralamalar, ödemeler ve borç kayıtları korunacaktır.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCustomerOpen(false)}>İptal</Button>
          <Button 
            onClick={confirmDeleteCustomer} 
            color="error" 
            variant="contained"
            disabled={deleteCustomerMutation.isPending}
          >
            {deleteCustomerMutation.isPending ? 'Kontrol ediliyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠️ Hata
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sorun devam ederse sistem yöneticisi ile iletişime geçiniz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setErrorDialogOpen(false)} 
            color="primary"
            variant="contained"
            sx={{ minWidth: 100 }}
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Müşteri Ekleme Dialog */}
      <NewCustomerDialog 
        open={newCustomerOpen} 
        onClose={() => setNewCustomerOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }}
      />
    </Layout>
  );
}
