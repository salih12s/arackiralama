import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Stack,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MoneyIcon,
  Warning as WarningIcon,
  AccountBalance as AccountBalanceIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import { reportsApi, formatCurrency, vehiclesApi } from '../api/client';
import { rentalsApi } from '../api/rentals';

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const navigate = useNavigate();

  // Fetch monthly report
  const { data: monthlyData } = useQuery({
    queryKey: ['monthly-report', selectedYear],
    queryFn: () => reportsApi.getMonthlyReport(selectedYear),
  });

  // This query is removed as it's not currently used
  // const { data: vehicleIncomeData } = useQuery({
  //   queryKey: ['vehicle-income'],
  //   queryFn: () => reportsApi.getVehicleIncomeReport(),
  // });

  // Fetch debtors
  const { data: debtorsData } = useQuery({
    queryKey: ['debtors'],
    queryFn: () => reportsApi.getDebtors(),
  });

  // Fetch vehicles data
  const { data: allVehiclesData } = useQuery({
    queryKey: ['all-vehicles-analytics'],
    queryFn: () => vehiclesApi.getAll(),
  });

  // Fetch all rentals for pure revenue calculation
  const { data: rentalsData } = useQuery({
    queryKey: ['all-rentals-analytics'],
    queryFn: () => rentalsApi.getAll(),
  });

  // Calculate advanced analytics
  const allMonthlyStats = monthlyData?.data || [];
  // Ay filtresine göre verileri filtrele
  const monthlyStats = selectedMonth === 'all' 
    ? allMonthlyStats 
    : allMonthlyStats.filter(month => month.month === selectedMonth);
    
  // const vehicleStats = vehicleIncomeData?.data || [];
  const debtorsList = debtorsData?.data || [];
  const vehicles = allVehiclesData?.data || [];
  const rentals = rentalsData?.data || [];

  // Helper function for month names
  const getMonthName = (month: number) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month - 1];
  };

  // Calculate pure revenue per vehicle (only rental + KM fees)
  const vehicleRevenueStats = vehicles.map(vehicle => {
    const vehicleRentals = rentals.filter(rental => rental.vehicleId === vehicle.id);
    const pureRevenue = vehicleRentals.reduce((total, rental) => {
      const rentalPrice = (rental.days || 0) * (rental.dailyPrice || 0);
      const kmRevenue = rental.kmDiff || 0;
      return total + rentalPrice + kmRevenue;
    }, 0);
    
    return {
      plate: vehicle.plate,
      name: vehicle.name || vehicle.plate,
      revenue: pureRevenue
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Calculate monthly revenue data for line chart
  const monthlyRevenueData = allMonthlyStats.map(month => {
    const monthRentals = rentals.filter(rental => {
      const rentalMonth = new Date(rental.startDate).getMonth() + 1;
      const rentalYear = new Date(rental.startDate).getFullYear();
      return rentalMonth === month.month && rentalYear === selectedYear;
    });
    
    const monthPureRevenue = monthRentals.reduce((total, rental) => {
      const rentalPrice = (rental.days || 0) * (rental.dailyPrice || 0);
      const kmRevenue = rental.kmDiff || 0;
      return total + rentalPrice + kmRevenue;
    }, 0);

    return {
      month: month.month,
      monthName: getMonthName(month.month),
      revenue: monthPureRevenue
    };
  });

  // Calculate KPIs
  const totalRevenue = monthlyStats.reduce((sum, month) => sum + month.billed, 0);
  const totalCollected = monthlyStats.reduce((sum, month) => sum + month.collected, 0);
  const totalOutstanding = monthlyStats.reduce((sum, month) => sum + month.outstanding, 0);
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

  // Status distribution for pie chart
  const statusDistribution = [
    { name: 'Uygun', value: vehicles.filter(v => v.status === 'IDLE').length, color: '#2e7d32' },
    { name: 'Kirada', value: vehicles.filter(v => v.status === 'RENTED').length, color: '#1976d2' },
    { name: 'Rezerve', value: vehicles.filter(v => v.status === 'RESERVED').length, color: '#ed6c02' },
    { name: 'Serviste', value: vehicles.filter(v => v.status === 'SERVICE').length, color: '#d32f2f' },
  ];

  // Monthly trend data
  const monthlyTrends = monthlyStats.map(month => ({
    ...month,
    profitMargin: month.billed > 0 ? ((month.collected - month.outstanding) / month.billed * 100) : 0,
    collectionRate: month.billed > 0 ? (month.collected / month.billed * 100) : 0,
  }));

  return (
    <Layout title="Raporlar ve Analizler">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            📊 Detaylı Raporlar ve Analizler
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Kapsamlı iş analitiği, performans metrikleri ve gelir raporları
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Yıl</InputLabel>
            <Select
              value={selectedYear}
              label="Yıl"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026].map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ay</InputLabel>
            <Select
              value={selectedMonth}
              label="Ay"
              onChange={(e) => setSelectedMonth(e.target.value as number | 'all')}
            >
              <MenuItem value="all">Tüm Aylar</MenuItem>
              {[
                { value: 1, label: 'Ocak' },
                { value: 2, label: 'Şubat' },
                { value: 3, label: 'Mart' },
                { value: 4, label: 'Nisan' },
                { value: 5, label: 'Mayıs' },
                { value: 6, label: 'Haziran' },
                { value: 7, label: 'Temmuz' },
                { value: 8, label: 'Ağustos' },
                { value: 9, label: 'Eylül' },
                { value: 10, label: 'Ekim' },
                { value: 11, label: 'Kasım' },
                { value: 12, label: 'Aralık' }
              ].map(month => (
                <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* KPI Dashboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                    {formatCurrency(totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                    Toplam Gelir ({selectedYear}{selectedMonth !== 'all' ? ` - ${['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][selectedMonth as number]}` : ''})
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <MoneyIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                    {formatCurrency(totalCollected)}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                    Tahsil Edilen
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <AccountBalanceIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'info.main' }}>
                    %{collectionRate.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                    Tahsil Oranı
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', color: 'white' }}>
                  <TrendingUpIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(totalOutstanding)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Kalan Alacak
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <WarningIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Revenue Trend */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon color="primary" />
              Aylık Gelir Trend Analizi ({selectedYear}{selectedMonth !== 'all' ? ` - ${['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][selectedMonth as number]}` : ''})
            </Typography>
            <Box sx={{ height: 400, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `%${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name.includes('Rate') || name.includes('Margin')) {
                        return [`%${value.toFixed(1)}`, name];
                      }
                      return [formatCurrency(value), name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="billed" fill="#1976d2" name="Faturalandırılan" />
                  <Bar yAxisId="left" dataKey="collected" fill="#2e7d32" name="Tahsil Edilen" />
                  <Line yAxisId="right" type="monotone" dataKey="collectionRate" stroke="#ff9800" strokeWidth={3} name="Tahsil Oranı (%)" />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Vehicle Status Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PieChartIcon color="primary" />
              Araç Durum Dağılımı
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                Toplam {vehicles.length} araç
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Pure Vehicle Revenue Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon color="primary" />
              Araç Başına Gelir Analizi (Kira + KM)
            </Typography>
            <Box sx={{ height: 400, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleRevenueStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="plate" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Gelir']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="revenue" fill="#1976d2" name="Net Gelir" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Monthly Revenue Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon color="primary" />
              Aylık Gelir Analizi
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value)]}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="revenue" fill="#2e7d32" name="Aylık Gelir" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Detailed Debtors Analysis */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="error" />
              Borçlu Müşteriler - Detaylı Analiz
            </Typography>
            {debtorsList.length === 0 ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                🎉 Harika! Şu anda borçlu müşteri bulunmuyor.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {debtorsList.length} borçlu müşteri bulundu
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/debtor-details')}
                    sx={{ ml: 2 }}
                  >
                    Tüm Detayları Gör
                  </Button>
                </Box>
                <TableContainer sx={{ mt: 2, maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Müşteri</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Araç</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Süre</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Borç Tutarı</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {debtorsList.map((debtor) => (
                        <TableRow key={debtor.rentalId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {debtor.customerName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={debtor.plate} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {debtor.days} gün
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(debtor.startDate).format('DD/MM/YYYY')} - {dayjs(debtor.endDate).format('DD/MM/YYYY')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 700, 
                                color: 'error.main',
                                fontSize: '1rem'
                              }}
                            >
                              {formatCurrency(debtor.balance)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                debtor.balance > 10000 ? 'Yüksek Risk' :
                                debtor.balance > 5000 ? 'Orta Risk' : 'Düşük Risk'
                              }
                              color={
                                debtor.balance > 10000 ? 'error' :
                                debtor.balance > 5000 ? 'warning' : 'info'
                              }
                              size="small"
                              variant="filled"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Paper>
        </Grid>

        {/* Quick Stats Summary */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📈 Hızlı İstatistikler
            </Typography>
            
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                  Toplam Araç Sayısı
                </Typography>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                  {vehicles.length} araç
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  Aktif Kiralama
                </Typography>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                  {vehicles.filter(v => v.status === 'RENTED').length} araç
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 2, border: '1px solid', borderColor: 'info.200' }}>
                <Typography variant="body2" color="info.main" sx={{ fontWeight: 600 }}>
                  En Yüksek Aylık Gelir
                </Typography>
                <Typography variant="h6" color="info.main" sx={{ fontWeight: 700 }}>
                  {formatCurrency(Math.max(...monthlyStats.map(m => m.collected), 0))}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Son güncelleme: {dayjs().format('DD/MM/YYYY HH:mm')}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

      </Grid>
    </Layout>
  );
}
