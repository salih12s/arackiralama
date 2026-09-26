import { t } from '../theme';
import { badge, monogram } from './brandPaths';

/**
 * SS Filo rozet logosu (vektör).
 * Renkler tema tokenlarından gelir; koyu modda krem zemin + bordo şekillere döner.
 * Sabit renkli dosyalar: /brand/ss-filo-badge.svg, /brand/ss-filo-monogram.svg
 */

interface LogoColors { bg?: string; fg?: string }

function LogoSvg({ shape, size, title, bg = t.markBg, fg = t.markFg }: { shape: { size: number; d: string }; size: number; title?: string } & LogoColors) {
  const half = shape.size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${shape.size} ${shape.size}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', flex: 'none' }}
    >
      <circle cx={half} cy={half} r={half} fill={bg} />
      <path d={shape.d} fill={fg} fillRule="evenodd" />
    </svg>
  );
}

/** Küçük boyutlar için monogram: birbirine geçen iki S. */
export function BrandMark({ size = 40, title, bg, fg }: { size?: number; title?: string } & LogoColors) {
  return <LogoSvg shape={monogram} size={size} title={title} bg={bg} fg={fg} />;
}

/** Tam rozet: çevresinde "SS FİLO · ARAÇ KİRALAMA · İSTANBUL". 72 px ve üzeri için. */
export function BrandBadge({ size = 120, title = 'SS Filo Araç Kiralama', bg, fg }: { size?: number; title?: string } & LogoColors) {
  return <LogoSvg shape={badge} size={size} title={title} bg={bg} fg={fg} />;
}
