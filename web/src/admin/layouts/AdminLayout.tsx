import { ReactNode, useEffect, useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Box, Drawer, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import {
  AssessmentOutlined,
  BackupOutlined,
  ChevronLeft,
  ChevronRight,
  DarkModeOutlined,
  DirectionsCarOutlined,
  LightModeOutlined,
  EventNoteOutlined,
  GridViewOutlined,
  Logout,
  MenuRounded,
  MoneyOffOutlined,
  OpenInNew,
  PeopleAltOutlined,
  PersonSearchOutlined,
  ReceiptLongOutlined,
  StickyNote2Outlined,
  WalletOutlined,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAuth } from '../../hooks/useAuth.tsx';
import { reservationsApi, Reservation } from '../../api/client';
import { BrandMark } from '../../public-site/components/BrandLogo';
import { a, ease, fonts } from '../theme';
import { useAdminColorMode } from '../colorMode';

interface AdminLayoutProps { children?: ReactNode }

interface NavItem { path: string; label: string; short?: string; icon: ReactNode; badge?: 'reservations' }

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operasyon',
    items: [
      { path: '/panel', label: 'Genel bakış', short: 'Özet', icon: <GridViewOutlined /> },
      { path: '/panel/kiralamalar', label: 'Kiralamalar', icon: <ReceiptLongOutlined /> },
      { path: '/panel/rezervasyonlar', label: 'Rezervasyonlar', short: 'Talepler', icon: <EventNoteOutlined />, badge: 'reservations' },
      { path: '/panel/araclar', label: 'Araçlar', icon: <DirectionsCarOutlined /> },
      { path: '/panel/musteriler', label: 'Müşteriler', icon: <PeopleAltOutlined /> },
    ],
  },
  {
    label: 'Finans',
    items: [
      { path: '/panel/raporlar', label: 'Raporlar', icon: <AssessmentOutlined /> },
      { path: '/panel/borclular', label: 'Borçlular', icon: <PersonSearchOutlined /> },
      { path: '/panel/odenmeyen-borclar', label: 'Ödenmeyen borçlar', icon: <MoneyOffOutlined /> },
      { path: '/panel/arac-giderleri', label: 'Araç giderleri', icon: <WalletOutlined /> },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { path: '/panel/notlar', label: 'Notlar', icon: <StickyNote2Outlined /> },
      { path: '/panel/yedekleme', label: 'Yedekleme', icon: <BackupOutlined /> },
    ],
  },
];

const allItems = groups.flatMap((group) => group.items);
/** Mobil alt çubukta kalıcı duran sekmeler. */
const mobileTabs = allItems.slice(0, 4);

