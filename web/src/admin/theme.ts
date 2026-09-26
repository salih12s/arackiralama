import { createTheme } from '@mui/material/styles';
import { ease, fonts } from '../public-site/theme';

/**
 * SS Filo yönetim paneli tasarım sistemi.
 *
 * Sitedeki "Rozet" kimliğinin iş aracı hali: daha sakin krem zemin, beyaz yüzeyler,
 * mürekkep renginde yan menü. Bordo yalnızca birincil eylem ve seçili durumda.
 * Plaka, tutar ve tarihler JetBrains Mono ile hizalanır.
 *
 * Renkler CSS değişkeni (`--sa-*`); bileşenler `a.*` ile okur.
 */

export type AdminColorMode = 'light' | 'dark';

interface AdminPalette {
  ground: string;
  surface: string;
  raised: string;
  hover: string;
  ink: string;
  muted: string;
  subtle: string;
  line: string;
  lineSoft: string;
  accent: string;
  accentFill: string;
  accentFillHover: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  neutralSoft: string;
  shadow: string;
  shadowPop: string;
  glass: string;
  /** Yan menü */
  nav: string;
  navInk: string;
  navMuted: string;
  navActive: string;
  navLine: string;
  /** Grafik serileri (doğrulanmış: bordo + bal) */
  chart1: string;
  chart2: string;
  chartGrid: string;
}

export const adminPalettes: Record<AdminColorMode, AdminPalette> = {
  light: {
    ground: '#F6F3EE',
    surface: '#EFEAE2',
    raised: '#FFFFFF',
    hover: '#FAF7F2',
    ink: '#1E1416',
    muted: '#6B5E5A',
    subtle: '#968984',
    line: '#E2D9CD',
    lineSoft: '#EDE7DE',
    accent: '#6E1F2F',
    accentFill: '#6E1F2F',
    accentFillHover: '#561623',
    accentSoft: '#F4E6E4',
    onAccent: '#FFFFFF',
    success: '#2E6B45',
    successSoft: '#E4F0E7',
    warning: '#94570F',
    warningSoft: '#F7ECDC',
    danger: '#B3261E',
    dangerSoft: '#F9E5E2',
    neutralSoft: '#EFEAE2',
    shadow: '0 1px 2px rgba(30, 20, 22, 0.04)',
    shadowPop: '0 12px 32px rgba(30, 20, 22, 0.12)',
    glass: 'rgba(246, 243, 238, 0.86)',
    nav: '#1E1416',
    navInk: '#F4EDE2',
    navMuted: 'rgba(244, 237, 226, 0.62)',
    navActive: 'rgba(244, 237, 226, 0.1)',
    navLine: 'rgba(244, 237, 226, 0.09)',
    chart1: '#9B2F45',
    chart2: '#D4914A',
    chartGrid: '#EDE7DE',
  },
  dark: {
    ground: '#120D0E',
    surface: '#1A1314',
    raised: '#1F1718',
    hover: '#241B1C',
    ink: '#F4EDE2',
    muted: '#B8AAA3',
    subtle: '#8E817C',
    line: 'rgba(244, 237, 226, 0.12)',
    lineSoft: 'rgba(244, 237, 226, 0.07)',
    accent: '#E3A6A9',
    accentFill: '#F4EDE2',
    accentFillHover: '#E6DACA',
    accentSoft: 'rgba(227, 166, 169, 0.13)',
    onAccent: '#6E1F2F',
    success: '#7FCB95',
    successSoft: 'rgba(127, 203, 149, 0.12)',
    warning: '#E8B45C',
    warningSoft: 'rgba(232, 180, 92, 0.12)',
    danger: '#F08A80',
    dangerSoft: 'rgba(240, 138, 128, 0.12)',
    neutralSoft: 'rgba(244, 237, 226, 0.07)',
    shadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    shadowPop: '0 12px 32px rgba(0, 0, 0, 0.5)',
    glass: 'rgba(18, 13, 14, 0.82)',
    nav: '#0C0809',
    navInk: '#F4EDE2',
    navMuted: 'rgba(244, 237, 226, 0.55)',
    navActive: 'rgba(244, 237, 226, 0.08)',
    navLine: 'rgba(244, 237, 226, 0.07)',
    chart1: '#D36A7C',
    chart2: '#E0A866',
    chartGrid: 'rgba(244, 237, 226, 0.08)',
  },
};

