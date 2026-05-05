/**
 * Wordmark
 *
 * Renders the Mapleleaf product-family lockup.
 *
 * For division="roots" the lockup is set in Poppins (the brand typeface)
 * directly — no SVG. That keeps the two halves of the lockup on the same
 * text baseline at every size, which the SVG-against-SVG version never
 * managed reliably (image baselines are image-bottom, not the optical
 * baseline of the lettering).
 *
 * For division="petroleum" | "express" | "automotive" the bespoke
 * logotypes are still rendered from /public/brand/*.svg — those wordmarks
 * use custom letterforms that aren't reproducible in Poppins.
 *
 * BRAND RULE (non-negotiable):
 *   - "Mapleleaf" is red on light surfaces, white on dark surfaces.
 *   - The division name is charcoal on light, light grey on dark.
 *   - Red NEVER appears on a division name.
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

// ---------------------------------------------------------------------------
// Text-based lockup (Roots only)
// ---------------------------------------------------------------------------

// Font sizes in px for each size token. The "main" half ("Mapleleaf") is
// always the dominant element; the division name renders at ~70% of it.
const textScale: Record<Size, { main: number; sub: number }> = {
  sm: { main: 18, sub: 13 },
  md: { main: 26, sub: 18 },
  lg: { main: 38, sub: 26 },
};

function TextLockup({
  division,
  surface,
  size,
  className,
}: Required<Pick<WordmarkProps, 'division' | 'surface' | 'size'>> & {
  className?: string;
}) {
  const { main, sub } = textScale[size];

  // Brand-ruled colour. Red on Mapleleaf only; division stays in the
  // neutral text colour for the surface.
  const mainColour = surface === 'dark' ? '#FFFFFF' : 'var(--ml-red)';
  const subColour = surface === 'dark' ? 'var(--ml-light-grey)' : 'var(--ml-charcoal)';

  // Gap is a fraction of the main size — comfortable visual breathing space.
  const gap = Math.max(6, Math.round(main * 0.28));

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: `${gap}px`,
        fontFamily: 'inherit',
        lineHeight: 1,
      }}
      aria-label={`Mapleleaf ${divisionLabels[division]}`}
    >
      <span
        style={{
          fontSize: main,
          fontWeight: 800,
          color: mainColour,
          letterSpacing: '-0.015em',
        }}
      >
        Mapleleaf
      </span>
      <span
        style={{
          fontSize: sub,
          fontWeight: 700,
          color: subColour,
          letterSpacing: '-0.005em',
        }}
      >
        {divisionLabels[division]}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SVG-based lockup (Petroleum, Express, Automotive)
// ---------------------------------------------------------------------------
//
// Aspect ratios taken from the supplied SVG viewBoxes.
// Mapleleaf wordmark: 335.12 × 69.82 → 4.80
// Division wordmarks: 155.98 × 33.26 → 4.69
const MAPLELEAF_RATIO = 335.12 / 69.82;
const DIVISION_RATIO = 155.98 / 33.26;

const svgScale: Record<Size, { main: number; sub: number }> = {
  sm: { main: 18, sub: 13 },
  md: { main: 28, sub: 19 },
  lg: { main: 40, sub: 26 },
};

function SvgLockup({
  division,
  surface,
  size,
  className,
}: Required<Pick<WordmarkProps, 'division' | 'surface' | 'size'>> & {
  className?: string;
}) {
  const { main, sub } = svgScale[size];

  const mainSrc = '/brand/mapleleaf-wordmark.svg';
  const divSrc =
    surface === 'dark'
      ? `/brand/mapleleaf-${division}-light.svg`
      : `/brand/mapleleaf-${division}-dark.svg`;

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
        style={{ display: 'block' }}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export function Wordmark({
  division = 'roots',
  surface = 'light',
  size = 'md',
  className,
}: WordmarkProps) {
  if (division === 'roots') {
    return (
      <TextLockup
        division={division}
        surface={surface}
        size={size}
        className={className}
      />
    );
  }
  return (
    <SvgLockup
      division={division}
      surface={surface}
      size={size}
      className={className}
    />
  );
}
