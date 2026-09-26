import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth.tsx';
import { queryClient } from './shared/queryClient';

const PublicApp = lazy(() => import('./public-site/PublicApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Loader() { return <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}><CircularProgress size={30} /></Box>; }

function LegacyRedirect({ target }: { target: string }) {
  const location = useLocation();
  const suffix = location.pathname.replace(/^\/(rentals|vehicles|vehicle|customers|reports|debtor-details|unpaid-debts|vehicle-expenses|notes|backup)/, '');
  return <Navigate to={`${target}${suffix}${location.search}`} replace />;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><Suspense fallback={<Loader />}><Routes>
    <Route path="/panel/*" element={<AdminApp />} />
    <Route path="/rentals/*" element={<LegacyRedirect target="/panel/kiralamalar" />} />
    <Route path="/vehicles/*" element={<LegacyRedirect target="/panel/araclar" />} />
    <Route path="/vehicle/*" element={<LegacyRedirect target="/panel/araclar" />} />
    <Route path="/customers/*" element={<LegacyRedirect target="/panel/musteriler" />} />
    <Route path="/reports/*" element={<LegacyRedirect target="/panel/raporlar" />} />
    <Route path="/debtor-details/*" element={<LegacyRedirect target="/panel/borclular" />} />
    <Route path="/unpaid-debts/*" element={<LegacyRedirect target="/panel/odenmeyen-borclar" />} />
    <Route path="/vehicle-expenses/*" element={<LegacyRedirect target="/panel/arac-giderleri" />} />
    <Route path="/notes/*" element={<LegacyRedirect target="/panel/notlar" />} />
    <Route path="/backup/*" element={<LegacyRedirect target="/panel/yedekleme" />} />
    <Route path="/*" element={<PublicApp />} />
  </Routes></Suspense></AuthProvider></QueryClientProvider>;
}
