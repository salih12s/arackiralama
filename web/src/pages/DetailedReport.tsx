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
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { rentalsApi } from '../api/rentals';
import { vehiclesApi } from '../api/vehicles';
import { customersApi } from '../api/client';
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
  customerId: string;
  vehicleId: string;
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
  rentalType: string;
  // Ödemeler
  payment1: number;
  payment2: number;
  payment3: number;
  payment4: number;
  // Yakıt bedeli ayrı
  actualFuelCost: number;
  // Açıklama alanı
  description?: string;
}

export const DetailedReport: React.FC = () => {
  const [rentals, setRentals] = useState<RentalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [filteredRentals, setFilteredRentals] = useState<RentalData[]>([]);
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<RentalData | null>(null);
  const [editForm, setEditForm] = useState({
    startDate: '',
    endDate: '',
    customerId: '',
    vehicleId: '',
    days: 0,
    dailyPrice: 0,
    kmPrice: 0,
    hgsFee: 0,
    damageFee: 0,
    actualFuelCost: 0,
    fuelCost: 0, // temizlik
    advancePayment: 0,
    payment1: 0,
    payment2: 0,
    payment3: 0,
    payment4: 0,
    rentalType: 'NEW' as 'NEW' | 'EXTENSION'
  });

  // Data for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Form calculation helpers
  const calculateDaysFromDates = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Remove +1 to fix calculation
    return diffDays;
  };

  const calculateEndDate = (startDate: string, days: number) => {
    if (!startDate || !days) return '';
    const start = new Date(startDate);
    start.setDate(start.getDate() + days);
    return start.toISOString().split('T')[0];
  };

  const handleEditFormChange = (field: string, value: any) => {
    let newForm = { ...editForm, [field]: value };

    // Auto-calculate dates and days
    if (field === 'startDate' || field === 'endDate') {
      if (newForm.startDate && newForm.endDate) {
        const calculatedDays = calculateDaysFromDates(newForm.startDate, newForm.endDate);
        newForm.days = calculatedDays;
      }
    } else if (field === 'days') {
      if (newForm.startDate && value > 0) {
        const calculatedEndDate = calculateEndDate(newForm.startDate, value);
        newForm.endDate = calculatedEndDate;
      }
    }

    setEditForm(newForm);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Sadece borcu bitmiş müşterileri filtrele (balance = 0)
    let filtered = rentals.filter(rental => rental.balance <= 0);
    
    // Araç filtresi uygula
    if (selectedVehicle) {
      filtered = filtered.filter(rental => rental.vehicleId === selectedVehicle);
    }
    
    // Arama terimini uygula
    if (searchTerm) {
      filtered = filtered.filter(rental =>
        rental.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRentals(filtered);
  }, [searchTerm, selectedVehicle, rentals]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rentalsResponse, vehiclesResponse, customersResponse] = await Promise.all([
        rentalsApi.getAll(),
        vehiclesApi.getAll(),
        customersApi.getAll()
      ]);

      console.log('Rentals Response:', rentalsResponse);
      console.log('Vehicles Response:', vehiclesResponse);
      console.log('Customers Response:', customersResponse);

      const rentalsData = rentalsResponse.data;
      const vehiclesData = vehiclesResponse.data ? vehiclesResponse.data : vehiclesResponse;
      const customersData = customersResponse.data ? customersResponse.data.data : customersResponse.data;

      if (!rentalsData || !vehiclesData || !customersData) {
        console.error('Missing data:', { rentalsData, vehiclesData, customersData });
        setError('Veriler yüklenirken hata oluştu');
        return;
      }

      // Set dropdown data
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);

        const formattedData: RentalData[] = rentalsData.map((rental: any) => {
          console.log('Rental data:', rental); // Debug için
          
          const vehicle = Array.isArray(vehiclesData) 
            ? vehiclesData.find((v: any) => v.id === rental.vehicleId)
            : null;
            
          console.log('Found vehicle:', vehicle); // Debug için
          console.log('Customer data:', rental.customer); // Debug için
          
          // API'dan TL cinsinden geliyor, direkt kullan
          const days = rental.days || 0;
          const dailyPrice = rental.dailyPrice || 0;  // TL cinsinden
          const totalPrice = days * dailyPrice;
          
          // KM bilgileri - TL cinsinden
          const kmDiff = rental.kmDiff || 0;
          
          const hgsFee = rental.hgs || 0;        // TL cinsinden
          const cleaningFee = rental.cleaning || 0; // TL cinsinden
          
          // Kaza ve yakıt ücretleri - TL cinsinden
          const damageFee = rental.damage || 0;
          const fuelCost = rental.fuel || 0;
          const otherFees = 0;
          
          const totalAmount = totalPrice + kmDiff + hgsFee + cleaningFee + damageFee + fuelCost + otherFees;
          const advancePayment = rental.upfront || 0; // TL cinsinden
          
          // Ödemeler - TL cinsinden
          const pay1 = rental.pay1 || 0;
          const pay2 = rental.pay2 || 0;
          const pay3 = rental.pay3 || 0;
          const pay4 = rental.pay4 || 0;
          
          const totalPaid = (rental.payments || []).reduce((sum: number, payment: any) => 
            sum + (payment.amount || 0), 0  // Ödemeler de TL cinsinden
          ) + advancePayment + pay1 + pay2 + pay3 + pay4;
          
          const balance = totalAmount - totalPaid;

          return {
            id: rental.id,
            startDate: rental.startDate,
            endDate: rental.endDate,
            customerId: rental.customerId,
            vehicleId: rental.vehicleId,
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
            kmTotal: kmDiff, // KM ücreti (TL)
            hgsFee,
            damageFee, // Sadece kaza ücreti
            fuelCost: cleaningFee, // Temizlik ücreti fuel sütununda gösteriliyor
            otherFees,
            totalAmount,
            advancePayment,
            totalPaid,
            balance,
            status: rental.status,
            rentalType: rental.rentalType || 'NEW',
            // Ödemeler - TL cinsinden
            payment1: pay1,
            payment2: pay2,
            payment3: pay3,
            payment4: pay4,
            // Yakıt bedeli ayrı - kuruş cinsinden
            actualFuelCost: fuelCost, // Gerçek yakıt ücreti
            // Açıklama alanı
            description: rental.description || ''
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
      case 'COMPLETED': return 'TESLİM EDİLDİ';
      case 'RETURNED': return 'TESLİM EDİLDİ';
      case 'CANCELLED': return 'İPTAL';
      case 'RESERVED': return 'REZERVE';
      default: return status;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const handleExport = () => {
    // TODO: Export functionality
    console.log('Export functionality will be implemented');
  };

  const handleEditRental = (rentalId: string) => {
    const rental = filteredRentals.find(r => r.id === rentalId);
    if (rental) {
      console.log('Edit rental data:', rental); // Debug için
      setEditingRental(rental);
      // Tablodaki hesaplanmış değerleri kullan - API'dan gelen ham değerleri değil
      const newEditForm = {
        startDate: rental.startDate,
        endDate: rental.endDate,
        customerId: rental.customerId,
        vehicleId: rental.vehicleId,
        days: rental.days,
        dailyPrice: rental.dailyPrice,              // Tablodaki günlük fiyat
        kmPrice: rental.kmPrice,                    // Tablodaki KM ücreti
        hgsFee: rental.hgsFee,                      // Tablodaki HGS ücreti  
        damageFee: rental.damageFee,                // Tablodaki kaza ücreti
        actualFuelCost: rental.actualFuelCost,      // Tablodaki yakıt ücreti
        fuelCost: rental.fuelCost,                  // Tablodaki temizlik ücreti
        advancePayment: rental.advancePayment,      // Tablodaki peşin ödeme
        payment1: rental.payment1,                  // Tablodaki 1. ödeme
        payment2: rental.payment2,                  // Tablodaki 2. ödeme  
        payment3: rental.payment3,                  // Tablodaki 3. ödeme
        payment4: rental.payment4,                  // Tablodaki 4. ödeme
        rentalType: (rental.rentalType || 'NEW') as 'NEW' | 'EXTENSION'
      };
      
      console.log('Setting editForm with values:', newEditForm); // Debug için
      setEditForm(newEditForm);
      setEditModalOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRental) return;

    try {
      setLoading(true);
      // Update rental via API - matching API field names
      // Modal TL cinsinden, API de TL bekliyor, direkt gönder
      const updatedData = {
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        customerId: editForm.customerId,        
        vehicleId: editForm.vehicleId,
        days: editForm.days || 0,
        dailyPrice: editForm.dailyPrice,        // TL cinsinden direkt gönder
        kmDiff: editForm.kmPrice,               // TL cinsinden direkt gönder
        hgs: editForm.hgsFee,                   // TL cinsinden direkt gönder
        damage: editForm.damageFee,             // TL cinsinden direkt gönder
        fuel: editForm.actualFuelCost,          // TL cinsinden direkt gönder
        cleaning: editForm.fuelCost,            // TL cinsinden direkt gönder
        upfront: editForm.advancePayment || 0,  // TL cinsinden direkt gönder
        pay1: editForm.payment1,                // TL cinsinden direkt gönder
        pay2: editForm.payment2,                // TL cinsinden direkt gönder
        pay3: editForm.payment3,                // TL cinsinden direkt gönder
        pay4: editForm.payment4,                // TL cinsinden direkt gönder
        rentalType: editForm.rentalType
      };

      console.log('Updating rental with data:', updatedData);

      // Call API to update rental
      await rentalsApi.update(editingRental.id, updatedData);
      
      // Refresh data
      await fetchData();
      
      // Close modal
      setEditModalOpen(false);
      setEditingRental(null);
      
      console.log('Rental updated successfully');
    } catch (error) {
      console.error('Error updating rental:', error);
      setError('Kiralama güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditingRental(null);
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
      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }} 
          sx={{ mb: { xs: 2, sm: 4 } }}
          spacing={{ xs: 2, sm: 0 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              variant="outlined"
              size="small"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 }
              }}
            >
              Excel'e Aktar
            </Button>
            <Button
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              variant="outlined"
              size="small"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 1.5 }
              }}
            >
              Yazdır
            </Button>
          </Stack>
        </Stack>

        <Paper sx={{ mb: 3, p: { xs: 1.5, sm: 2 } }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems={{ xs: 'stretch', sm: 'center' }} 
            flexWrap="wrap"
          >
            <TextField
              placeholder="Müşteri adı, araç markası/modeli veya plaka ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 300 }, width: { xs: '100%', sm: 'auto' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Araç Seçiniz</InputLabel>
              <Select
                value={selectedVehicle}
                label="Araç Seçiniz"
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                <MenuItem value="">Tüm Araçlar</MenuItem>
                {vehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedVehicle && (
              <Button
                size="small"
                onClick={() => setSelectedVehicle('')}
                color="secondary"
              >
                Filtreyi Temizle
              </Button>
            )}
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
                <TableCell sx={{ minWidth: 80, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Kiralama Tarihi
                </TableCell>
                <TableCell sx={{ minWidth: 50, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Plaka
                </TableCell>
                <TableCell sx={{ minWidth: 70, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Araç İsmi
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
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Kaza
                </TableCell>
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Yakıt
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
                <TableCell sx={{ minWidth: 50, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'right', fontSize: '0.6rem' }}>
                  Bakiye
                </TableCell>
                <TableCell sx={{ minWidth: 45, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'center', fontSize: '0.6rem' }}>
                  Durum
                </TableCell>
                <TableCell sx={{ minWidth: 100, fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.6rem' }}>
                  Açıklama
                </TableCell>
                <TableCell sx={{ minWidth: 60, fontWeight: 'bold', bgcolor: 'grey.100', textAlign: 'center', fontSize: '0.6rem' }}>
                  İşlemler
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
                  <TableCell>
                    <Box>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                        {formatDate(rental.startDate)}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                        {formatDate(rental.endDate)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{rental.vehicle.plate}</TableCell>
                  <TableCell>{rental.vehicle.name || 'Bilinmiyor'}</TableCell>
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
                  <TableCell align="right">{formatCurrency(rental.actualFuelCost)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(rental.totalAmount)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(rental.advancePayment)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment1)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment2)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment3)}</TableCell>
                  <TableCell align="right">{formatCurrency(rental.payment4)}</TableCell>
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
                  <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Tooltip title={rental.description || 'Açıklama bulunmuyor'} arrow>
                      <span style={{ cursor: rental.description ? 'help' : 'default' }}>
                        {rental.description || '-'}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', minWidth: 'auto', px: 1 }}
                      onClick={() => handleEditRental(rental.id)}
                    >
                      Düzenle
                    </Button>
                  </TableCell>
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

        {/* Edit Rental Modal */}
        <Dialog open={editModalOpen} onClose={handleCloseEdit} maxWidth="md" fullWidth>
          <DialogTitle>
            Kiralama Düzenle - {editingRental?.vehicle.plate} ({editingRental?.customer.firstName} {editingRental?.customer.lastName})
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Dates */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Başlangıç Tarihi"
                  type="date"
                  value={editForm.startDate ? editForm.startDate.split('T')[0] : ''}
                  onChange={(e) => handleEditFormChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Bitiş Tarihi"
                  type="date"
                  value={editForm.endDate ? editForm.endDate.split('T')[0] : ''}
                  onChange={(e) => handleEditFormChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Customer & Vehicle Selection */}
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Müşteri</InputLabel>
                  <Select
                    value={editForm.customerId}
                    onChange={(e) => handleEditFormChange('customerId', e.target.value)}
                    label="Müşteri"
                  >
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.fullName || customer.firstName + ' ' + customer.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Araç</InputLabel>
                  <Select
                    value={editForm.vehicleId}
                    onChange={(e) => handleEditFormChange('vehicleId', e.target.value)}
                    label="Araç"
                  >
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Rental Type */}
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Kiralama Türü</InputLabel>
                  <Select
                    value={editForm.rentalType}
                    onChange={(e) => handleEditFormChange('rentalType', e.target.value)}
                    label="Kiralama Türü"
                  >
                    <MenuItem value="NEW">Yeni Kiralama</MenuItem>
                    <MenuItem value="EXTENSION">Uzatma</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Gün Sayısı"
                  type="text"
                  value={editForm.days || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('days', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Günlük Fiyat (₺)"
                  type="text"
                  value={editForm.dailyPrice || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('dailyPrice', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="KM Ücreti (₺)"
                  type="text"
                  value={editForm.kmPrice || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('kmPrice', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="HGS Ücreti (₺)"
                  type="text"
                  value={editForm.hgsFee || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('hgsFee', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Kaza Ücreti (₺)"
                  type="text"
                  value={editForm.damageFee || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('damageFee', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Yakıt Ücreti (₺)"
                  type="text"
                  value={editForm.actualFuelCost || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('actualFuelCost', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Temizlik Ücreti (₺)"
                  type="text"
                  value={editForm.fuelCost || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('fuelCost', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Peşin Ödeme (₺)"
                  type="text"
                  value={editForm.advancePayment || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('advancePayment', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="1. Ödeme (₺)"
                  type="text"
                  value={editForm.payment1 || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('payment1', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="2. Ödeme (₺)"
                  type="text"
                  value={editForm.payment2 || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('payment2', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="3. Ödeme (₺)"
                  type="text"
                  value={editForm.payment3 || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('payment3', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="4. Ödeme (₺)"
                  type="text"
                  value={editForm.payment4 || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    if (!isNaN(value)) {
                      handleEditFormChange('payment4', value);
                    }
                  }}
                  inputProps={{ 
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*'
                  }}
                />
              </Grid>

              {/* Calculated Totals */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Toplam Ödenecek: {formatCurrency(
                          ((editForm.days || 0) * (editForm.dailyPrice || 0)) + 
                          (editForm.kmPrice || 0) + (editForm.hgsFee || 0) + (editForm.damageFee || 0) + 
                          (editForm.actualFuelCost || 0) + (editForm.fuelCost || 0)
                        )}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Ödenen: {formatCurrency(
                          (() => {
                            // Taksit ödemelerini hesapla
                            const installmentPayments = (editForm.advancePayment || 0) + 
                                                       (editForm.payment1 || 0) + 
                                                       (editForm.payment2 || 0) + 
                                                       (editForm.payment3 || 0) + 
                                                       (editForm.payment4 || 0);
                            
                            // Ek ödemeleri hesapla (editingRental'dan)
                            const extraPayments = editingRental && editingRental.totalPaid ? 
                              editingRental.totalPaid - (
                                (editingRental.advancePayment || 0) + 
                                (editingRental.payment1 || 0) + 
                                (editingRental.payment2 || 0) + 
                                (editingRental.payment3 || 0) + 
                                (editingRental.payment4 || 0)
                              ) : 0;
                            
                            return installmentPayments + (extraPayments > 0 ? extraPayments : 0);
                          })()
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: (
                            (() => {
                              // Toplam tutar
                              const totalDue = ((editForm.days || 0) * (editForm.dailyPrice || 0)) + 
                                             (editForm.kmPrice || 0) + (editForm.hgsFee || 0) + (editForm.damageFee || 0) + 
                                             (editForm.actualFuelCost || 0) + (editForm.fuelCost || 0);
                              
                              // Taksit ödemelerini hesapla
                              const installmentPayments = (editForm.advancePayment || 0) + 
                                                         (editForm.payment1 || 0) + 
                                                         (editForm.payment2 || 0) + 
                                                         (editForm.payment3 || 0) + 
                                                         (editForm.payment4 || 0);
                              
                              // Ek ödemeleri hesapla (editingRental'dan)
                              const extraPayments = editingRental && editingRental.totalPaid ? 
                                editingRental.totalPaid - (
                                  (editingRental.advancePayment || 0) + 
                                  (editingRental.payment1 || 0) + 
                                  (editingRental.payment2 || 0) + 
                                  (editingRental.payment3 || 0) + 
                                  (editingRental.payment4 || 0)
                                ) : 0;
                              
                              const totalPaid = installmentPayments + (extraPayments > 0 ? extraPayments : 0);
                              
                              return totalDue - totalPaid;
                            })()
                          ) > 0 ? 'error.main' : 'success.main'
                        }}
                      >
                        Kalan Bakiye: {formatCurrency(
                          (() => {
                            // Toplam tutar
                            const totalDue = ((editForm.days || 0) * (editForm.dailyPrice || 0)) + 
                                           (editForm.kmPrice || 0) + (editForm.hgsFee || 0) + (editForm.damageFee || 0) + 
                                           (editForm.actualFuelCost || 0) + (editForm.fuelCost || 0);
                            
                            // Taksit ödemelerini hesapla
                            const installmentPayments = (editForm.advancePayment || 0) + 
                                                       (editForm.payment1 || 0) + 
                                                       (editForm.payment2 || 0) + 
                                                       (editForm.payment3 || 0) + 
                                                       (editForm.payment4 || 0);
                            
                            // Ek ödemeleri hesapla (editingRental'dan)
                            const extraPayments = editingRental && editingRental.totalPaid ? 
                              editingRental.totalPaid - (
                                (editingRental.advancePayment || 0) + 
                                (editingRental.payment1 || 0) + 
                                (editingRental.payment2 || 0) + 
                                (editingRental.payment3 || 0) + 
                                (editingRental.payment4 || 0)
                              ) : 0;
                            
                            const totalPaid = installmentPayments + (extraPayments > 0 ? extraPayments : 0);
                            
                            return totalDue - totalPaid;
                          })()
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>İptal</Button>
            <Button variant="contained" onClick={handleSaveEdit}>
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};
