import { ReactNode, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Close, Inbox, MoreHoriz, Search } from '@mui/icons-material';
import { a, ease, fonts, monoSx } from './theme';
import { formatCurrency } from '../utils/currency';

/* -------------------------------------------------------------------------- */
/* Sayfa başlığı                                                              */
/* -------------------------------------------------------------------------- */

export function PageHeader({ title, subtitle, actions, eyebrow }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: { xs: 2.5, md: 3.5 } }}>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography sx={{ color: a.muted, fontSize: 13, fontWeight: 600, mb: 0.5 }}>{eyebrow}</Typography>
        )}
        <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 28, md: 34 }, lineHeight: 1.1, letterSpacing: '-0.02em', color: a.ink }}>
          {title}
        </Typography>
        {subtitle && <Typography sx={{ color: a.muted, mt: 0.75, fontSize: 14.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>{actions}</Stack>}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Kart                                                                       */
/* -------------------------------------------------------------------------- */

export const panelSx = {
  bgcolor: a.raised,
  border: `1px solid ${a.lineSoft}`,
  borderRadius: '14px',
  boxShadow: a.shadow,
  minWidth: 0,
} as const;

export function Panel({ title, subtitle, action, children, padded = true, sx }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** false: içerik kenara kadar (tablolar için) */
  padded?: boolean;
  sx?: object;
}) {
  return (
    <Box component="section" sx={{ ...panelSx, ...sx }}>
      {(title || action) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: 2.5, pt: 2.25, pb: padded ? 0 : 1.75 }}>
          <Box sx={{ minWidth: 0 }}>
            {title && <Typography component="h2" sx={{ fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.015em', color: a.ink }}>{title}</Typography>}
            {subtitle && <Typography sx={{ color: a.muted, fontSize: 13, mt: 0.25 }}>{subtitle}</Typography>}
          </Box>
          {action && <Box sx={{ flex: 'none' }}>{action}</Box>}
        </Stack>
      )}
      <Box sx={{ p: padded ? 2.5 : 0 }}>{children}</Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Gösterge kutusu                                                            */
/* -------------------------------------------------------------------------- */

export function KpiTile({ label, value, meta, progress, icon, loading }: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  /** 0–1 arası; altta ince oran çubuğu */
  progress?: number;
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 1.75, sm: 2.25 }, display: 'grid', gap: 0.75, alignContent: 'start' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography sx={{ color: a.muted, fontSize: 13, fontWeight: 700 }}>{label}</Typography>
        {icon && <Box sx={{ color: a.subtle, display: 'grid', '& svg': { fontSize: 18 } }}>{icon}</Box>}
      </Stack>
      {loading ? (
        <Skeleton width="60%" height={36} />
      ) : (
        <Typography sx={{ ...monoSx, fontWeight: 500, fontSize: { xs: 18, sm: 22, md: 25 }, color: a.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </Typography>
      )}
      {progress != null && !loading && (
        <Box sx={{ height: 4, borderRadius: 999, bgcolor: a.surface, overflow: 'hidden', mt: 0.25 }} aria-hidden>
          <Box sx={{ height: '100%', width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`, bgcolor: a.accent, borderRadius: 999, transition: `width .6s ${ease}` }} />
        </Box>
      )}
      {meta && <Typography sx={{ color: a.muted, fontSize: 12.5 }}>{meta}</Typography>}
    </Box>
  );
}

/** Üçlü gösterge satırı: dar ekranda ilk gösterge tam genişlik, diğer ikisi yan yana. */
export const kpiRow3Sx = {
  display: 'grid',
  gap: 2,
  mb: 2,
  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
  '& > :first-of-type': { gridColumn: { xs: '1 / -1', md: 'auto' } },
} as const;

/* -------------------------------------------------------------------------- */
/* Durum rozeti                                                               */
/* -------------------------------------------------------------------------- */

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

const tones: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: a.success, bg: a.successSoft },
  warning: { fg: a.warning, bg: a.warningSoft },
  danger: { fg: a.danger, bg: a.dangerSoft },
  neutral: { fg: a.muted, bg: a.neutralSoft },
  accent: { fg: a.accent, bg: a.accentSoft },
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const color = tones[tone];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.1, py: 0.35, borderRadius: 999, bgcolor: color.bg, color: color.fg, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
      <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', flex: 'none' }} />
      {label}
    </Box>
  );
}

const statusMap: Record<string, { label: string; tone: Tone }> = {
  // Kiralama
  ACTIVE: { label: 'Kirada', tone: 'accent' },
  RETURNED: { label: 'Teslim alındı', tone: 'success' },
  COMPLETED: { label: 'Tamamlandı', tone: 'success' },
  CANCELLED: { label: 'İptal', tone: 'danger' },
  // Araç
  IDLE: { label: 'Müsait', tone: 'success' },
  RENTED: { label: 'Kirada', tone: 'accent' },
  RESERVED: { label: 'Rezerve', tone: 'warning' },
  SERVICE: { label: 'Serviste', tone: 'neutral' },
  // Rezervasyon
  PENDING: { label: 'Bekliyor', tone: 'warning' },
  CONFIRMED: { label: 'Onaylandı', tone: 'success' },
};

/** Kiralama, araç ve rezervasyon durumlarını tek dilde gösterir. */
export function Status({ value }: { value: string }) {
  const item = statusMap[value] || { label: value, tone: 'neutral' as Tone };
  return <StatusBadge label={item.label} tone={item.tone} />;
}

/* -------------------------------------------------------------------------- */
/* Plaka ve tutar                                                             */
/* -------------------------------------------------------------------------- */

/** Türk plakası görünümünde küçük etiket. */
export function Plate({ value, size = 'md' }: { value?: string | null; size?: 'sm' | 'md' }) {
  if (!value) return <Box component="span" sx={{ color: a.subtle }}>—</Box>;
  const small = size === 'sm';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        border: `1px solid ${a.line}`,
        borderRadius: '6px',
        overflow: 'hidden',
        bgcolor: a.raised,
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }}
    >
      <Box component="span" aria-hidden sx={{ width: small ? 5 : 6, bgcolor: '#2B4C9B', flex: 'none' }} />
      <Box component="span" sx={{ ...monoSx, fontWeight: 500, fontSize: small ? 12 : 13, color: a.ink, px: small ? 0.75 : 0.9, py: small ? 0.1 : 0.2, letterSpacing: '0.02em' }}>
        {value}
      </Box>
    </Box>
  );
}

export function Money({ value, tone, strong }: { value: number | null | undefined; tone?: 'danger' | 'success' | 'muted'; strong?: boolean }) {
  const color = tone === 'danger' ? a.danger : tone === 'success' ? a.success : tone === 'muted' ? a.muted : a.ink;
  return (
    <Box component="span" sx={{ ...monoSx, color, fontWeight: strong ? 600 : 500, whiteSpace: 'nowrap' }}>
      {value == null ? '—' : formatCurrency(value)}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Boş durum                                                                  */
/* -------------------------------------------------------------------------- */

export function EmptyState({ title, subtitle, icon, action, compact }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <Box sx={{ py: compact ? 4 : 7, px: 3, textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 0.75 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: a.surface, color: a.subtle, mb: 0.5, '& svg': { fontSize: 22 } }}>
        {icon ?? <Inbox />}
      </Box>
      <Typography sx={{ fontWeight: 800, color: a.ink, fontSize: 15 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: a.muted, fontSize: 13.5, maxWidth: 360 }}>{subtitle}</Typography>}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Veri tablosu                                                               */
/* -------------------------------------------------------------------------- */

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Bu genişliğin altında sütunu gizle */
  hideBelow?: 'sm' | 'md' | 'lg';
}

const hideQuery = { sm: '@media (max-width:599.95px)', md: '@media (max-width:899.95px)', lg: '@media (max-width:1199.95px)' };

/**
 * Sade, yoğun veri tablosu. Masaüstünde tablo; `mobileRow` verilirse 600px altında
 * satırlar kart listesine dönüşür.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, loading, empty, mobileRow, dense }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  mobileRow?: (row: T) => ReactNode;
  dense?: boolean;
}) {
  const cellPad = dense ? '9px 12px' : '12px 14px';
  const hasMobile = Boolean(mobileRow);

  if (loading) {
    return (
      <Box sx={{ px: 2.5, py: 1.5 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={40} />)}
      </Box>
    );
  }
  if (rows.length === 0) return <>{empty ?? <EmptyState compact title="Kayıt yok" />}</>;

  return (
    <>
      <Box sx={{ overflowX: 'auto', display: hasMobile ? { xs: 'none', sm: 'block' } : 'block' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <Box component="thead">
            <Box component="tr">
              {columns.map((column) => (
                <Box
                  component="th"
                  key={column.key}
                  scope="col"
                  sx={{
                    textAlign: column.align || 'left',
                    width: column.width,
                    p: cellPad,
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: a.subtle,
                    borderBottom: `1px solid ${a.line}`,
                    whiteSpace: 'nowrap',
                    '&:first-of-type': { pl: 2.5 },
                    '&:last-of-type': { pr: 2.5 },
                    ...(column.hideBelow ? { [hideQuery[column.hideBelow]]: { display: 'none' } } : {}),
                  }}
                >
                  {column.header}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((row) => (
              <Box
                component="tr"
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color .12s ease',
                  '@media (hover: hover)': { '&:hover': { bgcolor: onRowClick ? a.hover : 'transparent' } },
                  '&:last-of-type td': { borderBottom: 0 },
                  '&:focus-visible': { outline: `2px solid ${a.accent}`, outlineOffset: -2 },
                }}
              >
                {columns.map((column) => (
                  <Box
                    component="td"
                    key={column.key}
                    sx={{
                      textAlign: column.align || 'left',
                      p: cellPad,
                      fontSize: 14,
                      color: a.ink,
                      borderBottom: `1px solid ${a.lineSoft}`,
                      verticalAlign: 'middle',
                      '&:first-of-type': { pl: 2.5 },
                      '&:last-of-type': { pr: 2.5 },
                      ...(column.hideBelow ? { [hideQuery[column.hideBelow]]: { display: 'none' } } : {}),
                    }}
                  >
                    {column.render(row)}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {hasMobile && (
        <Box component="ul" sx={{ display: { xs: 'block', sm: 'none' }, listStyle: 'none', m: 0, p: 0 }}>
          {rows.map((row) => (
            <Box
              component="li"
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ px: 2, py: 1.5, borderTop: `1px solid ${a.lineSoft}`, cursor: onRowClick ? 'pointer' : 'default', '&:active': { bgcolor: onRowClick ? a.hover : 'transparent' } }}
            >
              {mobileRow!(row)}
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}

/** Etiket–değer listesi (katalog satırları). `mono` tutar/tarih için. */
export function DefinitionList({ rows, dense }: {
  rows: ({ label: ReactNode; value: ReactNode; mono?: boolean; strong?: boolean; tone?: 'danger' | 'success' } | null | false)[];
  dense?: boolean;
}) {
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {rows.filter(Boolean).map((row, index) => {
        const item = row as { label: ReactNode; value: ReactNode; mono?: boolean; strong?: boolean; tone?: 'danger' | 'success' };
        return (
          <Box key={index} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, auto) minmax(0, 1fr)', columnGap: 2, alignItems: 'baseline', py: dense ? 0.9 : 1.2, borderTop: index === 0 ? 0 : `1px solid ${a.lineSoft}` }}>
            <Box component="dt" sx={{ color: a.muted, fontSize: 13.5 }}>{item.label}</Box>
            <Box
              component="dd"
              sx={{
                m: 0,
                textAlign: 'right',
                fontSize: item.strong ? 15 : 14,
                fontWeight: item.strong ? 700 : 600,
                color: item.tone === 'danger' ? a.danger : item.tone === 'success' ? a.success : a.ink,
                overflowWrap: 'anywhere',
                ...(item.mono ? { ...monoSx, fontWeight: item.strong ? 600 : 500 } : {}),
              }}
            >
              {item.value}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** Küçük ikincil metin (tablo hücrelerinde ikinci satır). */
export function Sub({ children }: { children: ReactNode }) {
  return <Box component="span" sx={{ display: 'block', color: a.muted, fontSize: 12.5, mt: 0.15 }}>{children}</Box>;
}

/* -------------------------------------------------------------------------- */
/* Sekmeli filtre                                                             */
/* -------------------------------------------------------------------------- */

/** Sayılı durum sekmeleri; dar ekranda yatay kayar. */
export function FilterTabs<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: NoInfer<T>; label: string; count?: number }[];
  onChange: (value: NoInfer<T>) => void;
  label: string;
}) {
  return (
    <Box role="tablist" aria-label={label} sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, p: 0.5, bgcolor: a.surface, borderRadius: '12px', maxWidth: '100%' }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            sx={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.9,
              height: 34,
              px: 1.5,
              border: 0,
              borderRadius: '9px',
              cursor: 'pointer',
              font: `${selected ? 700 : 600} 13.5px ${fonts.sans}`,
              color: selected ? a.ink : a.muted,
              bgcolor: selected ? a.raised : 'transparent',
              boxShadow: selected ? '0 1px 2px rgba(30,20,22,.08)' : 'none',
              transition: 'background-color .15s ease, color .15s ease',
              '@media (hover: hover)': { '&:hover': { color: a.ink } },
            }}
          >
            {option.label}
            {option.count != null && (
              <Box component="span" sx={{ ...monoSx, fontSize: 11.5, fontWeight: 500, color: selected ? a.accent : a.subtle }}>{option.count}</Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Satır işlemleri                                                            */
/* -------------------------------------------------------------------------- */

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

/** Tek ana düğme + "⋯" menüsü. Tıklamalar satırın kendi tıklamasını tetiklemez. */
export function RowActions({ primary, items }: { primary?: RowAction | null; items: RowAction[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = items.filter((item) => !item.hidden);
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" onClick={stop} onKeyDown={stop}>
      {primary && !primary.hidden && (
        <Button size="small" variant="outlined" startIcon={primary.icon} disabled={primary.disabled} onClick={primary.onClick} sx={{ whiteSpace: 'nowrap', '& .MuiButton-startIcon svg': { fontSize: 16 } }}>
          {primary.label}
        </Button>
      )}
      {visible.length > 0 && (
        <>
          <IconButton size="small" aria-label="Diğer işlemler" aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}>
            <MoreHoriz fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
            onClick={stop}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 200, py: 0.5 } } }}
          >
            {visible.flatMap((item, index) => {
              const previous = visible[index - 1];
              const divider = item.danger && previous && !previous.danger ? [<Divider key={`${item.label}-divider`} sx={{ my: 0.5 }} />] : [];
              return [
                ...divider,
                <MenuItem
                  key={item.label}
                  disabled={item.disabled}
                  onClick={() => { setAnchor(null); item.onClick(); }}
                  sx={{ gap: 1.25, color: item.danger ? a.danger : a.ink, '& svg': { fontSize: 18, color: item.danger ? a.danger : a.muted } }}
                >
                  {item.icon}
                  {item.label}
                </MenuItem>,
              ];
            })}
          </Menu>
        </>
      )}
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */
/* Onay penceresi                                                             */
/* -------------------------------------------------------------------------- */

export function ConfirmDialog({ open, title, body, confirmLabel, pendingLabel, danger, pending, error, onConfirm, onClose }: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  danger?: boolean;
  pending?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ color: a.muted, fontSize: 14.5, lineHeight: 1.6 }}>{body}</Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="outlined">Vazgeç</Button>
        <Button onClick={onConfirm} disabled={pending} variant="contained" color={danger ? 'error' : 'primary'} autoFocus>
          {pending ? pendingLabel || 'İşleniyor…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Sayfalama, arama, filtre çubuğu                                            */
/* -------------------------------------------------------------------------- */

export function Pager({ page, pageSize, total, onPage, onPageSize }: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: 2.5, py: 1.25, borderTop: `1px solid ${a.lineSoft}` }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ fontSize: 12.5, color: a.muted, display: { xs: 'none', sm: 'block' } }}>Sayfa başına</Typography>
        <TextField select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} inputProps={{ 'aria-label': 'Sayfa başına satır' }} sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: 13 } }}>
          {[10, 25, 50, 100].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
        </TextField>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography sx={{ ...monoSx, fontSize: 12.5, color: a.muted, mr: 1 }}>{from}–{to} / {total}</Typography>
        <IconButton size="small" aria-label="Önceki sayfa" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Sonraki sayfa" disabled={page >= last} onClick={() => onPage(page + 1)}><ChevronRight fontSize="small" /></IconButton>
      </Stack>
    </Stack>
  );
}

export function SearchField({ value, onChange, placeholder, sx }: { value: string; onChange: (value: string) => void; placeholder: string; sx?: object }) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': placeholder }}
      InputProps={{
        startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 19, color: a.subtle }} /></InputAdornment>,
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Aramayı temizle" onClick={() => onChange('')} sx={{ mr: -0.75 }}><Close sx={{ fontSize: 16 }} /></IconButton>
          </InputAdornment>
        ) : undefined,
      }}
      sx={{ minWidth: 0, ...sx }}
    />
  );
}

/** Filtre çubuğu: kart içinde, tablonun üstünde; dar ekranda sarar. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, px: 2.5, py: 1.75, borderBottom: `1px solid ${a.lineSoft}` }}>
      {children}
    </Box>
  );
}
