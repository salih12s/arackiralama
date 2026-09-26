import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogContent,
  DialogActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  DownloadOutlined as DownloadIcon,
  PrintOutlined as PrintIcon,
  EditOutlined as EditIcon
} from '@mui/icons-material';
import { a, fonts, monoSx } from '../admin/theme';
import { DialogHeader } from '../admin/dialogParts';
import { EmptyState, KpiTile, PageHeader, Plate, SearchField, Status, StatusBadge, Toolbar, panelSx, kpiRow3Sx } from '../admin/ui';
import { rentalsApi, vehiclesApi, customersApi } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/format';
import { getStatusText, StatusType } from '../utils/status';

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
  // Ek ödemeler (taksit dışı)
  extraPayments: number;
  // Açıklama alanı
  description?: string;
  // Orijinal toplam tutar ve kullanıcı notu
  note?: string;
}

export const UnpaidDebtsDetail: React.FC = () => {
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
    rentalType: 'NEW' as 'NEW' | 'EXTENSION',
    description: '',
    note: '' // Orijinal note'u da sakla
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    // Sadece borçlu müşterileri filtrele (balance > 0)
    let filtered = rentals.filter(rental => rental.balance > 0);
    
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
        vehiclesApi.getAll(undefined, 1000),
        customersApi.getAll(undefined, 1000)
      ]);

      console.log('Rentals Response:', rentalsResponse);
      console.log('Vehicles Response:', vehiclesResponse);
      console.log('Customers Response:', customersResponse);

      const rentalsData = Array.isArray(rentalsResponse.data) ? rentalsResponse.data : (rentalsResponse.data.data || []);
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
          
          // Orijinal toplam tutarı note'dan oku
          const noteMatch = rental.note?.match(/ORIGINAL_TOTAL:(\d+)/);
          const originalTotalTL = noteMatch ? parseInt(noteMatch[1]) / 100 : (rental.days * rental.dailyPrice);
          const days = rental.days || 0;
          const dailyPrice = rental.dailyPrice || 0;
          const totalPrice = originalTotalTL;
          
          // KM bilgileri - Schema'da kmDiff var, bu KM ücreti 
          const kmDiff = rental.kmDiff || 0; 
          
          const hgsFee = rental.hgs || 0;     
          const cleaningFee = rental.cleaning || 0; 
          
          // Kaza ve yakıt ücretleri ayrı tutulacak
          const damageFee = rental.damage || 0;  
          const fuelCost = rental.fuel || 0;     
          const otherFees = 0; // Diğer ücretler
          
          const totalAmount = totalPrice + kmDiff + hgsFee + cleaningFee + damageFee + fuelCost + otherFees;
          const advancePayment = rental.upfront || 0; 
          
          // Calculate total paid from payments and installments
          const pay1 = rental.pay1 || 0;  
          const pay2 = rental.pay2 || 0;  
          const pay3 = rental.pay3 || 0;  
          const pay4 = rental.pay4 || 0;  
          
          const totalPaid = (rental.payments || []).reduce((sum: number, payment: any) => 
            sum + (payment.amount || 0), 0  // payment.amount zaten kuruş cinsinde
          ) + advancePayment + pay1 + pay2 + pay3 + pay4;
          
          const balance = totalAmount - totalPaid;

          // Ek ödemeleri hesapla (taksit ödemeleri dışındaki ödemeler)
          const installmentPayments = advancePayment + pay1 + pay2 + pay3 + pay4;
          const extraPayments = Math.max(0, totalPaid - installmentPayments);

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
            kmTotal: kmDiff, // KM ücreti (kuruş)
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
            // Ödemeler - kuruş cinsinden
            payment1: pay1,
            payment2: pay2,
            payment3: pay3,
            payment4: pay4,
            // Yakıt bedeli ayrı - kuruş cinsinden
            actualFuelCost: fuelCost, // Gerçek yakıt ücreti
            // Ek ödemeler (taksit dışı)
            extraPayments: extraPayments,
            // Açıklama alanı - ORIGINAL_TOTAL kısmını gizle
            description: rental.note?.replace(/ORIGINAL_TOTAL:\d+\|?/, '') || ''
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

  const handlePrint = () => {
    window.print();
  };

  const handleEditRental = (rentalId: string) => {
    const rental = filteredRentals.find(r => r.id === rentalId);
    if (rental) {
      console.log('Edit rental data:', rental); // Debug için
      setEditingRental(rental);
      // Veriler artık API'dan TL cinsinde geliyor, direkt kullan (100'e bölme!)
      setEditForm({
        startDate: rental.startDate,
        endDate: rental.endDate,
        customerId: rental.customerId,
        vehicleId: rental.vehicleId,
        days: rental.days,
        dailyPrice: rental.dailyPrice,      // TL cinsinden direkt kullan
        kmPrice: rental.kmPrice,            // TL cinsinden direkt kullan
        hgsFee: rental.hgsFee,              // TL cinsinden direkt kullan
        damageFee: rental.damageFee,        // TL cinsinden direkt kullan
        actualFuelCost: rental.actualFuelCost, // TL cinsinden direkt kullan
        fuelCost: rental.fuelCost,          // TL cinsinden direkt kullan
        advancePayment: rental.advancePayment, // TL cinsinden direkt kullan
        payment1: rental.payment1,          // TL cinsinden direkt kullan
        payment2: rental.payment2,          // TL cinsinden direkt kullan
        payment3: rental.payment3,          // TL cinsinden direkt kullan
        payment4: rental.payment4,          // TL cinsinden direkt kullan
        rentalType: (rental.rentalType || 'NEW') as 'NEW' | 'EXTENSION',
        description: rental.description?.replace(/ORIGINAL_TOTAL:\d+\|?/, '') || '',
        note: rental.note || '' // Orijinal note'u da sakla
      });
      console.log('Edit form set:', editForm); // Debug için
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
        rentalType: editForm.rentalType,
        note: editForm.description              // Açıklama alanı
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

  // Bakiye: toplamdan peşin, 4 taksit ve plan dışı ek ödemeler düşülür
  // (Kiralamalar, Borçlular ve kiralama detayıyla aynı hesap).
  const sheetBalance = (rental: RentalData) => rental.balance;

  const customerLabel = (rental: RentalData) => `${rental.customer.firstName} ${rental.customer.lastName}`.trim() || 'Bilinmiyor';

  const sheetColumns: { key: string; label: string; align?: 'left' | 'right' | 'center'; value: (rental: RentalData) => React.ReactNode; excel: (rental: RentalData) => string | number; strong?: boolean }[] = [
    { key: 'date', label: 'Tarih', value: (r) => <><Box component="span" sx={{ display: 'block' }}>{formatDate(r.startDate)}</Box><Box component="span" sx={{ display: 'block', color: a.muted }}>{formatDate(r.endDate)}</Box></>, excel: (r) => `${formatDate(r.startDate)} - ${formatDate(r.endDate)}` },
    { key: 'plate', label: 'Plaka', value: (r) => <Plate value={r.vehicle.plate} size="sm" />, excel: (r) => r.vehicle.plate },
    { key: 'vehicle', label: 'Araç', value: (r) => <Box component="span" sx={{ fontFamily: fonts.sans }}>{r.vehicle.name || 'Bilinmiyor'}</Box>, excel: (r) => r.vehicle.name },
    { key: 'customer', label: 'Kiralayan', value: (r) => <Box component="span" sx={{ fontWeight: 700, fontFamily: fonts.sans }}>{customerLabel(r)}</Box>, excel: customerLabel },
    { key: 'days', label: 'Gün', align: 'center', value: (r) => r.days, excel: (r) => r.days },
    { key: 'rent', label: 'Kira', align: 'right', value: (r) => formatCurrency(r.totalPrice), excel: (r) => r.totalPrice },
    { key: 'km', label: 'KM', align: 'right', value: (r) => formatCurrency(r.kmPrice), excel: (r) => r.kmPrice },
    { key: 'rentKm', label: 'Kira+KM', align: 'right', strong: true, value: (r) => formatCurrency(r.totalPrice + r.kmTotal), excel: (r) => r.totalPrice + r.kmTotal },
    { key: 'cleaning', label: 'Temizlik', align: 'right', value: (r) => formatCurrency(r.fuelCost), excel: (r) => r.fuelCost },
    { key: 'hgs', label: 'HGS', align: 'right', value: (r) => formatCurrency(r.hgsFee), excel: (r) => r.hgsFee },
    { key: 'damage', label: 'Kaza', align: 'right', value: (r) => formatCurrency(r.damageFee), excel: (r) => r.damageFee },
    { key: 'fuel', label: 'Yakıt', align: 'right', value: (r) => formatCurrency(r.actualFuelCost), excel: (r) => r.actualFuelCost },
    { key: 'total', label: 'Toplam', align: 'right', strong: true, value: (r) => formatCurrency(r.totalAmount), excel: (r) => r.totalAmount },
    { key: 'advance', label: 'Peşin', align: 'right', value: (r) => formatCurrency(r.advancePayment), excel: (r) => r.advancePayment },
    { key: 'p1', label: '1. öd.', align: 'right', value: (r) => formatCurrency(r.payment1), excel: (r) => r.payment1 },
    { key: 'p2', label: '2. öd.', align: 'right', value: (r) => formatCurrency(r.payment2), excel: (r) => r.payment2 },
    { key: 'p3', label: '3. öd.', align: 'right', value: (r) => formatCurrency(r.payment3), excel: (r) => r.payment3 },
    { key: 'p4', label: '4. öd.', align: 'right', value: (r) => formatCurrency(r.payment4), excel: (r) => r.payment4 },
    { key: 'extra', label: 'Ek öd.', align: 'right', value: (r) => (r.extraPayments ? <Box component="span" sx={{ color: a.success }}>{formatCurrency(r.extraPayments)}</Box> : formatCurrency(0)), excel: (r) => r.extraPayments },
    {
      key: 'balance',
      label: 'Bakiye',
      align: 'right',
      strong: true,
      value: (r) => {
        const balance = sheetBalance(r);
        return <Box component="span" sx={{ color: balance > 0 ? a.danger : a.success }}>{formatCurrency(balance)}</Box>;
      },
      excel: sheetBalance,
    },
    { key: 'status', label: 'Durum', align: 'center', value: (r) => <Status value={r.status} />, excel: (r) => getStatusText(r.status as StatusType) },
    { key: 'type', label: 'Tür', align: 'center', value: (r) => <StatusBadge label={r.rentalType === 'NEW' ? 'Yeni' : 'Uzatma'} tone={r.rentalType === 'NEW' ? 'neutral' : 'accent'} />, excel: (r) => (r.rentalType === 'NEW' ? 'Yeni' : 'Uzatma') },
    { key: 'note', label: 'Açıklama', value: (r) => <Tooltip title={r.description || ''}><Box component="span" sx={{ display: 'block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: fonts.sans, color: a.muted }}>{r.description || '—'}</Box></Tooltip>, excel: (r) => r.description || '' },
  ];

  // xlsx (~280 KB) yalnızca dışa aktarırken yüklenir
  const exportSheet = async () => {
    const XLSX = await import('xlsx');
    const data = filteredRentals.map((rental) => Object.fromEntries(sheetColumns.map((column) => [column.label, column.excel(rental)])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ödenmeyen borçlar');
    XLSX.writeFile(wb, `odenmeyen-borclar-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`);
  };

  const totalOutstanding = filteredRentals.reduce((sum, rental) => sum + Math.max(0, sheetBalance(rental)), 0);
  const debtorCount = new Set(filteredRentals.map((rental) => rental.customerId)).size;

  const headCell = { position: 'sticky' as const, top: 0, zIndex: 2, bgcolor: a.raised, color: a.subtle, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, p: '10px 10px', borderBottom: `1px solid ${a.line}`, whiteSpace: 'nowrap' as const };

  return (
    <>
      <PageHeader
        title="Ödenmeyen borçlar"
        subtitle="Bakiyesi kapanmamış kiralamaların tüm kalemleri, tek tabloda."
        actions={
          <>
            <Tooltip title="Excel'e aktar">
              <span>
                <IconButton onClick={exportSheet} disabled={loading || filteredRentals.length === 0} aria-label="Excel'e aktar" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Yazdır">
              <IconButton onClick={handlePrint} aria-label="Yazdır" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={kpiRow3Sx}>
        <KpiTile label="Açık bakiye" loading={loading} value={<Box component="span" sx={{ color: totalOutstanding > 0 ? a.danger : a.ink }}>{formatCurrency(totalOutstanding)}</Box>} meta="Ek ödemeler düşülmüş" />
        <KpiTile label="Borçlu kiralama" loading={loading} value={filteredRentals.length} meta={selectedVehicle || searchTerm ? 'Filtrelenen' : 'Tümü'} />
        <KpiTile label="Müşteri" loading={loading} value={debtorCount} meta="Borcu olan kişi" />
      </Box>

      <Box sx={{ ...panelSx, overflow: 'hidden' }}>
        <Toolbar>
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Müşteri, araç veya plaka" sx={{ width: { xs: '100%', sm: 280 } }} />
          <TextField select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Araç' }} sx={{ width: { xs: '100%', sm: 220 } }}>
            <MenuItem value="">Tüm araçlar</MenuItem>
            {vehicles.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.name}</MenuItem>)}
          </TextField>
          {(selectedVehicle || searchTerm) && (
            <Button size="small" onClick={() => { setSelectedVehicle(''); setSearchTerm(''); }} sx={{ color: a.muted }}>Temizle</Button>
          )}
        </Toolbar>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><CircularProgress size={28} /></Box>
        ) : filteredRentals.length === 0 ? (
          <EmptyState title={searchTerm || selectedVehicle ? 'Filtreye uygun borçlu kiralama yok' : 'Ödenmeyen borç yok'} subtitle={searchTerm || selectedVehicle ? 'Filtreyi temizlemeyi deneyin.' : 'Tüm kiralamaların bakiyesi kapalı.'} />
        ) : (
          <Box sx={{ overflow: 'auto', maxHeight: 'calc(100dvh - 330px)', minHeight: 280 }}>
            <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 1500 }}>
              <Box component="thead">
                <Box component="tr">
                  {sheetColumns.map((column) => (
                    <Box component="th" key={column.key} scope="col" sx={{ ...headCell, textAlign: column.align || 'left' }}>{column.label}</Box>
                  ))}
                  <Box component="th" scope="col" sx={{ ...headCell, right: 0, zIndex: 3, textAlign: 'right' }} />
                </Box>
              </Box>
              <Box component="tbody">
                {filteredRentals.map((rental) => (
                  <Box component="tr" key={rental.id} sx={{ '&:nth-of-type(even) td': { bgcolor: a.hover }, '@media (hover: hover)': { '&:hover td': { bgcolor: a.accentSoft } } }}>
                    {sheetColumns.map((column) => (
                      <Box
                        component="td"
                        key={column.key}
                        sx={{
                          p: '8px 10px',
                          textAlign: column.align || 'left',
                          borderBottom: `1px solid ${a.lineSoft}`,
                          bgcolor: a.raised,
                          whiteSpace: 'nowrap',
                          fontSize: 12.5,
                          ...monoSx,
                          fontWeight: column.strong ? 600 : 400,
                          color: a.ink,
                        }}
                      >
                        {column.value(rental)}
                      </Box>
                    ))}
                    <Box component="td" sx={{ position: 'sticky', right: 0, p: '6px 10px', bgcolor: a.raised, borderBottom: `1px solid ${a.lineSoft}`, borderLeft: `1px solid ${a.lineSoft}`, textAlign: 'right' }}>
                      <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: 15 }} />} onClick={() => handleEditRental(rental.id)}>Düzenle</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

        {/* Edit Rental Modal */}
        <Dialog open={editModalOpen} onClose={handleCloseEdit} maxWidth="md" fullWidth>
          <DialogHeader
            title="Kiralamayı düzenle"
            subtitle={<><Box component="span" sx={monoSx}>{editingRental?.vehicle.plate}</Box> · {editingRental?.customer.firstName} {editingRental?.customer.lastName}</>}
            onClose={handleCloseEdit}
          />
          <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
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

              {/* Açıklama Alanı */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama/Not"
                  multiline
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => handleEditFormChange('description', e.target.value)}
                  placeholder="Kiralama ile ilgili notlar..."
                />
              </Grid>

              {/* Ek Ödemeler Bölümü */}
              {editingRental && editingRental.extraPayments > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: a.surface, borderRadius: 1, border: '1px solid', borderColor: a.line }}>
                    <Typography variant="h6" color="info.main" sx={{ mb: 2 }}>
                      Ek Ödemeler
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Taksit Ödemeleri: {formatCurrency(
                            (editingRental.advancePayment || 0) + 
                            (editingRental.payment1 || 0) + 
                            (editingRental.payment2 || 0) + 
                            (editingRental.payment3 || 0) + 
                            (editingRental.payment4 || 0)
                          )}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          Ek Ödemeler: {formatCurrency(editingRental.extraPayments)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                          Toplam Ödenen: {formatCurrency(editingRental.totalPaid)}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      * Ek ödemeler taksit ödemeleri dışında yapılan ödemelerdir ve otomatik hesaplanır.
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Calculated Totals */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, bgcolor: a.surface, borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Tutar: {formatCurrency(editingRental?.totalAmount || 0)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Ödenen: {formatCurrency(
                          (() => {
                            // Peşin + taksitler + plan dışı ek ödemeler
                            return (editForm.advancePayment || 0) +
                                   editForm.payment1 +
                                   editForm.payment2 +
                                   editForm.payment3 +
                                   editForm.payment4 +
                                   (editingRental?.extraPayments || 0);
                          })()
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        Bakiye: {formatCurrency(
                          (() => {
                            // Toplam tutar - (peşin + taksitler + ek ödemeler)
                            const totalDue = editingRental?.totalAmount || 0;
                            const totalPaid = (editForm.advancePayment || 0) +
                                            editForm.payment1 +
                                            editForm.payment2 +
                                            editForm.payment3 +
                                            editForm.payment4 +
                                            (editingRental?.extraPayments || 0);
                            
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
          <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, py: 2, gap: 1, borderTop: `1px solid ${a.lineSoft}` }}>
            <Button variant="outlined" onClick={handleCloseEdit}>Vazgeç</Button>
            <Button variant="contained" onClick={handleSaveEdit}>Değişiklikleri kaydet</Button>
          </DialogActions>
        </Dialog>
    </>
  );
};

export default UnpaidDebtsDetail;
