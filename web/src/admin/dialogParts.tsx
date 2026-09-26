import { ReactNode } from 'react';
import { Box, IconButton, InputAdornment, Stack, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { a, ease, fonts, monoSx } from './theme';
import { formatCurrency } from '../utils/currency';

/** Form pencerelerinin üst bölümü: başlık, alt başlık, kapatma. */
export function DialogHeader({ title, subtitle, onClose, disabled }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; disabled?: boolean }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ px: { xs: 2.5, sm: 3 }, pt: 2.5, pb: 2, borderBottom: `1px solid ${a.lineSoft}` }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 22, sm: 26 }, lineHeight: 1.15, color: a.ink }}>{title}</Typography>
        {subtitle && <Typography sx={{ color: a.muted, fontSize: 14, mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      <IconButton onClick={onClose} disabled={disabled} aria-label="Kapat" sx={{ mt: -0.5, mr: -1 }}>
        <Close fontSize="small" />
      </IconButton>
    </Stack>
  );
}

/** Numaralı form bölümü. */
export function FormSection({ step, title, hint, action, children }: { step?: number; title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Box component="section" sx={{ '& + &': { mt: 3.5, pt: 3, borderTop: `1px solid ${a.lineSoft}` } }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 1.5, rowGap: 1, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flex: '1 1 220px' }}>
          {step != null && (
            <Box component="span" sx={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: a.accentSoft, color: a.accent, ...monoSx, fontSize: 12, fontWeight: 600 }}>
              {step}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h3" sx={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: a.ink }}>{title}</Typography>
            {hint && <Typography sx={{ fontSize: 12.5, color: a.muted }}>{hint}</Typography>}
          </Box>
        </Stack>
        {action}
      </Box>
      {children}
    </Box>
  );
}

/** Para alanları için sağda ₺ işareti ve mono rakamlar. */
export const moneyInputProps = {
  endAdornment: <InputAdornment position="end">₺</InputAdornment>,
  sx: { '& input': { ...monoSx } },
};

/** Az seçenekli alanlar için düğmeli seçici (radio grubu gibi davranır). */
export function SegmentedControl<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: NoInfer<T>; label: string; icon?: ReactNode }[];
  onChange: (value: NoInfer<T>) => void;
  label: string;
}) {
  return (
    <Box role="radiogroup" aria-label={label} sx={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 0.75 }}>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              height: 44,
              borderRadius: '10px',
              cursor: 'pointer',
              font: `${selected ? 700 : 600} 14px ${fonts.sans}`,
              color: selected ? a.accent : a.ink,
              bgcolor: selected ? a.accentSoft : a.raised,
              border: `1px solid ${selected ? a.accent : a.line}`,
              boxShadow: selected ? `inset 0 0 0 1px ${a.accent}` : 'none',
              transition: `border-color .15s ease, background-color .15s ease, transform .16s ${ease}`,
              '&:active': { transform: 'scale(0.98)' },
              '& svg': { fontSize: 18 },
              '@media (hover: hover)': { '&:hover': { borderColor: selected ? a.accent : a.muted } },
            }}
          >
            {option.icon}
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}

/** Pencerelerin sağındaki özet paneli. */
export function SummaryPanel({ title = 'Özet', children }: { title?: string; children: ReactNode }) {
  return (
    <Box component="aside" aria-label={title} sx={{ bgcolor: a.surface, borderRadius: '14px', p: 2.5, position: { md: 'sticky' }, top: 0, alignSelf: 'start' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: a.muted, mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}

/** Özet satırı: etiket solda, değer sağda. */
export function SummaryRow({ label, value, mono = true, strong, tone, muted }: { label: ReactNode; value: ReactNode; mono?: boolean; strong?: boolean; tone?: 'danger' | 'success'; muted?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2} sx={{ py: 0.75 }}>
      <Typography sx={{ fontSize: 13.5, color: muted ? a.subtle : a.muted }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: strong ? 15 : 13.5,
          fontWeight: strong ? 700 : 600,
          color: tone === 'danger' ? a.danger : tone === 'success' ? a.success : muted ? a.subtle : a.ink,
          textAlign: 'right',
          overflowWrap: 'anywhere',
          ...(mono ? { ...monoSx, fontWeight: strong ? 600 : 500 } : {}),
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/** Kalan bakiye: büyük rakam + ödenme oranı çubuğu. */
export function BalanceHero({ balance, total, paid, label = 'Kalan bakiye' }: { balance: number; total: number; paid: number; label?: string }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, paid / total)) : 0;
  return (
    <Box sx={{ pt: 1.5, mt: 1, borderTop: `1px solid ${a.line}` }}>
      <Typography sx={{ fontSize: 13, color: a.muted, fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ ...monoSx, fontSize: 28, fontWeight: 500, lineHeight: 1.2, color: balance > 0 ? a.danger : a.success }}>{formatCurrency(balance)}</Typography>
      <Box aria-hidden sx={{ height: 5, borderRadius: 999, bgcolor: a.raised, overflow: 'hidden', mt: 1 }}>
        <Box sx={{ height: '100%', width: `${ratio * 100}%`, bgcolor: a.success, borderRadius: 999, transition: `width .4s ${ease}` }} />
      </Box>
      <Typography sx={{ fontSize: 12, color: a.muted, mt: 0.5 }}>Toplamın %{Math.round(ratio * 100)}'i ödendi</Typography>
    </Box>
  );
}

/** İki sütunlu form penceresi gövdesi: solda form, sağda özet (dar ekranda alt alta). */
export const dialogBodySx = {
  display: 'grid',
  gap: { xs: 2.5, md: 3.5 },
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 300px' },
  alignItems: 'start',
} as const;

/** Form alanları ızgarası. */
export const fieldGrid = (columns: { xs?: number; sm?: number; md?: number }) => ({
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
    sm: `repeat(${columns.sm ?? columns.xs ?? 1}, minmax(0, 1fr))`,
    md: `repeat(${columns.md ?? columns.sm ?? columns.xs ?? 1}, minmax(0, 1fr))`,
  },
});
