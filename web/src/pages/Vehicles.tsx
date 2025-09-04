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
} from '@mui/material';
import {
  Add as AddIcon,
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
        const response = await client.post('/vehicles', {
          plate: data.plate,
          name: data.name,
          status: 'IDLE',
          active: true,
          isConsignment: false
        });
        return response.data;
      } catch (error) {
        console.error('Vehicle creation error:', error);
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
      alert(error.response?.data?.message || 'Araç ekleme hatası');
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

      <Grid container spacing={3}>
        {/* Sol Taraf - Araçlar */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Araçlar
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewVehicleOpen(true)}
                size="small"
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(vehicles) && vehicles.length > 0 ? (
                      vehicles.map((vehicle: Vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell>{vehicle.plate}</TableCell>
                          <TableCell>{vehicle.name || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
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
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Müşteriler
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewCustomerOpen(true)}
                size="small"
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(customers) && customers.length > 0 ? (
                      customers.map((customer: Customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>{customer.fullName || customer.full_name || customer.name || '-'}</TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
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
