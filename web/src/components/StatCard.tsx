import React from 'react';
import { Card, CardContent, Typography, Box, Avatar, Chip } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    label: string;
  };
  sx?: SxProps<Theme>;
}

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  trend,
  sx 
}: StatCardProps) {
  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'success';
    if (trendValue < 0) return 'error';
    return 'default';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
        ...sx
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" color="text.secondary" fontSize="0.875rem">
            {title}
          </Typography>
          <Avatar 
            sx={{ 
              bgcolor: `${color}.main`, 
              width: 40, 
              height: 40 
            }}
          >
            {icon}
          </Avatar>
        </Box>
        
        <Typography variant="h4" fontWeight="bold" mb={1}>
          {typeof value === 'number' && value > 999 
            ? `${(value / 1000).toFixed(1)}K` 
            : value}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            {subtitle}
          </Typography>
        )}
        
        {trend && (
          <Chip
            label={`${trend.value > 0 ? '+' : ''}${trend.value}% ${trend.label}`}
            size="small"
            color={getTrendColor(trend.value)}
            variant="outlined"
          />
        )}
      </CardContent>
    </Card>
  );
}
