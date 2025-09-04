import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import client from '../api/client';

interface NewCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewCustomerDialog: React.FC<NewCustomerDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (customerData: typeof formData) => {
      // Telefon numarası boşsa API'ye gönderme
      const payload: any = {
        fullName: customerData.fullName.trim()
      };
      
      if (customerData.phone.trim()) {
        payload.phone = customerData.phone.trim();
      }
      
      const response = await client.post('/customers', payload);
      return response.data;
    },
    onSuccess: () => {
      setFormData({ fullName: '', phone: '' });
      setError('');
      onSuccess();
      onClose(); // Modal'ı kapat
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Müşteri eklenirken hata oluştu');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setError('Müşteri adı zorunludur');
      return;
    }
    mutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({ fullName: '', phone: '' });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              label="Ad Soyad *"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              fullWidth
              variant="outlined"
            />
            
            <TextField
              label="Telefon (Opsiyonel)"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              variant="outlined"
              placeholder="Örn: 0532 123 45 67"
              helperText="Telefon numarası zorunlu değildir"
            />
            
    
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={mutation.isPending}>
            İptal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
