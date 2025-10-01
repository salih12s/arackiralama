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
  Warning,
  Menu as MenuIcon,
  AttachMoney,
  Note,
} from '@mui/icons-material';
import dayjs from 'dayjs';

import { useAuth } from '../hooks/useAuth.tsx';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children }: LayoutProps) {
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
      case '/vehicle-expenses':
        queryClient.invalidateQueries({ queryKey: ['vehicle-expenses'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        break;
      case '/notes':
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        break;
    }
    navigate(path);
  };

  const navigationItems = [
    { path: '/', label: 'Ana Sayfa', icon: <DashboardIcon fontSize="small" /> },
    { path: '/rentals', label: 'Kiralama Yönetimi', icon: <Receipt fontSize="small" /> },
    { path: '/vehicles', label: 'Tanımlamalar', icon: <DirectionsCar fontSize="small" /> },
  
    { path: '/reports', label: 'Raporlar', icon: <Assessment fontSize="small" /> },
    { path: '/debtor-details', label: 'Borçlu Kişiler', icon: <Person fontSize="small" /> },
    { path: '/unpaid-debts', label: 'Ödenmeyen Borçlar Detay', icon: <Warning fontSize="small" /> },
      { path: '/vehicle-expenses', label: 'Araç Gider Tablosu', },
    { path: '/notes', label: 'NOTLAR', icon: <Note fontSize="small" /> },
    { path: '/backup', label: 'Yedekleme', icon: <Backup fontSize="small" /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 3 }, py: { xs: 0.5, sm: 1 } }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2,
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                borderRadius: 2
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <DirectionsCar sx={{ 
              mr: 1.5, 
              fontSize: { xs: 20, sm: 24 },
              color: '#fff'
            }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.3rem' },
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px'
              }}
            >
              {isMobile ? 'Araç Kiralama' : 'Araç Kiralama - Ana Sayfa'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Chip
              label={dayjs().format('DD.MM.YYYY')}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 600,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                display: { xs: 'none', sm: 'flex' },
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{ 
                p: { xs: 0.5, sm: 1 },
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <AccountCircle sx={{ fontSize: { xs: 18, sm: 22 }, color: '#fff' }} />
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
                <Typography variant="body2" sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', sm: '0.875rem' }
                }}>
                  {user?.email}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>Çıkış Yap</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
            Admin Panel
          </Typography>
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton 
                  selected={location.pathname === item.path}
                  onClick={() => {
                    handleNavigation(item.path);
                    handleDrawerToggle(); // Close drawer after navigation
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path ? 'primary.main' : 'inherit'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Desktop Navigation */}
      <Box sx={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        display: { xs: 'none', sm: 'block' }
      }}>
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
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2 } }}>
        {children}
      </Container>
    </Box>
  );
}