const cssName = (key: string) => `--sa-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Panel bileşenlerinde kullanılan renk referansları (CSS değişkenleri). */
export const a = Object.fromEntries(
  Object.keys(adminPalettes.light).map((key) => [key, `var(${cssName(key)})`]),
) as Record<keyof AdminPalette, string>;

function declarations(mode: AdminColorMode) {
  return Object.fromEntries(Object.entries(adminPalettes[mode]).map(([key, value]) => [cssName(key), value]));
}

export const adminColorVariables = {
  ':root, :root[data-sa-theme="light"]': declarations('light'),
  ':root[data-sa-theme="dark"]': { ...declarations('dark'), colorScheme: 'dark' },
};

export { ease, fonts };

/** Sayılar için ortak stil: mono + hizalı rakamlar. */
export const monoSx = { fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' } as const;

export function createAdminTheme(mode: AdminColorMode = 'light') {
  const p = adminPalettes[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: p.accentFill, dark: p.accentFillHover, light: p.accentSoft, contrastText: p.onAccent },
      secondary: { main: p.ink, contrastText: p.raised },
      success: { main: mode === 'light' ? p.success : '#3F9A5E', light: p.successSoft, contrastText: '#fff' },
      warning: { main: mode === 'light' ? p.warning : '#C98A2E', light: p.warningSoft, contrastText: '#fff' },
      error: { main: mode === 'light' ? p.danger : '#D9534A', light: p.dangerSoft, contrastText: '#fff' },
      info: { main: mode === 'light' ? '#6B5E5A' : '#B8AAA3', light: p.surface, contrastText: '#fff' },
      background: { default: p.ground, paper: p.raised },
      text: { primary: p.ink, secondary: p.muted, disabled: p.subtle },
      divider: p.line,
      action: { hover: p.hover, selected: p.accentSoft },
    },
    shape: { borderRadius: 10 },
    spacing: 8,
    typography: {
      fontFamily: fonts.sans,
      fontSize: 14,
      h1: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.015em' },
      h3: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 800, letterSpacing: '-0.015em', fontSize: '1.05rem' },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.78rem' },
      overline: { fontWeight: 700, letterSpacing: '0.12em', fontSize: '0.7rem' },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: a.ground, color: a.ink, WebkitFontSmoothing: 'antialiased', WebkitTapHighlightColor: 'transparent' },
          '::selection': { backgroundColor: a.accentSoft },
          'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, [tabindex]:focus-visible': {
            outline: `2px solid ${a.accent}`,
            outlineOffset: 2,
          },
          'h1, h2, h3': { textWrap: 'balance' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 38,
            paddingInline: 16,
            transition: `background-color .15s ease, border-color .15s ease, color .15s ease, transform .16s ${ease}`,
            '&:active': { transform: 'scale(0.97)' },
          },
          sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: '0.8125rem' },
          sizeLarge: { minHeight: 46, paddingInline: 22 },
          containedPrimary: { '@media (hover: hover)': { '&:hover': { backgroundColor: p.accentFillHover } } },
          outlined: {
            borderColor: a.line,
            color: a.ink,
            backgroundColor: a.raised,
            '@media (hover: hover)': { '&:hover': { borderColor: a.muted, backgroundColor: a.raised } },
          },
          text: { color: a.ink, '@media (hover: hover)': { '&:hover': { backgroundColor: a.hover } } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 10, color: a.muted, transition: `background-color .15s ease, color .15s ease, transform .16s ${ease}`, '&:active': { transform: 'scale(0.94)' }, '@media (hover: hover)': { '&:hover': { backgroundColor: a.hover, color: a.ink } } },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          elevation1: { border: `1px solid ${a.lineSoft}`, boxShadow: a.shadow },
          outlined: { borderColor: a.lineSoft },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${a.lineSoft}`, borderRadius: 14, boxShadow: a.shadow, backgroundColor: a.raised } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16, border: `1px solid ${a.lineSoft}`, boxShadow: a.shadowPop },
        },
      },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.015em' } } },
      MuiPopover: { styleOverrides: { paper: { border: `1px solid ${a.lineSoft}`, boxShadow: a.shadowPop, borderRadius: 12 } } },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${a.lineSoft}`, boxShadow: a.shadowPop, borderRadius: 12 } } },
      MuiMenuItem: { styleOverrides: { root: { fontSize: '0.875rem', borderRadius: 8, marginInline: 4, minHeight: 36 } } },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: p.ink, color: p.raised, fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, padding: '6px 10px' } },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: a.raised,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: a.line },
            '@media (hover: hover)': { '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: a.muted } },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: a.accent, borderWidth: 1.5 },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 700 } } },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, fontSize: '0.875rem' },
          // Zeminler tema değişkenlerinden: koyu modda MUI'nin siyaha yakın tonları yerine
          standardInfo: { backgroundColor: a.surface, color: a.ink, '& .MuiAlert-icon': { color: a.muted } },
          standardSuccess: { backgroundColor: a.successSoft, color: a.ink, '& .MuiAlert-icon': { color: a.success } },
          standardWarning: { backgroundColor: a.warningSoft, color: a.ink, '& .MuiAlert-icon': { color: a.warning } },
          standardError: { backgroundColor: a.dangerSoft, color: a.ink, '& .MuiAlert-icon': { color: a.danger } },
        },
      },
      MuiTableContainer: { styleOverrides: { root: { borderRadius: 0 } } },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: a.raised,
              color: a.muted,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${a.line}`,
              whiteSpace: 'nowrap',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: a.lineSoft, fontSize: '0.875rem', paddingTop: 10, paddingBottom: 10 },
          sizeSmall: { paddingTop: 8, paddingBottom: 8 },
        },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: a.hover } } },
      },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: a.accent, height: 2 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, minHeight: 44, '&.Mui-selected': { color: a.ink } } } },
      MuiSkeleton: { styleOverrides: { root: { backgroundColor: a.surface } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, backgroundColor: a.surface } } },
    },
  });
}

const adminTheme = createAdminTheme('light');
export default adminTheme;
