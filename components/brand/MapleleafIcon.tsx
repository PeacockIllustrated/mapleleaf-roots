/**
 * MapleleafIcon
 *
 * Renders the authentic Mapleleaf marque — the gold-gradient maple leaf with
 * red accents — from /public/brand/mapleleaf-icon.svg. Three presentations:
 *
 *   - gold-on-transparent : the icon on a neutral surface (login hero, cards)
 *   - gold-on-red-square  : inside a red tile for the app-bar lockup
 *   - mono-white          : solid-white silhouette for rare monochrome cases
 *
 * Brand rule: the icon always retains its gold + red character except in the
 * explicit mono variant. Do not recolour it, do not crop it.
 */

type Variant = 'gold-on-transparent' | 'gold-on-red-square' | 'mono-white';

interface MapleleafIconProps {
  size?: number;
  variant?: Variant;
  className?: string;
  /** When rendered on a red square, how large the leaf sits inside. 0-1. */
  leafScale?: number;
}

const ASSET = '/brand/mapleleaf-icon.svg';

export function MapleleafIcon({
  size = 40,
  variant = 'gold-on-transparent',
  className,
  leafScale = 0.72,
}: MapleleafIconProps) {
  if (variant === 'gold-on-red-square') {
    const inner = Math.round(size * leafScale);
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          background: 'var(--ml-red)',
          borderRadius: 'var(--ml-radius-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-label="Mapleleaf"
      >
        <img
          src={ASSET}
          width={inner}
          height={inner}
          alt=""
          aria-hidden="true"
          style={{ display: 'block' }}
        />
      </span>
    );
  }

  if (variant === 'mono-white') {
    return (
      <img
        src={ASSET}
        className={className}
        width={size}
        height={size}
        alt="Mapleleaf"
        style={{
          display: 'block',
          filter: 'brightness(0) invert(1)',
        }}
      />
    );
  }

  return (
    <img
      src={ASSET}
      className={className}
      width={size}
      height={size}
      alt="Mapleleaf"
      style={{ display: 'block' }}
    />
  );
}
