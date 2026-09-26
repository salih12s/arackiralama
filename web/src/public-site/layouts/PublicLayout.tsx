import { ReactNode, useEffect, useState } from 'react';
import { Link as RouterLink, NavLink, useLocation } from 'react-router-dom';
import { Box, Button, Container, Drawer, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Close, DarkModeOutlined, LightModeOutlined, Menu as MenuIcon, WhatsApp } from '@mui/icons-material';
import { site } from '../config';
import { ease, fonts, t } from '../theme';
import { useColorMode } from '../colorMode';
import { BrandBadge, BrandMark } from '../components/BrandLogo';

const navItems = [
  { label: 'Araçlar', to: '/araclar' },
  { label: 'Nasıl Çalışır', to: '/nasil-calisir' },
  { label: 'Hakkımızda', to: '/hakkimizda' },
  { label: 'Sorular', to: '/sss' },
  { label: 'İletişim', to: '/iletisim' },
];

const whatsappHref = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Merhaba, araç kiralama hakkında bilgi almak istiyorum.')}`;

function SiteBrand({ onClick }: { onClick?: () => void }) {
  return (
    <Stack
      component={RouterLink}
      to="/"
      onClick={onClick}
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ textDecoration: 'none', color: t.ink, flex: '0 0 auto' }}
      aria-label={`${site.brandName} ana sayfa`}
    >
      <BrandMark size={40} />
      <Box sx={{ lineHeight: 1 }}>
        <Typography component="span" sx={{ display: 'block', fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 700, fontSize: 20, letterSpacing: '-.01em' }}>
          {site.brandName}
        </Typography>
        <Typography component="span" sx={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: t.subtle, mt: 0.25 }}>
          ARAÇ KİRALAMA
        </Typography>
      </Box>
    </Stack>
  );
}

function ThemeToggle() {
  const { mode, toggle } = useColorMode();
  const label = mode === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
  return (
    <Tooltip title={label}>
      <IconButton onClick={toggle} aria-label={label} sx={{ width: 40, height: 40 }}>
        {mode === 'dark' ? <LightModeOutlined sx={{ fontSize: 20 }} /> : <DarkModeOutlined sx={{ fontSize: 20 }} />}
      </IconButton>
    </Tooltip>
  );
}

