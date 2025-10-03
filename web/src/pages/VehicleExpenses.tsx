import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import Layout from '../components/Layout';
import { vehicleExpensesApi, VehicleExpense, CreateVehicleExpenseData } from '../api/vehicleExpenses';
import { vehiclesApi } from '../api/vehicles';

interface Vehicle {
  id: string;
  plate: string;
  name?: string;
  active?: boolean;
}

const EXPENSE_TYPES = [
  'YAĞ BAKIM',
  'ELEKTRİK',
  'AKÜ',
  'LASTİK',
  'ŞANZUMAN',
  'KLİMA',
  'FREN',
  'GENEL BAKIM',
  'DÖŞEME',
  'ARIZA',
  'SİGORTA',
  'KASKO',
  'DİĞER'
];

export default function VehicleExpenses() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VehicleExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [formData, setFormData] = useState({
    date: dayjs(),
    vehicleId: '',
    expenseType: '',
    location: '',
    amount: 0,
    description: '',
  });
  
  const queryClient = useQueryClient();

  // Fetch expenses
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['vehicle-expenses'],
    queryFn: vehicleExpensesApi.getAll,
  });

  // Fetch vehicles for dropdown
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.getAll(),
  });

  const vehicles: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : ((vehiclesData as any)?.data || []);

  // Filter expenses by plate number and expense type
  const filteredExpenses = expenses
    .filter(expense => {
      const plateMatch = expense.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = !filterExpenseType || expense.expenseType === filterExpenseType;
      return plateMatch && typeMatch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // En yeni önce

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateVehicleExpenseData) => {
      return vehicleExpensesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setModalOpen(false);
      resetForm();
    },
  });

  // Update expense mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVehicleExpenseData> }) => {
      return vehicleExpensesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setModalOpen(false);
      setEditingExpense(null);
      resetForm();
    },
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: vehicleExpensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
    },
  });

  const resetForm = () => {
    setFormData({
      date: dayjs(),
      vehicleId: '',
      expenseType: '',
      location: '',
      amount: 0,
      description: '',
    });
  };

  const handleOpenModal = (expense?: VehicleExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        date: dayjs(expense.date),
        vehicleId: expense.vehicleId,
        expenseType: expense.expenseType,
        location: expense.location,
        amount: expense.amount,
        description: expense.description || '',
      });
    } else {
      setEditingExpense(null);
      resetForm();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExpense(null);
    resetForm();
  };

  const handleSubmit = () => {
    const submitData = {
      date: formData.date.toISOString(),
      vehicleId: formData.vehicleId,
      expenseType: formData.expenseType,
      location: formData.location,
      amount: formData.amount,
      description: formData.description || undefined,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu gideri silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} TL`;
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD.MM.YYYY');
  };

  if (isLoading) return <Layout><Typography>Yükleniyor...</Typography></Layout>;
  if (error) return <Layout><Alert severity="error">Veriler yüklenirken hata oluştu</Alert></Layout>;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Araç Gider Tablosu
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
          >
            Yeni Gider Ekle
          </Button>
        </Box>

        {/* Search Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Plaka Ara"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Plaka giriniz..."
              sx={{ minWidth: 200 }}
            />

            <TextField
              select
              label="Gider Türü Filtresi"
              variant="outlined"
              size="small"
              value={filterExpenseType}
              onChange={(e) => setFilterExpenseType(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">
                Tümü
              </MenuItem>
              {EXPENSE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            {(searchTerm || filterExpenseType) && (
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFilterExpenseType('');
                }}
                size="small"
              >
                Temizle
              </Button>
            )}
          </Box>
        </Paper>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '10%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>TARİH</strong>
                  </TableCell>
                  <TableCell sx={{ width: '12%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>ARAÇ PLAKA</strong>
                  </TableCell>
                  <TableCell sx={{ width: '15%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>GİDER TÜRÜ</strong>
                  </TableCell>
                  <TableCell sx={{ width: '15%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>İŞİN YAPILDIĞI YER</strong>
                  </TableCell>
                  <TableCell sx={{ width: '10%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>TUTAR TL</strong>
                  </TableCell>
                  <TableCell sx={{ width: '28%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>AÇIKLAMA</strong>
                  </TableCell>
                  <TableCell sx={{ width: '10%', backgroundColor: '#0D3282', color: 'white' }}>
                    <strong>İŞLEMLER</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {formatDate(expense.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.85rem' }}>
                        {expense.vehicle.plate}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {expense.expenseType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {expense.location}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.85rem' }}>
                        {formatCurrency(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.8rem',
                          wordBreak: 'break-word',
                          maxWidth: '300px'
                        }}
                      >
                        {expense.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenModal(expense)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(expense.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && expenses.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Arama kriterlerinize uygun gider bulunamadı.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Henüz gider kaydı bulunmamaktadır.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add/Edit Modal */}
        <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingExpense ? 'Gider Düzenle' : 'Yeni Gider Ekle'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <DatePicker
                label="Tarih"
                value={formData.date}
                onChange={(newValue: Dayjs | null) => 
                  setFormData(prev => ({ ...prev, date: newValue || dayjs() }))
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                  },
                }}
              />

              <TextField
                select
                label="Araç Plakası"
                value={formData.vehicleId}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                fullWidth
                required
              >
                <MenuItem value="">
                  Araç Seçin
                </MenuItem>
                {vehicles
                  .sort((a, b) => a.plate.localeCompare(b.plate))
                  .map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} {vehicle.name && `- ${vehicle.name}`}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Gider Türü"
                value={formData.expenseType}
                onChange={(e) => setFormData(prev => ({ ...prev, expenseType: e.target.value }))}
                fullWidth
                required
              >
                <MenuItem value="">
                  Gider Türü Seçin
                </MenuItem>
                {EXPENSE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="İşin Yapıldığı Yer"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                fullWidth
                required
              />

              <TextField
                label="Tutar (TL)"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />

              <TextField
                label="Açıklama"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>İptal</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={
                !formData.vehicleId ||
                !formData.expenseType ||
                !formData.location ||
                !formData.amount ||
                formData.amount <= 0 ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingExpense ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}