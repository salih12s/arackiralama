import { useState, useMemo } from 'react';
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
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingDown as TrendingDownIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import { formatCurrency, rentalsApi, paymentsApi } from '../api/client';

interface CustomerDebtHistory {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  totalRentals: number;
  totalBilled: number;
  totalPaid: number;
  currentDebt: number;
  debtHistory: Array<{
    rentalId: string;
    vehiclePlate: string;
    vehicleBrand: string;
    vehicleModel: string;
    startDate: string;
    endDate: string;
    totalDue: number;
    paidAmount: number;
    remainingDebt: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
    paymentDate?: string;
    daysOverdue: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  paymentHistory: Array<{
    paymentId: string;
    rentalId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    description?: string;
  }>;
  riskScore: number;
  lastPaymentDate?: string;
  avgPaymentDelay: number;
}

export default function DebtorDetails() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebtHistory | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDateDialog, setEditDateDialog] = useState<{open: boolean; customerId: string | null; currentDate: string | null}>({
    open: false,
    customerId: null,
    currentDate: null
  });
  const [newPaymentDate, setNewPaymentDate] = useState<dayjs.Dayjs | null>(null);
  const [successDialog, setSuccessDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all rentals to build debt history
  const { data: allRentalsData, isLoading: rentalsLoading, error: rentalsError } = useQuery({
    queryKey: ['all-rentals-debt-analysis'],
    queryFn: async () => {
      console.log('🔄 Fetching debt analysis rentals...');
      const result = await rentalsApi.getAll({ 
        limit: 10000,
      });
      console.log('📋 Debt analysis API response:', result);
      console.log('📋 Debt analysis data structure:', result?.data);
      console.log('📋 Rentals array length:', result?.data?.data?.length);
      return result;
    },
    staleTime: 1 * 60 * 1000, // Reduce to 1 minute for testing
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true, // Enable refetch on focus
    refetchOnMount: true, // Always refetch on mount
  });

  const rentals = allRentalsData?.data?.data || [];
  console.log('🏠 DebtorDetails - Rentals data:', rentals);
  console.log('🏠 DebtorDetails - Rentals length:', rentals.length);

  // Calculate comprehensive customer debt history with memoization
  const customerDebtHistory: CustomerDebtHistory[] = useMemo(() => {
    console.log('💭 Computing customer debt history...');
    console.log('📊 Processing', rentals.length, 'rentals');
    
    if (!rentals || rentals.length === 0) {
      console.log('⚠️ No rentals data available');
      return [];
    }
    const customerMap = new Map<string, CustomerDebtHistory>();

    // Process all rentals
    rentals.forEach((rental: any, index: number) => {
      if (index === 0) { // First rental raw data check
        console.log('🔍 RAW RENTAL DATA CHECK:');
        console.log('totalDue:', rental.totalDue, 'type:', typeof rental.totalDue);
        console.log('balance:', rental.balance, 'type:', typeof rental.balance);
        console.log('upfront:', rental.upfront, 'type:', typeof rental.upfront);
        console.log('Full rental object:', rental);
      }
      
      if (index < 3) { // Log first 3 rentals for debug
        console.log(`📋 Processing rental ${index + 1}:`, rental);
      }
      
      const customerId = rental.customer?.id || rental.customerId || 'unknown';
      const customerName = rental.customer?.fullName || rental.customerName || 'Bilinmeyen Müşteri';

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName,
          customerPhone: rental.customer?.phone,
          customerEmail: rental.customer?.email,
          totalRentals: 0,
          totalBilled: 0,
          totalPaid: 0,
          currentDebt: 0,
          debtHistory: [],
          paymentHistory: [],
          riskScore: 0,
          avgPaymentDelay: 0,
        });
        
        if (index < 3) {
          console.log(`👤 Created new customer: ${customerName} (ID: ${customerId})`);
        }
      }

      const customer = customerMap.get(customerId)!;
      customer.totalRentals += 1;
      
      // Values are already in TL from API
      const totalDue = rental.totalDue || 0;
      const balance = rental.balance || 0;
      const paidAmount = totalDue - balance;
      
      if (index < 3) {
        console.log(`💰 Rental ${index + 1} amounts - Total: ${totalDue} TL, Paid: ${paidAmount} TL, Balance: ${balance} TL`);
      }
      
      customer.totalBilled += totalDue;
      customer.totalPaid += paidAmount;
      customer.currentDebt += balance;

      // Calculate payment status
      let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
      
      if (balance <= 0) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      }

      // Calculate days overdue
      const endDate = dayjs(rental.endDate);
      const now = dayjs();
      const daysOverdue = status !== 'PAID' && rental.status !== 'ACTIVE' ? Math.max(0, now.diff(endDate, 'days')) : 0;

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (balance > 0) {
        if (balance > 15000 || daysOverdue > 60) riskLevel = 'CRITICAL'; // 15000 TL
        else if (balance > 10000 || daysOverdue > 30) riskLevel = 'HIGH'; // 10000 TL
        else if (balance > 5000 || daysOverdue > 15) riskLevel = 'MEDIUM'; // 5000 TL
      }

      customer.debtHistory.push({
        rentalId: rental.id,
        vehiclePlate: rental.vehicle?.plate || 'Bilinmeyen',
        vehicleBrand: rental.vehicle?.brand || 'Bilinmeyen',
        vehicleModel: rental.vehicle?.model || 'Bilinmeyen',
        startDate: rental.startDate,
        endDate: rental.endDate,
        totalDue: totalDue,
        paidAmount: paidAmount,
        remainingDebt: balance,
        status,
        paymentDate: status === 'PAID' ? rental.completedAt : undefined,
        daysOverdue,
        riskLevel,
      });

      // Add payment history from payments relation
      if (rental.payments && Array.isArray(rental.payments)) {
        rental.payments.forEach((payment: any) => {
          customer.paymentHistory.push({
            paymentId: payment.id,
            rentalId: rental.id,
            amount: payment.amount || 0, // Already in TL
            paymentDate: payment.paidAt,
            paymentMethod: payment.method === 'CASH' ? 'Nakit' : 
                          payment.method === 'TRANSFER' ? 'Havale' : 
                          payment.method === 'CARD' ? 'Kart' : 'Diğer',
            description: `${payment.method} ödemesi`,
          });
        });
      }

      // Add manual payments (upfront, pay1, pay2, pay3, pay4)
      const manualPayments = [
        { name: 'Kapora', amount: rental.upfront },
        { name: '1. Taksit', amount: rental.pay1 },
        { name: '2. Taksit', amount: rental.pay2 },
        { name: '3. Taksit', amount: rental.pay3 },
        { name: '4. Taksit', amount: rental.pay4 },
      ];

      manualPayments.forEach((payment, index) => {
        if (payment.amount && payment.amount > 0) {
          customer.paymentHistory.push({
            paymentId: `${rental.id}-manual-${index}`,
            rentalId: rental.id,
            amount: payment.amount, // Already in TL
            paymentDate: rental.createdAt, // Use creation date as fallback
            paymentMethod: 'Nakit',
            description: payment.name,
          });
        }
      });
    });

    console.log('✅ Processed all rentals, customers found:', customerMap.size);
    customerMap.forEach((customer) => {
      console.log(`👤 ${customer.customerName}: ${customer.totalRentals} rentals, ${customer.currentDebt.toFixed(2)} TL debt`);
    });

    // Calculate risk scores and other metrics
    customerMap.forEach((customer) => {
      // Calculate average payment delay
      const paidRentals = customer.debtHistory.filter(d => d.status === 'PAID');
      if (paidRentals.length > 0) {
        const totalDelay = paidRentals.reduce((sum, rental) => {
          if (rental.paymentDate) {
            const endDate = dayjs(rental.endDate);
            const paymentDate = dayjs(rental.paymentDate);
            return sum + Math.max(0, paymentDate.diff(endDate, 'days'));
          }
          return sum;
        }, 0);
        customer.avgPaymentDelay = totalDelay / paidRentals.length;
      }

      // Calculate risk score (0-100)
      let riskScore = 0;
      if (customer.currentDebt > 0) riskScore += 30;
      if (customer.currentDebt > 10000) riskScore += 20;
      if (customer.avgPaymentDelay > 15) riskScore += 20;
      const criticalDebts = customer.debtHistory.filter(d => d.riskLevel === 'CRITICAL').length;
      riskScore += Math.min(30, criticalDebts * 10);
      customer.riskScore = Math.min(100, riskScore);

      // Set last payment date
      const sortedPayments = customer.paymentHistory.sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
      customer.lastPaymentDate = sortedPayments[0]?.paymentDate;

      // Sort debt history by date (newest first)
      customer.debtHistory.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    });

    return Array.from(customerMap.values());
  }, [rentals]); // Only recalculate when rentals data changes

  console.log('👥 Customer debt history calculated:', customerDebtHistory);
  console.log('👥 Total customers:', customerDebtHistory.length);

  // Filter customers based on search with memoization
  const filteredCustomers = useMemo(() => 
    customerDebtHistory.filter(customer =>
      customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerPhone?.includes(searchTerm) ||
      customer.debtHistory.some(debt => debt.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [customerDebtHistory, searchTerm]
  );

  // Sort by risk score and current debt with memoization
  const sortedCustomers = useMemo(() => 
    [...filteredCustomers].sort((a, b) => {
      if (a.currentDebt > 0 && b.currentDebt === 0) return -1;
      if (b.currentDebt > 0 && a.currentDebt === 0) return 1;
      if (a.currentDebt > 0 && b.currentDebt > 0) {
        return b.riskScore - a.riskScore || b.currentDebt - a.currentDebt;
      }
      return b.totalBilled - a.totalBilled;
    }), [filteredCustomers]
  );

  const handleCustomerClick = (customer: CustomerDebtHistory) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PARTIAL': return 'warning';
      default: return 'error';
    }
  };

  // Calculate summary statistics with memoization
  const {
    totalCustomers,
    customersWithDebt,
    totalOutstandingDebt,
    averageDebt
  } = useMemo(() => {
    const total = customerDebtHistory.length;
    const withDebt = customerDebtHistory.filter(c => c.currentDebt > 0).length;
    const outstandingDebt = customerDebtHistory.reduce((sum, c) => sum + c.currentDebt, 0);
    const avgDebt = withDebt > 0 ? outstandingDebt / withDebt : 0;

    return {
      totalCustomers: total,
      customersWithDebt: withDebt,
      totalOutstandingDebt: outstandingDebt,
      averageDebt: avgDebt
    };
  }, [customerDebtHistory]);

  if (rentalsError) {
    console.log('❌ DebtorDetails - Error:', rentalsError);
    return (
      <Layout title="Borçlu Kişiler Detay">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Veri yüklenemedi
            </Typography>
            <Typography variant="body2">
              Borçlu kişi verileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.
            </Typography>
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
    console.log('⏳ DebtorDetails - Loading rentals...');
    return (
      <Layout title="Borçlu Kişiler Detay">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <LinearProgress sx={{ width: '50%', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Borçlu kişiler analiz ediliyor...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tüm kiralama geçmişi ve ödeme verileri toplanıyor
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (!allRentalsData?.data?.data || allRentalsData.data.data.length === 0) {
    console.log('⚠️ No rental data found, showing empty state');
    console.log('📊 All rentals data:', allRentalsData);
    return (
      <Layout title="Borçlu Kişiler Detay">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Henüz kiralama verisi bulunamadı
            </Typography>
            <Typography variant="body2">
              Sistem henüz kiralama işlemi kaydı bulunmuyor. İlk kiralama işleminden sonra bu sayfa otomatik olarak doldurulacaktır.
            </Typography>
          </Alert>
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Verileri Yenile
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Borçlu Kişiler Detay">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            👥 Borçlu Kişiler Detay Analizi
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tüm müşterilerin borçlanma geçmişi, ödeme durumu ve risk analizi
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            queryClient.invalidateQueries({ queryKey: ['all-rentals-debt-analysis'] });
          }}
          sx={{ ml: 2 }}
        >
          Verileri Yenile
        </Button>
      </Box>

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                    {totalCustomers}
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                    Toplam Müşteri
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <PersonIcon />
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
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>
                    {customersWithDebt}
                  </Typography>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                    Borçlu Müşteri
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', color: 'white' }}>
                  <WarningIcon />
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
                    {formatCurrency(totalOutstandingDebt)}
                  </Typography>
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                    Toplam Borç
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', color: 'white' }}>
                  <AccountBalanceIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Müşteri adı, telefon veya araç plakası ile arama yapın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Customer List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Müşteri Borç Detayları ({sortedCustomers.length} müşteri)
        </Typography>

        {sortedCustomers.length === 0 ? (
          <Alert severity="info">
            Arama kriterlerinize uygun müşteri bulunamadı.
          </Alert>
        ) : (
          <Stack spacing={2}>
            {sortedCustomers.map((customer) => (
              <Accordion key={customer.customerId}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: customer.currentDebt > 0 ? 'error.main' : 'success.main' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {customer.customerName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {customer.customerPhone || 'Telefon yok'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                    
                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Kiralama
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {customer.totalRentals}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Mevcut Borç
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          color: customer.currentDebt > 0 ? 'error.main' : 'success.main'
                        }}
                      >
                        {formatCurrency(customer.currentDebt)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Risk Skoru
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {customer.riskScore}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={customer.riskScore} 
                          sx={{ 
                            width: 50,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: customer.riskScore > 70 ? 'error.main' : 
                                            customer.riskScore > 40 ? 'warning.main' : 'success.main'
                            }
                          }} 
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {customer.currentDebt > 0 && (
                          <Chip 
                            label="Borçlu" 
                            color="error" 
                            size="small" 
                            variant="filled"
                          />
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomerClick(customer);
                          }}
                        >
                          Detay
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </AccordionSummary>

                <AccordionDetails>
                  <Box sx={{ pl: 2 }}>
                    {/* Customer Summary */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                            Toplam Faturalandırılan
                          </Typography>
                          <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                            {formatCurrency(customer.totalBilled)}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                            Toplam Ödenen
                          </Typography>
                          <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                            {formatCurrency(customer.totalPaid)}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                          <Typography variant="body2" color="info.main" sx={{ fontWeight: 600 }}>
                            Ortalama Ödeme Gecikmesi
                          </Typography>
                          <Typography variant="h6" color="info.main" sx={{ fontWeight: 700 }}>
                            {customer.avgPaymentDelay.toFixed(1)} gün
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                              Son Ödeme
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                setEditDateDialog({
                                  open: true,
                                  customerId: customer.customerId,
                                  currentDate: customer.lastPaymentDate || null
                                });
                                setNewPaymentDate(customer.lastPaymentDate ? dayjs(customer.lastPaymentDate) : null);
                              }}
                              sx={{ minWidth: 'auto', px: 1, py: 0.5 }}
                            >
                              Düzenle
                            </Button>
                          </Stack>
                          <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700 }}>
                            {customer.lastPaymentDate ? dayjs(customer.lastPaymentDate).format('DD/MM/YYYY') : 'Yok'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {/* Recent Rentals */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      Son 5 Kiralama Geçmişi
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Araç</TableCell>
                            <TableCell>Tarih</TableCell>
                            <TableCell align="right">Tutar</TableCell>
                            <TableCell align="right">Ödenen</TableCell>
                            <TableCell align="right">Kalan</TableCell>
                            <TableCell>Durum</TableCell>
                            <TableCell>Risk</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customer.debtHistory.slice(0, 5).map((debt) => (
                            <TableRow key={debt.rentalId}>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {debt.vehiclePlate}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {debt.vehicleBrand} {debt.vehicleModel}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {dayjs(debt.startDate).format('DD/MM/YYYY')} -
                                </Typography>
                                <Typography variant="body2">
                                  {dayjs(debt.endDate).format('DD/MM/YYYY')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {formatCurrency(debt.totalDue)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                  {formatCurrency(debt.paidAmount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: debt.remainingDebt > 0 ? 'error.main' : 'success.main'
                                  }}
                                >
                                  {formatCurrency(debt.remainingDebt)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    debt.status === 'PAID' ? 'Ödendi' :
                                    debt.status === 'PARTIAL' ? 'Kısmi' : 'Ödenmedi'
                                  }
                                  color={getStatusColor(debt.status) as any}
                                  size="small"
                                  variant="filled"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    debt.riskLevel === 'CRITICAL' ? 'Kritik' :
                                    debt.riskLevel === 'HIGH' ? 'Yüksek' :
                                    debt.riskLevel === 'MEDIUM' ? 'Orta' : 'Düşük'
                                  }
                                  color={getRiskColor(debt.riskLevel) as any}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {customer.debtHistory.length > 5 && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button 
                          variant="text" 
                          onClick={() => handleCustomerClick(customer)}
                        >
                          Tüm Geçmişi Görüntüle ({customer.debtHistory.length} kayıt)
                        </Button>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Customer Detail Modal */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {selectedCustomer?.customerName} - Detaylı Borç Analizi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ödenmemiş {selectedCustomer?.debtHistory.filter(d => d.status === 'UNPAID').length} kiralama, {selectedCustomer?.paymentHistory.length} ödeme
              </Typography>
            </Box>
            <Chip
              label={`Risk: ${selectedCustomer?.riskScore}%`}
              color={
                (selectedCustomer?.riskScore || 0) > 70 ? 'error' :
                (selectedCustomer?.riskScore || 0) > 40 ? 'warning' : 'success'
              }
              variant="filled"
            />
          </Stack>
        </DialogTitle>

        <DialogContent>
          {selectedCustomer && (
            <Box>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                        Toplam Faturalandırılan
                      </Typography>
                      <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                        {formatCurrency(selectedCustomer.totalBilled)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                        Toplam Ödenen
                      </Typography>
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                        {formatCurrency(selectedCustomer.totalPaid)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                        Mevcut Borç
                      </Typography>
                      <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
                        {formatCurrency(selectedCustomer.currentDebt)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                        Tahsil Oranı
                      </Typography>
                      <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700 }}>
                        %{((selectedCustomer.totalPaid / selectedCustomer.totalBilled) * 100).toFixed(1)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Unpaid Rental History */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Ödenmemiş Kiralamalar
              </Typography>
              <TableContainer sx={{ maxHeight: 400, mb: 3 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Araç</TableCell>
                      <TableCell>Kiralama Tarihi</TableCell>
                      <TableCell>Bitiş Tarihi</TableCell>
                      <TableCell align="right">Toplam Tutar</TableCell>
                      <TableCell align="right">Ödenen</TableCell>
                      <TableCell align="right">Kalan</TableCell>
                      <TableCell>Ödeme Tarihi</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>Gecikme</TableCell>
                      <TableCell>Risk</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedCustomer.debtHistory
                      .filter((debt) => debt.status === 'UNPAID') // Sadece borçlu olanları göster
                      .length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                            🎉 Bu müşterinin ödenmemiş borcu bulunmuyor!
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedCustomer.debtHistory
                        .filter((debt) => debt.status === 'UNPAID')
                        .map((debt) => (
                      <TableRow key={debt.rentalId} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {debt.vehiclePlate}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {debt.vehicleBrand} {debt.vehicleModel}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {dayjs(debt.startDate).format('DD/MM/YYYY')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {dayjs(debt.endDate).format('DD/MM/YYYY')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(debt.totalDue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                            {formatCurrency(debt.paidAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: debt.remainingDebt > 0 ? 'error.main' : 'success.main'
                            }}
                          >
                            {formatCurrency(debt.remainingDebt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {debt.paymentDate ? (
                            <Typography variant="body2">
                              {dayjs(debt.paymentDate).format('DD/MM/YYYY')}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              debt.status === 'PAID' ? 'Ödendi' :
                              debt.status === 'PARTIAL' ? 'Kısmi' : 'Ödenmedi'
                            }
                            color={getStatusColor(debt.status) as any}
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell>
                          {debt.daysOverdue > 0 ? (
                            <Chip
                              label={`${debt.daysOverdue} gün`}
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label="Zamanında"
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              debt.riskLevel === 'CRITICAL' ? 'Kritik' :
                              debt.riskLevel === 'HIGH' ? 'Yüksek' :
                              debt.riskLevel === 'MEDIUM' ? 'Orta' : 'Düşük'
                            }
                            color={getRiskColor(debt.riskLevel) as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Payment History */}
              {selectedCustomer.paymentHistory.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Ödeme Geçmişi ({selectedCustomer.paymentHistory.length} ödeme)
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Ödeme Tarihi</TableCell>
                          <TableCell align="right">Tutar</TableCell>
                          <TableCell>Ödeme Yöntemi</TableCell>
                          <TableCell>Açıklama</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedCustomer.paymentHistory
                          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                          .map((payment) => (
                          <TableRow key={payment.paymentId} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {dayjs(payment.paymentDate).format('DD/MM/YYYY HH:mm')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                {formatCurrency(payment.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={payment.paymentMethod}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {payment.description || '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Son Ödeme Tarihi Düzenleme Dialog'u */}
      <Dialog
        open={editDateDialog.open}
        onClose={() => setEditDateDialog({ open: false, customerId: null, currentDate: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Son Ödeme Tarihini Düzenle</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Bu müşterinin en son ödeme tarihini güncelleyebilirsiniz. Bu işlem gerçek ödeme kaydının tarihini değiştirecektir.
          </Alert>
          
          <DatePicker
            label="Son Ödeme Tarihi"
            value={newPaymentDate}
            onChange={(newValue) => setNewPaymentDate(newValue)}
            sx={{ width: '100%' }}
            format="DD/MM/YYYY"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setEditDateDialog({ open: false, customerId: null, currentDate: null });
              setNewPaymentDate(null);
            }}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newPaymentDate || isUpdating}
            onClick={async () => {
              setIsUpdating(true);
              try {
                if (!newPaymentDate || !editDateDialog.customerId) return;
                
                // Müşterinin en son ödeme kaydını bul
                const customerRentals = rentals.filter(r => r.customer?.id === editDateDialog.customerId);
                const allPayments = customerRentals.flatMap(r => r.payments || []);
                const latestPayment = allPayments.sort((a, b) => 
                  new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
                )[0];

                if (latestPayment) {
                  // En son ödeme kaydının tarihini güncelle
                  await paymentsApi.updatePaymentDate(
                    latestPayment.id, 
                    newPaymentDate.toISOString()
                  );
                  
                  // Veri cache'ini yenile
                  await queryClient.invalidateQueries({ queryKey: ['all-rentals-debt-analysis'] });
                  
                  // Dialog'u kapat
                  setEditDateDialog({ open: false, customerId: null, currentDate: null });
                  setNewPaymentDate(null);
                  
                  // Başarı modalını göster
                  setSuccessDialog(true);
                } else {
                  alert('Bu müşterinin ödeme kaydı bulunamadı!');
                }
              } catch (error) {
                console.error('Ödeme tarihi güncelleme hatası:', error);
                alert('Ödeme tarihi güncellenirken hata oluştu!');
              } finally {
                setIsUpdating(false);
              }
            }}
          >
            {isUpdating ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Başarı Modal'ı */}
      <Dialog
        open={successDialog}
        onClose={() => setSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', color: 'success.main' }}>
          ✅ Başarılı!
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Son ödeme tarihi başarıyla güncellendi!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Değişiklikler hemen yansıyacaktır.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            variant="contained"
            onClick={() => setSuccessDialog(false)}
            color="success"
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