const navLinkSx = {
  color: t.muted,
  fontSize: 14.5,
  fontWeight: 600,
  textDecoration: 'none',
  px: 1.25,
  py: 1,
  borderRadius: 999,
  transition: 'color .15s ease',
  '@media (hover: hover)': { '&:hover': { color: t.ink } },
  '&.active': { color: t.ink },
} as const;

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: t.ground, color: t.ink }}>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 'env(safe-area-inset-top, 0px)',
          zIndex: 1100,
          bgcolor: t.glass,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${t.lineSoft}`,
        }}
      >
        <Container maxWidth="lg">
          <Box component="nav" aria-label="Ana menü" sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: { xs: 64, md: 68 } }}>
            <SiteBrand />
            <Stack direction="row" spacing={0.25} sx={{ display: { xs: 'none', md: 'flex' }, ml: 'auto' }}>
              {navItems.map((item) => (
                <Box key={item.to} component={NavLink} to={item.to} sx={navLinkSx}>{item.label}</Box>
              ))}
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: { xs: 'auto', md: 1 } }}>
              <Box component={NavLink} to="/rezervasyon-sorgula" sx={{ ...navLinkSx, display: { xs: 'none', lg: 'inline-flex' } }}>
                Rezervasyon Sorgula
              </Box>
              <ThemeToggle />
              <Button component={RouterLink} to="/rezervasyon" variant="contained" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                Rezervasyon Yap
              </Button>
              <IconButton onClick={() => setMenuOpen(true)} aria-label="Menüyü aç" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
                <MenuIcon />
              </IconButton>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)} PaperProps={{ sx: { width: 'min(100vw, 400px)' } }}>
        <Box sx={{ p: 2.5, pt: 'calc(20px + env(safe-area-inset-top, 0px))', display: 'grid', gap: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <SiteBrand onClick={() => setMenuOpen(false)} />
            <IconButton onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat"><Close /></IconButton>
          </Stack>
          <Box component="nav" aria-label="Mobil menü" sx={{ display: 'grid' }}>
            {[...navItems, { label: 'Rezervasyon Sorgula', to: '/rezervasyon-sorgula' }].map((item) => (
              <Box
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  color: t.ink,
                  textDecoration: 'none',
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: '-.025em',
                  py: 1.1,
                  borderBottom: `1px solid ${t.lineSoft}`,
                  '&.active': { color: t.accent },
                }}
              >
                {item.label}
              </Box>
            ))}
          </Box>
          <Stack spacing={1.25}>
            <Button component={RouterLink} to="/rezervasyon" variant="contained" size="large" fullWidth>Rezervasyon Yap</Button>
            <Button href={whatsappHref} target="_blank" rel="noopener" variant="outlined" size="large" fullWidth startIcon={<WhatsApp />}>
              WhatsApp'tan yazın
            </Button>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ color: t.muted, fontSize: 14 }}>{site.phoneDisplay} · {site.workingHours}</Typography>
            <ThemeToggle />
          </Stack>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      <SiteFooter />
      <WhatsAppButton hidden={pathname.startsWith('/rezervasyon')} lifted={/^\/araclar\/[^/]+/.test(pathname)} />
    </Box>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.25, alignContent: 'start' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: t.subtle }}>{title}</Typography>
      {children}
    </Box>
  );
}

const footerLinkSx = {
  color: t.muted,
  fontSize: 14.5,
  textDecoration: 'none',
  width: 'fit-content',
  '@media (hover: hover)': { '&:hover': { color: t.ink } },
} as const;

function SiteFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: t.surface, borderTop: `1px solid ${t.lineSoft}`, pt: { xs: 6, md: 8 }, pb: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr 1fr', md: '1.6fr 1fr 1fr 1.3fr' } }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, display: 'grid', gap: 2, alignContent: 'start', justifyItems: 'start' }}>
            <BrandBadge size={96} />
            <Typography sx={{ color: t.muted, fontSize: 14.5, maxWidth: 320 }}>{site.description}</Typography>
          </Box>
          <FooterColumn title="Filo">
            <Box component={RouterLink} to="/araclar" sx={footerLinkSx}>Tüm araçlar</Box>
            <Box component={RouterLink} to="/rezervasyon" sx={footerLinkSx}>Rezervasyon yap</Box>
            <Box component={RouterLink} to="/nasil-calisir" sx={footerLinkSx}>Nasıl çalışır</Box>
          </FooterColumn>
          <FooterColumn title="Destek">
            <Box component={RouterLink} to="/rezervasyon-sorgula" sx={footerLinkSx}>Rezervasyon sorgula</Box>
            <Box component={RouterLink} to="/sss" sx={footerLinkSx}>Sık sorulan sorular</Box>
            <Box component={RouterLink} to="/hakkimizda" sx={footerLinkSx}>Hakkımızda</Box>
            <Box component={RouterLink} to="/iletisim" sx={footerLinkSx}>İletişim</Box>
          </FooterColumn>
          <FooterColumn title="İletişim">
            <Box component="a" href={`tel:${site.phone}`} sx={{ ...footerLinkSx, color: t.ink, fontWeight: 700, fontFamily: fonts.mono, fontSize: 14 }}>{site.phoneDisplay}</Box>
            <Box component="a" href={whatsappHref} target="_blank" rel="noopener" sx={footerLinkSx}>WhatsApp</Box>
            <Box component="a" href={`mailto:${site.email}`} sx={footerLinkSx}>{site.email}</Box>
            <Typography sx={{ color: t.muted, fontSize: 14.5 }}>{site.address}</Typography>
            <Typography sx={{ color: t.muted, fontSize: 14.5 }}>{site.workingHours}</Typography>
          </FooterColumn>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: { xs: 5, md: 7 }, pt: 3, borderTop: `1px solid ${t.lineSoft}` }}
        >
          <Typography sx={{ color: t.subtle, fontSize: 13 }}>© {new Date().getFullYear()} {site.brandName}. Tüm hakları saklıdır.</Typography>
          <Stack direction="row" spacing={2.5}>
            <Box component={RouterLink} to="/gorsel-kaynaklari" sx={{ ...footerLinkSx, fontSize: 13, color: t.subtle }}>Görsel kaynakları</Box>
            <Box component={RouterLink} to="/panel/login" sx={{ ...footerLinkSx, fontSize: 13, color: t.subtle }}>Yönetim girişi</Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function WhatsAppButton({ hidden, lifted = false }: { hidden: boolean; lifted?: boolean }) {
  return (
    <Box
      component="a"
      href={whatsappHref}
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp'tan yazın"
      sx={{
        position: 'fixed',
        right: 'calc(16px + env(safe-area-inset-right, 0px))',
        // Araç detayında mobil rezervasyon çubuğunun üstünde durur.
        bottom: { xs: `calc(${lifted ? 92 : 16}px + env(safe-area-inset-bottom, 0px))`, md: 'calc(16px + env(safe-area-inset-bottom, 0px))' },
        zIndex: 1050,
        display: hidden ? 'none' : 'inline-flex',
        alignItems: 'center',
        gap: 1,
        height: 52,
        minWidth: 52,
        px: { xs: 0, md: 2.25 },
        justifyContent: 'center',
        borderRadius: 999,
        // WhatsApp yeşili; beyaz metinle 5:1 kontrast için koyulaştırıldı.
        bgcolor: '#15803D',
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: 14.5,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        transition: `transform .2s ${ease}`,
        '&:active': { transform: 'scale(0.96)' },
        '@media (hover: hover)': { '&:hover': { transform: 'translateY(-2px)' } },
      }}
    >
      <WhatsApp sx={{ fontSize: 26 }} />
      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>WhatsApp'tan yazın</Box>
    </Box>
  );
}
