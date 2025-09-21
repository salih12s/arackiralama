import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
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
  FormControl,
  InputLabel,
  Autocomplete,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  DirectionsCar,
  Schedule,
  Build,
  Add,
  Visibility,
  Timeline,
  CheckCircle,
  Edit,
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
  DriveEta as DriveEtaIcon,
  CarRental as CarRentalIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  reportsApi,
  rentalsApi,
  vehiclesApi,
  reservationsApi,
  DashboardStats,
  Rental,
  Vehicle,
  Reservation,
} from '../api/client';
import ReservationDialog from '../components/ReservationDialog';
import { formatCurrency } from '../utils/currency';
import client from '../api/client';
import Layout from '../components/Layout';
import NewRentalDialog from '../components/NewRentalDialog';
import AddPaymentDialog from '../components/AddPaymentDialog';
import EditRentalDialog from '../components/EditRentalDialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [newRentalOpen, setNewRentalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
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
  
  // Reservation states
  const [reservationDialog, setReservationDialog] = useState<{
    open: boolean; 
    reservation: Reservation | null;
  }>({
    open: false,
    reservation: null
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editRentalDialogOpen, setEditRentalDialogOpen] = useState(false);

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

  // Detaylı kiralama tablosu için state'ler
  // const [detailedRentalsFilter, setDetailedRentalsFilter] = useState('');
  
  // Status helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'RETURNED': return 'info';
      case 'COMPLETED': return 'primary';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'RETURNED': return 'Teslim Edildi';
      case 'COMPLETED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      default: return status;
    }
  };

  const formatDate = (date: string) => {
    return dayjs(date).format('DD.MM.YYYY');
  };

  // Reservation status helpers
  const getReservationStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'success';
      case 'CANCELLED': return 'error';
      case 'COMPLETED': return 'primary';
      default: return 'default';
    }
  };

  const getReservationStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Beklemede';
      case 'CONFIRMED': return 'Onaylandı';
      case 'CANCELLED': return 'İptal Edildi';
      case 'COMPLETED': return 'Tamamlandı';
      default: return status;
    }
  };

  // Confirmation modal states
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    type: '', // 'deduction', 'payment', 'note', 'status'
    id: '',
    title: '',
    message: '',
    statusData: null as { vehicleId: string; status: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE' } | null
  });

  // Error/Success modal states
  const [notificationDialog, setNotificationDialog] = useState({
    open: false,
    type: 'success', // 'success' | 'error'
    title: '',
    message: ''
  });

  // Filtreleme state'leri
  const [activeRentalsFilter, setActiveRentalsFilter] = useState('');
  const [vehiclesFilter, setVehiclesFilter] = useState('');

  // === DATA FETCH ===
  const { data: statsRes, isFetching: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedMonth, selectedYear],
    queryFn: () => reportsApi.getDashboardStats(selectedMonth, selectedYear),
    staleTime: 30 * 1000, // 30 saniye fresh tut
    gcTime: 2 * 60 * 1000, // 2 dakika cache'de sakla
  });

  // Boşta olan araçları getir
  const { data: idleVehiclesRes, isFetching: idleLoading } = useQuery({
    queryKey: ['idle-vehicles'],
    queryFn: () => vehiclesApi.getAll('IDLE', 1000),
    staleTime: 45 * 1000, // 45 saniye fresh tut
    gcTime: 3 * 60 * 1000, // 3 dakika cache'de sakla
  });

  // Rezerve araçları getir
  const { data: reservedVehiclesRes } = useQuery({
    queryKey: ['reserved-vehicles'],
    queryFn: () => vehiclesApi.getAll('RESERVED', 1000),
    staleTime: 45 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Rezervasyonları getir  
  const { data: reservationsRes, isFetching: reservationsLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.getAll(),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Serviste olan araçları getir
  const { data: serviceVehiclesRes } = useQuery({
    queryKey: ['service-vehicles'],
    queryFn: () => vehiclesApi.getAll('SERVICE', 1000),
    staleTime: 45 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Tüm araçları getir (rezervasyon dialog için)
  const { data: allVehiclesRes } = useQuery({
    queryKey: ['all-vehicles'],
    queryFn: () => vehiclesApi.getAll(undefined, 1000),
    staleTime: 45 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  // Aktif kiralamaları getir
  const { data: activeRentalsRes, isFetching: activeLoading } = useQuery({
    queryKey: ['active-rentals'],
    queryFn: async () => {
      console.log('🔄 Fetching active rentals...');
      const result = await rentalsApi.getAll({ limit: 1000 });
      console.log('📋 Active rentals API response:', result);
      console.log('📋 Active rentals data structure:', result.data);
      return result;
    },
    staleTime: 20 * 1000, // 20 saniye fresh tut (en dinamik data)
    gcTime: 1 * 60 * 1000, // 1 dakika cache'de sakla
  });

  // Tüm kiralamaları getir (detaylı tablo için)
  const { data: allRentalsRes, isFetching: allRentalsLoading } = useQuery({
    queryKey: ['all-rentals'],
    queryFn: async () => {
      console.log('🔄 Fetching all rentals...');
      const result = await rentalsApi.getAll({ limit: 1000 });
      console.log('📋 All rentals API response:', result);
      return result;
    },
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Customers query for dropdown  
  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await client.get('/customers');
      return response.data;
    },
    staleTime: 60 * 1000,
  });

  // Aylık rapor verilerini getir (reports sayfasından)
  const { data: monthlyReportRes } = useQuery({
    queryKey: ['monthly-report', selectedYear],
    queryFn: async () => {
      const response = await client.get(`/reports/monthly?year=${selectedYear}`);
      return response.data;
    },
    staleTime: 60 * 1000,
  });

  // Borçlu kişiler verilerini getir (UnpaidDebtsDetail sayfasından)
  const { data: debtorsRes } = useQuery({
    queryKey: ['debtors-report'],
    queryFn: async () => {
      const response = await client.get('/reports/debtors');
      return response.data;
    },
    staleTime: 30 * 1000,
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
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Araç başarıyla silindi'
      });
    },
    onError: (error: any) => {
      console.error('Vehicle delete error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Araç silme hatası';
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Araç Silme Hatası',
        message: errorMessage
      });
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
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Araç durumu başarıyla değiştirildi'
      });
    },
    onError: (error: any) => {
      console.error('Vehicle status change error:', error);
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Durum Değiştirme Hatası',
        message: error.response?.data?.message || error.message || 'Araç durumu değiştirme hatası'
      });
    },
  });

  // === RESERVATION HANDLERS ===
  const createReservationMutation = useMutation({
    mutationFn: async (data: {
      customerName: string;
      licensePlate: string;
      reservationDate: string;
      reservationTime: string;
      rentalDuration: number;
      note?: string;
    }) => {
      const customer = customers.find(c => (c.fullName || c.name) === data.customerName);
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }
      
      const reservationDateTime = dayjs(`${data.reservationDate} ${data.reservationTime}`, 'YYYY-MM-DD HH:mm').toISOString();
      
      const payload = {
        customerId: customer.id,
        vehicleId: '', // Vehicle ID boş bırakılıyor
        customerName: data.customerName,
        licensePlate: data.licensePlate,
        reservationDate: reservationDateTime,
        reservationTime: data.reservationTime,
        rentalDuration: data.rentalDuration,
        note: data.note || ''
      };
      
      return reservationsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setReservationDialog({ open: false, reservation: null });
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Rezervasyon başarıyla oluşturuldu'
      });
    },
    onError: (error: any) => {
      console.error('Reservation creation error:', error);
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Hata',
        message: error.response?.data?.message || error.message || 'Rezervasyon oluşturma hatası'
      });
    },
  });

  const updateReservationMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      customerName: string;
      licensePlate: string;
      reservationDate: string;
      reservationTime: string;
      rentalDuration: number;
      note?: string;
    }) => {
      const customer = customers.find(c => (c.fullName || c.name) === data.customerName);
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }
      
      const reservationDateTime = dayjs(`${data.reservationDate} ${data.reservationTime}`, 'YYYY-MM-DD HH:mm').toISOString();
      
      const payload = {
        customerId: customer.id,
        vehicleId: '', // Vehicle ID boş bırakılıyor
        customerName: data.customerName,
        licensePlate: data.licensePlate,
        reservationDate: reservationDateTime,
        reservationTime: data.reservationTime,
        rentalDuration: data.rentalDuration,
        note: data.note || ''
      };
      
      return reservationsApi.update(data.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setReservationDialog({ open: false, reservation: null });
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Rezervasyon başarıyla güncellendi'
      });
    },
    onError: (error: any) => {
      console.error('Reservation update error:', error);
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Hata',
        message: error.response?.data?.message || error.message || 'Rezervasyon güncelleme hatası'
      });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return reservationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Rezervasyon başarıyla silindi'
      });
    },
    onError: (error: any) => {
      console.error('Reservation deletion error:', error);
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Hata',
        message: error.response?.data?.message || error.message || 'Rezervasyon silme hatası'
      });
    },
  });

  const confirmReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return reservationsApi.confirm(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reserved-vehicles'] });
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Rezervasyon onaylandı'
      });
    },
    onError: (error: any) => {
      console.error('Reservation confirmation error:', error);
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Hata',
        message: error.response?.data?.message || error.message || 'Rezervasyon onaylama hatası'
      });
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return reservationsApi.cancel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reserved-vehicles'] });
      setNotificationDialog({
        open: true,
        type: 'success',
        title: 'Başarılı',
        message: 'Rezervasyon iptal edildi'
      });
    },
    onError: (error: any) => {
      console.error('Reservation cancellation error:', error);
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Hata',
        message: error.response?.data?.message || error.message || 'Rezervasyon iptal hatası'
      });
    },
  });

  // === RESERVATION BUTTON HANDLERS ===
  const handleConfirmReservation = (id: string) => {
    confirmReservationMutation.mutate(id);
  };

  const handleDeleteReservation = (id: string) => {
    if (window.confirm('Bu rezervasyonu silmek istediğinizden emin misiniz?')) {
      deleteReservationMutation.mutate(id);
    }
  };

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

  const idleVehicles: Vehicle[] = idleVehiclesRes?.data ?? [];
  const reservedVehicles: Vehicle[] = reservedVehiclesRes?.data ?? [];
  const serviceVehicles: Vehicle[] = serviceVehiclesRes?.data ?? [];
  const allVehicles: Vehicle[] = allVehiclesRes?.data ?? [];

  // Tüm kiralamalar (detaylı tablo için)
  const allRentals: Rental[] = allRentalsRes?.data?.data ?? [];
  // Removed unused detailed rentals filtering

  // Extract vehicles and customers for dropdowns
  const vehicles: Vehicle[] = [
    ...idleVehicles,
    ...reservedVehicles,
    ...serviceVehicles,
    ...(activeRentalsRes?.data?.data || []).map((rental: any) => rental.vehicle).filter(Boolean)
  ].filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i); // Remove duplicates
  
  const customers: any[] = Array.isArray(customersRes?.data?.data) ? customersRes.data.data : 
                           Array.isArray(customersRes?.data) ? customersRes.data : 
                           Array.isArray(customersRes) ? customersRes : [];

  // Aylık kazanç hesaplaması (reports sayfasındaki mantıkla)
  const currentMonthRevenue = useMemo(() => {
    if (!allRentalsRes?.data?.data) return 0;
    
    const rentals = allRentalsRes.data.data;
    const targetMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    
    let monthlyRevenue = 0;
    
    rentals.forEach((rental: any) => {
      if (!rental.startDate || !rental.endDate) return;
      
      const startDate = new Date(rental.startDate);
      const endDate = new Date(rental.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Günlük gelir hesaplaması (kira ücreti + km farkı)
      const dailyPrice = rental.dailyPrice || 0; // TL cinsinden
      const kmPrice = rental.kmDiff || 0; // TL cinsinden
      const totalRevenue = (dailyPrice * totalDays) + kmPrice;
      const dailyRevenue = totalRevenue / totalDays;
      
      // Bu aya düşen günleri hesapla
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (dateMonth === targetMonth) {
          monthlyRevenue += dailyRevenue;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    return monthlyRevenue;
  }, [allRentalsRes?.data?.data, selectedMonth, selectedYear]);

  // Toplam alacak hesaplaması (borçlu kişiler listesinden toplam)
  const totalDebt = useMemo(() => {
    if (!debtorsRes || !Array.isArray(debtorsRes)) return 0;
    return debtorsRes.reduce((sum: number, debtor: any) => sum + (debtor.totalDebt || 0), 0) / 100;
  }, [debtorsRes]);

  // Helper function to get month name
  const getMonthName = (month: number): string => {
    const monthNames = [
      '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return monthNames[month] || '';
  };

  // Determine if we're viewing current month or not
  const isCurrentMonth = selectedMonth === dayjs().month() + 1 && selectedYear === dayjs().year();
  const monthDisplayText = isCurrentMonth ? 'Bu Ay' : `${getMonthName(selectedMonth)} ${selectedYear}`;

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
        'Günlük Fiyat': rental.dailyPrice,
        'Toplam Tutar': rental.totalDue,
        'Ödenen': (paidFromRental + paidFromPayments),
        'Kalan': actualBalance,
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

  const handleQuickRental = (vehicle: Vehicle) => {
    setQuickRentalDialog({ open: true, vehicle });
  };

  // === UI ===

  // Manuel refresh fonksiyonu
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
  };

  return (
    <Layout title="Araç Kiralama - Ana Sayfa">
      {/* HEADER WITH COMPACT STATS - Mobile Responsive */}
      <Box sx={{ 
        mb: { xs: 2, sm: 3, md: 4 }, 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 2, sm: 0 }
      }}>
        {/* COMPACT STATS */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
          gap: { xs: 1, sm: 2 },
          alignItems: 'center',
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            p: { xs: 1, sm: 0 },
            border: { xs: '1px solid', sm: 'none' },
            borderColor: 'divider',
            borderRadius: { xs: 1, sm: 0 },
            backgroundColor: { xs: 'background.paper', sm: 'transparent' }
          }}>
            <CarRentalIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              Kirada:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
              {stats.totalVehicles - stats.idle - stats.reserved - stats.service}
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            p: { xs: 1, sm: 0 },
            border: { xs: '1px solid', sm: 'none' },
            borderColor: 'divider',
            borderRadius: { xs: 1, sm: 0 },
            backgroundColor: { xs: 'background.paper', sm: 'transparent' }
          }}>
            <DriveEtaIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              Boş:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
              {stats.idle}
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            p: { xs: 1, sm: 0 },
            border: { xs: '1px solid', sm: 'none' },
            borderColor: 'divider',
            borderRadius: { xs: 1, sm: 0 },
            backgroundColor: { xs: 'background.paper', sm: 'transparent' }
          }}>
            <PeopleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              Borçlu:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
              {(allRentalsRes?.data?.data || []).filter((rental: any) => {
                const totalDue = (rental.days || 0) * (rental.dailyPrice || 0) + 
                  (rental.kmDiff || 0) + (rental.hgs || 0) + (rental.damage || 0) + 
                  (rental.fuel || 0) + (rental.cleaning || 0);
                const totalPaid = (rental.payments || []).reduce((sum: number, payment: any) => sum + payment.amount, 0) +
                  (rental.upfront || 0) + (rental.pay1 || 0) + (rental.pay2 || 0) + (rental.pay3 || 0) + (rental.pay4 || 0);
                return totalDue > totalPaid;
              }).length}
            </Typography>
          </Box>
          
          {(statsLoading || activeLoading || idleLoading) && (
            <Chip 
              label="Güncelleniyor..." 
              size="small" 
              color="info" 
              sx={{ 
                ml: { xs: 0, sm: 1 }, 
                mt: { xs: 1, sm: 0 },
                fontSize: { xs: '0.5rem', sm: '0.6rem' }, 
                height: { xs: 18, sm: 20 },
                gridColumn: { xs: 'span 2', sm: 'auto' }
              }}
            />
          )}
        </Box>

        {/* Action Buttons - Mobile Responsive */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: { xs: 'row', sm: 'row' },
          gap: { xs: 1, sm: 1.5 },
          alignItems: 'center',
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-end' }
        }}>
          <IconButton
            onClick={handleRefresh}
            disabled={statsLoading || activeLoading || idleLoading}
            sx={{ 
              bgcolor: 'grey.100', 
              '&:hover': { bgcolor: 'grey.200' },
              borderRadius: 2,
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 }
            }}
            title="Verileri Yenile"
          >
            <RefreshIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
          </IconButton>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewRentalOpen(true)}
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 }
            }}
          >
            {isMobile ? 'Kiralama' : 'Yeni Kiralama'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DirectionsCar />}
            onClick={() => navigate('/vehicles')}
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 }
            }}
          >
            {isMobile ? 'Araç' : 'Araçlar'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Timeline />}
            onClick={() => navigate('/reports')}
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 }
            }}
          >
            {isMobile ? 'Rapor' : 'Raporlar'}
          </Button>
        </Box>
      </Box>

         <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
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
          <Table size="small" sx={{ 
            '& .MuiTableCell-root': { 
              padding: '4px 8px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap'
            } 
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 70 }}>Plaka</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 120 }}>Araç Adı</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 80 }}>Toplam Fatura</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 80 }}>Tahsil Edilen</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 80 }}>Kalan Bakiye</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'center', minWidth: 70 }}>Kiralama Sayısı</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 60 }}>Durum</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 80 }}>İşlemler</TableCell>
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
                <TableRow key={vehicle.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                    {vehicle.plate}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vehicle.name || 'Araç Adı Belirtilmemiş'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    -
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'info.main' }}>
                    -
                  </TableCell>
                  <TableCell align="right" sx={{ 
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}>
                    -
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {vehicle._count?.rentals || 0}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={vehicle.status}
                      onChange={(e) => handleVehicleStatusChange(vehicle.id, e.target.value as 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE')}
                      size="small"
                      sx={{ minWidth: 100, fontSize: '0.75rem', height: 32 }}
                    >
                      <MenuItem value="IDLE">
                        <Chip label="Uygun" color="success" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                      </MenuItem>
                      <MenuItem value="RESERVED">
                        <Chip label="Rezerve" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                      </MenuItem>
                      <MenuItem value="SERVICE">
                        <Chip label="Serviste" color="error" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                      </MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Detaylar">
                        <IconButton
                          size="small"
                          onClick={() => setVehicleDetailDialog({ open: true, vehicle })}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Hızlı Kiralama">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleQuickRental(vehicle)}
                        >
                          <PersonAdd fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Aracı Sil">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setVehicleDeleteDialog({ open: true, vehicle })}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
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
          <Table size="small" sx={{ 
            '& .MuiTableCell-root': { 
              padding: '4px 8px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap'
            } 
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 70 }}>Plaka</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 100 }}>Müşteri</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 80 }}>Tarih</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'center', minWidth: 40 }}>Gün</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 60 }}>Günlük</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 50 }}>KM</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 45 }}>HGS</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 50 }}>Temizlik</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 45 }}>Hasar</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 45 }}>Yakıt</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 70 }}>Toplam</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 70 }}>Ödenen</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', textAlign: 'right', minWidth: 70 }}>Bakiye</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 60 }}>Durum</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', minWidth: 80 }}>İşlemler</TableCell>
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
                .sort((a: Rental, b: Rental) => {
                  // Gelecekte bitecekler (bugünden sonra) üstte, geçmişte kalanlar aşağıda
                  const today = dayjs().startOf('day');
                  const dateA = dayjs(a.endDate).startOf('day');
                  const dateB = dayjs(b.endDate).startOf('day');

                  const isAFuture = dateA.isAfter(today) || dateA.isSame(today);
                  const isBFuture = dateB.isAfter(today) || dateB.isSame(today);

                  // İkisi de gelecekteyse, en yakın olan üstte
                  if (isAFuture && isBFuture) {
                    return dateA.diff(dateB);
                  }
                  // Sadece biri gelecekteyse, o üstte
                  if (isAFuture && !isBFuture) return -1;
                  if (!isAFuture && isBFuture) return 1;
                  // İkisi de geçmişteyse, en yeni (en az gecikmiş) üstte
                  return dateB.diff(dateA);
                })
                .map((rental: Rental) => {
                // EditRentalDialog ile aynı hesaplama mantığı
                // Toplam Ödenecek = (Gün × Günlük) + Ek Ücretler
                const totalDueTL = 
                  (rental.days * rental.dailyPrice) + 
                  (rental.kmDiff || 0) + 
                  (rental.cleaning || 0) + 
                  (rental.hgs || 0) + 
                  (rental.damage || 0) + 
                  (rental.fuel || 0);
                
                // Ek Ödemeler (payments) - TL cinsinden gelir
                const totalPaid = Array.isArray(rental.payments) ? rental.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
                
                // Planlı Ödemeler (upfront + pay1-4) - sadece gösterim için
                const paidFromRental = 
                  (rental.upfront || 0) + 
                  (rental.pay1 || 0) + 
                  (rental.pay2 || 0) + 
                  (rental.pay3 || 0) + 
                  (rental.pay4 || 0);
                
                // Toplam Ödenen = Planlı Ödemeler + Ek Ödemeler
                const totalPaidTL = totalPaid + paidFromRental;
                
                // Kalan Bakiye = Toplam Ödenecek - Toplam Ödenen
                const balanceTL = totalDueTL - totalPaidTL;
                
                console.log(`🔍 Payment Debug for ${rental.vehicle?.plate}:`, {
                  calculation: {
                    dailyPrice: rental.dailyPrice,
                    days: rental.days,
                    dailyTotal: rental.days * rental.dailyPrice,
                    kmDiff: rental.kmDiff,
                    cleaning: rental.cleaning,
                    hgs: rental.hgs,
                    damage: rental.damage,
                    fuel: rental.fuel,
                    totalDueTL
                  },
                  payments: {
                    upfront: rental.upfront,
                    pay1: rental.pay1,
                    pay2: rental.pay2,
                    pay3: rental.pay3,
                    pay4: rental.pay4,
                    plannedPayments: paidFromRental,
                    additionalPayments: totalPaid,
                    totalPaid: totalPaidTL
                  },
                  result: {
                    totalDueTL,
                    totalPaidTL,
                    balanceTL
                  }
                });
                
                
                return (
                  <TableRow key={rental.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                      {rental.vehicle?.plate}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rental.customer?.fullName || 'İsimsiz'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
                        {dayjs(rental.startDate).format('DD.MM.YYYY')}{' '}
                        <span style={{ color: '#1976d2', fontWeight: 600 }}>
                          {dayjs(rental.startDate).format('HH:mm')}
                        </span>
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
                        {dayjs(rental.endDate).format('DD.MM.YYYY')}{' '}
                        <span style={{ color: '#d32f2f', fontWeight: 600 }}>
                          {dayjs(rental.endDate).format('HH:mm')}
                        </span>
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
                      <Typography variant="body2">
                        {formatCurrency(rental.kmDiff || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(rental.cleaning || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(rental.hgs || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(rental.damage || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(rental.fuel || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(totalDueTL)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(totalPaidTL)}
                    </TableCell>
                    <TableCell align="right" sx={{ 
                        fontWeight: 600,
                        color: balanceTL > 0 ? 'error.main' : balanceTL < 0 ? 'warning.main' : 'success.main'
                      }}>
                      {formatCurrency(balanceTL)}
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
                          rental.status === 'ACTIVE' ? 'success' :
                          rental.status === 'COMPLETED' ? 'info' :
                          rental.status === 'CANCELLED' ? 'error' :
                          'default'
                        }
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Düzenle">
                          <IconButton
                            size="small"
                            onClick={() => setEditRentalDialog({ open: true, rental })}
                            sx={{ padding: '2px', color: 'warning.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Detay">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/rentals/${rental.id}`)}
                            sx={{ padding: '2px', color: 'primary.main' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {rental.status === 'ACTIVE' && (
                          <Tooltip title="Teslim Al">
                            <IconButton
                              size="small"
                              onClick={() => setCompleteDialog({ open: true, rental })}
                              sx={{ padding: '2px', color: 'success.main' }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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

      {/* Rezervasyonlar Tablosu */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ 
            fontWeight: 600, 
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            📅 Rezervasyonlar
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setReservationDialog({ open: true, reservation: null })}
            sx={{ minWidth: 150 }}
          >
            Yeni Rezervasyon
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Müşteri</strong></TableCell>
                <TableCell><strong>Plaka</strong></TableCell>
                <TableCell><strong>Tarih</strong></TableCell>
                <TableCell><strong>Saat</strong></TableCell>
                <TableCell><strong>Süre</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>Not</strong></TableCell>
                <TableCell><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservationsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (reservationsRes?.data ?? []).map((reservation) => (
                <TableRow key={reservation.id} hover>
                  <TableCell>{reservation.customerName}</TableCell>
                  <TableCell>{reservation.licensePlate}</TableCell>
                  <TableCell>{dayjs(reservation.reservationDate).format('DD.MM.YYYY')}</TableCell>
                  <TableCell>{dayjs(reservation.reservationDate).format('HH:mm')}</TableCell>
                  <TableCell>{reservation.rentalDuration} gün</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        reservation.status === 'PENDING' ? 'Bekliyor' :
                        reservation.status === 'CONFIRMED' ? 'Onaylandı' :
                        reservation.status === 'CANCELLED' ? 'İptal' : 'Tamamlandı'
                      }
                      color={
                        reservation.status === 'PENDING' ? 'warning' :
                        reservation.status === 'CONFIRMED' ? 'success' :
                        reservation.status === 'CANCELLED' ? 'error' : 'info'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={reservation.note || 'Not bulunmuyor'} arrow>
                      <span style={{ cursor: reservation.note ? 'help' : 'default' }}>
                        {reservation.note || '-'}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => setReservationDialog({ 
                          open: true, 
                          reservation
                        })}
                        title="Düzenle"
                      >
                        <Edit />
                      </IconButton>
                      {reservation.status === 'PENDING' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleConfirmReservation(reservation.id)}
                          title="Onayla"
                        >
                          <CheckCircle />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteReservation(reservation.id)}
                        title="Sil"
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

        {(reservationsRes?.data ?? []).length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Henüz rezervasyon bulunmuyor.
          </Alert>
        )}
      </Paper>

      {/* BOŞTA OLAN ARAÇLAR */}
     

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

      {/* BOŞTA OLAN ARAÇLAR */}
     
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
        <DialogContent dividers sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          {detailDialog.rental && (() => {
            // Hesaplamaları yap - ESKİ HALİNE GETİR (sadece totalDue ve remainingBalance düzelt)
            const totalAllPaid = (detailDialog.rental.upfront || 0) + 
                                (detailDialog.rental.pay1 || 0) + 
                                (detailDialog.rental.pay2 || 0) + 
                                (detailDialog.rental.pay3 || 0) + 
                                (detailDialog.rental.pay4 || 0) +
                                (detailDialog.rental.payments ? detailDialog.rental.payments.reduce((sum: number, p: any) => sum + p.amount, 0) : 0);
            
            // Sadece totalDue ve remainingBalance için TL çevrimi
            const totalDueTL = detailDialog.rental.totalDue / 100;
            const remainingBalance = totalDueTL - totalAllPaid;
            
            // Araç geliri - ESKİ HALİNE GETİR
            const vehicleRevenue = (detailDialog.rental.days * detailDialog.rental.dailyPrice) + (detailDialog.rental.kmDiff || 0);

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Üst Kısım - Genel Özet */}
                <Alert severity={remainingBalance <= 0 ? "success" : "info"}>
                  <Typography variant="h6" gutterBottom>
                    Kiralama Özeti
                  </Typography>
                  
                  {/* Temel Mali Bilgiler Grid */}
                  <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={2.4}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: { xs: 0.5, sm: 1 }, 
                        bgcolor: 'success.100', 
                        borderRadius: 1 
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                          Toplam Ödenecek
                        </Typography>
                        <Typography variant="h6" color="success.dark" sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '0.9rem', sm: '1.25rem' }
                        }}>
                          {formatCurrency(totalDueTL)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: { xs: 0.5, sm: 1 }, 
                        bgcolor: 'info.100', 
                        borderRadius: 1 
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                          Toplam Ödenen
                        </Typography>
                        <Typography variant="h6" color="info.dark" sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '0.9rem', sm: '1.25rem' }
                        }}>
                          {formatCurrency(totalAllPaid)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: { xs: 0.5, sm: 1 }, 
                        bgcolor: 'warning.100', 
                        borderRadius: 1 
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                          Araç Geliri
                        </Typography>
                        <Typography variant="h6" color="warning.dark" sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '0.9rem', sm: '1.25rem' }
                        }}>
                          {formatCurrency(vehicleRevenue)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: { xs: 0.5, sm: 1 }, 
                        bgcolor: 'primary.100', 
                        borderRadius: 1 
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                          Kapora
                        </Typography>
                        <Typography variant="h6" color="primary.dark" sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '0.9rem', sm: '1.25rem' }
                        }}>
                          {formatCurrency(detailDialog.rental.upfront || 0)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: { xs: 0.5, sm: 1 }, 
                        bgcolor: remainingBalance > 0 ? 'error.100' : 'success.100', 
                        borderRadius: 1 
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                          Kalan Bakiye
                        </Typography>
                        <Typography variant="h6" color={remainingBalance > 0 ? 'error.dark' : 'success.dark'} sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '0.9rem', sm: '1.25rem' }
                        }}>
                          {formatCurrency(remainingBalance)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Ek Maliyetler */}
                  {(detailDialog.rental.kmDiff > 0 || detailDialog.rental.cleaning > 0 || detailDialog.rental.hgs > 0 || detailDialog.rental.damage > 0 || detailDialog.rental.fuel > 0) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Ek Maliyetler
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {detailDialog.rental.kmDiff > 0 && (
                          <Chip label={`KM Farkı: ${formatCurrency(detailDialog.rental.kmDiff)}`} size="small" variant="outlined" />
                        )}
                        {detailDialog.rental.cleaning > 0 && (
                          <Chip label={`Temizlik: ${formatCurrency(detailDialog.rental.cleaning)}`} size="small" variant="outlined" />
                        )}
                        {detailDialog.rental.hgs > 0 && (
                          <Chip label={`HGS: ${formatCurrency(detailDialog.rental.hgs)}`} size="small" variant="outlined" />
                        )}
                        {detailDialog.rental.damage > 0 && (
                          <Chip label={`Hasar: ${formatCurrency(detailDialog.rental.damage)}`} size="small" variant="outlined" />
                        )}
                        {detailDialog.rental.fuel > 0 && (
                          <Chip label={`Yakıt: ${formatCurrency(detailDialog.rental.fuel)}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                  )}
                </Alert>

                {/* Alt Kısım - Detaylı Bilgiler Grid */}
                <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                  {/* Sol Kolon - Genel Bilgiler */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" sx={{ 
                        mb: 2, 
                        color: 'primary.main', 
                        fontWeight: 600,
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}>
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
                            {formatCurrency(detailDialog.rental.totalDue / 100)}
                          </Typography>
                        </Box>
                        
                        <Divider />
                        
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
                          Planlanan Ödemeler:
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

                        {/* Ek Ödemeler */}
                        {detailDialog.rental.payments && detailDialog.rental.payments.length > 0 && (
                          <>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
                              Ek Ödemeler ({detailDialog.rental.payments.length} adet):
                            </Typography>
                            {detailDialog.rental.payments.map((payment: any, index: number) => (
                              <Box key={payment.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  {index + 1}. Ödeme ({payment.method === 'CASH' ? 'Nakit' : payment.method === 'CARD' ? 'Kart' : 'Transfer'}):
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                  {formatCurrency(payment.amount)}
                                </Typography>
                              </Box>
                            ))}
                          </>
                        )}
                        
                        <Divider />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>Toplam Ödenen:</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {formatCurrency(totalAllPaid)}
                          </Typography>
                        </Box>
                        
                        <Divider />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>Araç Geliri:</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: 'warning.main' }}>
                            {formatCurrency(vehicleRevenue)}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                          (Temel Tutar + KM Farkı + Ödemeler)
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>Kalan Bakiye:</Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 700, 
                              color: remainingBalance > 0 ? 'error.main' : 'success.main'
                            }}
                          >
                            {formatCurrency(remainingBalance)}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            );
          })()}
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
                <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      height: '100%'
                    }}>
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ 
                              fontWeight: 700, 
                              mb: 0.5,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}>
                              {formatCurrency(totalRevenue)}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.9,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}>
                              Toplam Gelir
                            </Typography>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: { xs: 32, sm: 40 }, 
                            height: { xs: 32, sm: 40 } 
                          }}>
                            <MoneyIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
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
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ 
                              fontWeight: 700, 
                              mb: 0.5,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}>
                              {totalRentals}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.9,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}>
                              Toplam Kiralama
                            </Typography>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: { xs: 32, sm: 40 }, 
                            height: { xs: 32, sm: 40 } 
                          }}>
                            <CalendarIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
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
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ 
                              fontWeight: 700, 
                              mb: 0.5,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}>
                              {activeRentals}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.9,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}>
                              Aktif Kiralama
                            </Typography>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: { xs: 32, sm: 40 }, 
                            height: { xs: 32, sm: 40 } 
                          }}>
                            <TrendingUpIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
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
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" component="div" sx={{ 
                              fontWeight: 700, 
                              mb: 0.5,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}>
                              {formatCurrency(outstandingAmount)}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.9,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}>
                              Kalan Bakiye
                            </Typography>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: { xs: 32, sm: 40 }, 
                            height: { xs: 32, sm: 40 } 
                          }}>
                            <Assignment sx={{ fontSize: { xs: 16, sm: 20 } }} />
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

      {/* Notification Modal */}
      <Dialog
        open={notificationDialog.open}
        onClose={() => setNotificationDialog({ open: false, type: 'success', title: '', message: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          color: notificationDialog.type === 'success' ? 'success.main' : 'error.main',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {notificationDialog.type === 'success' ? '✅' : '❌'} {notificationDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {notificationDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setNotificationDialog({ open: false, type: 'success', title: '', message: '' })}
            color="primary"
            variant="contained"
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Payment Dialog */}
      {selectedRental && (
        <AddPaymentDialog
          open={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
        />
      )}

      {/* Edit Rental Dialog */}
      {selectedRental && (
        <EditRentalDialog
          open={editRentalDialogOpen}
          onClose={() => {
            setEditRentalDialogOpen(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
        />
      )}
      
      {/* Reservation Dialog */}
      <ReservationDialog
        open={reservationDialog.open}
        onClose={() => setReservationDialog({ open: false, reservation: null })}
        onSubmit={(data) => {
          if (reservationDialog.reservation) {
            // Düzenleme modu
            updateReservationMutation.mutate({ ...data, id: reservationDialog.reservation.id });
          } else {
            // Yeni rezervasyon
            createReservationMutation.mutate(data);
          }
        }}
        customers={customers}
        vehicles={allVehicles.map(v => ({ id: v.id, licensePlate: v.plate || '' }))}
        reservation={reservationDialog.reservation}
        loading={createReservationMutation.isPending || updateReservationMutation.isPending}
      />
    </Layout>
  );
}
