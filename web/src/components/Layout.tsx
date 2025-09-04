import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  DirectionsCar,
  Receipt,
  Assessment,
  Backup,
  Person,
  TrendingUp,
  Warning,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';

import { useAuth } from '../hooks/useAuth.tsx';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Mobile drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Sayfa görünür olduğunda verileri yenile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Sayfa aktif olduğunda tüm aktif query'leri yenile
        queryClient.refetchQueries({ 
          type: 'active',
          stale: true
        });
      }
    };

    const handleFocus = () => {
      // Pencere odaklandığında critical verileri yenile
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-today'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    // Sayfa geçişlerinde ilgili verileri yenile
    switch (path) {
      case '/':
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['rentals-today'] });
        queryClient.invalidateQueries({ queryKey: ['debtors'] });
        queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
        break;
      case '/rentals':
        queryClient.invalidateQueries({ queryKey: ['rentals'] });
        break;
      case '/vehicles':
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-income-report'] });
        break;
      case '/reports':
        queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-income'] });
        break;
      case '/debtor-details':
        queryClient.invalidateQueries({ queryKey: ['all-rentals-debt-analysis'] });
        queryClient.invalidateQueries({ queryKey: ['current-debtors'] });
        break;
      case '/all-rentals':
        queryClient.invalidateQueries({ queryKey: ['rentals'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        break;
    }
    navigate(path);
  };

  const navigationItems = [
    { path: '/', label: 'Ana Sayfa', icon: <DashboardIcon fontSize="small" /> },
    { path: '/rentals', label: 'Kiralama', icon: <Receipt fontSize="small" /> },
    { path: '/vehicles', label: 'Tanımlamalar', icon: <DirectionsCar fontSize="small" /> },
    { path: '/reports', label: 'Raporlar', icon: <Assessment fontSize="small" /> },
    { path: '/detailed-report', label: 'Kiralama Girişi', icon: <Assessment fontSize="small" /> },
    { path: '/debtor-details', label: 'Borçlu Kişiler', icon: <Person fontSize="small" /> },
    { path: '/unpaid-debts', label: 'Ödenmeyen Borçlar Detay', icon: <Warning fontSize="small" /> },
    { path: '/vehicle-revenue', label: 'Araç Bazlı Gelir', icon: <TrendingUp fontSize="small" /> },
    { path: '/all-rentals', label: 'Kiralama Geçmişi', icon: <Receipt fontSize="small" /> },
    { path: '/backup', label: 'Yedekleme', icon: <Backup fontSize="small" /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title || 'Araç Kiralama Admin Paneli'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {dayjs().format('DD.MM.YYYY')}
            </Typography>
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user?.email}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>Çıkış Yap</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation */}
      <Box sx={{ backgroundColor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                startIcon={item.icon}
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  borderBottom: location.pathname === item.path ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: 0,
                  py: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(13, 50, 130, 0.04)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
