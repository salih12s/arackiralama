import { useMemo } from 'react';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridToolbar
} from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { formatCurrency, formatDate, Rental } from '../api/client';
import StatusChip from './StatusChip';

interface RentalTableProps {
  rentals: Rental[];
  loading?: boolean;
  title?: string;
}

export default function RentalTable({ rentals, loading = false }: RentalTableProps) {
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'startDate',
      headerName: 'Kiralama Tarihi',
      width: 130,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'plate',
      headerName: 'Plaka',
      width: 120,
      valueGetter: (_value, row) => row.vehicle?.plate,
    },
    {
      field: 'endDate',
      headerName: 'Geri Dönüş',
      width: 130,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'customerName',
      headerName: 'Kiralayan Kişi',
      width: 150,
      valueGetter: (_value, row) => row.customer?.fullName,
    },
    {
      field: 'days',
      headerName: 'Gün',
      width: 70,
      align: 'right' as const,
      headerAlign: 'right' as const,
    },
    {
      field: 'dailyPrice',
      headerName: 'Kira Ücreti',
      width: 110,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => formatCurrency(params.value),
    },
    {
      field: 'kmDiff',
      headerName: 'KM Farkı',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'cleaning',
      headerName: 'Temizlik',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'hgs',
      headerName: 'HGS',
      width: 80,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'damage',
      headerName: 'Kaza/Sürtme',
      width: 110,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'fuel',
      headerName: 'Yakıt Bedeli',
      width: 110,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'totalDue',
      headerName: 'Toplam Ödenecek',
      width: 140,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => formatCurrency(params.value),
    },
    {
      field: 'upfront',
      headerName: 'Peşin',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'pay1',
      headerName: '1. Ödeme',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'pay2',
      headerName: '2. Ödeme',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'pay3',
      headerName: '3. Ödeme',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'pay4',
      headerName: '4. Ödeme',
      width: 100,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => 
        params.value > 0 ? formatCurrency(params.value) : '-',
    },
    {
      field: 'balance',
      headerName: 'Kalan Bakiye',
      width: 120,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ color: params.value > 0 ? 'error.main' : 'text.primary' }}>
          {formatCurrency(params.value)}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Araç Durum',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip status={params.value} />
      ),
    },
    {
      field: 'note',
      headerName: 'Açıklama',
      width: 150,
      renderCell: (params: GridRenderCellParams) => 
        params.value ? (
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}>
            {params.value}
          </Box>
        ) : '-',
    },
  ], []);

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={rentals}
        columns={columns}
        loading={loading}
        slots={{
          toolbar: GridToolbar,
        }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        disableRowSelectionOnClick
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        sx={{
          '& .MuiDataGrid-cell': {
            fontSize: '0.875rem',
          },
          '& .MuiDataGrid-columnHeader': {
            fontWeight: 600,
            fontSize: '0.875rem',
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              backgroundColor: 'rgba(13, 50, 130, 0.04)',
            },
          },
        }}
      />
    </Box>
  );
}