const NAV_WIDTH = 248;
const NAV_COLLAPSED = 76;
const COLLAPSE_KEY = 'sa-nav-collapsed';

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { user, logout } = useAuth();
  const { mode, toggle: toggleMode } = useAdminColorMode();
  const modeLabel = mode === 'dark' ? 'Açık moda geç' : 'Koyu moda geç';
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Sekmeye geri dönüldüğünde eskimiş verileri tazele.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) queryClient.refetchQueries({ type: 'active', stale: true }); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [queryClient]);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const toggleCollapsed = () => setCollapsed((value) => {
    try { localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1'); } catch { /* yoksay */ }
    return !value;
  });

  // Bekleyen web talepleri menüde rozet olarak görünür (ana sayfayla aynı sorgu).
  const reservationsQuery = useQuery({ queryKey: ['reservations'], queryFn: () => reservationsApi.getAll(), staleTime: 30_000 });
  const pendingCount = ((reservationsQuery.data?.data || []) as Reservation[]).filter((item) => item.status === 'PENDING').length;

  const isActive = (path: string) => path === '/panel'
    ? location.pathname === '/panel' || location.pathname === '/panel/'
    : location.pathname.startsWith(path);
  const current = allItems.find((item) => isActive(item.path));
  const crumb = current?.label || 'Panel';

  const onNavigate = (path: string) => {
    if (path === '/panel') {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    }
  };

  const doLogout = () => { logout(); setAccountAnchor(null); navigate('/panel/login'); };
  const initial = user?.email?.charAt(0).toUpperCase() || 'A';
  const width = collapsed ? NAV_COLLAPSED : NAV_WIDTH;

  const navLink = (item: NavItem, compact: boolean) => {
    const active = isActive(item.path);
    const badge = item.badge === 'reservations' && pendingCount > 0 ? pendingCount : 0;
    const link = (
      <Box
        component={RouterLink}
        to={item.path}
        onClick={() => onNavigate(item.path)}
        aria-current={active ? 'page' : undefined}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          height: 40,
          px: compact ? 0 : 1.5,
          justifyContent: compact ? 'center' : 'flex-start',
          borderRadius: '10px',
          color: active ? a.navInk : a.navMuted,
          bgcolor: active ? a.navActive : 'transparent',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: active ? 700 : 600,
          transition: 'background-color .15s ease, color .15s ease',
          '& svg': { fontSize: 20, flex: 'none' },
          '@media (hover: hover)': { '&:hover': { color: a.navInk, bgcolor: a.navActive } },
          '&:focus-visible': { outline: `2px solid ${a.navInk}`, outlineOffset: -2 },
        }}
      >
        {item.icon}
        {!compact && <Box component="span" sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</Box>}
        {badge > 0 && (
          <Box
            component="span"
            aria-label={`${badge} bekleyen talep`}
            sx={compact
              ? { position: 'absolute', top: 6, right: 14, width: 8, height: 8, borderRadius: '50%', bgcolor: '#E3A6A9' }
              : { minWidth: 20, height: 20, px: 0.75, borderRadius: 999, bgcolor: '#E3A6A9', color: '#1E1416', font: `600 11.5px ${fonts.mono}`, display: 'grid', placeItems: 'center' }}
          >
            {compact ? null : badge}
          </Box>
        )}
      </Box>
    );
    return compact ? <Tooltip key={item.path} title={item.label} placement="right">{link}</Tooltip> : <Box key={item.path}>{link}</Box>;
  };

  const navContent = (compact: boolean, inDrawer = false) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: a.nav, color: a.navInk }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ height: 64, px: compact ? 0 : 2.25, justifyContent: compact ? 'center' : 'flex-start', flex: 'none' }}>
        <BrandMark size={34} bg="#F4EDE2" fg="#6E1F2F" title="SS Filo" />
        {!compact && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 700, fontSize: 18, lineHeight: 1.05, color: a.navInk }}>SS Filo</Typography>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: a.navMuted }}>Yönetim</Typography>
          </Box>
        )}
      </Stack>

      <Box component="nav" aria-label="Panel menüsü" sx={{ flex: 1, overflowY: 'auto', px: compact ? 1.25 : 1.5, py: 1, '&::-webkit-scrollbar': { width: 0 } }}>
        {groups.map((group, index) => (
          <Box key={group.label} sx={{ mt: index === 0 ? 0 : 2.25 }}>
            {compact ? (
              index > 0 && <Box sx={{ height: '1px', bgcolor: a.navLine, mx: 1, mb: 1.5 }} />
            ) : (
              <Typography sx={{ px: 1.5, mb: 0.75, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: a.navMuted, opacity: 0.8 }}>
                {group.label}
              </Typography>
            )}
            <Stack spacing={0.25}>{group.items.map((item) => navLink(item, compact))}</Stack>
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 'none', px: compact ? 1.25 : 1.5, pb: 1.5, pt: 1, borderTop: `1px solid ${a.navLine}` }}>
        <Tooltip title={compact ? 'Siteyi aç' : ''} placement="right">
          <Box
            component="a"
            href="/"
            target="_blank"
            rel="noopener"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 38, px: compact ? 0 : 1.5, justifyContent: compact ? 'center' : 'flex-start', borderRadius: '10px', color: a.navMuted, textDecoration: 'none', fontSize: 13.5, fontWeight: 600, '& svg': { fontSize: 18 }, '@media (hover: hover)': { '&:hover': { color: a.navInk, bgcolor: a.navActive } } }}
          >
            <OpenInNew />
            {!compact && 'Kiralama sitesini aç'}
          </Box>
        </Tooltip>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 1, px: compact ? 0 : 1, justifyContent: compact ? 'center' : 'flex-start' }}>
          <Tooltip title={compact ? `${user?.email || ''} · Çıkış` : ''} placement="right">
            <Avatar onClick={compact ? doLogout : undefined} sx={{ width: 32, height: 32, bgcolor: 'rgba(244,237,226,.14)', color: a.navInk, fontSize: 13, fontWeight: 800, cursor: compact ? 'pointer' : 'default' }}>{initial}</Avatar>
          </Tooltip>
          {!compact && (
            <>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: a.navInk }}>{user?.email?.split('@')[0] || 'Yönetici'}</Typography>
                <Typography noWrap sx={{ fontSize: 11.5, color: a.navMuted }}>{user?.email}</Typography>
              </Box>
              <Tooltip title="Çıkış yap">
                <IconButton onClick={doLogout} size="small" aria-label="Çıkış yap" sx={{ color: a.navMuted, '@media (hover: hover)': { '&:hover': { color: a.navInk, bgcolor: a.navActive } } }}>
                  <Logout sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
        {!inDrawer && (
          <Box
            component="button"
            type="button"
            onClick={toggleCollapsed}
            aria-label={compact ? 'Menüyü genişlet' : 'Menüyü daralt'}
            sx={{ mt: 1.25, width: '100%', height: 30, border: 0, borderRadius: '8px', bgcolor: 'transparent', color: a.navMuted, cursor: 'pointer', display: 'grid', placeItems: 'center', '@media (hover: hover)': { '&:hover': { bgcolor: a.navActive, color: a.navInk } } }}
          >
            {compact ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
      <Box sx={{ minHeight: '100dvh', bgcolor: a.ground }}>
        {/* Masaüstü yan menü */}
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'fixed',
            insetBlock: 0,
            left: 0,
            width,
            zIndex: 1200,
            transition: `width .25s ${ease}`,
            overflow: 'hidden',
          }}
        >
          {navContent(collapsed)}
        </Box>

        <Box sx={{ pl: { md: `${width}px` }, transition: `padding-left .25s ${ease}`, minWidth: 0 }}>
          {/* Üst bar */}
          <Box
            component="header"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              height: { xs: 56, md: 60 },
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: { xs: 2, md: 3.5 },
              bgcolor: a.glass,
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              borderBottom: `1px solid ${a.lineSoft}`,
            }}
          >
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
              <BrandMark size={30} bg="#6E1F2F" fg="#F4EDE2" title="SS Filo" />
            </Box>
            <Box component="nav" aria-label="Konum" sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13.5 }}>
              <Box component={RouterLink} to="/panel" sx={{ display: { xs: 'none', sm: 'inline' }, color: a.muted, textDecoration: 'none', '@media (hover: hover)': { '&:hover': { color: a.ink } } }}>Panel</Box>
              <ChevronRight sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 16, color: a.subtle }} />
              <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: a.ink }}>{crumb}</Typography>
            </Box>
            <Typography sx={{ display: { xs: 'none', sm: 'block' }, color: a.muted, fontSize: 13, whiteSpace: 'nowrap' }}>
              {dayjs().format('D MMMM YYYY, dddd')}
            </Typography>
            <Tooltip title={modeLabel}>
              <IconButton onClick={toggleMode} aria-label={modeLabel} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                {mode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
              </IconButton>
            </Tooltip>
            <IconButton onClick={(event) => setAccountAnchor(event.currentTarget)} aria-label="Hesap menüsü" sx={{ display: { md: 'none' }, p: 0.5 }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: a.accentSoft, color: a.accent, fontSize: 13, fontWeight: 800 }}>{initial}</Avatar>
            </IconButton>
          </Box>

          <Box component="main" sx={{ px: { xs: 2, sm: 2.5, md: 3.5 }, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 'calc(96px + env(safe-area-inset-bottom, 0px))', md: 6 }, maxWidth: 1600, mx: 'auto' }}>
            {children ?? <Outlet />}
          </Box>
        </Box>

        {/* Mobil alt sekme çubuğu */}
        <Box
          component="nav"
          aria-label="Hızlı menü"
          sx={{
            display: { xs: 'grid', md: 'none' },
            gridTemplateColumns: 'repeat(5, 1fr)',
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1150,
            pb: 'env(safe-area-inset-bottom, 0px)',
            bgcolor: a.glass,
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            borderTop: `1px solid ${a.lineSoft}`,
          }}
        >
          {[...mobileTabs, null].map((item) => {
            const active = item ? isActive(item.path) : moreOpen || !mobileTabs.some((tab) => isActive(tab.path));
            const badge = item?.badge === 'reservations' && pendingCount > 0;
            const content = (
              <>
                <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', width: 44, height: 28, borderRadius: 999, bgcolor: active ? a.accentSoft : 'transparent', color: active ? a.accent : a.muted, transition: 'background-color .15s ease', '& svg': { fontSize: 21 } }}>
                  {item ? item.icon : <MenuRounded />}
                  {badge && <Box component="span" sx={{ position: 'absolute', top: 2, right: 8, width: 7, height: 7, borderRadius: '50%', bgcolor: a.accent }} />}
                </Box>
                <Box component="span" sx={{ fontSize: 11, fontWeight: active ? 700 : 600, color: active ? a.ink : a.muted }}>{item ? item.short || item.label : 'Menü'}</Box>
              </>
            );
            const sx = { display: 'grid', justifyItems: 'center', gap: 0.25, pt: 1, pb: 0.75, textDecoration: 'none', border: 0, bgcolor: 'transparent', cursor: 'pointer', font: 'inherit', WebkitTapHighlightColor: 'transparent' };
            return item ? (
              <Box key={item.path} component={RouterLink} to={item.path} onClick={() => onNavigate(item.path)} aria-current={active ? 'page' : undefined} sx={sx}>{content}</Box>
            ) : (
              <Box key="more" component="button" type="button" onClick={() => setMoreOpen(true)} aria-label="Tüm menü" sx={sx}>{content}</Box>
            );
          })}
        </Box>

        <Drawer anchor="left" open={moreOpen} onClose={() => setMoreOpen(false)} PaperProps={{ sx: { width: 280, border: 0, bgcolor: a.nav } }}>
          {navContent(false, true)}
        </Drawer>

        <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem disabled sx={{ opacity: '1 !important', fontSize: 13 }}>{user?.email}</MenuItem>
          <MenuItem onClick={() => { toggleMode(); setAccountAnchor(null); }}>{mode === 'dark' ? <LightModeOutlined sx={{ fontSize: 18, mr: 1.25 }} /> : <DarkModeOutlined sx={{ fontSize: 18, mr: 1.25 }} />}{modeLabel}</MenuItem>
          <MenuItem component="a" href="/" target="_blank" rel="noopener"><OpenInNew sx={{ fontSize: 18, mr: 1.25 }} />Kiralama sitesi</MenuItem>
          <MenuItem onClick={doLogout} sx={{ color: a.danger }}><Logout sx={{ fontSize: 18, mr: 1.25 }} />Çıkış yap</MenuItem>
        </Menu>
      </Box>
  );
}
