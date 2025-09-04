import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Button
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Layout from '../components/Layout';
import { rentalsApi } from '../api/rentals';
import { formatCurrency } from '../utils/currency';

interface MonthlyVehicleRevenue {
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  monthlyData: {
    month: string;
    revenue: number;
  }[];
}

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState('Tüm Aylar');

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // Fetch all rentals
  const { data: allRentalsData, isLoading: rentalsLoading, error: rentalsError } = useQuery({
    queryKey: ['all-rentals-revenue-analysis'],
    queryFn: async () => {
      console.log('🔄 Fetching revenue analysis rentals...');
      try {
        const result = await rentalsApi.getAll({ 
          limit: 10000,
          page: 1
        });
        console.log('📋 Revenue analysis API response:', result);
        console.log('📋 Rentals data:', result?.data || []);
        return result;
      } catch (error) {
        console.error('❌ Error fetching rentals:', error);
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const rentals = allRentalsData?.data || [];
  
  console.log('🔍 Rentals for analysis:', rentals);
  console.log('📊 Total rentals count:', rentals.length);

  // Calculate daily revenue for each rental day and distribute across months
  const calculateDailyRevenue = (rental: any) => {
    console.log('💰 Calculating revenue for rental:', rental.id);
    
    if (!rental.startDate || !rental.endDate) {
      console.log('⚠️ Missing dates for rental:', rental.id);
      return [];
    }
    
    const startDate = dayjs(rental.startDate);
    const endDate = dayjs(rental.endDate);
    const totalDays = endDate.diff(startDate, 'days') + 1;
    
    console.log(`📅 Rental ${rental.id}: ${totalDays} days from ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
    
    // Calculate total revenue (daily price + km price)
    const dailyPrice = rental.dailyPrice || 0; // Backend sends in kuruş
    const kmPrice = rental.kmDiff || 0; // Backend sends in kuruş
    const totalRevenue = (dailyPrice * totalDays) + kmPrice; // Already in kuruş from backend
    const dailyRevenue = totalRevenue / totalDays;

    console.log(`💰 Rental ${rental.id} revenue: ${totalRevenue} kuruş (daily: ${dailyPrice}, km: ${kmPrice}, daily avg: ${dailyRevenue})`);

    const dailyRevenueData: { date: string; revenue: number; vehicleId: string; vehiclePlate: string; vehicleName: string }[] = [];
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = startDate.add(i, 'days');
      dailyRevenueData.push({
        date: currentDate.format('YYYY-MM-DD'),
        revenue: dailyRevenue,
        vehicleId: rental.vehicle?.id || 'unknown',
        vehiclePlate: rental.vehicle?.plate || 'Bilinmeyen',
        vehicleName: `${rental.vehicle?.brand || ''} ${rental.vehicle?.model || ''}`.trim() || 'Bilinmeyen'
      });
    }
    
    return dailyRevenueData;
  };

  // Process all rental data and calculate monthly revenues
  const { monthlyVehicleRevenues } = useMemo(() => {
    console.log('🔄 Processing rentals data...', rentals);
    
    if (!rentals || rentals.length === 0) {
      console.log('⚠️ No rentals data available');
      return { monthlyVehicleRevenues: [], monthlyTotalRevenues: [] };
    }

    const vehicleRevenueMap = new Map<string, MonthlyVehicleRevenue>();
    const monthlyTotalMap = new Map<string, number>();

    // Process each rental
    rentals.forEach((rental: any, index: number) => {
      console.log(`📋 Processing rental ${index + 1}:`, {
        id: rental.id,
        startDate: rental.startDate,
        endDate: rental.endDate,
        dailyPrice: rental.dailyPrice,
        kmPrice: rental.kmPrice,
        vehicle: rental.vehicle
      });
      
      const dailyData = calculateDailyRevenue(rental);
      console.log(`💰 Daily data for rental ${rental.id}:`, dailyData);
      
      dailyData.forEach(({ date, revenue, vehicleId, vehiclePlate, vehicleName }) => {
        const monthKey = dayjs(date).format('YYYY-MM');
        
        // Initialize vehicle revenue data if not exists
        if (!vehicleRevenueMap.has(vehicleId)) {
          vehicleRevenueMap.set(vehicleId, {
            vehicleId,
            vehiclePlate,
            vehicleName,
            monthlyData: []
          });
        }
        
        const vehicleRevenue = vehicleRevenueMap.get(vehicleId)!;
        const existingMonth = vehicleRevenue.monthlyData.find(m => m.month === monthKey);
        
        if (existingMonth) {
          existingMonth.revenue += revenue;
        } else {
          vehicleRevenue.monthlyData.push({
            month: monthKey,
            revenue: revenue
          });
        }
        
        // Add to total monthly revenue
        monthlyTotalMap.set(monthKey, (monthlyTotalMap.get(monthKey) || 0) + revenue);
      });
    });

    // Convert to arrays and sort
    const vehicleRevenues = Array.from(vehicleRevenueMap.values());
    const totalRevenues = Array.from(monthlyTotalMap.entries())
      .map(([month, totalRevenue]) => ({
        month,
        totalRevenue
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    console.log('📊 Final vehicle revenues:', vehicleRevenues);
    console.log('📊 Final total revenues:', totalRevenues);

    return { monthlyVehicleRevenues: vehicleRevenues };
  }, [rentals]);

  // Filter data based on selected year and month (for second chart only)
  const filteredVehicleData = useMemo(() => {
    return monthlyVehicleRevenues.map(vehicle => ({
      ...vehicle,
      monthlyData: vehicle.monthlyData.filter(data => {
        const dataYear = parseInt(data.month.split('-')[0]);
        return dataYear === selectedYear; // Only filter by year, show all months
      })
    })).filter(vehicle => vehicle.monthlyData.length > 0);
  }, [monthlyVehicleRevenues, selectedYear]);

  // Prepare chart data for monthly total revenues (first chart)
  const monthlyTotalChartData = useMemo(() => {
    // Create 12 months for selected year
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const monthKey = `${selectedYear}-${String(i).padStart(2, '0')}`;
      const monthName = monthNames[i - 1];
      
      // Calculate total revenue for this month from all vehicles
      let totalRevenue = 0;
      
      filteredVehicleData.forEach(vehicle => {
        const monthData = vehicle.monthlyData.find(data => data.month === monthKey);
        if (monthData) {
          totalRevenue += monthData.revenue;
        }
      });
      
      months.push({
        month: monthName,
        monthKey: monthKey,
        totalRevenue: totalRevenue
      });
    }
    
    console.log('📊 Monthly total revenues:', months);
    return months;
  }, [filteredVehicleData, selectedYear, monthNames]);

  // Prepare chart data for selected month vehicle revenues (second chart)
  const monthlyVehicleChartData = useMemo(() => {
    if (selectedMonth === 'Tüm Aylar') {
      return [];
    }

    const targetMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    console.log('🎯 Target month for vehicle chart:', targetMonth);

    const vehicleRevenueForMonth: { plate: string; revenue: number; vehicleName: string }[] = [];

    filteredVehicleData.forEach(vehicle => {
      const monthData = vehicle.monthlyData.find(data => data.month === targetMonth);
      if (monthData) {
        vehicleRevenueForMonth.push({
          plate: vehicle.vehiclePlate,
          revenue: monthData.revenue,
          vehicleName: vehicle.vehicleName
        });
      }
    });

    console.log('📊 Vehicle revenue for selected month:', vehicleRevenueForMonth);
    return vehicleRevenueForMonth.sort((a, b) => b.revenue - a.revenue);
  }, [filteredVehicleData, selectedYear, selectedMonth]);

  if (rentalsError) {
    return (
      <Layout title="Detaylı Raporlar ve Analizler">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Veri yüklenirken hata oluştu.
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Sayfayı Yenile
          </Button>
        </Box>
      </Layout>
    );
  }

  if (rentalsLoading) {
    return (
      <Layout title="Detaylı Raporlar ve Analizler">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <LinearProgress sx={{ width: '50%', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Gelir analizi hazırlanıyor...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Detaylı Raporlar ve Analizler">
      {/* Header */}

      {/* Filter Controls */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
        <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Yıl Seçiniz</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                label="Yıl Seçiniz"
                sx={{ 
                  '& .MuiSelect-select': { 
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    py: { xs: 1.5, sm: 2 }
                  }
                }}
              >
                <MenuItem value={2024}>2024</MenuItem>
                <MenuItem value={2025}>2025</MenuItem>
                <MenuItem value={2026}>2026</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Ay</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Ay"
                sx={{ 
                  '& .MuiSelect-select': { 
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    py: { xs: 1.5, sm: 2 }
                  }
                }}
              >
                <MenuItem value="Tüm Aylar">Tüm Aylar</MenuItem>
                {monthNames.map((month, index) => (
                  <MenuItem key={index + 1} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Monthly Total Revenue Chart */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          fontWeight: 600, 
          mb: 3,
          fontSize: { xs: '1rem', sm: '1.25rem' }
        }}>
          📅 Aylık Toplam Gelir Analizi ({selectedYear})
        </Typography>
        
        {monthlyTotalChartData.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}>
              {selectedYear} yılı için veri bulunamadı
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ 
              mt: 1,
              fontSize: { xs: '0.875rem', sm: '0.875rem' }
            }}>
              Seçilen yılda kiralama verisi bulunmuyor.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: { xs: 250, sm: 300, md: 400 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTotalChartData} margin={{ 
                top: 20, 
                right: { xs: 10, sm: 30 }, 
                left: { xs: 10, sm: 20 }, 
                bottom: 5 
              }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => `${(value / 100000).toFixed(0)}K`}
                  label={{ value: 'Kuruş', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Toplam Gelir']}
                  labelFormatter={(month) => `Ay: ${month}`}
                />
                <Bar 
                  dataKey="totalRevenue" 
                  fill="#4caf50"
                  name="Aylık Toplam Gelir"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      {/* Vehicle Revenue by Plate Chart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          📊 Araç Bazında Aylık Gelirler
          {selectedMonth !== 'Tüm Aylar' && (
            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
              ({monthNames[Number(selectedMonth) - 1]} {selectedYear})
            </Typography>
          )}
        </Typography>
        
        {selectedMonth === 'Tüm Aylar' ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              Araç bazında gelir analizi için lütfen bir ay seçin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Yukarıdaki filtrelerden bir ay seçerek o aya ait araç gelirlerini görüntüleyebilirsiniz.
            </Typography>
          </Box>
        ) : monthlyVehicleChartData.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              {selectedYear} yılının {monthNames[Number(selectedMonth) - 1]} ayı için araç gelir verisi bulunamadı
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Seçilen dönemde kiralama verisi bulunmuyor.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVehicleChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="plate" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 100000).toFixed(0)}K`}
                  label={{ value: 'Kuruş', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Gelir']}
                  labelFormatter={(plate) => `Araç: ${plate}`}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#4caf50"
                  name="Aylık Gelir"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Layout>
  );
}
