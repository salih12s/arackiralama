import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Alert,
  LinearProgress,
  Button,
  Card,
  CardContent,
  TextField
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from '../components/Layout';
import { reportsApi } from '../api/reports';
import { formatCurrency } from '../utils/currency';

export default function VehicleRevenue() {
  const queryClient = useQueryClient();
  const [plateFilter, setPlateFilter] = useState('');

  // Fetch vehicle revenue data
  const { data: vehicleRevenueData, isLoading: vehicleRevenueLoading, error: vehicleRevenueError, refetch } = useQuery({
    queryKey: ['vehicle-revenue'],
    queryFn: () => reportsApi.getVehicleRevenue(),
    staleTime: 0, // Cache'i devre dışı bırak
    gcTime: 0, // Garbage collection süresini sıfırla
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-revenue'] });
    refetch();
  };

  // API'den dönen veriyi güvenli şekilde işle
  const vehicles = Array.isArray(vehicleRevenueData) ? vehicleRevenueData : [];
  
  // Plaka filtrelemesi
  const filteredVehicles = vehicles.filter((vehicle: any) => 
    vehicle.licensePlate?.toLowerCase().includes(plateFilter.toLowerCase())
  );
  
  const totalRevenue = filteredVehicles.reduce((sum: number, vehicle: any) => sum + vehicle.totalRevenue || 0, 0);

  if (vehicleRevenueError) {
    return (
      <Layout title="Araç Bazlı Gelir">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Araç gelir verileri yüklenirken hata oluştu.
          </Alert>
          <Button variant="contained" onClick={handleRefresh}>
            Tekrar Dene
          </Button>
        </Box>
      </Layout>
    );
  }

  if (vehicleRevenueLoading) {
    return (
      <Layout title="Araç Bazlı Gelir">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Araç gelir verileri yükleniyor...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Araç Bazlı Gelir">
      <Grid container spacing={3}>
        {/* Sol taraf - Araç Gelir Tablosu */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Araç Bazlı Gelir Listesi
              </Typography>
              <Button variant="outlined" onClick={handleRefresh}>
                Yenile
              </Button>
            </Box>
            
            {/* Plaka Filtreleme */}
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Plaka Filtrele"
                value={plateFilter}
                onChange={(e) => setPlateFilter(e.target.value)}
                placeholder="Örn: 34 ABC 123"
                size="small"
                sx={{ minWidth: 200 }}
              />
            </Box>
            
            {filteredVehicles.length === 0 ? (
              <Alert severity="info">
                {plateFilter ? 
                  `"${plateFilter}" ile eşleşen araç bulunamadı.` : 
                  'Henüz gelir kaydı bulunamadı.'
                }
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Plaka</strong></TableCell>
                      <TableCell align="right"><strong>Toplam Gelir</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVehicles.map((vehicle: any, index: number) => (
                      <TableRow key={vehicle.licensePlate || index} hover>
                        <TableCell>{vehicle.licensePlate}</TableCell>
                        <TableCell align="right">
                          {formatCurrency((vehicle.totalRevenue || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Sağ taraf - Toplam Gelir Özeti */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Toplam Gelir Özeti
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Gösterilen Araç Sayısı
                </Typography>
                <Typography variant="h4" color="primary">
                  {filteredVehicles.length}
                </Typography>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Toplam Gelir
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(totalRevenue)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
