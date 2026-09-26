import { createTheme } from '@mui/material/styles';

/**
 * SS Filo müşteri sitesi tasarım sistemi.
 *
 * Kimlik: "Rozet" logosu — bordo (#6E1F2F) ve krem (#F4EDE2), italik serif başlıklar.
 * Yerleşim: Garenta tarzı rezervasyon odaklı sayfa, "Showroom" sadeliğiyle.
 * Özellik tabloları: "Katalog" (Dieter Rams) — ince çizgili tablo, mono rakamlar.
 * Gece modu: koyu zemin, ince çizgiler; butonlar krem zemin üzerinde bordo.
 *
 * Renkler CSS değişkeni olarak tanımlanır; bileşenler `t.*` ile okur ve
 * tema değişince yeniden render gerekmeden güncellenir.
 */

export type ColorMode = 'light' | 'dark';

interface Palette {
  ground: string;
  surface: string;
  raised: string;
  photo: string;
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
  glass: string;
  shadow: string;
  /** Logo rozeti: zemin ve yazı rengi (koyu modda tersine döner). */
  markBg: string;
  markFg: string;
}

export const palettes: Record<ColorMode, Palette> = {
  light: {
    ground: '#FBF8F3',
    surface: '#F4EDE2',
    raised: '#FFFFFF',
    photo: '#EFE7DB',
    ink: '#1E1416',
    muted: '#6B5E5A',
    subtle: '#8C7F7A',
    line: '#DDD1C2',
    lineSoft: '#EAE1D5',
    accent: '#6E1F2F',
    accentFill: '#6E1F2F',
    accentFillHover: '#561623',
    accentSoft: '#F3E3E1',
    onAccent: '#FFFFFF',
    success: '#2E6B45',
    successSoft: '#E3F0E6',
    warning: '#9A5B12',
    warningSoft: '#F7EBDA',
    danger: '#B3261E',
    dangerSoft: '#F8E3E0',
    glass: 'rgba(251, 248, 243, 0.86)',
    shadow: '0 10px 30px rgba(30, 20, 22, 0.08)',
    markBg: '#6E1F2F',
    markFg: '#F4EDE2',
  },
  dark: {
    ground: '#140E0F',
    surface: '#1C1415',
    raised: '#231A1B',
    photo: '#231A1B',
    ink: '#F4EDE2',
    muted: '#B8AAA3',
    subtle: '#9A8C86',
    line: 'rgba(244, 237, 226, 0.13)',
    lineSoft: 'rgba(244, 237, 226, 0.07)',
    accent: '#E3A6A9',
    // Koyu modda butonlar rozetin kendisi gibi: krem zemin, bordo yazı.
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
    glass: 'rgba(20, 14, 15, 0.8)',
    shadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    markBg: '#F4EDE2',
    markFg: '#6E1F2F',
  },
};

