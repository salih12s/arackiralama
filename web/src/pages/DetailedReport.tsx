import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Stack,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { rentalsApi } from '../api/rentals';
import { vehiclesApi } from '../api/vehicles';
import { formatCurrency } from '../utils/currency';

// Compact date formatting (DD.MM)
// const formatCompactDate = (dateString: string) => {
//   const date = new Date(dateString);
//   const day = date.getDate().toString().padStart(2, '0');
//   const month = (date.getMonth() + 1).toString().padStart(2, '0');
//   return `${day}.${month}`;
// };

interface RentalData {
  id: string;
  startDate: string;
  endDate: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicle: {
    name: string;
    plate: string;
  };
  days: number;
  dailyPrice: number;
  totalPrice: number;
  kmPrice: number;
  kmTotal: number;
  hgsFee: number;
  damageFee: number;
  fuelCost: number;
  otherFees: number;
  totalAmount: number;
  advancePayment: number;
  totalPaid: number;
  balance: number;
  status: string;
  paymentStatus: string;
  // Ödemeler
  payment1: number;
  payment2: number;
  payment3: number;
  payment4: number;
  // Açıklama
  notes: string;
}

export const DetailedReport: React.FC = () => {
  const [rentals, setRentals] = useState<RentalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRentals, setFilteredRentals] = useState<RentalData[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = rentals.filter(rental =>
        rental.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRentals(filtered);
    } else {
      setFilteredRentals(rentals);
    }
  }, [searchTerm, rentals]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rentalsResponse, vehiclesResponse] = await Promise.all([
        rentalsApi.getAll(),
        vehiclesApi.getAll()
      ]);

      console.log('Rentals Response:', rentalsResponse);
      console.log('Vehicles Response:', vehiclesResponse);

      const rentalsData = rentalsResponse.data;
      // vehiclesApi { data: Vehicle[] } yapısında döndürüyor
      const vehiclesData = vehiclesResponse.data ? vehiclesResponse.data : vehiclesResponse;

      if (!rentalsData || !vehiclesData) {
        console.error('Missing data:', { rentalsData, vehiclesData });
        setError('Veriler yüklenirken hata oluştu');
        return;
      }

        const formattedData: RentalData[] = rentalsData.map((rental: any) => {
          console.log('Rental data:', rental); // Debug için
          
          const vehicle = Array.isArray(vehiclesData) 
            ? vehiclesData.find((v: any) => v.id === rental.vehicleId)
            : null;
            
          console.log('Found vehicle:', vehicle); // Debug için
          console.log('Customer data:', rental.customer); // Debug için
          
          // Calculate values
          const days = rental.days || 0;
          const dailyPrice = rental.dailyPrice || 0;
          const totalPrice = days * dailyPrice;
          
          // KM bilgileri - Schema'da kmDiff var, bu KM ücreti (para değeri)
          const kmDiff = rental.kmDiff || 0; // Bu KM ücreti (para değeri)
          
          const hgsFee = rental.hgs || 0;
          const cleaningFee = rental.cleaning || 0; // Temizlik ücreti
          const damageFee = rental.damage || 0;
          const fuelCost = rental.fuel || 0;
          const otherFees = 0; // Diğer ücretler
          
          // Kaza/Sürtme = damage + fuel (tek sütunda)
          const accidentAndFuel = damageFee + fuelCost;
          
          const totalAmount = totalPrice + kmDiff + hgsFee + cleaningFee + accidentAndFuel + otherFees;
          const advancePayment = rental.upfront || 0;
          
          // Calculate total paid from payments and installments
          const totalPaid = (rental.payments || []).reduce((sum: number, payment: any) => 
            sum + (payment.amount || 0), 0
          ) + advancePayment + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0);
          
          const balance = totalAmount - totalPaid;

          // Individual payments from API
          const payment1 = rental.pay1 || 0;
          const payment2 = rental.pay2 || 0;
          const payment3 = rental.pay3 || 0;
          const payment4 = rental.pay4 || 0;

          return {
            id: rental.id,
            startDate: rental.startDate,
            endDate: rental.endDate,
            customer: {
              firstName: rental.customer?.firstName || rental.customer?.fullName?.split(' ')[0] || '',
              lastName: rental.customer?.lastName || rental.customer?.fullName?.split(' ').slice(1).join(' ') || '',
              phone: rental.customer?.phone || ''
            },
            vehicle: {
              name: vehicle?.name || 'Bilinmiyor',
              plate: vehicle?.plate || rental.vehicle?.plate || 'Bilinmiyor'
            },
            days,
            dailyPrice,
            totalPrice,
            kmPrice: kmDiff, // KM ücreti (para değeri)
            kmTotal: kmDiff, // KM ücreti (kuruş)
            hgsFee,
            damageFee: accidentAndFuel, // damage + fuel birleştirildi
            fuelCost: cleaningFee, // Temizlik ücreti fuel sütununda gösteriliyor
            otherFees,
            totalAmount,
            advancePayment,
            totalPaid,
            balance,
            status: rental.status,
            paymentStatus: balance <= 0 ? 'PAID' : balance < totalAmount ? 'PARTIAL' : 'UNPAID',
            // Ödemeler
            payment1,
            payment2,
            payment3,
            payment4,
            // Açıklama - schema'da 'note' olarak tanımlı
            notes: rental.note || ''
          };
        });

        setRentals(formattedData);
        setFilteredRentals(formattedData);
    } catch (err) {
      setError('Veriler yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'COMPLETED': return 'success';
      case 'RETURNED': return 'success';
      case 'CANCELLED': return 'error';
      case 'RESERVED': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'KIRADA';
      case 'COMPLETED': return 'TAMAMLANDI';
      case 'RETURNED': return 'TESLİM EDİLDİ';
      case 'CANCELLED': return 'İPTAL';
      case 'RESERVED': return 'REZERVE';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PARTIAL': return 'warning';
      case 'UNPAID': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'PAID': return 'ÖDENDİ';
      case 'PARTIAL': return 'KISMİ';
      case 'UNPAID': return 'ÖDENMEDİ';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const handleExport = () => {
    // TODO: Export functionality
    console.log('Export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1">
            Detaylı Kiralama Raporu
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              variant="outlined"
              size="small"
            >
              Excel'e Aktar
            </Button>
            <Button
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              variant="outlined"
              size="small"
            >
              Yazdır
            </Button>
          </Stack>
        </Stack>

        <Paper sx={{ mb: 3, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Müşteri adı, araç markası/modeli veya plaka ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Toplam {filteredRentals.length} kiralama
            </Typography>
          </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ 
            '& .MuiTableCell-root': { 
              padding: '2px 4px', 
              fontSize: '0.65rem', 
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              borderRight: '1px solid #e0e0e0'
            } 
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 65, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Kiralama Tarihi
                </TableCell>
                <TableCell sx={{ minWidth: 50, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Plaka
                </TableCell>
                <TableCell sx={{ minWidth: 70, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Araç İsmi
                </TableCell>
                <TableCell sx={{ minWidth: 65, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Geri Dönüş
                </TableCell>
                <TableCell sx={{ minWidth: 80, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Kiralayan
                </TableCell>
                <TableCell sx={{ minWidth: 30, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'center', fontSize: '0.6rem' }}>
                  Gün
                </TableCell>
                <TableCell sx={{ minWidth: 55, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Kira
                </TableCell>
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  KM
                </TableCell>
                <TableCell sx={{ minWidth: 60, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Kira+KM
                </TableCell>
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Temizlik
                </TableCell>
                <TableCell sx={{ minWidth: 35, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  HGS
                </TableCell>
                <TableCell sx={{ minWidth: 50, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Kaza/Yakıt
                </TableCell>
                <TableCell sx={{ minWidth: 60, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Toplam
                </TableCell>
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Peşin
                </TableCell>
                <TableCell sx={{ minWidth: 35, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  1.Öd
                </TableCell>
                <TableCell sx={{ minWidth: 35, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  2.Öd
                </TableCell>
                <TableCell sx={{ minWidth: 35, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  3.Öd
                </TableCell>
                <TableCell sx={{ minWidth: 35, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  4.Öd
                </TableCell>
                <TableCell sx={{ minWidth: 55, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Ödeme Durumu
                </TableCell>
                <TableCell sx={{ minWidth: 50, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Bakiye
                </TableCell>
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'center', fontSize: '0.6rem' }}>
                  Durum
                </TableCell>
                <TableCell sx={{ minWidth: 70, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Açıklama
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRentals.map((rental) => (
                <TableRow 
                  key={rental.id} 
                  sx={{ 
                    '&:nth-of-type(odd)': { bgcolor: 'grey.50' },
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <TableCell>{formatDate(rental.startDate)}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{rental.vehicle.plate}</TableCell>
                  <TableCell>{rental.vehicle.name || 'Bilinmiyor'}</TableCell>
                  <TableCell>{formatDate(rental.endDate)}</TableCell>
                  <TableCell>
                    {`${rental.customer.firstName} ${rental.customer.lastName}`.trim() || 'Bilinmiyor'}
                  </TableCell>
                  <TableCell align="center">{rental.days}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.totalPrice)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.kmPrice)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(rental.totalPrice + rental.kmTotal)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(rental.fuelCost)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.hgsFee)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.damageFee)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(rental.totalAmount)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(rental.advancePayment)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment1)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment2)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment3)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment4)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={getPaymentStatusText(rental.paymentStatus)}
                      color={getPaymentStatusColor(rental.paymentStatus)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 600,
                      color: rental.balance > 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    {formatCurrency(rental.balance)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getStatusText(rental.status)}
                      color={getStatusColor(rental.status)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell>{rental.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredRentals.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Herhangi bir kiralama bulunamadı
            </Typography>
          </Box>
        )}
      </Container>
    </Layout>
  );
};
