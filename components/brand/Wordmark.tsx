/**
 * Wordmark
 *
 * Renders a Mapleleaf product-family wordmark (Mapleleaf + division name).
 *
 * BRAND RULE (non-negotiable):
 * Mapleleaf Red (#E12828) is NEVER used on division wordmarks.
 * The division name is always charcoal (on light surfaces) or white
 * (on dark surfaces). Only "Mapleleaf" is red.
 *
 * If you find yourself tempted to set the division name to red to "match
 * the CTA colour" or similar — stop. Read docs/BRAND.md. The rule is deliberate.
 */

type Division = 'petroleum' | 'express' | 'automotive' | 'roots';
type Surface = 'light' | 'dark';

interface WordmarkProps {
  division?: Division;
  surface?: Surface;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const divisionLabels: Record<Division, string> = {
  petroleum: 'Petroleum',
  express: 'Express',
  automotive: 'Automotive',
  roots: 'Roots',
};

const sizeScale = {
  sm: { main: 18, sub: 11 },
  md: { main: 28, sub: 16 },
  lg: { main: 40, sub: 22 },
};

export function Wordmark({
  division = 'roots',
  surface = 'light',
  size = 'md',
  className,
}: WordmarkProps) {
  const scale = sizeScale[size];

  // Rule: "Mapleleaf" is red on light surfaces, white on dark surfaces.
  const mainColour = surface === 'dark' ? '#FFFFFF' : 'var(--ml-red)';

  // Rule: division name is charcoal on light, white on dark. NEVER red.
  const divColour = surface === 'dark' ? '#FFFFFF' : 'var(--ml-charcoal)';

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.35em',
        fontFamily: 'Poppins, system-ui, sans-serif',
        lineHeight: 1,
      }}
      aria-label={`Mapleleaf ${divisionLabels[division]}`}
    >
      <span
        style={{
          fontWeight: 900,
          fontSize: scale.main,
          color: mainColour,
          letterSpacing: '-0.02em',
        }}
      >
        Mapleleaf
      </span>
      <span
        style={{
          fontWeight: 900,
          fontSize: scale.sub,
          color: divColour,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        {divisionLabels[division]}
      </span>
    </div>
  );
}
