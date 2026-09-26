import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { CalendarMonthOutlined, LocationOnOutlined } from '@mui/icons-material';
import dayjs from 'dayjs';
import { site } from '../config';
import { fonts, t } from '../theme';

export interface SearchValues {
  start: string;
  end: string;
  pickupTime: string;
  returnTime: string;
  pickup: string;
  q: string;
}

export function defaultSearchValues(): SearchValues {
  return {
    start: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    end: dayjs().add(4, 'day').format('YYYY-MM-DD'),
    pickupTime: '10:00',
    returnTime: '10:00',
    pickup: site.pickupLocations[0],
    q: '',
  };
}

export function searchValuesToParams(values: SearchValues): URLSearchParams {
  const params = new URLSearchParams();
  params.set('start', values.start);
  params.set('end', values.end);
  if (values.pickupTime) params.set('pickupTime', values.pickupTime);
  if (values.returnTime) params.set('returnTime', values.returnTime);
  if (values.pickup) params.set('pickup', values.pickup);
  if (values.q.trim()) params.set('q', values.q.trim());
  return params;
}

export const TIME_OPTIONS = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

/** Süre sekmeleri: seçilince dönüş tarihi alıştan bu kadar gün sonraya ayarlanır. */
const DURATIONS = [
  { key: 'daily', label: 'Günlük', days: 3 },
  { key: 'weekly', label: 'Haftalık', days: 7 },
  { key: 'monthly', label: 'Aylık', days: 30 },
] as const;
type DurationKey = (typeof DURATIONS)[number]['key'];

function durationFor(days: number): DurationKey {
  if (days === 7) return 'weekly';
  if (days === 30) return 'monthly';
  return 'daily';
}

/** Boş/undefined başlangıç değerleri varsayılanları ezmesin. */
function mergeInitial(initial?: Partial<SearchValues>): SearchValues {
  const values = defaultSearchValues();
  if (!initial) return values;
  for (const [key, value] of Object.entries(initial) as [keyof SearchValues, string | undefined][]) {
    if (value) values[key] = value;
  }
  return values;
}

interface SearchFormProps {
  initial?: Partial<SearchValues>;
  submitLabel?: string;
  /** verilmezse /araclar sayfasına yönlendirir */
  onSubmit?: (values: SearchValues) => void;
  /** Geriye dönük uyumluluk; yerleşim ekran genişliğine göre ayarlanır. */
  compact?: boolean;
  /** Araç / kategori arama alanını da gösterir. */
  showQuery?: boolean;
  /** Günlük / Haftalık / Aylık sekmelerini gösterir. */
  showDurations?: boolean;
}

const fieldSx = {
  display: 'grid',
  gap: '3px',
  minWidth: 0,
  px: 2,
  py: 1.25,
  borderRadius: '12px',
  bgcolor: t.surface,
  border: '1px solid transparent',
  transition: 'border-color .15s ease, background-color .15s ease',
  '&:focus-within': { borderColor: t.accent, bgcolor: t.raised },
} as const;

const labelSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.6,
  fontSize: 12.5,
  fontWeight: 600,
  color: t.muted,
  lineHeight: 1.3,
  cursor: 'pointer',
  '& svg': { fontSize: 16, color: t.subtle },
} as const;

const controlSx = {
  appearance: 'none',
  border: 0,
  outline: 0,
  bgcolor: 'transparent',
  color: t.ink,
  font: `700 16px/1.35 ${fonts.sans}`,
  p: 0,
  m: 0,
  minWidth: 0,
  width: '100%',
  cursor: 'pointer',
  colorScheme: 'inherit',
  '&::-webkit-calendar-picker-indicator': { opacity: 0.5, cursor: 'pointer' },
} as const;

