import { Card, CardContent, Typography, Box } from '@mui/material';
import { formatCurrency } from '../api/client';

interface KpiCardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  icon?: string;
}

export default function KpiCard({ title, value, isCurrency = false, color = 'primary', icon }: KpiCardProps) {
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
      <CardContent>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          {icon && (
            <Typography variant="h3" sx={{ mb: 1 }}>
              {icon}
            </Typography>
          )}
          <Typography variant="h4" component="div" sx={{ color: colorMap[color], fontWeight: 'bold', mb: 1 }}>
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
