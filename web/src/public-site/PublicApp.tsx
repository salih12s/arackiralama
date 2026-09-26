import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Box, CircularProgress, GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import PublicLayout from './layouts/PublicLayout';
import { colorVariables, createPublicTheme } from './theme';
import { ColorModeProvider, useColorMode } from './colorMode';
import HomePage from './pages/HomePage';
import VehiclesPage from './pages/VehiclesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HowItWorksPage from './pages/HowItWorksPage';
import FaqPage from './pages/FaqPage';

const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const LookupPage = lazy(() => import('./pages/LookupPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PhotoCreditsPage = lazy(() => import('./pages/PhotoCreditsPage'));

function Loader() { return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}><CircularProgress size={30} /></Box>; }

function LegacyVehicleRedirect() {
  const { id } = useParams();
  return <Navigate to={`/araclar/${id || ''}`} replace />;
}

function ThemedSite() {
  const { mode } = useColorMode();
  const theme = useMemo(() => createPublicTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={colorVariables} />
      <PublicLayout>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/araclar" element={<VehiclesPage />} />
              <Route path="/araclar/:id" element={<VehicleDetailPage />} />
              <Route path="/arac/:id" element={<LegacyVehicleRedirect />} />
              <Route path="/rezervasyon" element={<BookingPage />} />
              <Route path="/rezervasyon-sorgula" element={<LookupPage />} />
              <Route path="/hakkimizda" element={<AboutPage />} />
              <Route path="/iletisim" element={<ContactPage />} />
              <Route path="/nasil-calisir" element={<HowItWorksPage />} />
              <Route path="/sss" element={<FaqPage />} />
              <Route path="/gorsel-kaynaklari" element={<PhotoCreditsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
      </PublicLayout>
    </ThemeProvider>
  );
}

export default function PublicApp() {
  return (
    <ColorModeProvider>
      <ThemedSite />
    </ColorModeProvider>
  );
}
