import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Alert,
  LinearProgress,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { reportsApi } from '../api/reports';
import { formatCurrency } from '../utils/currency';

export default function DebtorDetails() {
  const queryClient = useQueryClient();

  // Fetch debtors data
  const { data: debtorsData, isLoading: debtorsLoading, error: debtorsError, refetch } = useQuery({
    queryKey: ['debtors'],
    queryFn: () => reportsApi.getDebtors(),
    staleTime: 0, // Cache'i devre dışı bırak
    gcTime: 0, // Garbage collection süresini sıfırla
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });


  // API'den dönen veriyi güvenli şekilde işle
  const debtors = Array.isArray(debtorsData) ? debtorsData : [];
  const totalDebt = debtors.reduce((sum: number, debtor: any) => sum + (debtor.totalDebt || 0), 0);

  if (debtorsError) {
    return (
      <Layout title="Borçlu Müşteri Detayları">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Borçlu müşteri verileri yüklenirken hata oluştu.
          </Alert>
        </Box>
      </Layout>
    );
  }

  if (debtorsLoading) {
    return (
      <Layout title="Borçlu Müşteri Detayları">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <LinearProgress sx={{ width: '50%', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Borçlu müşteri verileri yükleniyor...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Borçlu Müşteri Detayları">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            💳 Borçlu Müşteri Detayları
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ödenmemiş borcu bulunan müşteriler ve borç tutarları
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Left Side - Debtors Table */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              📋 Borçlu Müşteriler
            </Typography>

            {debtors.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  Borçlu müşteri bulunamadı
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Tüm müşteriler ödemelerini yapmış durumda.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Müşteri Adı</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Borç Tutarı</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debtors.map((debtor: any) => (
                      <TableRow key={debtor.customerId} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {debtor.customerName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: 'error.main',
                              fontWeight: 600
                            }}
                          >
                            {formatCurrency(debtor.totalDebt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Right Side - Total Debt Summary */}
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
              border: '2px solid #dee2e6'
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.secondary' }}>
              💰 Toplam Borç
            </Typography>
            
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                color: 'error.main',
                mb: 2
              }}
            >
              {formatCurrency(totalDebt)}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              {debtors.length} müşteriden toplanan borç tutarı
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
}
