import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Alert,
  TextField,
  InputAdornment,
  Avatar,
  Select,
} from '@mui/material';
import {
  DirectionsCar,
  Schedule,
  Build,
  Warning as WarningIcon,
  Add,
  Visibility,
  Timeline,
  CheckCircle,
  MoreVert,
  Assignment,
  Payment,
  GetApp,
  PictureAsPdf,
  PersonAdd,
  Delete,
  Refresh as RefreshIcon,
  Search,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MonetizationOn as MoneyIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  reportsApi,
  rentalsApi,
  vehiclesApi,
  formatCurrency,
  DashboardStats,
  DebtorReport,
  Rental,
  Vehicle,
} from '../api/client';
import Layout from '../components/Layout';
import KpiCard from '../components/KpiCard';
import NewRentalDialog from '../components/NewRentalDialog';
import AddPaymentDialog from '../components/AddPaymentDialog';
import EditRentalDialog from '../components/EditRentalDialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newRentalOpen, setNewRentalOpen] = useState(false);
  const [debtorDeleteDialog, setDebtorDeleteDialog] = useState<{open: boolean; rental: any}>({
    open: false,
    rental: null
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [quickRentalDialog, setQuickRentalDialog] = useState<{open: boolean; vehicle: Vehicle | null}>({
    open: false,
    vehicle: null
  });
  const [detailDialog, setDetailDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
  const [completeDialog, setCompleteDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
  const [paymentDialog, setPaymentDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });
  const [vehicleDeleteDialog, setVehicleDeleteDialog] = useState<{open: boolean; vehicle: Vehicle | null}>({
    open: false,
    vehicle: null
  });
  const [vehicleDetailDialog, setVehicleDetailDialog] = useState<{open: boolean; vehicle: Vehicle | null}>({
    open: false,
    vehicle: null
  });
  const [editRentalDialog, setEditRentalDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });

  // Vehicle detail data when modal is open
  const { data: vehicleDetailData, isLoading: vehicleDetailLoading } = useQuery({
    queryKey: ['vehicle-detail', vehicleDetailDialog.vehicle?.id],
    queryFn: () => vehiclesApi.getById(vehicleDetailDialog.vehicle!.id),
    enabled: !!vehicleDetailDialog.vehicle?.id && vehicleDetailDialog.open,
  });

  // Vehicle income report for detailed modal
  const { data: vehicleIncomeReport } = useQuery({
    queryKey: ['vehicle-income-report'],
    queryFn: () => reportsApi.getVehicleIncomeReport(),
    enabled: vehicleDetailDialog.open,
  });
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; rental: Rental | null}>({
    open: false,
    rental: null
  });

  // Filtreleme state'leri
  const [activeRentalsFilter, setActiveRentalsFilter] = useState('');
  const [completedRentalsFilter, setCompletedRentalsFilter] = useState('');
  const [debtorsFilter, setDebtorsFilter] = useState('');
  const [vehiclesFilter, setVehiclesFilter] = useState('');

  // === DATA FETCH ===
  const { data: statsRes, isFetching: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsApi.getDashboardStats,
    staleTime: 30 * 1000, // 30 saniye fresh tut
    gcTime: 2 * 60 * 1000, // 2 dakika cache'de sakla
  });

  const { data: debtorsRes } = useQuery({
    queryKey: ['debtors'],
    queryFn: reportsApi.getDebtors,
    staleTime: 30 * 1000, // 30 saniye fresh tut
    gcTime: 2 * 60 * 1000, // 2 dakika cache'de sakla
  });


  // Boşta olan araçları getir
  const { data: idleVehiclesRes, isFetching: idleLoading } = useQuery({
    queryKey: ['idle-vehicles'],
    queryFn: () => vehiclesApi.getAll('IDLE'),
    staleTime: 45 * 1000, // 45 saniye fresh tut
    gcTime: 3 * 60 * 1000, // 3 dakika cache'de sakla
  });

  // Rezerve araçları getir
  const { data: reservedVehiclesRes } = useQuery({
    queryKey: ['reserved-vehicles'],
    queryFn: () => vehiclesApi.getAll('RESERVED'),
    staleTime: 45 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Serviste olan araçları getir
  const { data: serviceVehiclesRes } = useQuery({
    queryKey: ['service-vehicles'],
    queryFn: () => vehiclesApi.getAll('SERVICE'),
    staleTime: 45 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Aktif kiralamaları getir
  const { data: activeRentalsRes, isFetching: activeLoading } = useQuery({
    queryKey: ['active-rentals'],
    queryFn: async () => {
      console.log('🔄 Fetching active rentals...');
      const result = await rentalsApi.getAll({ limit: 100 });
      console.log('📋 Active rentals API response:', result);
      console.log('📋 Active rentals data structure:', result.data);
      return result;
    },
    staleTime: 20 * 1000, // 20 saniye fresh tut (en dinamik data)
    gcTime: 1 * 60 * 1000, // 1 dakika cache'de sakla
  });

  // Geçmiş kiralamaları getir
  const { data: completedRentalsRes } = useQuery({
    queryKey: ['completed-rentals'],
    queryFn: async () => {
      console.log('🔄 Fetching completed rentals...');
      const result = await rentalsApi.getAll({ limit: 50 });
      console.log('📋 Completed rentals API response:', result);
      console.log('📋 Completed rentals data structure:', result.data);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 dakika fresh tut (daha az değişken)
    gcTime: 5 * 60 * 1000, // 5 dakika cache'de sakla
  });

  // Borç ödeme mutation'ı
  const markDebtAsPaidMutation = useMutation({
    mutationFn: async (rentalId: string) => {
      // Bu endpoint'i API'de oluşturmamız gerekecek
      return fetch(`/api/rentals/${rentalId}/mark-paid`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDebtorDeleteDialog({open: false, rental: null});
    },
  });

  // Kiralama teslim alma mutation'ı
  const completeRentalMutation = useMutation({
    mutationFn: async (rentalId: string) => {
      return rentalsApi.complete(rentalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCompleteDialog({ open: false, rental: null });
    },
    onError: (error) => {
      console.error('Complete rental error:', error);
    },
  });

  // Kiralama silme mutation'ı
  const deleteRentalMutation = useMutation({
    mutationFn: async (rentalId: string) => {
      return rentalsApi.delete(rentalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteDialog({ open: false, rental: null });
    },
  });

  // Araç silme mutation'ı
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setVehicleDeleteDialog({ open: false, vehicle: null });
    },
    onError: (error: any) => {
      console.error('Vehicle delete error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Araç silme hatası';
      alert(errorMessage);
    },
  });

  // Araç durum değiştirme mutation'ı
  const changeVehicleStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE' }) => 
      vehiclesApi.update(vehicleId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['reserved-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['service-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      console.error('Vehicle status change error:', error);
      alert('Araç durumu değiştirme hatası');
    },
  });

  // === DATA PROCESSING ===
  const stats: DashboardStats = statsRes?.data ?? {
    totalVehicles: 0,
    rentedToday: 0,
    idle: 0,
    reserved: 0,
    service: 0,
    monthBilled: 0,
    monthCollected: 0,
    monthOutstanding: 0,
    monthVehicleProfit: 0,
  };

  const debtors: DebtorReport[] = debtorsRes?.data ?? [];
  const idleVehicles: Vehicle[] = idleVehiclesRes?.data ?? [];
  const reservedVehicles: Vehicle[] = reservedVehiclesRes?.data ?? [];
  const serviceVehicles: Vehicle[] = serviceVehiclesRes?.data ?? [];

  // === UTILITY FUNCTIONS ===
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, rental: Rental) => {
    setAnchorEl(event.currentTarget);
    setSelectedRental(rental);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRental(null);
  };

  const handleVehicleStatusChange = (vehicleId: string, newStatus: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE') => {
    changeVehicleStatusMutation.mutate({ vehicleId, status: newStatus });
  };

  const exportToExcel = () => {
    const activeRentals: Rental[] = activeRentalsRes?.data.data ?? [];
    const filteredRentals = activeRentals
      .filter((rental: Rental) => rental.status === 'ACTIVE')
      .filter((rental: Rental) => {
        if (!activeRentalsFilter) return true;
        const filter = activeRentalsFilter.toLowerCase();
        return (
          rental.vehicle?.plate?.toLowerCase().includes(filter) ||
          rental.customer?.fullName?.toLowerCase().includes(filter) ||
          rental.customer?.phone?.toLowerCase().includes(filter) ||
          rental.vehicle?.name?.toLowerCase().includes(filter)
        );
      });
    
    const data = filteredRentals.map(rental => {
      const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const actualBalance = rental.totalDue - (paidFromRental + paidFromPayments);
      
      return {
        'Plaka': rental.vehicle?.plate || '',
        'Müşteri': rental.customer?.fullName || '',
        'Başlangıç': dayjs(rental.startDate).format('DD.MM.YYYY'),
        'Bitiş': dayjs(rental.endDate).format('DD.MM.YYYY'),
        'Gün': rental.days,
        'Günlük Fiyat': rental.dailyPrice / 100,
        'Toplam Tutar': rental.totalDue / 100,
        'Ödenen': (paidFromRental + paidFromPayments) / 100,
        'Kalan': actualBalance / 100,
        'Durum': rental.status === 'ACTIVE' ? 'Aktif' : rental.status,
        'Not': rental.note || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aktif Kiralamalar');
    XLSX.writeFile(wb, `aktif-kiralamalar-${dayjs().format('DD-MM-YYYY')}.xlsx`);
  };

  const exportToPDF = () => {
    const activeRentals: Rental[] = activeRentalsRes?.data.data ?? [];
    const filteredRentals = activeRentals
      .filter((rental: Rental) => rental.status === 'ACTIVE')
      .filter((rental: Rental) => {
        if (!activeRentalsFilter) return true;
        const filter = activeRentalsFilter.toLowerCase();
        return (
          rental.vehicle?.plate?.toLowerCase().includes(filter) ||
          rental.customer?.fullName?.toLowerCase().includes(filter) ||
          rental.customer?.phone?.toLowerCase().includes(filter) ||
          rental.vehicle?.name?.toLowerCase().includes(filter)
        );
      });
    
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Aktif Kiralamalar', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 14, 25);

    const tableData = filteredRentals.map(rental => {
      const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const actualBalance = rental.totalDue - (paidFromRental + paidFromPayments);
      
      return [
        rental.vehicle?.plate || '',
        rental.customer?.fullName || '',
        dayjs(rental.startDate).format('DD.MM.YYYY'),
        dayjs(rental.endDate).format('DD.MM.YYYY'),
        rental.days.toString(),
        formatCurrency(rental.totalDue),
        formatCurrency(actualBalance),
      ];
    });

    autoTable(doc, {
      head: [['Plaka', 'Müşteri', 'Başlangıç', 'Bitiş', 'Gün', 'Tutar', 'Kalan']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 50, 130] },
    });

    doc.save(`aktif-kiralamalar-${dayjs().format('DD-MM-YYYY')}.pdf`);
  };

  // Geçmiş Kiralamalar Export Fonksiyonları
  const exportCompletedToExcel = () => {
    const completedRentals: Rental[] = (completedRentalsRes?.data.data || [])
      .filter((rental: Rental) => rental.status === 'COMPLETED')
      .filter((rental: Rental) => {
        if (!completedRentalsFilter) return true;
        const filter = completedRentalsFilter.toLowerCase();
        return (
          rental.vehicle?.plate?.toLowerCase().includes(filter) ||
          rental.customer?.fullName?.toLowerCase().includes(filter)
        );
      });
    
    const data = completedRentals.map(rental => {
      const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const actualBalance = rental.totalDue - (paidFromRental + paidFromPayments);
      
      return {
        'Plaka': rental.vehicle?.plate || '',
        'Müşteri': rental.customer?.fullName || '',
        'Başlangıç': dayjs(rental.startDate).format('DD.MM.YYYY'),
        'Bitiş': dayjs(rental.endDate).format('DD.MM.YYYY'),
        'Gün': rental.days,
        'Günlük Fiyat': rental.dailyPrice / 100,
        'Toplam Tutar': rental.totalDue / 100,
        'Ödenen': (paidFromRental + paidFromPayments) / 100,
        'Kalan': actualBalance / 100,
        'Durum': 'Tamamlandı',
        'Not': rental.note || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Geçmiş Kiralamalar');
    XLSX.writeFile(wb, `gecmis-kiralamalar-${dayjs().format('DD-MM-YYYY')}.xlsx`);
  };

  const exportCompletedToPDF = () => {
    const completedRentals: Rental[] = (completedRentalsRes?.data.data || [])
      .filter((rental: Rental) => rental.status === 'COMPLETED')
      .filter((rental: Rental) => {
        if (!completedRentalsFilter) return true;
        const filter = completedRentalsFilter.toLowerCase();
        return (
          rental.vehicle?.plate?.toLowerCase().includes(filter) ||
          rental.customer?.fullName?.toLowerCase().includes(filter)
        );
      });
    
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Geçmiş Kiralamalar', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 14, 25);

    const tableData = completedRentals.map(rental => {
      const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
      const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const actualBalance = rental.totalDue - (paidFromRental + paidFromPayments);
      
      return [
        rental.vehicle?.plate || '',
        rental.customer?.fullName || '',
        `${dayjs(rental.startDate).format('DD.MM.YYYY')} - ${dayjs(rental.endDate).format('DD.MM.YYYY')}`,
        rental.days.toString(),
        formatCurrency(rental.totalDue),
        formatCurrency(actualBalance),
      ];
    });

    autoTable(doc, {
      head: [['Plaka', 'Müşteri', 'Tarih Aralığı', 'Gün', 'Tutar', 'Kalan Borç']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 50, 130] },
    });

    doc.save(`gecmis-kiralamalar-${dayjs().format('DD-MM-YYYY')}.pdf`);
  };

  // Borçlu Müşteriler Export Fonksiyonları
  const exportDebtorsToExcel = () => {
    const filteredDebtors = debtors.filter((debtor) => {
      if (!debtorsFilter) return true;
      const filter = debtorsFilter.toLowerCase();
      return (
        debtor.customerName?.toLowerCase().includes(filter) ||
        debtor.plate?.toLowerCase().includes(filter)
      );
    });
    
    const data = filteredDebtors.map(debtor => ({
      'Müşteri Adı': debtor.customerName || '',
      'Telefon': '-',
      'Araç Plaka': debtor.plate || '',
      'Kiralama Tarihi': format(new Date(debtor.startDate), 'dd.MM.yyyy'),
      'Borç Miktarı': debtor.balance / 100,
      'Durum': 'Borçlu',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Borçlu Müşteriler');
    XLSX.writeFile(wb, `borclu-musteriler-${dayjs().format('DD-MM-YYYY')}.xlsx`);
  };

  const exportDebtorsToPDF = () => {
    const filteredDebtors = debtors.filter((debtor) => {
      if (!debtorsFilter) return true;
      const filter = debtorsFilter.toLowerCase();
      return (
        debtor.customerName?.toLowerCase().includes(filter) ||
        debtor.plate?.toLowerCase().includes(filter)
      );
    });
    
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Borçlu Müşteriler', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 14, 25);

    const tableData = filteredDebtors.map(debtor => [
      debtor.customerName || '',
      '-',
      debtor.plate || '',
      format(new Date(debtor.startDate), 'dd.MM.yyyy'),
      formatCurrency(debtor.balance),
    ]);

    autoTable(doc, {
      head: [['Ad Soyad', 'Telefon', 'Araç', 'Kiralama Tarihi', 'Borç Miktarı']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 50, 130] },
    });

    doc.save(`borclu-musteriler-${dayjs().format('DD-MM-YYYY')}.pdf`);
  };

  const handleQuickRental = (vehicle: Vehicle) => {
    setQuickRentalDialog({ open: true, vehicle });
  };

  // === UI ===

  // Manuel refresh fonksiyonu
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['debtors'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
    queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
  };

  return (
    <Layout title="Araç Kiralama - Ana Sayfa">
      {/* HEADER */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Genel Bakış
            {(statsLoading || activeLoading || idleLoading) && (
              <Chip 
                label="Güncelleniyor..." 
                size="small" 
                color="info" 
                sx={{ ml: 2, fontSize: '0.7rem' }}
              />
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Günlük istatistikler ve aktif kiralamalar • Akıllı önbellek sistemi
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <IconButton
            onClick={handleRefresh}
            disabled={statsLoading || activeLoading || idleLoading}
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
            startIcon={<Add />}
            onClick={() => setNewRentalOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Yeni Kiralama
          </Button>
          <Button
            variant="outlined"
            startIcon={<DirectionsCar />}
            onClick={() => navigate('/vehicles')}
            sx={{ borderRadius: 2 }}
          >
            Araçlar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Timeline />}
            onClick={() => navigate('/reports')}
            sx={{ borderRadius: 2 }}
          >
            Raporlar
          </Button>
        </Stack>
      </Box>

      {/* KPI CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 1. Kiradaki Araç Sayısı */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Kiradaki Araç" 
            value={stats?.rentedToday ?? 0} 
            color="success" 
            icon="🚗"
          />
        </Grid>
        
        {/* 2. Boştaki Araç Sayısı */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Boştaki Araç" 
            value={stats?.idle ?? 0} 
            color="primary" 
            icon="🅿️"
          />
        </Grid>
        
        {/* 3. Rezerveli Araç Sayısı */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Rezerveli Araç" 
            value={stats?.reserved ?? 0} 
            color="warning" 
            icon="📅"
          />
        </Grid>
        
        {/* 4. Servisteki Araç Sayısı */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Servisteki Araç" 
            value={stats?.service ?? 0} 
            color="error" 
            icon="🔧"
          />
        </Grid>
        
        {/* 5. Güncel Kazanç */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Bu Ay Kazanç" 
            value={stats?.monthCollected ?? 0} 
            isCurrency 
            color="success"
            icon="💰"
          />
        </Grid>
        
        {/* 7. Kazanç Ortalaması (Güncel kazanç / Araç sayısı) */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Araç Başı Ortalama" 
            value={stats?.totalVehicles > 0 ? Math.round((stats?.monthCollected ?? 0) / stats?.totalVehicles) : 0} 
            isCurrency 
            color="info"
            icon="📊"
          />
        </Grid>
        
        {/* 8. Toplam Borç Miktarı */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Toplam Borç" 
            value={stats?.monthOutstanding ?? 0} 
            isCurrency 
            color="error"
            icon="⚠️"
          />
        </Grid>
        
        {/* 9. Toplam Araç Sayısı */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Toplam Araç" 
            value={stats?.totalVehicles ?? 0} 
            color="primary"
            icon="🏢"
          />
        </Grid>
      </Grid>

      {/* ANA İÇERİK - AKTİF KİRALAMALAR TABLOSU */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ color: 'primary.main' }} />
            Aktif Kiralamalar
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<GetApp />}
              onClick={exportToExcel}
              color="success"
            >
              Excel
            </Button>
            <Button
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={exportToPDF}
              color="error"
            >
              PDF
            </Button>
          </Stack>
        </Box>

        {/* Aktif Kiralamalar Filtreleme */}
        <TextField
          size="small"
          placeholder="Ara (plaka, müşteri adı, telefon...)"
          value={activeRentalsFilter}
          onChange={(e) => setActiveRentalsFilter(e.target.value)}
          sx={{ mb: 2, minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        {/* Aktif Kiralamalar Tablosu */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Plaka</strong></TableCell>
                <TableCell><strong>Müşteri</strong></TableCell>
                <TableCell><strong>Başlangıç</strong></TableCell>
                <TableCell><strong>Bitiş</strong></TableCell>
                <TableCell align="center"><strong>Gün</strong></TableCell>
                <TableCell align="right"><strong>Günlük</strong></TableCell>
                <TableCell align="right"><strong>KM Farkı</strong></TableCell>
                <TableCell align="right"><strong>Temizlik</strong></TableCell>
                <TableCell align="right"><strong>HGS</strong></TableCell>
                <TableCell align="right"><strong>Kaza/Sürtme</strong></TableCell>
                <TableCell align="right"><strong>Yakıt</strong></TableCell>
                <TableCell align="right"><strong>Toplam</strong></TableCell>
                <TableCell align="right"><strong>Ödenen</strong></TableCell>
                <TableCell align="right"><strong>Kalan</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
               {(activeRentalsRes?.data.data ?? [])
                .filter((rental: Rental) => rental.status === 'ACTIVE')
                .filter((rental: Rental) => {
                  if (!activeRentalsFilter) return true;
                  const filter = activeRentalsFilter.toLowerCase();
                  return (
                    rental.vehicle?.plate?.toLowerCase().includes(filter) ||
                    rental.customer?.fullName?.toLowerCase().includes(filter) ||
                    rental.customer?.phone?.toLowerCase().includes(filter) ||
                    rental.vehicle?.name?.toLowerCase().includes(filter)
                  );
                })
                .map((rental: Rental) => {
                // Calculate total paid including payments table
                const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
                const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
                const paidAmount = paidFromRental + paidFromPayments;
                
                // Calculate actual balance
                const actualBalance = rental.totalDue - paidAmount;
                
                
                return (
                  <TableRow key={rental.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {rental.vehicle?.plate}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {rental.customer?.fullName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {dayjs(rental.startDate).format('DD.MM.YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {dayjs(rental.endDate).format('DD.MM.YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {rental.days}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(rental.dailyPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="warning.main">
                        {formatCurrency(rental.kmDiff || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="info.main">
                        {formatCurrency(rental.cleaning || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="secondary.main">
                        {formatCurrency(rental.hgs || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main">
                        {formatCurrency(rental.damage || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(rental.fuel || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(rental.totalDue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(paidAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: actualBalance > 0 ? 'error.main' : 'success.main'
                        }}
                      >
                        {formatCurrency(actualBalance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          rental.status === 'ACTIVE' ? 'Aktif' :
                          rental.status === 'COMPLETED' ? 'Tamamlandı' :
                          rental.status === 'CANCELLED' ? 'İptal Edildi' :
                          rental.status
                        }
                        color={
                          rental.status === 'ACTIVE' ? 'success' :
                          rental.status === 'COMPLETED' ? 'info' :
                          rental.status === 'CANCELLED' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => setEditRentalDialog({ open: true, rental })}
                        >
                          Düzenle
                        </Button>
                        <Tooltip title="İşlemler">
                          <IconButton 
                            size="small"
                            onClick={(e) => handleMenuOpen(e, rental)}
                          >
                            <MoreVert />
                          </IconButton>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<CheckCircle />}
                          onClick={() => setCompleteDialog({ open: true, rental })}
                        >
                          Teslim Al
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {(activeRentalsRes?.data.data ?? []).filter((r: Rental) => r.status === 'ACTIVE').length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Henüz aktif kiralama bulunmuyor.
          </Alert>
        )}
      </Paper>

      {/* BOŞTA OLAN ARAÇLAR */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DirectionsCar sx={{ color: 'success.main' }} />
            Boşta Olan Araçlar ({idleVehicles.length})
          </Typography>
        </Box>

        {/* Araçlar Filtreleme */}
        <TextField
          size="small"
          placeholder="Ara (plaka, araç adı, model...)"
          value={vehiclesFilter}
          onChange={(e) => setVehiclesFilter(e.target.value)}
          sx={{ mb: 2, minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        {/* Boşta Olan Araçlar Tablosu */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Plaka</strong></TableCell>
                <TableCell><strong>Araç Adı</strong></TableCell>
                <TableCell align="right"><strong>Toplam Fatura</strong></TableCell>
                <TableCell align="right"><strong>Tahsil Edilen</strong></TableCell>
                <TableCell align="right"><strong>Kalan Bakiye</strong></TableCell>
                <TableCell align="center"><strong>Kiralama Sayısı</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {idleVehicles
                .filter((vehicle) => {
                  if (!vehiclesFilter) return true;
                  const filter = vehiclesFilter.toLowerCase();
                  return (
                    vehicle.plate?.toLowerCase().includes(filter) ||
                    vehicle.name?.toLowerCase().includes(filter)
                  );
                })
                .map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {vehicle.plate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {vehicle.name || 'Araç Adı Belirtilmemiş'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="info.main">
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}
                    >
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {vehicle._count?.rentals || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={vehicle.status}
                      onChange={(e) => handleVehicleStatusChange(vehicle.id, e.target.value as 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE')}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="IDLE">
                        <Chip label="Uygun" color="success" size="small" />
                      </MenuItem>
                      <MenuItem value="RESERVED">
                        <Chip label="Rezerve" color="warning" size="small" />
                      </MenuItem>
                      <MenuItem value="SERVICE">
                        <Chip label="Serviste" color="error" size="small" />
                      </MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => setVehicleDetailDialog({ open: true, vehicle })}
                      >
                        Detaylar
                      </Button>
                      
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => handleQuickRental(vehicle)}
                        sx={{ 
                          bgcolor: 'success.main', 
                          '&:hover': { bgcolor: 'success.dark' }
                        }}
                      >
                        Hızlı Kiralama
                      </Button>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setVehicleDeleteDialog({ open: true, vehicle })}
                        title="Aracı Sil"
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {idleVehicles.length === 0 && (
          <Alert severity="warning">
            Şu anda boşta olan araç bulunmuyor.
          </Alert>
        )}
      </Paper>

      {/* REZERVE ARAÇLAR */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule sx={{ color: 'warning.main' }} />
            Rezerve Araçlar ({reservedVehicles.length})
          </Typography>
        </Box>

        {/* Rezerve Araçlar Tablosu */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Plaka</strong></TableCell>
                <TableCell><strong>Araç Adı</strong></TableCell>
                <TableCell align="right"><strong>Toplam Fatura</strong></TableCell>
                <TableCell align="right"><strong>Tahsil Edilen</strong></TableCell>
                <TableCell align="right"><strong>Kalan Bakiye</strong></TableCell>
                <TableCell align="center"><strong>Kiralama Sayısı</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservedVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      {vehicle.plate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {vehicle.name || 'Araç Adı Belirtilmemiş'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="info.main">
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}
                    >
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {vehicle._count?.rentals || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={vehicle.status}
                      onChange={(e) => handleVehicleStatusChange(vehicle.id, e.target.value as 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE')}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="IDLE">
                        <Chip label="Uygun" color="success" size="small" />
                      </MenuItem>
                      <MenuItem value="RESERVED">
                        <Chip label="Rezerve" color="warning" size="small" />
                      </MenuItem>
                      <MenuItem value="SERVICE">
                        <Chip label="Serviste" color="error" size="small" />
                      </MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => setVehicleDetailDialog({ open: true, vehicle })}
                      >
                        Detaylar
                      </Button>
                      
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => handleQuickRental(vehicle)}
                        sx={{ 
                          bgcolor: 'warning.main', 
                          '&:hover': { bgcolor: 'warning.dark' }
                        }}
                      >
                        Hızlı Kiralama
                      </Button>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setVehicleDeleteDialog({ open: true, vehicle })}
                        title="Aracı Sil"
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {reservedVehicles.length === 0 && (
          <Alert severity="info">
            Şu anda rezerve araç bulunmuyor.
          </Alert>
        )}
      </Paper>

      {/* SERVİSTE OLAN ARAÇLAR */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Build sx={{ color: 'error.main' }} />
            Serviste Olan Araçlar ({serviceVehicles.length})
          </Typography>
        </Box>

        {/* Serviste Olan Araçlar Tablosu */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Plaka</strong></TableCell>
                <TableCell><strong>Araç Adı</strong></TableCell>
                <TableCell align="right"><strong>Toplam Fatura</strong></TableCell>
                <TableCell align="right"><strong>Tahsil Edilen</strong></TableCell>
                <TableCell align="right"><strong>Kalan Bakiye</strong></TableCell>
                <TableCell align="center"><strong>Kiralama Sayısı</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {serviceVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {vehicle.plate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {vehicle.name || 'Araç Adı Belirtilmemiş'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="info.main">
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}
                    >
                      -
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {vehicle._count?.rentals || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={vehicle.status}
                      onChange={(e) => handleVehicleStatusChange(vehicle.id, e.target.value as 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE')}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="IDLE">
                        <Chip label="Uygun" color="success" size="small" />
                      </MenuItem>
                      <MenuItem value="RESERVED">
                        <Chip label="Rezerve" color="warning" size="small" />
                      </MenuItem>
                      <MenuItem value="SERVICE">
                        <Chip label="Serviste" color="error" size="small" />
                      </MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => setVehicleDetailDialog({ open: true, vehicle })}
                      >
                        Detaylar
                      </Button>
                      
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Build />}
                        disabled
                        sx={{ 
                          bgcolor: 'error.main', 
                          '&:hover': { bgcolor: 'error.dark' },
                          '&.Mui-disabled': { 
                            bgcolor: 'error.main',
                            color: 'white',
                            opacity: 0.7
                          }
                        }}
                      >
                        Serviste
                      </Button>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setVehicleDeleteDialog({ open: true, vehicle })}
                        title="Aracı Sil"
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {serviceVehicles.length === 0 && (
          <Alert severity="info">
            Şu anda serviste araç bulunmuyor.
          </Alert>
        )}
      </Paper>

      {/* GEÇMİŞ KİRALAMALAR */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ color: 'info.main' }} />
            Geçmiş Kiralamalar
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<GetApp />}
              onClick={exportCompletedToExcel}
              color="success"
            >
              Excel
            </Button>
            <Button
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={exportCompletedToPDF}
              color="error"
            >
              PDF
            </Button>
          </Stack>
        </Box>

        {/* Geçmiş Kiralamalar Filtreleme */}
        <TextField
          size="small"
          placeholder="Ara (plaka, müşteri adı...)"
          value={completedRentalsFilter}
          onChange={(e) => setCompletedRentalsFilter(e.target.value)}
          sx={{ mb: 2, minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        {/* Geçmiş Kiralamalar Tablosu */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Plaka</strong></TableCell>
                <TableCell><strong>Müşteri</strong></TableCell>
                <TableCell><strong>Tarih Aralığı</strong></TableCell>
                <TableCell align="center"><strong>Gün</strong></TableCell>
                <TableCell align="right"><strong>Toplam</strong></TableCell>
                <TableCell align="right"><strong>Kalan Borç</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(completedRentalsRes?.data.data || [])
                .filter((rental: Rental) => rental.status === 'COMPLETED')
                .filter((rental: Rental) => {
                  if (!completedRentalsFilter) return true;
                  const filter = completedRentalsFilter.toLowerCase();
                  return (
                    rental.vehicle?.plate?.toLowerCase().includes(filter) ||
                    rental.customer?.fullName?.toLowerCase().includes(filter)
                  );
                })
                .slice(0, 10)
                .map((rental: Rental) => {
                  // Calculate actual balance with payments
                  const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
                  const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
                  const actualBalance = rental.totalDue - (paidFromRental + paidFromPayments);
                  
                  return (
                <TableRow key={rental.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                      {rental.vehicle?.plate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {rental.customer?.fullName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {dayjs(rental.startDate).format('DD.MM.YYYY')} - {dayjs(rental.endDate).format('DD.MM.YYYY')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {rental.days}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(rental.totalDue)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: actualBalance > 0 ? 'error.main' : 'success.main'
                      }}
                    >
                      {formatCurrency(actualBalance)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="Tamamlandı"
                      color="info"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        size="small" 
                        onClick={() => setDetailDialog({ open: true, rental })}
                      >
                        Detay
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => setEditRentalDialog({ open: true, rental })}
                      >
                        Düzenle
                      </Button>
                      {rental.balance > 0 && (
                        <Button 
                          size="small" 
                          variant="outlined"
                          color="warning"
                          onClick={() => setPaymentDialog({ open: true, rental })}
                        >
                          Ödeme Ekle
                        </Button>
                      )}
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => setDeleteDialog({ open: true, rental })}
                      >
                        Sil
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {((completedRentalsRes?.data.data || []).filter((r: Rental) => r.status === 'COMPLETED')).length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Henüz tamamlanmış kiralama bulunmuyor.
          </Alert>
        )}
      </Paper>

      {/* Borçlu Müşteriler Tablosu */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
            Borçlu Müşteriler
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<GetApp />}
              onClick={exportDebtorsToExcel}
              color="success"
            >
              Excel
            </Button>
            <Button
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={exportDebtorsToPDF}
              color="error"
            >
              PDF
            </Button>
          </Stack>
        </Box>
        
        {/* Borçlu Müşteriler Filtreleme */}
        <TextField
          size="small"
          placeholder="Ara (müşteri adı, plaka...)"
          value={debtorsFilter}
          onChange={(e) => setDebtorsFilter(e.target.value)}
          sx={{ mb: 2, minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ad Soyad</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell>Araç</TableCell>
                <TableCell>Kiralama Tarihi</TableCell>
                <TableCell align="right">Borç Miktarı</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {debtors
                ?.filter((debtor) => {
                  if (!debtorsFilter) return true;
                  const filter = debtorsFilter.toLowerCase();
                  return (
                    debtor.customerName?.toLowerCase().includes(filter) ||
                    debtor.plate?.toLowerCase().includes(filter)
                  );
                })
                .map((debtor) => (
                <TableRow key={debtor.rentalId}>
                  <TableCell>{debtor.customerName}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{debtor.plate}</TableCell>
                  <TableCell>{format(new Date(debtor.startDate), 'dd.MM.yyyy')}</TableCell>
                  <TableCell align="right">
                    <Typography color="error" fontWeight="bold">
                      {formatCurrency(debtor.balance)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="Borçlu" 
                      color="error" 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        // Borçlu müşterinin rental bilgisini bulup düzenleme modalını açalım
                        const rental = (completedRentalsRes?.data.data || []).find((r: Rental) => r.id === debtor.rentalId);
                        if (rental) {
                          setEditRentalDialog({ open: true, rental });
                        }
                      }}
                    >
                      Düzenle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!debtors?.length && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Borçlu müşteri bulunmuyor.
            </Alert>
          )}
        </TableContainer>
      </Paper>

      {/* MENU */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem 
          onClick={() => {
            if (selectedRental) {
              setDetailDialog({ open: true, rental: selectedRental });
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Detay Görüntüle</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            if (selectedRental) {
              setPaymentDialog({ open: true, rental: selectedRental });
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Payment fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ödeme Ekle</ListItemText>
        </MenuItem>
        
        {selectedRental?.status === 'ACTIVE' && (
          <MenuItem 
            onClick={() => {
              if (selectedRental) {
                setCompleteDialog({ open: true, rental: selectedRental });
              }
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <CheckCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Teslim Al</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* DIALOGS */}
      <NewRentalDialog 
        open={newRentalOpen} 
        onClose={() => setNewRentalOpen(false)} 
      />

      <NewRentalDialog 
        open={quickRentalDialog.open} 
        onClose={() => setQuickRentalDialog({ open: false, vehicle: null })}
        preselectedVehicle={quickRentalDialog.vehicle}
      />

      {/* Ödeme Ekleme Dialog'u */}
      <AddPaymentDialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, rental: null })}
        rental={paymentDialog.rental}
      />

      {/* Kiralama Düzenleme Dialog'u */}
      <EditRentalDialog
        open={editRentalDialog.open}
        onClose={() => setEditRentalDialog({ open: false, rental: null })}
        rental={editRentalDialog.rental}
      />

      {/* Kiralama Teslim Alma Dialog'u */}
      <Dialog open={completeDialog.open} onClose={() => setCompleteDialog({ open: false, rental: null })}>
        <DialogTitle>Kiralama Teslim Al</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{completeDialog.rental?.vehicle?.plate}</strong> plakalı aracın kiralamasını teslim almak istediğinizden emin misiniz?
            <br /><br />
            <strong>Müşteri:</strong> {completeDialog.rental?.customer?.fullName}
            <br />
            <strong>Kiralama Süresi:</strong> {completeDialog.rental?.days} gün
            <br />
            <strong>Kalan Borç:</strong> {completeDialog.rental ? formatCurrency(completeDialog.rental.balance) : ''}
            <br /><br />
            Bu işlem geri alınamaz ve araç "Boşta" durumuna geçecektir.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCompleteDialog({ open: false, rental: null })}
            disabled={completeRentalMutation.isPending}
          >
            İptal
          </Button>
          <Button 
            variant="contained" 
            color="warning"
            startIcon={<CheckCircle />}
            onClick={() => {
              if (completeDialog.rental) {
                completeRentalMutation.mutate(completeDialog.rental.id);
              }
            }}
            disabled={completeRentalMutation.isPending}
          >
            {completeRentalMutation.isPending ? 'Teslim Alınıyor...' : 'Evet, Teslim Al'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog 
        open={detailDialog.open} 
        onClose={() => setDetailDialog({ open: false, rental: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ color: 'primary.main' }} />
            Kiralama Detayları
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {detailDialog.rental && (
            <Grid container spacing={3}>
              {/* Sol Kolon - Genel Bilgiler */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                    Genel Bilgiler
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Araç:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {detailDialog.rental.vehicle?.plate}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Müşteri:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {detailDialog.rental.customer?.fullName}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Telefon:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {detailDialog.rental.customer?.phone || 'Belirtilmemiş'}
                      </Typography>
                    </Box>
                    
                    <Divider />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Başlangıç:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dayjs(detailDialog.rental.startDate).format('DD.MM.YYYY')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Bitiş:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dayjs(detailDialog.rental.endDate).format('DD.MM.YYYY')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Gün Sayısı:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {detailDialog.rental.days} gün
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Günlük Ücret:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(detailDialog.rental.dailyPrice)}
                      </Typography>
                    </Box>
                    
                    {detailDialog.rental.note && (
                      <>
                        <Divider />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Not:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {detailDialog.rental.note}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Card>
              </Grid>

              {/* Sağ Kolon - Mali Bilgiler */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
                    Mali Detaylar
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Temel Tutar:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(detailDialog.rental.days * detailDialog.rental.dailyPrice)}
                      </Typography>
                    </Box>
                    
                    {detailDialog.rental.kmDiff > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Km Farkı:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(detailDialog.rental.kmDiff)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.cleaning > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Temizlik:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(detailDialog.rental.cleaning)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.hgs > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">HGS:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(detailDialog.rental.hgs)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.damage > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Hasar:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(detailDialog.rental.damage)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.fuel > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Yakıt:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(detailDialog.rental.fuel)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>Toplam Tutar:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {formatCurrency(detailDialog.rental.totalDue)}
                      </Typography>
                    </Box>
                    
                    <Divider />
                    
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
                      Ödemeler:
                    </Typography>
                    
                    {detailDialog.rental.upfront > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Kapora:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(detailDialog.rental.upfront)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.pay1 > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">1. Ödeme:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(detailDialog.rental.pay1)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.pay2 > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">2. Ödeme:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(detailDialog.rental.pay2)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.pay3 > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">3. Ödeme:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(detailDialog.rental.pay3)}
                        </Typography>
                      </Box>
                    )}
                    
                    {detailDialog.rental.pay4 > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">4. Ödeme:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(detailDialog.rental.pay4)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>Toplam Ödenen:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {formatCurrency(
                          detailDialog.rental.upfront + 
                          detailDialog.rental.pay1 + 
                          detailDialog.rental.pay2 + 
                          detailDialog.rental.pay3 + 
                          detailDialog.rental.pay4
                        )}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>Kalan Bakiye:</Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 700, 
                          color: detailDialog.rental.balance > 0 ? 'error.main' : 'success.main'
                        }}
                      >
                        {formatCurrency(detailDialog.rental.balance)}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, rental: null })}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Borçlu silme dialog'u */}
      <Dialog open={debtorDeleteDialog.open} onClose={() => setDebtorDeleteDialog({open: false, rental: null})}>
        <DialogTitle>Borcu Ödendi Olarak İşaretle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu kiralamanın borcunu ödendi olarak işaretlemek istediğinizden emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDebtorDeleteDialog({open: false, rental: null})}>İptal</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (debtorDeleteDialog.rental) {
                markDebtAsPaidMutation.mutate(debtorDeleteDialog.rental.id);
              }
            }}
            disabled={markDebtAsPaidMutation.isPending}
          >
            {markDebtAsPaidMutation.isPending ? 'İşleniyor...' : 'Ödendi İşaretle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kiralama Silme Dialog'u */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, rental: null })}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete sx={{ color: 'error.main' }} />
            Kiralama Sil
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            <strong>{deleteDialog.rental?.vehicle?.plate}</strong> plakalı aracın kiralamasını tamamen silmek istediğinizden emin misiniz?
          </DialogContentText>
          
          {deleteDialog.rental && (
            <Card sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>
                ⚠️ DİKKAT: Bu işlem geri alınamaz!
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Müşteri:</strong> {deleteDialog.rental.customer?.fullName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Tarih:</strong> {dayjs(deleteDialog.rental.startDate).format('DD.MM.YYYY')} - {dayjs(deleteDialog.rental.endDate).format('DD.MM.YYYY')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Toplam Tutar:</strong> {formatCurrency(deleteDialog.rental.totalDue)}
              </Typography>
              <Typography variant="body2">
                <strong>Kalan Borç:</strong> {formatCurrency(deleteDialog.rental.balance)}
              </Typography>
            </Card>
          )}
          
          <Alert severity="warning">
            Bu işlem:
            <br />• Kiralama kaydını tamamen siler
            <br />• Tüm ödeme kayıtlarını siler
            <br />• Araç durumunu "Boşta" yapar
            <br />• Bu işlem geri alınamaz
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ open: false, rental: null })}
            disabled={deleteRentalMutation.isPending}
          >
            İptal
          </Button>
          <Button 
            variant="contained" 
            color="error"
            startIcon={<Delete />}
            onClick={() => {
              if (deleteDialog.rental) {
                deleteRentalMutation.mutate(deleteDialog.rental.id);
              }
            }}
            disabled={deleteRentalMutation.isPending}
          >
            {deleteRentalMutation.isPending ? 'Siliniyor...' : 'Evet, Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Araç Silme Dialog'u */}
      <Dialog
        open={vehicleDeleteDialog.open}
        onClose={() => setVehicleDeleteDialog({ open: false, vehicle: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Araç Silme Onayı</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{vehicleDeleteDialog.vehicle?.plate} - {vehicleDeleteDialog.vehicle?.name}</strong> aracını silmek istediğinizden emin misiniz?
            <br /><br />
            <Alert severity="warning" sx={{ mt: 2 }}>
              Bu işlem geri alınamaz. Araç kalıcı olarak silinecektir, ancak geçmiş kiralama gelirleri korunacaktır.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setVehicleDeleteDialog({ open: false, vehicle: null })}
            disabled={deleteVehicleMutation.isPending}
          >
            İptal
          </Button>
          <Button 
            onClick={() => {
              if (vehicleDeleteDialog.vehicle) {
                deleteVehicleMutation.mutate(vehicleDeleteDialog.vehicle.id);
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

      {/* Vehicle Details Modal */}
      <Dialog
        open={vehicleDetailDialog.open}
        onClose={() => setVehicleDetailDialog({ open: false, vehicle: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                <DirectionsCar sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {vehicleDetailDialog.vehicle?.plate}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {vehicleDetailDialog.vehicle?.name || 'Araç Adı Belirtilmemiş'} • {dayjs(vehicleDetailDialog.vehicle?.createdAt).format('DD/MM/YYYY')} tarihinde eklendi
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={
                  vehicleDetailDialog.vehicle?.status === 'IDLE' ? 'Uygun' :
                  vehicleDetailDialog.vehicle?.status === 'RENTED' ? 'Kirada' :
                  vehicleDetailDialog.vehicle?.status === 'RESERVED' ? 'Rezerve' :
                  vehicleDetailDialog.vehicle?.status === 'SERVICE' ? 'Serviste' :
                  vehicleDetailDialog.vehicle?.status
                }
                color={
                  vehicleDetailDialog.vehicle?.status === 'IDLE' ? 'success' :
                  vehicleDetailDialog.vehicle?.status === 'RENTED' ? 'primary' :
                  vehicleDetailDialog.vehicle?.status === 'RESERVED' ? 'warning' :
                  vehicleDetailDialog.vehicle?.status === 'SERVICE' ? 'error' : 'default'
                } 
                size="medium"
                sx={{ borderRadius: 2, px: 2, py: 1 }}
              />
              <IconButton onClick={() => setVehicleDetailDialog({ open: false, vehicle: null })}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {vehicleDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <Typography>Yükleniyor...</Typography>
            </Box>
          ) : vehicleDetailData ? (() => {
            const vehicle = vehicleDetailData.data;
            const rentals = vehicle.rentals || [];
            
            // Find income data for this vehicle
            const vehicleIncome = vehicleIncomeReport?.data?.find((item: any) => item.vehicleId === vehicle.id) || {
              billed: 0,
              collected: 0,
              outstanding: 0
            };

            // Calculate statistics
            const totalRentals = rentals.length;
            const activeRentals = rentals.filter((r: any) => r.status === 'ACTIVE').length;
            const totalRevenue = vehicleIncome.collected || 0;
            const outstandingAmount = vehicleIncome.outstanding || 0;

            return (
              <Box>
                {/* KPI Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      height: '100%'
                    }}>
                      <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {formatCurrency(totalRevenue)}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Toplam Gelir
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                            <MoneyIcon sx={{ fontSize: 20 }} />
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
                      <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {totalRentals}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Toplam Kiralama
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                            <CalendarIcon sx={{ fontSize: 20 }} />
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
                      <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {activeRentals}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Aktif Kiralama
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                            <TrendingUpIcon sx={{ fontSize: 20 }} />
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
                      <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {formatCurrency(outstandingAmount)}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Kalan Bakiye
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                            <Assignment sx={{ fontSize: 20 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Rental History */}
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <CalendarIcon sx={{ mr: 1 }} />
                    Kiralama Geçmişi ({totalRentals} adet)
                  </Typography>

                  {rentals.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CalendarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        Henüz kiralama geçmişi bulunmuyor
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bu araç daha önce kiralanmamış
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Müşteri</strong></TableCell>
                            <TableCell><strong>Kiralama Tarihi</strong></TableCell>
                            <TableCell><strong>Dönüş Tarihi</strong></TableCell>
                            <TableCell align="center"><strong>Gün Sayısı</strong></TableCell>
                            <TableCell align="right"><strong>Toplam Tutar</strong></TableCell>
                            <TableCell align="right"><strong>Ödenmiş</strong></TableCell>
                            <TableCell align="right"><strong>Bakiye</strong></TableCell>
                            <TableCell><strong>Durum</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rentals.map((rental: any) => {
                            // Calculate total paid including payments table
                            const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
                            const paidFromPayments = (rental.payments || []).reduce((sum: number, payment: any) => sum + payment.amount, 0);
                            const totalPaid = paidFromRental + paidFromPayments;
                            const actualBalance = rental.totalDue - totalPaid;

                            return (
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
                                  <Typography variant="body2">
                                    {dayjs(rental.startDate).format('DD/MM/YYYY')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {dayjs(rental.endDate).format('DD/MM/YYYY')}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip 
                                    label={`${rental.days} gün`}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={600} color="primary.main">
                                    {formatCurrency(rental.totalDue)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={600} color="success.main">
                                    {formatCurrency(totalPaid)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography 
                                    variant="body2" 
                                    fontWeight={600}
                                    color={actualBalance > 0 ? 'error.main' : 'success.main'}
                                  >
                                    {formatCurrency(actualBalance)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      rental.status === 'ACTIVE' ? 'Aktif' :
                                      rental.status === 'COMPLETED' ? 'Tamamlandı' :
                                      rental.status === 'CANCELLED' ? 'İptal' :
                                      rental.status
                                    }
                                    color={
                                      rental.status === 'ACTIVE' ? 'primary' :
                                      rental.status === 'COMPLETED' ? 'success' :
                                      rental.status === 'CANCELLED' ? 'error' : 'default'
                                    }
                                    size="small"
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
              </Box>
            );
          })() : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Araç detayları yüklenemedi
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDetailDialog({ open: false, vehicle: null })}>
            Kapat
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              setVehicleDetailDialog({ open: false, vehicle: null });
              navigate(`/vehicles/${vehicleDetailDialog.vehicle?.id}`);
            }}
            startIcon={<Visibility />}
          >
            Tam Detaya Git
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
