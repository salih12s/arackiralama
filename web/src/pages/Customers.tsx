import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Layout from '../components/Layout';
import { customersApi, Customer } from '../api/client';

export default function Customers() {
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customerDialog, setCustomerDialog] = useState<{
    open: boolean;
    customer?: Customer;
    mode: 'create' | 'edit';
  }>({ open: false, mode: 'create' });
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    identityNumber: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch customers
  const { data: customersRes, isLoading } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => customersApi.getAll(searchTerm || undefined),
    staleTime: 30 * 1000,
  });

  const customers = customersRes?.data || [];

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.error || 'Müşteri oluşturulurken hata oluştu' });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Customer>) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.error || 'Müşteri güncellenirken hata oluştu' });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Müşteri silinirken hata oluştu');
    },
  });

  const handleOpenDialog = (mode: 'create' | 'edit', customer?: Customer) => {
    setCustomerDialog({ open: true, mode, customer });
    if (mode === 'edit' && customer) {
      setFormData({
        fullName: customer.fullName,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        identityNumber: customer.identityNumber || '',
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        identityNumber: '',
      });
    }
    setErrors({});
  };

  const handleCloseDialog = () => {
    setCustomerDialog({ open: false, mode: 'create' });
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      address: '',
      identityNumber: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Ad soyad gereklidir';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (customerDialog.mode === 'create') {
        await createCustomerMutation.mutateAsync(formData);
      } else if (customerDialog.customer) {
        await updateCustomerMutation.mutateAsync({
          id: customerDialog.customer.id,
          ...formData,
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ color: 'primary.main' }} />
            Müşteri Yönetimi
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
            sx={{ minWidth: 160 }}
          >
            Yeni Müşteri
          </Button>
        </Box>

        {/* Search */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Müşteri ara (isim, telefon, email)..."
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

        {/* Customers Table */}
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Müşteri</TableCell>
                  <TableCell>İletişim</TableCell>
                  <TableCell>Kiralama Sayısı</TableCell>
                  <TableCell>Kayıt Tarihi</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {searchTerm ? 'Arama kriterinize uygun müşteri bulunamadı' : 'Henüz müşteri kaydı yok'}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {customer.fullName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {customer.fullName}
                            </Typography>
                            {customer.identityNumber && (
                              <Typography variant="caption" color="text.secondary">
                                TC: {customer.identityNumber}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Stack spacing={0.5}>
                          {customer.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="body2">{customer.phone}</Typography>
                            </Box>
                          )}
                          {customer.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon fontSize="small" color="action" />
                              <Typography variant="body2">{customer.email}</Typography>
                            </Box>
                          )}
                          {customer.address && (
                            <Typography variant="caption" color="text.secondary">
                              {customer.address}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={`${customer.rentalCount || 0} kiralama`}
                          size="small"
                          color={customer.rentalCount && customer.rentalCount > 0 ? 'success' : 'default'}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog('edit', customer)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (confirm(`${customer.fullName} müşterisini silmek istediğinizden emin misiniz?`)) {
                                deleteCustomerMutation.mutate(customer.id);
                              }
                            }}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Customer Create/Edit Dialog */}
        <Dialog 
          open={customerDialog.open} 
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {customerDialog.mode === 'create' ? 'Yeni Müşteri Ekle' : 'Müşteri Düzenle'}
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {errors.submit && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.submit}
              </Alert>
            )}
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ad Soyad *"
                  value={formData.fullName}
                  onChange={handleChange('fullName')}
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  error={!!errors.phone}
                  helperText={errors.phone}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adres"
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleChange('address')}
                  error={!!errors.address}
                  helperText={errors.address}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="TC Kimlik No"
                  value={formData.identityNumber}
                  onChange={handleChange('identityNumber')}
                  error={!!errors.identityNumber}
                  helperText={errors.identityNumber}
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              İptal
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
            >
              {customerDialog.mode === 'create' ? 'Oluştur' : 'Güncelle'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
