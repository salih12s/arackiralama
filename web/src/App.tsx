import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

import theme from './theme';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rentals from './pages/Rentals';
import RentalDetail from './pages/RentalDetail';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import DebtorDetails from './pages/DebtorDetails';
import VehicleDetail from './pages/VehicleDetail';
import Backup from './pages/Backup';
import { DetailedReport } from './pages/DetailedReport';

// Set dayjs locale
dayjs.locale('tr');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // 2 kez yeniden dene
      staleTime: 30 * 1000, // 30 saniye fresh tut (daha hızlı güncelleme)
      gcTime: 2 * 60 * 1000, // 2 dakika cache'de sakla
      refetchOnWindowFocus: false, // Pencere odaklandığında otomatik yenileme - KAPALI
      refetchOnMount: true, // Component mount olduğunda yenile
      refetchOnReconnect: true, // İnternet bağlantısı geri geldiğinde yenile
    },
  },
});

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public Route component (redirect if authenticated)
function PublicRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rentals"
        element={
          <ProtectedRoute>
            <Rentals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rentals/:id"
        element={
          <ProtectedRoute>
            <RentalDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute>
            <Vehicles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles/:id"
        element={
          <ProtectedRoute>
            <VehicleDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicle/:id"
        element={
          <ProtectedRoute>
            <VehicleDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/detailed-report"
        element={
          <ProtectedRoute>
            <DetailedReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/debtor-details"
        element={
          <ProtectedRoute>
            <DebtorDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backup"
        element={
          <ProtectedRoute>
            <Backup />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
            <AppRoutes />
          </LocalizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
