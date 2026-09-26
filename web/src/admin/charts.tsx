import { useEffect, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { a, monoSx } from './theme';
import { formatCurrency } from '../utils/currency';

/** Kapsayıcı genişliğini izler (SVG'yi piksel hassasiyetinde çizmek için). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const compactTL = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} Mn`;
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString('tr-TR')} B`;
  return String(Math.round(value));
};

/** Eksen için temiz üst sınır ve adım (0, 10 B, 20 B …). */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { top: 1, step: 1 };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  return { top: step * Math.ceil(max / step), step };
}

function LegendKey({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <Stack direction="row" spacing={0.9} alignItems="center">
      <Box component="span" sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: color, flex: 'none' }} />
      <Typography component="span" sx={{ fontSize: 12.5, color: a.muted }}>{label}</Typography>
      {value && <Typography component="span" sx={{ ...monoSx, fontSize: 12.5, color: a.ink, fontWeight: 500 }}>{value}</Typography>}
    </Stack>
  );
}

export interface RevenuePoint { label: string; billed: number; collected: number }

/**
 * Aylık faturalanan / tahsil edilen: gruplu sütunlar, tek eksen.
 * Ay bandının tamamı üzerine gelme alanıdır; ipucu iki değeri ve oranı gösterir.
 */
export function RevenueChart({ data, height = 240 }: { data: RevenuePoint[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const plotW = Math.max(0, width - padL - padR);
  const plotH = height - padT - padB;
  const max = Math.max(0, ...data.flatMap((d) => [d.billed, d.collected]));
  const { top, step } = niceScale(max);
  const y = (value: number) => padT + plotH - (value / top) * plotH;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(14, (band - 10) / 2));
  const totals = data.reduce((acc, d) => ({ billed: acc.billed + d.billed, collected: acc.collected + d.collected }), { billed: 0, collected: 0 });

  // Üstü 4px yuvarlatılmış, tabanı düz sütun
  const bar = (x: number, value: number, color: string) => {
    const h = Math.max(0, padT + plotH - y(value));
    if (h <= 0) return null;
    const r = Math.min(4, h, barW / 2);
    const top = padT + plotH - h;
    const d = `M${x},${padT + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${padT + plotH} Z`;
    return <path d={d} fill={color} />;
  };

  const hovered = hover != null ? data[hover] : null;

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack direction="row" spacing={2.5} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
        <LegendKey color={a.chart1} label="Faturalanan" value={formatCurrency(totals.billed)} />
        <LegendKey color={a.chart2} label="Tahsil edilen" value={formatCurrency(totals.collected)} />
      </Stack>
      <Box ref={ref} sx={{ position: 'relative', height }} onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Aylık faturalanan ve tahsil edilen tutarlar" style={{ display: 'block', overflow: 'visible' }}>
            {/* Izgara ve eksen etiketleri */}
            {Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).map((tick) => (
              <g key={tick}>
                <line x1={padL} x2={width - padR} y1={y(tick)} y2={y(tick)} stroke={a.chartGrid} strokeWidth={1} />
                <text x={padL - 8} y={y(tick)} dy="0.32em" textAnchor="end" fill={a.subtle} style={{ font: '500 11px "JetBrains Mono", monospace' }}>
                  {compactTL(tick)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x0 = padL + i * band;
              const cx = x0 + band / 2;
              const active = hover === i;
              return (
                <g key={d.label} opacity={hover == null || active ? 1 : 0.45} style={{ transition: 'opacity .15s ease' }}>
                  {active && <rect x={x0 + 2} y={padT} width={band - 4} height={plotH} rx={6} fill={a.hover} />}
                  {bar(cx - barW - 1, d.billed, a.chart1)}
                  {bar(cx + 1, d.collected, a.chart2)}
                  {/* Dar ekranda etiketler birer atlanır (seçili ay her zaman görünür). */}
                  {(band >= 30 || i % 2 === 0 || active) && (
                    <text x={cx} y={height - 8} textAnchor="middle" fill={active ? a.ink : a.subtle} style={{ font: `${active ? 700 : 500} 11px Manrope, sans-serif` }}>
                      {d.label}
                    </text>
                  )}
                  <rect x={x0} y={padT} width={band} height={plotH + padB} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
        )}
        {hovered && hover != null && (
          <Box
            role="status"
            sx={{
              position: 'absolute',
              top: 0,
              left: Math.min(Math.max(padL + hover * band + band / 2 - 90, 0), Math.max(0, width - 180)),
              width: 180,
              pointerEvents: 'none',
              bgcolor: a.raised,
              border: `1px solid ${a.lineSoft}`,
              borderRadius: '10px',
              boxShadow: a.shadowPop,
              p: 1.25,
              display: 'grid',
              gap: 0.5,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: a.ink }}>{hovered.label}</Typography>
            <LegendKey color={a.chart1} label="Fatura" value={formatCurrency(hovered.billed)} />
            <LegendKey color={a.chart2} label="Tahsil" value={formatCurrency(hovered.collected)} />
            {hovered.billed > 0 && (
              <Typography sx={{ fontSize: 11.5, color: a.muted }}>Tahsil oranı %{Math.round((hovered.collected / hovered.billed) * 100)}</Typography>
            )}
          </Box>
        )}
      </Box>
      {/* Ekran okuyucular için tablo karşılığı */}
      <Box component="table" sx={{ position: 'absolute', width: '1px', height: '1px', m: '-1px', p: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
        <caption>Aylık gelir</caption>
        <thead><tr><th>Ay</th><th>Faturalanan</th><th>Tahsil edilen</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{formatCurrency(d.billed)}</td><td>{formatCurrency(d.collected)}</td></tr>)}</tbody>
      </Box>
    </Box>
  );
}

export interface FleetSegment { key: string; label: string; value: number; color: string }

/** Filo dağılımı: 2px boşluklu yatay yığın çubuk + sayılı açıklama. */
export function FleetBar({ segments }: { segments: FleetSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <Box>
      <Box role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')} sx={{ display: 'flex', gap: '2px', height: 12, borderRadius: '4px', overflow: 'hidden', bgcolor: a.surface }}>
        {total > 0 && segments.filter((s) => s.value > 0).map((s) => (
          <Box key={s.key} title={`${s.label}: ${s.value}`} sx={{ flex: s.value, bgcolor: s.color }} />
        ))}
      </Box>
      <Box component="dl" sx={{ m: 0, mt: 2, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 2, rowGap: 1.25 }}>
        {segments.map((s) => (
          <Stack key={s.key} direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Box component="span" aria-hidden sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: s.color, flex: 'none' }} />
            <Box component="dt" sx={{ fontSize: 13, color: a.muted, flex: 1, minWidth: 0 }}>{s.label}</Box>
            <Box component="dd" sx={{ m: 0, ...monoSx, fontSize: 13.5, fontWeight: 500, color: a.ink }}>{s.value}</Box>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
