import { useState } from 'react';
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
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import Layout from '../components/Layout';
import { formatCurrency, reportsApi, DebtorReport } from '../api/client';

export default function DebtorDetails() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch debtors data
  const { data: debtorsRes, isLoading } = useQuery({
    queryKey: ['debtors'],
    queryFn: reportsApi.getDebtors,
  });

  const debtors: DebtorReport[] = debtorsRes?.data ?? [];

  // Filter debtors based on search term
  const filteredDebtors = debtors.filter((debtor) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      debtor.customerName.toLowerCase().includes(search) ||
      debtor.plate.toLowerCase().includes(search)
    );
  });

  // Calculate total debt (balance is in kuruş)
  const totalDebt = filteredDebtors.reduce((sum, debtor) => sum + debtor.balance, 0);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            Borçlu Müşteriler Detayı
          </Typography>
        </Box>

        {/* Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Müşteri adı veya plaka ile ara..."
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

        {/* Summary */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Chip
              label={`Toplam ${filteredDebtors.length} borçlu müşteri`}
              color="warning"
              variant="outlined"
            />
            <Chip
              label={`Toplam Borç: ${formatCurrency(totalDebt)}`}
              color="error"
              variant="outlined"
            />
          </Box>
        </Paper>

        {/* Debtors Table */}
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Müşteri</strong></TableCell>
                  <TableCell align="right"><strong>Borç Miktarı</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredDebtors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      {searchTerm ? 'Arama kriterlerine uygun borçlu müşteri bulunamadı.' : 'Borçlu müşteri bulunamadı.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebtors.map((debtor) => (
                    <TableRow key={debtor.rentalId} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {debtor.customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {debtor.plate}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="h6"
                          color={debtor.balance > 0 ? 'error.main' : 'success.main'}
                          fontWeight={600}
                        >
                          {formatCurrency(debtor.balance)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Total Row */}
        {filteredDebtors.length > 0 && (
          <Paper sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={600}>
                TOPLAM
              </Typography>
              <Typography variant="h5" color="error.main" fontWeight={700}>
                {formatCurrency(totalDebt)}
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </Layout>
  );
}
