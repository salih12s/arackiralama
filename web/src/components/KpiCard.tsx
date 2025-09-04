import { Card, CardContent, Typography, Box } from '@mui/material';
import { formatCurrency } from '../utils/currency';

interface KpiCardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export default function KpiCard({ title, value, isCurrency = false, color = 'primary' }: KpiCardProps) {
  const displayValue = isCurrency && typeof value === 'number' 
    ? formatCurrency(value) 
    : value;

  const colorMap = {
    primary: '#0D3282',
    secondary: '#f50057',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1'
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          <Typography variant="h5" component="div" sx={{ color: colorMap[color], fontWeight: 'bold', mb: 0.5 }}>
            {displayValue}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
