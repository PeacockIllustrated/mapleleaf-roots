/**
 * MapleleafIcon
 *
 * The Mapleleaf marque: a stylised gold maple leaf with a red accent stroke.
 *
 * NOTE: The current SVG path is a stylised APPROXIMATION of the Mapleleaf
 * brand mark. When the authentic vector is supplied by the brand team, drop
 * the SVG into `public/brand/mapleleaf.svg` and replace the inline path with
 * an <img> or <object> reference — or inline the real path here.
 *
 * Brand rule: this icon is always the gold leaf + red stroke combination.
 * Do not recolour it, do not use it without the red accent, do not render
 * it smaller than 16px (the accent stops reading clearly below that).
 */

type Variant = 'gold-on-transparent' | 'gold-on-red-square' | 'mono-white';

interface MapleleafIconProps {
  size?: number;
  variant?: Variant;
  className?: string;
}

export function MapleleafIcon({
  size = 40,
  variant = 'gold-on-transparent',
  className,
}: MapleleafIconProps) {
  if (variant === 'gold-on-red-square') {
    // Used inside the app bar — a red tile with the leaf inside.
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: 'var(--ml-red)',
          borderRadius: 'var(--ml-radius-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Mapleleaf"
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 80 80"
          aria-hidden="true"
        >
          <path
            d="M40 5 L43 22 L55 17 L51 30 L65 28 L57 37 L73 42 L58 47 L68 60 L52 56 L48 68 L40 75 L32 68 L28 56 L12 60 L22 47 L7 42 L23 37 L15 28 L29 30 L25 17 L37 22 Z"
            fill="var(--ml-gold-mid)"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'mono-white') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 80 80"
        aria-label="Mapleleaf"
      >
        <path
          d="M40 5 L43 22 L55 17 L51 30 L65 28 L57 37 L73 42 L58 47 L68 60 L52 56 L48 68 L40 75 L32 68 L28 56 L12 60 L22 47 L7 42 L23 37 L15 28 L29 30 L25 17 L37 22 Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Default: gold leaf with red accent on transparent background
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-label="Mapleleaf"
    >
      <path
        d="M40 5 L43 22 L55 17 L51 30 L65 28 L57 37 L73 42 L58 47 L68 60 L52 56 L48 68 L40 75 L32 68 L28 56 L12 60 L22 47 L7 42 L23 37 L15 28 L29 30 L25 17 L37 22 Z"
        fill="var(--ml-gold-mid)"
        stroke="var(--ml-gold-dark)"
        strokeWidth={0.8}
      />
      <path
        d="M14 42 Q 40 54 66 42"
        stroke="var(--ml-red)"
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
