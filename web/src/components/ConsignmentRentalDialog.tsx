import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Divider,
  Autocomplete,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

interface ConsignmentVehicle {
  id: string;
  plate: string;
  name?: string;
}

interface Customer {
  id: string;
  fullName: string;
}

interface ConsignmentRentalDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ConsignmentRentalData {
  // Konsinye araçlardan kesilecek tutar
  consignmentDeductions: {
    vehicleId: string;
    amount: number;
    description: string;
  }[];
  // Harici ödemesi yapılacak
  externalPayments: {
    customerId: string;
    amount: number;
    description: string;
  }[];
  // Genel not
  generalNote: string;
}

export default function ConsignmentRentalDialog({ open, onClose }: ConsignmentRentalDialogProps) {
  const [formData, setFormData] = useState<ConsignmentRentalData>({
    consignmentDeductions: [{ vehicleId: '', amount: 0, description: '' }],
    externalPayments: [{ customerId: '', amount: 0, description: '' }],
    generalNote: '',
  });

  const queryClient = useQueryClient();

  // Fetch consignment vehicles
  const { data: consignmentVehiclesData } = useQuery({
    queryKey: ['consignment-vehicles'],
    queryFn: async () => {
      try {
        const response = await client.get('/vehicles?consignment=true');
        return response.data;
      } catch (error) {
        console.error('Consignment Vehicles API Error:', error);
        throw error;
      }
    },
    enabled: open,
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await client.get('/customers');
        return response.data;
      } catch (error) {
        console.error('Customers API Error:', error);
        throw error;
      }
    },
    enabled: open,
  });

  // Extract data
  const consignmentVehicles = Array.isArray(consignmentVehiclesData?.data?.data) ? consignmentVehiclesData.data.data : 
                              Array.isArray(consignmentVehiclesData?.data) ? consignmentVehiclesData.data : 
                              Array.isArray(consignmentVehiclesData) ? consignmentVehiclesData : [];

  const customers = Array.isArray(customersData?.data?.data) ? customersData.data.data : 
                    Array.isArray(customersData?.data) ? customersData.data : 
                    Array.isArray(customersData) ? customersData : [];

  // Create consignment rental mutation
  const createConsignmentRentalMutation = useMutation({
    mutationFn: async (data: ConsignmentRentalData) => {
      try {
        const response = await client.post('/rentals/consignment', data);
        return response.data;
      } catch (error) {
        console.error('Consignment rental creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Consignment rental creation error:', error);
      alert(error.response?.data?.message || 'Konsinye kiralama oluşturma hatası');
    },
  });

  const resetForm = () => {
    setFormData({
      consignmentDeductions: [{ vehicleId: '', amount: 0, description: '' }],
      externalPayments: [{ customerId: '', amount: 0, description: '' }],
      generalNote: '',
    });
  };

  const addConsignmentDeduction = () => {
    setFormData(prev => ({
      ...prev,
      consignmentDeductions: [...prev.consignmentDeductions, { vehicleId: '', amount: 0, description: '' }]
    }));
  };

  const removeConsignmentDeduction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      consignmentDeductions: prev.consignmentDeductions.filter((_, i) => i !== index)
    }));
  };

  const addExternalPayment = () => {
    setFormData(prev => ({
      ...prev,
      externalPayments: [...prev.externalPayments, { customerId: '', amount: 0, description: '' }]
    }));
  };

  const removeExternalPayment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      externalPayments: prev.externalPayments.filter((_, i) => i !== index)
    }));
  };

  const updateConsignmentDeduction = (index: number, field: keyof typeof formData.consignmentDeductions[0], value: any) => {
    setFormData(prev => ({
      ...prev,
      consignmentDeductions: prev.consignmentDeductions.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateExternalPayment = (index: number, field: keyof typeof formData.externalPayments[0], value: any) => {
    setFormData(prev => ({
      ...prev,
      externalPayments: prev.externalPayments.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = () => {
    // Validate form
    const hasValidDeductions = formData.consignmentDeductions.some(d => d.vehicleId && d.amount > 0);
    const hasValidPayments = formData.externalPayments.some(p => p.customerId && p.amount > 0);
    
    if (!hasValidDeductions && !hasValidPayments) {
      alert('En az bir konsinye kesinti veya harici ödeme girmelisiniz.');
      return;
    }

    createConsignmentRentalMutation.mutate(formData);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Konsinye Kiralama
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Konsinye Araçlardan Kesilecek Tutar */}
          <Grid item xs={12}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                Konsinye Araçlardan Kesilecek Tutar
              </Typography>
              
              {formData.consignmentDeductions.map((deduction, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={consignmentVehicles}
                        getOptionLabel={(option: ConsignmentVehicle) => `${option.plate} - ${option.name || 'İsimsiz'}`}
                        value={consignmentVehicles.find((v: ConsignmentVehicle) => v.id === deduction.vehicleId) || null}
                        onChange={(_, newValue) => {
                          updateConsignmentDeduction(index, 'vehicleId', newValue?.id || '');
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Plaka" size="small" />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Tutar (₺)"
                        type="number"
                        size="small"
                        fullWidth
                        value={deduction.amount}
                        onChange={(e) => updateConsignmentDeduction(index, 'amount', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Açıklama"
                        size="small"
                        fullWidth
                        value={deduction.description}
                        onChange={(e) => updateConsignmentDeduction(index, 'description', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      {formData.consignmentDeductions.length > 1 && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeConsignmentDeduction(index)}
                        >
                          Sil
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              ))}
              
              <Button
                size="small"
                onClick={addConsignmentDeduction}
                sx={{ mt: 1 }}
              >
                + Konsinye Kesinti Ekle
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Harici Ödemesi Yapılacak */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
                Harici Ödemesi Yapılacak
              </Typography>
              
              {formData.externalPayments.map((payment, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={customers}
                        getOptionLabel={(option: Customer) => option.fullName}
                        value={customers.find((c: Customer) => c.id === payment.customerId) || null}
                        onChange={(_, newValue) => {
                          updateExternalPayment(index, 'customerId', newValue?.id || '');
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Müşteri" size="small" />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Tutar (₺)"
                        type="number"
                        size="small"
                        fullWidth
                        value={payment.amount}
                        onChange={(e) => updateExternalPayment(index, 'amount', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Açıklama"
                        size="small"
                        fullWidth
                        value={payment.description}
                        onChange={(e) => updateExternalPayment(index, 'description', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      {formData.externalPayments.length > 1 && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeExternalPayment(index)}
                        >
                          Sil
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              ))}
              
              <Button
                size="small"
                onClick={addExternalPayment}
                sx={{ mt: 1 }}
              >
                + Harici Ödeme Ekle
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Genel Not */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Genel Not
              </Typography>
              <TextField
                label="Not"
                multiline
                rows={3}
                fullWidth
                value={formData.generalNote}
                onChange={(e) => setFormData(prev => ({ ...prev, generalNote: e.target.value }))}
                placeholder="Konsinye kiralama ile ilgili genel notlar..."
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createConsignmentRentalMutation.isPending}
        >
          {createConsignmentRentalMutation.isPending ? 'Oluşturuluyor...' : 'Konsinye Kiralama Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
