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
  // Phone as PhoneIcon,
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
  const outstandingAmount = vehicleIncome.outstanding || 0;
  
  // Calculate total revenue (everything included)
  const totalRevenue = rentals.reduce((total: number, rental: any) => {
    const rentalPrice = (rental.dailyPrice || 0) * (rental.days || 0);
    const kmDiff = rental.kmDiff || 0;
    const hgsFee = rental.hgsFee || 0;
    const damageFee = rental.damageFee || 0;
    const fuelCost = rental.fuelCost || 0;
    const otherFees = rental.otherFees || 0;
    
    return total + rentalPrice + kmDiff + hgsFee + damageFee + fuelCost + otherFees;
  }, 0);
  
  // Calculate vehicle profit (only rental price + km difference)
  const vehicleProfit = rentals.reduce((total: number, rental: any) => {
    const rentalPrice = (rental.dailyPrice || 0) * (rental.days || 0);
    const kmDiff = rental.kmDiff || 0;
    return total + rentalPrice + kmDiff;
  }, 0);

  // Calculate detailed breakdown for display
  const rentalBreakdown = rentals.reduce((acc: any, rental: any) => {
    const rentalPrice = (rental.dailyPrice || 0) * (rental.days || 0);
    const kmDiff = rental.kmDiff || 0;
    
    acc.totalRentalPrice += rentalPrice;
    acc.totalKmDiff += kmDiff;
    acc.totalIncome += rentalPrice + kmDiff;
    
    return acc;
  }, {
    totalRentalPrice: 0,
    totalKmDiff: 0,
    totalIncome: 0
  });

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
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getRentalStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'RETURNED': return 'Tamamlandı';
      case 'COMPLETED': return 'Tamamlandı';
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
        {/* Toplam Gelir Card - First */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Gelir
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <MoneyIcon sx={{ fontSize: 32, color: 'white' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {totalRentals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Kiralama
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <CalendarIcon sx={{ fontSize: 32, color: 'white' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {activeRentals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aktif Kiralama
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <TrendingUpIcon sx={{ fontSize: 32, color: 'white' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(outstandingAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kalan Bakiye
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: outstandingAmount > 0 ? 'error.main' : 'success.main', width: 56, height: 56 }}>
                  <AssignmentIcon sx={{ fontSize: 32, color: 'white' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Araç Kazancı Card - Last */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(vehicleProfit)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Araç Kazancı
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Kiralama: {formatCurrency(rentalBreakdown.totalRentalPrice)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      KM Farkı: {formatCurrency(rentalBreakdown.totalKmDiff)}
                    </Typography>
                  </Stack>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <TrendingUpIcon sx={{ fontSize: 32, color: 'white' }} />
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
          <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold' }}>
                    Kiralama Tarihi
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold' }}>
                    Geri Dönüş
                  </TableCell>
                  <TableCell sx={{ minWidth: 150, fontWeight: 'bold' }}>
                    Müşteri Adı
                  </TableCell>
                  <TableCell sx={{ minWidth: 60, fontWeight: 'bold', textAlign: 'center' }}>
                    Gün
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    Kira Ücreti
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    KM Ücreti
                  </TableCell>
                  <TableCell sx={{ minWidth: 120, fontWeight: 'bold', textAlign: 'right' }}>
                    Toplam Gelir
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    HGS
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    Kaza/Su
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    Yakıt Bedeli
                  </TableCell>
                  <TableCell sx={{ minWidth: 120, fontWeight: 'bold', textAlign: 'right' }}>
                    Toplam Ödenen
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    Peşin Ödenen
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'right' }}>
                    Ödeme
                  </TableCell>
                  <TableCell sx={{ minWidth: 120, fontWeight: 'bold', textAlign: 'right' }}>
                    Kalan Bakiye
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'center' }}>
                    Durum
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rentals.map((rental: any) => {
                  // Calculate detailed breakdown
                  const rentalPrice = (rental.dailyPrice || 0) * (rental.days || 0);
                  const kmDiff = rental.kmDiff || 0;
                  const totalIncome = rentalPrice + kmDiff;
                  const hgsAmount = rental.hgsAmount || 0;
                  const damageAmount = rental.damageAmount || 0;
                  const fuelAmount = rental.fuelAmount || 0;
                  const totalPaid = rental.totalDue - rental.balance;
                  const advancePayment = rental.advancePayment || 0;
                  const remainingPayment = totalPaid - advancePayment;

                  return (
                    <TableRow 
                      key={rental.id} 
                      hover 
                      sx={{ 
                        '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.875rem' }}>
                        {dayjs(rental.startDate).format('DD.MM.YYYY')}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>
                        {dayjs(rental.endDate).format('DD.MM.YYYY')}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}>
                            <PersonIcon sx={{ fontSize: 14 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                              {rental.customer.fullName}
                            </Typography>
                            {rental.customer.phone && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {rental.customer.phone}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={rental.days || 0}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {formatCurrency(rentalPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 500,
                            color: kmDiff > 0 ? 'success.main' : kmDiff < 0 ? 'error.main' : 'text.primary'
                          }}
                        >
                          {formatCurrency(kmDiff)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {formatCurrency(totalIncome)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {hgsAmount > 0 ? formatCurrency(hgsAmount) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.875rem',
                            color: damageAmount > 0 ? 'error.main' : 'text.primary'
                          }}
                        >
                          {damageAmount > 0 ? formatCurrency(damageAmount) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {fuelAmount > 0 ? formatCurrency(fuelAmount) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {formatCurrency(totalPaid)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'info.main', fontWeight: 500 }}>
                          {formatCurrency(advancePayment)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'secondary.main', fontWeight: 500 }}>
                          {formatCurrency(remainingPayment)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.875rem', 
                            fontWeight: rental.balance > 0 ? 700 : 500,
                            color: rental.balance > 0 ? 'error.main' : 'text.primary'
                          }}
                        >
                          {formatCurrency(rental.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getRentalStatusText(rental.status)}
                          color={getRentalStatusColor(rental.status) as any}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 20 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Layout>
  );
}
