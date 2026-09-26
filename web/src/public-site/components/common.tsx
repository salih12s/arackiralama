import { Component, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ChevronRight, ErrorOutline, SearchOff } from '@mui/icons-material';
import { ease, fonts, t } from '../theme';

/** Bölüm üstü küçük büyük harfli etiket. */
export function Overline({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Typography sx={{ color: t.accent, fontWeight: 700, letterSpacing: '.14em', fontSize: 12, textTransform: 'uppercase', ...sx }}>
      {children}
    </Typography>
  );
}

/**
 * İç sayfaların üst bandı: kırıntı → etiket → italik serif başlık → tek paragraf.
 * `children` başlığın altına (ör. arama kutusu) yerleşir.
 */
export function PageHeader({ overline, title, subtitle, crumbs, children, maxWidth = 720 }: {
  overline?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: { label: string; to?: string }[];
  children?: ReactNode;
  maxWidth?: number;
}) {
  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {crumbs && crumbs.length > 0 && (
        <Box component="nav" aria-label="Sayfa konumu" sx={{ mb: 0.75 }}>
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, fontSize: 13.5, color: t.muted }}>
            {crumbs.map((crumb, index) => (
              <Box component="li" key={crumb.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                {index > 0 && <ChevronRight aria-hidden sx={{ fontSize: 16, color: t.subtle }} />}
                {crumb.to ? (
                  <Box component={RouterLink} to={crumb.to} sx={{ color: 'inherit', textDecoration: 'none', '@media (hover: hover)': { '&:hover': { color: t.ink } } }}>
                    {crumb.label}
                  </Box>
                ) : (
                  <Box component="span" aria-current="page" sx={{ color: t.ink, fontWeight: 600 }}>{crumb.label}</Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      {overline && <Overline>{overline}</Overline>}
      <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, color: t.ink, fontSize: { xs: 34, sm: 42, md: 52 }, letterSpacing: '-.02em', lineHeight: 1.06, maxWidth }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ color: t.muted, fontSize: { xs: 16.5, md: 18 }, maxWidth: 620 }}>{subtitle}</Typography>
      )}
      {children && <Box sx={{ mt: { xs: 2, md: 2.5 } }}>{children}</Box>}
    </Box>
  );
}

/** Sayfa üst bandı zemini (açık gri/krem), altındaki içerikten ince çizgiyle ayrılır. */
export const headerBandSx = {
  bgcolor: t.surface,
  borderBottom: `1px solid ${t.lineSoft}`,
  pt: { xs: 4, md: 6 },
  pb: { xs: 4.5, md: 6.5 },
} as const;

/**
 * Katalog tablosu (Dieter Rams): üstte koyu çizgi, satırlar arasında ince çizgi.
 * `mono` olan değerler JetBrains Mono ile hizalanır (tutar, kod, tarih).
 */
export function SpecList({ rows, dense = false, emphasizeLast = false }: {
  rows: { label: ReactNode; value: ReactNode; mono?: boolean }[];
  dense?: boolean;
  emphasizeLast?: boolean;
}) {
  return (
    <Box component="dl" sx={{ m: 0, borderTop: `1px solid ${t.ink}` }}>
      {rows.map((row, index) => {
        const strong = emphasizeLast && index === rows.length - 1;
        return (
          <Box
            key={index}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, auto) minmax(0, 1fr)',
              columnGap: 2,
              alignItems: 'baseline',
              py: dense ? 1.25 : 1.6,
              borderBottom: `1px solid ${t.line}`,
            }}
          >
            <Box component="dt" sx={{ color: strong ? t.ink : t.muted, fontWeight: strong ? 700 : 500, fontSize: dense ? 14.5 : 15.5 }}>{row.label}</Box>
            <Box
              component="dd"
              sx={{
                m: 0,
                textAlign: 'right',
                color: strong ? t.accent : t.ink,
                fontWeight: row.mono ? 500 : 700,
                fontFamily: row.mono ? fonts.mono : undefined,
                fontSize: strong ? 20 : dense ? 14.5 : 15.5,
                overflowWrap: 'anywhere',
              }}
            >
              {row.value}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Segmentli seçici: az sayıda seçenek için select yerine dokunulabilir düğmeler.
 * Klavye için radio grubu gibi davranır.
 */
export function Segmented<T extends string>({ label, value, options, onChange, columns }: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; hint?: ReactNode }[];
  onChange: (value: T) => void;
  columns?: { xs?: number; sm?: number; md?: number };
}) {
  return (
    <Box role="radiogroup" aria-label={label} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: `repeat(${columns?.xs ?? 2}, minmax(0, 1fr))`, sm: `repeat(${columns?.sm ?? columns?.xs ?? 2}, minmax(0, 1fr))`, md: `repeat(${columns?.md ?? columns?.sm ?? columns?.xs ?? 2}, minmax(0, 1fr))` } }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            sx={{
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              minHeight: 48,
              px: 1.75,
              py: 1.25,
              borderRadius: '12px',
              border: `1px solid ${selected ? t.accent : t.line}`,
              boxShadow: selected ? `inset 0 0 0 1px ${t.accent}` : 'none',
              bgcolor: selected ? t.accentSoft : t.raised,
              color: t.ink,
              display: 'grid',
              gap: 0.25,
              alignContent: 'center',
              transition: `border-color .15s ease, background-color .15s ease, transform .16s ${ease}`,
              '&:active': { transform: 'scale(0.98)' },
              '@media (hover: hover)': { '&:hover': { borderColor: selected ? t.accent : t.muted } },
            }}
          >
            <Box component="span" sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>{option.label}</Box>
            {option.hint && <Box component="span" sx={{ fontSize: 12.5, color: t.muted, lineHeight: 1.35 }}>{option.hint}</Box>}
          </Box>
        );
      })}
    </Box>
  );
}

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

