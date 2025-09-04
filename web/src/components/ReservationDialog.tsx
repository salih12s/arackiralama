import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Grid,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

interface ReservationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    customerName: string;
    licensePlate: string;
    reservationDate: string;
    reservationTime: string;
    rentalDuration: number;
    note?: string;
  }) => void;
  customers: Array<{ id: string; name?: string; fullName?: string }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
  reservation?: any;
  loading?: boolean;
}

const ReservationDialog: React.FC<ReservationDialogProps> = ({
  open,
  onClose,
  onSubmit,
  customers,
  vehicles,
  reservation,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    licensePlate: '',
    reservationDate: dayjs(),
    reservationTime: dayjs().add(1, 'hour'),
    rentalDuration: '' as string | number,
    note: ''
  });

  useEffect(() => {
    if (reservation) {
      // Düzenleme modu - mevcut rezervasyon verilerini yükle
      const customer = customers.find(c => c.id === reservation.customerId);
      setFormData({
        customerName: customer ? (customer.fullName || customer.name || '') : '',
        licensePlate: reservation.licensePlate,
        reservationDate: dayjs(reservation.reservationDate),
        reservationTime: dayjs(reservation.reservationDate),
        rentalDuration: reservation.rentalDuration,
        note: reservation.note || ''
      });
    } else {
      // Yeni rezervasyon modu - formu sıfırla
      setFormData({
        customerName: '',
        licensePlate: '',
        reservationDate: dayjs(),
        reservationTime: dayjs().add(1, 'hour'),
        rentalDuration: '',
        note: ''
      });
    }
  }, [reservation, customers, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.licensePlate || !formData.reservationDate || !formData.reservationTime) {
      alert('Lütfen zorunlu alanları doldurun (Müşteri Adı, Plaka, Tarih ve Saat)');
      return;
    }

    const data = {
      ...(reservation && { id: reservation.id }),
      customerName: formData.customerName,
      licensePlate: formData.licensePlate,
      reservationDate: formData.reservationDate.format('YYYY-MM-DD'),
      reservationTime: formData.reservationTime.format('HH:mm'),
      rentalDuration: formData.rentalDuration || 0, // Default 0 if empty
      note: formData.note
    };

    onSubmit(data);
  };

  const handleClose = () => {
    setFormData({
      customerName: '',
      licensePlate: '',
      reservationDate: dayjs(),
      reservationTime: dayjs().add(1, 'hour'),
      rentalDuration: '',
      note: ''
    });
    onClose();
  };

  // Müşteri isimlerini hazırla
  const customerOptions = customers.map(c => c.fullName || c.name || '').filter(Boolean);
  
  // Plaka seçeneklerini hazırla
  const plateOptions = vehicles.map(v => v.licensePlate).filter(Boolean);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {reservation ? 'Rezervasyon Düzenle' : 'Yeni Rezervasyon'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                value={formData.customerName}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ ...prev, customerName: newValue || '' }));
                }}
                options={customerOptions}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Müşteri Adı *"
                    fullWidth
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                value={formData.licensePlate}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ ...prev, licensePlate: newValue || '' }));
                }}
                options={plateOptions}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Plaka *"
                    fullWidth
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
                <DatePicker
                  label="Rezervasyon Tarihi *"
                  value={formData.reservationDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData(prev => ({ ...prev, reservationDate: newValue }));
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                  format="DD.MM.YYYY"
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
                <TimePicker
                  label="Rezervasyon Saati *"
                  value={formData.reservationTime}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData(prev => ({ ...prev, reservationTime: newValue }));
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                  format="HH:mm"
                  ampm={false}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Kira Süresi (gün)"
                type="number"
                value={formData.rentalDuration}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setFormData(prev => ({ ...prev, rentalDuration: value === '' ? '' : Number(value) }));
                  }
                }}
                fullWidth
                inputProps={{ min: 0 }}
                placeholder="Kira süresini gün cinsinden girin"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Not"
                value={formData.note}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, note: e.target.value }));
                }}
                fullWidth
                multiline
                rows={3}
                placeholder="İsteğe bağlı rezervasyon notu..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            İptal
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Kaydediliyor...' : (reservation ? 'Güncelle' : 'Rezervasyon Oluştur')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ReservationDialog;
