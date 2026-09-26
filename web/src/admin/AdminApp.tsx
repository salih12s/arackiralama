import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress, GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import { useAuth } from '../hooks/useAuth.tsx';
import AdminLayout from './layouts/AdminLayout';
import { adminColorVariables, createAdminTheme } from './theme';
import { AdminColorModeProvider, useAdminColorMode } from './colorMode';

dayjs.locale('tr');

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const AllRentals = lazy(() => import('../pages/AllRentals'));
const Reservations = lazy(() => import('../pages/Reservations'));
const RentalDetail = lazy(() => import('../pages/RentalDetail'));
const Vehicles = lazy(() => import('../pages/Vehicles'));
const Customers = lazy(() => import('../pages/Customers'));
const Reports = lazy(() => import('../pages/Reports'));
const DebtorDetails = lazy(() => import('../pages/DebtorDetails'));
const UnpaidDebtsDetail = lazy(() => import('../pages/UnpaidDebtsDetail'));
const VehicleDetail = lazy(() => import('../pages/VehicleDetail'));
const Backup = lazy(() => import('../pages/Backup'));
const VehicleExpenses = lazy(() => import('../pages/VehicleExpenses'));
const Notes = lazy(() => import('../pages/Notes'));

function Loader() {
  return <Box sx={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>;
}

function ProtectedAdmin() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/panel/login" replace />;
  return <Outlet />;
}

function ThemedAdmin() {
  const { mode } = useAdminColorMode();
  const theme = useMemo(() => createAdminTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={adminColorVariables} />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route element={<ProtectedAdmin />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="kiralamalar" element={<AllRentals />} />
                <Route path="kiralamalar/:id" element={<RentalDetail />} />
                <Route path="rezervasyonlar" element={<Reservations />} />
                <Route path="araclar" element={<Vehicles />} />
                <Route path="araclar/:id" element={<VehicleDetail />} />
                <Route path="musteriler" element={<Customers />} />
                <Route path="raporlar" element={<Reports />} />
                <Route path="borclular" element={<DebtorDetails />} />
                <Route path="odenmeyen-borclar" element={<UnpaidDebtsDetail />} />
                <Route path="arac-giderleri" element={<VehicleExpenses />} />
                <Route path="notlar" element={<Notes />} />
                <Route path="yedekleme" element={<Backup />} />
                <Route path="*" element={<Navigate to="/panel" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default function AdminApp() {
  return (
    <AdminColorModeProvider>
      <ThemedAdmin />
    </AdminColorModeProvider>
  );
}
