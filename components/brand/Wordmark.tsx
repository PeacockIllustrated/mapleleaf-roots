/**
 * Wordmark
 *
 * Renders the Mapleleaf product-family lockup by pairing the authentic
 * "Mapleleaf" SVG wordmark with the division's SVG wordmark.
 *
 * BRAND RULE (non-negotiable):
 *   - "Mapleleaf" is red on light surfaces, white on dark surfaces.
 *   - The division name is charcoal on light surfaces, light grey on dark.
 *   - Red NEVER appears on a division wordmark.
 *
 * Assets live in /public/brand/. Dark surfaces recolour the red "Mapleleaf"
 * to white via a CSS filter (brightness(0) invert(1)) — a single-colour SVG
 * recolours cleanly under that filter.
 */

type Division = 'petroleum' | 'express' | 'automotive' | 'roots';
type Surface = 'light' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface WordmarkProps {
  division?: Division;
  surface?: Surface;
  size?: Size;
  className?: string;
}

const divisionLabels: Record<Division, string> = {
  petroleum: 'Petroleum',
  express: 'Express',
  automotive: 'Automotive',
  roots: 'Roots',
};

// Aspect ratios taken from the supplied SVG viewBoxes.
// Mapleleaf wordmark: 335.12 × 69.82 → 4.80
// Division wordmarks: 155.98 × 33.26 → 4.69
const MAPLELEAF_RATIO = 335.12 / 69.82;
const DIVISION_RATIO = 155.98 / 33.26;

// Height in px for the "Mapleleaf" wordmark at each size.
const heightScale: Record<Size, { main: number; sub: number }> = {
  sm: { main: 16, sub: 10 },
  md: { main: 26, sub: 16 },
  lg: { main: 36, sub: 22 },
};

export function Wordmark({
  division = 'roots',
  surface = 'light',
  size = 'md',
  className,
}: WordmarkProps) {
  const { main, sub } = heightScale[size];

  const mainSrc = '/brand/mapleleaf-wordmark.svg';
  const divSrc =
    surface === 'dark'
      ? `/brand/mapleleaf-${division}-light.svg`
      : `/brand/mapleleaf-${division}-dark.svg`;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: `${Math.round(main * 0.28)}px`,
        lineHeight: 1,
      }}
      aria-label={`Mapleleaf ${divisionLabels[division]}`}
    >
      <img
        src={mainSrc}
        alt=""
        aria-hidden="true"
        width={Math.round(main * MAPLELEAF_RATIO)}
        height={main}
        style={{
          display: 'block',
          // On dark surfaces, recolour the red wordmark to white.
          filter: surface === 'dark' ? 'brightness(0) invert(1)' : undefined,
        }}
      />
      <img
        src={divSrc}
        alt=""
        aria-hidden="true"
        width={Math.round(sub * DIVISION_RATIO)}
        height={sub}
        style={{ display: 'block' }}
      />
    </span>
  );
}
