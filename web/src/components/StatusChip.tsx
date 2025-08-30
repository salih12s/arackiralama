import { Chip } from '@mui/material';

interface StatusChipProps {
  status: 'ACTIVE' | 'RETURNED' | 'CANCELLED' | 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
}

export default function StatusChip({ status }: StatusChipProps) {
  const getStatusProps = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'RENTED':
        return { label: 'Kiralandı', color: 'success' as const };
      case 'RETURNED':
      case 'IDLE':
        return { label: 'Boşta', color: 'default' as const, variant: 'outlined' as const };
      case 'RESERVED':
        return { label: 'Rezerve', color: 'warning' as const };
      case 'SERVICE':
        return { label: 'Serviste', color: 'error' as const };
      case 'CANCELLED':
        return { label: 'İptal', color: 'error' as const };
      default:
        return { label: status, color: 'default' as const };
    }
  };

  const props = getStatusProps(status);

  return (
    <Chip 
      {...props}
      size="small"
      sx={{ 
        minWidth: 80,
        '& .MuiChip-label': {
          fontSize: '0.75rem',
          fontWeight: 500
        }
      }}
    />
  );
}