const toneColors: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: t.success, bg: t.successSoft },
  warning: { fg: t.warning, bg: t.warningSoft },
  danger: { fg: t.danger, bg: t.dangerSoft },
  neutral: { fg: t.muted, bg: t.surface },
  accent: { fg: t.accent, bg: t.accentSoft },
};

/** Noktalı durum rozeti (müsait / beklemede / onaylandı …). */
export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const color = toneColors[tone];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.85, px: 1.4, py: 0.55, borderRadius: 999, bgcolor: color.bg, color: color.fg, fontSize: 13, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
      <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'currentColor' }} />
      {label}
    </Box>
  );
}

/** Kutu: içerik kartları için tek tip yüzey. */
export const panelSx = {
  bgcolor: t.raised,
  border: `1px solid ${t.lineSoft}`,
  borderRadius: '18px',
  p: { xs: 2.5, md: 3.5 },
} as const;

/** Bölüm başlığı: küçük üst etiket → büyük başlık → tek paragraf. */
export function SectionHeading({ overline, title, subtitle, align = 'center' }: {
  overline?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  const centered = align === 'center';
  return (
    <Box sx={{ mb: { xs: 4, md: 5 }, textAlign: centered ? 'center' : 'left', display: 'grid', gap: 1.25, justifyItems: centered ? 'center' : 'start' }}>
      {overline && (
        <Typography sx={{ color: t.accent, fontWeight: 700, letterSpacing: '.14em', fontSize: 12, textTransform: 'uppercase' }}>
          {overline}
        </Typography>
      )}
      <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, color: t.ink, fontSize: { xs: 30, md: 42 }, letterSpacing: '-.015em', lineHeight: 1.1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ color: t.muted, fontSize: { xs: 16.5, md: 18 }, maxWidth: 620 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <Box sx={{ py: 8, px: 3, textAlign: 'center', borderRadius: '22px', bgcolor: t.surface }}>
      <Box sx={{ color: t.subtle, mb: 1.5, '& svg': { fontSize: 40 } }}>{icon ?? <SearchOff />}</Box>
      <Typography sx={{ fontWeight: 800, color: t.ink, fontSize: 19 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: t.muted, mt: 0.75, maxWidth: 440, mx: 'auto' }}>{subtitle}</Typography>}
    </Box>
  );
}

interface ErrorBoundaryState { hasError: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Uncaught error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: '60vh', px: 2, textAlign: 'center' }}>
          <ErrorOutline sx={{ fontSize: 48, color: t.danger }} />
          <Typography variant="h6" sx={{ color: t.ink }}>Beklenmedik bir sorun oluştu</Typography>
          <Typography variant="body2" sx={{ color: t.muted }}>
            Sayfayı yenilemeyi deneyin. Sorun devam ederse bizi arayabilirsiniz.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Sayfayı Yenile</Button>
        </Stack>
      );
    }
    return this.props.children;
  }
}
