import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  DirectionsCar as CarIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MonetizationOn as MoneyIcon,
  Assignment as AssignmentIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import { vehiclesApi, reportsApi, formatCurrency } from '../api/client';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch vehicle data with rentals
  const { data: vehicleData, isLoading: vehicleLoading, error: vehicleError } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.getById(id!),
    enabled: !!id,
  });

  // Fetch vehicle income from reports
  const { data: incomeReportData, isLoading: incomeLoading } = useQuery({
    queryKey: ['vehicle-income-report'],
    queryFn: () => reportsApi.getVehicleIncomeReport(),
  });

  const isLoading = vehicleLoading || incomeLoading;

  if (isLoading) {
    return (
      <Layout title="Araç Detayı">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Typography>Yükleniyor...</Typography>
        </Box>
      </Layout>
    );
  }

  if (vehicleError || !vehicleData?.data) {
    return (
      <Layout title="Araç Detayı">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Araç bulunamadı
          </Typography>
          <Button onClick={() => navigate('/vehicles')} sx={{ mt: 2 }}>
            Araçlar Sayfasına Dön
          </Button>
        </Box>
      </Layout>
    );
  }

  const vehicle = vehicleData.data;
  const rentals = vehicle.rentals || [];
  
  // Find income data for this vehicle
  const vehicleIncome = incomeReportData?.data?.find((item: any) => item.vehicleId === vehicle.id) || {
    billed: 0,
    collected: 0,
    outstanding: 0
  };

  // Calculate statistics
  const totalRentals = rentals.length;
  const activeRentals = rentals.filter((r: any) => r.status === 'ACTIVE').length;
  const totalRevenue = vehicleIncome.collected || 0;
  const outstandingAmount = vehicleIncome.outstanding || 0;

  // Get status info
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

  const getRentalStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'RETURNED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getRentalStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'RETURNED': return 'Tamamlandı';
      case 'CANCELLED': return 'İptal';
      default: return status;
    }
  };

  return (
    <Layout title={`Araç Detayı - ${vehicle.plate}`}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate('/vehicles')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
          <CarIcon sx={{ fontSize: 32 }} />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {vehicle.plate}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {vehicle.name || 'Araç Adı Belirtilmemiş'} • {dayjs(vehicle.createdAt).format('DD/MM/YYYY')} tarihinde eklendi
          </Typography>
        </Box>
        <Chip 
          label={getStatusText(vehicle.status)}
          color={getStatusColor(vehicle.status) as any}
          size="medium"
          sx={{ borderRadius: 2, px: 2, py: 1 }}
        />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(totalRevenue)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Toplam Gelir
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <MoneyIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {totalRentals}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Toplam Kiralama
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <CalendarIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {activeRentals}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Aktif Kiralama
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <TrendingUpIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: outstandingAmount > 0 
              ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' 
              : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(outstandingAmount)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Kalan Bakiye
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <AssignmentIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Rental History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center' }}>
          <CalendarIcon sx={{ mr: 1 }} />
          Kiralama Geçmişi ({totalRentals} adet)
        </Typography>

        {rentals.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Henüz kiralama geçmişi bulunmuyor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bu araç daha önce kiralanmamış
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Müşteri</strong></TableCell>
                  <TableCell><strong>Kiralama Tarihi</strong></TableCell>
                  <TableCell><strong>Dönüş Tarihi</strong></TableCell>
                  <TableCell><strong>Gün Sayısı</strong></TableCell>
                  <TableCell><strong>Toplam Tutar</strong></TableCell>
                  <TableCell><strong>Ödenmiş</strong></TableCell>
                  <TableCell><strong>Bakiye</strong></TableCell>
                  <TableCell><strong>Durum</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rentals.map((rental: any) => (
                  <TableRow key={rental.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {rental.customer.fullName}
                          </Typography>
                          {rental.customer.phone && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon sx={{ fontSize: 12 }} />
                              {rental.customer.phone}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {dayjs(rental.startDate).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      {dayjs(rental.endDate).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${rental.days} gün`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        {formatCurrency(rental.totalDue)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {formatCurrency(rental.totalDue - rental.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={rental.balance > 0 ? 'error.main' : 'success.main'}
                      >
                        {formatCurrency(rental.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRentalStatusText(rental.status)}
                        color={getRentalStatusColor(rental.status) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Layout>
  );
}