const cssName = (key: string) => `--ss-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Bileşenlerde kullanılan renk referansları (CSS değişkenleri). */
export const t = Object.fromEntries(
  Object.keys(palettes.light).map((key) => [key, `var(${cssName(key)})`]),
) as Record<keyof Palette, string>;

export const fonts = {
  /** Rozetteki italik serif; büyük başlıklar ve logo yazısı için. */
  display: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans: '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace',
};

/** Güçlü ease-out: giriş ve durum değişimleri için. */
export const ease = 'cubic-bezier(0.23, 1, 0.32, 1)';

function declarations(mode: ColorMode) {
  return Object.fromEntries(
    Object.entries(palettes[mode]).map(([key, value]) => [cssName(key), value]),
  );
}

/** `:root[data-ss-theme]` üzerinde değişkenleri tanımlar; portallar (menü, drawer) da görür. */
export const colorVariables = {
  ':root, :root[data-ss-theme="light"]': { ...declarations('light'), colorScheme: 'light' },
  ':root[data-ss-theme="dark"]': { ...declarations('dark'), colorScheme: 'dark' },
};

/**
 * Eski sayfalarla uyumluluk: önceki tema anahtarları yeni tokenlara bağlanır.
 * Yeniden tasarlanan bileşenler doğrudan `t` kullanır.
 */
export const brand = {
  navy: t.ink,
  navySoft: t.surface,
  blue: t.accent,
  blueDark: t.accent,
  blueSoft: t.accentSoft,
  petrol: t.accent,
  petrolHover: t.accentFillHover,
  gold: t.accent,
  text: t.ink,
  textSoft: t.muted,
  line: t.line,
  bg: t.surface,
  slate: t.surface,
  surface: t.raised,
  white: t.raised,
  green: t.success,
  greenSoft: t.successSoft,
  red: t.danger,
  redSoft: t.dangerSoft,
  warning: t.warning,
  warningSoft: t.warningSoft,
};

export const softShadow = t.shadow;

export function createPublicTheme(mode: ColorMode) {
  const p = palettes[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: p.accentFill, dark: p.accentFillHover, contrastText: p.onAccent },
      secondary: { main: p.ink },
      success: { main: mode === 'light' ? p.success : '#22A35A' },
      warning: { main: mode === 'light' ? p.warning : '#D99A0B' },
      error: { main: mode === 'light' ? p.danger : '#E05252' },
      text: { primary: p.ink, secondary: p.muted },
      divider: p.line,
      background: { default: p.ground, paper: p.raised },
    },
    shape: { borderRadius: 12 },
    spacing: 8,
    typography: {
      fontFamily: fonts.sans,
      h1: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.015em' },
      h3: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.015em' },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
      body1: { fontSize: '1.0625rem', lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.ground,
            color: t.ink,
            WebkitFontSmoothing: 'antialiased',
            WebkitTapHighlightColor: 'transparent',
          },
          '::selection': { backgroundColor: t.accentSoft },
          'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, input:focus-visible, select:focus-visible': {
            outline: `2px solid ${t.accent}`,
            outlineOffset: 2,
          },
          'h1, h2, h3': { textWrap: 'balance' },
          p: { textWrap: 'pretty' },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 16,
            paddingRight: 16,
            '@media (min-width:600px)': { paddingLeft: 24, paddingRight: 24 },
            '@media (min-width:900px)': { paddingLeft: 32, paddingRight: 32 },
          },
          maxWidthLg: { '@media (min-width:1200px)': { maxWidth: 1200 } },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 20,
            minHeight: 44,
            transition: `background-color .15s ease, color .15s ease, border-color .15s ease, transform .16s ${ease}`,
            '&:active': { transform: 'scale(0.97)' },
          },
          sizeSmall: { minHeight: 36, paddingInline: 14 },
          sizeLarge: { minHeight: 52, paddingInline: 26, fontSize: '1rem' },
          containedPrimary: { '@media (hover: hover)': { '&:hover': { backgroundColor: p.accentFillHover } } },
          outlined: {
            borderColor: t.line,
            color: t.ink,
            '@media (hover: hover)': { '&:hover': { borderColor: t.ink, backgroundColor: 'transparent' } },
          },
          text: { color: t.accent },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { color: t.ink, '&:active': { transform: 'scale(0.94)' } } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundColor: 'transparent', backgroundImage: 'none', borderRadius: 18, overflow: 'visible' } },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiPopover: {
        styleOverrides: { paper: { border: `1px solid ${t.lineSoft}`, boxShadow: t.shadow, borderRadius: 14 } },
      },
      MuiMenu: {
        styleOverrides: { paper: { border: `1px solid ${t.lineSoft}`, boxShadow: t.shadow, borderRadius: 14 } },
      },
      MuiDrawer: {
        styleOverrides: { paper: { backgroundColor: t.ground, color: t.ink } },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: t.raised,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.line },
            '@media (hover: hover)': { '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.muted } },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.accent, borderWidth: 1.5 },
          },
          // iOS'ta odaklanınca sayfanın yakınlaşmaması için 16px
          input: { fontSize: 16 },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 999 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: { root: { backgroundColor: 'transparent', '&::before': { display: 'none' } } },
      },
      MuiLink: { defaultProps: { underline: 'hover' } },
    },
  });
}
