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
//
// The division wordmark renders at ~62-66% of the main wordmark's height —
// matches how the brochure pairs them. We scale `sub` up at smaller sizes so
// "ROOTS" stays legible at 16-20px main heights.
const heightScale: Record<Size, { main: number; sub: number }> = {
  sm: { main: 18, sub: 13 },
  md: { main: 28, sub: 19 },
  lg: { main: 40, sub: 26 },
};

// Optical adjustments for the lockup.
//
// The two SVGs were drawn with different internal padding, so a naive
// alignItems: 'baseline' renders the division wordmark sitting above the
// optical baseline of "Mapleleaf". A small negative translate on the
// division element pulls it down to match. Tuned visually against the
// supplied SVGs and the brochure layout.
const DIVISION_BASELINE_OFFSET = 0.06; // fraction of `sub` height

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

  // The lockup gap is a fixed fraction of the main wordmark height so the
  // proportions hold across sizes. 0.45 gives a comfortable visual breathing
  // space at every size — at 0.28 the marks felt crammed.
  const gap = Math.max(6, Math.round(main * 0.45));

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${gap}px`,
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
        style={{
          display: 'block',
          transform: `translateY(${Math.round(sub * DIVISION_BASELINE_OFFSET)}px)`,
        }}
      />
    </span>
  );
}