export default function SearchForm({ initial, submitLabel = 'Araçları Göster', onSubmit, showQuery = false, showDurations = false }: SearchFormProps) {
  const navigate = useNavigate();
  const id = useId();
  const [values, setValues] = useState<SearchValues>(() => mergeInitial(initial));

  const update = (field: keyof SearchValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const changeStart = (value: string) =>
    setValues((current) => {
      const next = { ...current, start: value };
      // Dönüş tarihi alıştan önce kalırsa önceki süreyi koruyarak kaydır.
      if (value && (!current.end || !dayjs(current.end).isAfter(dayjs(value)))) {
        const previous = Math.max(1, dayjs(current.end).diff(dayjs(current.start), 'day') || 3);
        next.end = dayjs(value).add(previous, 'day').format('YYYY-MM-DD');
      }
      return next;
    });

  const chooseDuration = (days: number) =>
    setValues((current) => ({ ...current, end: dayjs(current.start).add(days, 'day').format('YYYY-MM-DD') }));

  const invalidRange = !values.start || !values.end || !dayjs(values.end).isAfter(dayjs(values.start));
  const days = invalidRange ? 0 : dayjs(values.end).diff(dayjs(values.start), 'day');
  const activeDuration = durationFor(days);
  const today = dayjs().format('YYYY-MM-DD');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidRange) return;
    if (onSubmit) onSubmit(values);
    else navigate(`/araclar?${searchValuesToParams(values).toString()}`);
  };

  const columns = showQuery
    ? 'minmax(0, 1.4fr) minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(0, 1fr) auto'
    : 'minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) auto';

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate aria-label="Müsait araç arama" sx={{ width: '100%', textAlign: 'left' }}>
      {showDurations && (
        <Box role="tablist" aria-label="Kiralama süresi" sx={{ display: 'flex', gap: 0.5 }}>
          {DURATIONS.map((duration) => {
            const active = activeDuration === duration.key;
            return (
              <Box
                key={duration.key}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => chooseDuration(duration.days)}
                sx={{
                  border: 0,
                  cursor: 'pointer',
                  font: `700 15px ${fonts.sans}`,
                  px: { xs: 2.25, sm: 4 },
                  py: 1.4,
                  borderRadius: '14px 14px 0 0',
                  color: active ? t.ink : t.muted,
                  bgcolor: active ? t.raised : t.glass,
                  backdropFilter: active ? 'none' : 'blur(12px)',
                  transition: 'color .15s ease, background-color .15s ease',
                }}
              >
                {duration.label}
              </Box>
            );
          })}
        </Box>
      )}
      <Box
        sx={{
          bgcolor: t.raised,
          borderRadius: showDurations ? '0 18px 18px 18px' : '18px',
          boxShadow: t.shadow,
          border: `1px solid ${t.lineSoft}`,
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: columns },
            gap: 1.25,
            alignItems: 'stretch',
          }}
        >
          <Box sx={{ ...fieldSx, gridColumn: { xs: 'auto', sm: '1 / -1', md: 'auto' } }}>
            <Box component="label" htmlFor={`${id}-pickup`} sx={labelSx}><LocationOnOutlined />Alış noktası</Box>
            <Box component="select" id={`${id}-pickup`} value={values.pickup} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update('pickup', e.target.value)} sx={{ ...controlSx, textOverflow: 'ellipsis' }}>
              {site.pickupLocations.map((location) => <option key={location} value={location}>{location}</option>)}
            </Box>
          </Box>

          <DateTimeField
            id={`${id}-start`}
            label="Alış tarihi"
            date={values.start}
            time={values.pickupTime}
            min={today}
            onDate={changeStart}
            onTime={(value) => update('pickupTime', value)}
          />
          <DateTimeField
            id={`${id}-end`}
            label="İade tarihi"
            date={values.end}
            time={values.returnTime}
            min={values.start ? dayjs(values.start).add(1, 'day').format('YYYY-MM-DD') : today}
            invalid={invalidRange}
            onDate={(value) => update('end', value)}
            onTime={(value) => update('returnTime', value)}
          />

          {showQuery && (
            <Box sx={{ ...fieldSx, gridColumn: { xs: 'auto', sm: '1 / -1', md: 'auto' } }}>
              <Box component="label" htmlFor={`${id}-q`} sx={labelSx}>Araç veya kategori</Box>
              <Box component="input" id={`${id}-q`} type="search" placeholder="Corolla, SUV…" value={values.q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('q', e.target.value)} sx={{ ...controlSx, cursor: 'text', '&::placeholder': { color: t.subtle, fontWeight: 600 } }} />
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={invalidRange}
            sx={{
              gridColumn: { xs: 'auto', sm: '1 / -1', md: 'auto' },
              minHeight: 56,
              px: 3.5,
              borderRadius: '12px',
              flexDirection: 'column',
              gap: 0,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            <Box component="span" sx={{ fontSize: 15.5 }}>{submitLabel}</Box>
            {days > 0 && (
              <Box component="span" sx={{ font: `500 12px ${fonts.mono}`, opacity: 0.85 }}>{days} gün</Box>
            )}
          </Button>
        </Box>
        {invalidRange && (
          <Typography role="alert" sx={{ mt: 1.25, fontSize: 13.5, color: t.danger, fontWeight: 600 }}>
            İade tarihi alış tarihinden sonra olmalı.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function DateTimeField({ id, label, date, time, min, invalid, onDate, onTime }: {
  id: string;
  label: string;
  date: string;
  time: string;
  min: string;
  invalid?: boolean;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
}) {
  return (
    <Box sx={{ ...fieldSx, borderColor: invalid ? t.danger : 'transparent' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Box component="label" htmlFor={`${id}-date`} sx={labelSx}><CalendarMonthOutlined />{label}</Box>
        <Box component="label" htmlFor={`${id}-time`} sx={labelSx}>Saat</Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box
          component="input"
          type="date"
          id={`${id}-date`}
          value={date}
          min={min}
          aria-invalid={invalid || undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDate(e.target.value)}
          sx={{ ...controlSx, flex: '1 1 auto' }}
        />
        <Box
          component="select"
          id={`${id}-time`}
          value={time}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onTime(e.target.value)}
          sx={{ ...controlSx, width: 'auto', flex: '0 0 auto', textAlign: 'right' }}
        >
          {TIME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </Box>
      </Box>
    </Box>
  );
}

