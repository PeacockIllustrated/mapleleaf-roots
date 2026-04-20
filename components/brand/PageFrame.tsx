/**
 * PageFrame — standard padded + max-width content wrapper.
 *
 * Most dashboard pages opt into this frame; canvas-heavy surfaces
 * (planogram, shelves) skip it so they can breathe across the full
 * available width of the viewport minus the sidenav.
 */

interface Props {
  children: React.ReactNode;
  width?: 'default' | 'narrow';
}

export function PageFrame({ children, width = 'default' }: Props) {
  return (
    <div
      style={{
        padding: '28px 32px 48px',
        maxWidth: width === 'narrow' ? 1040 : 1440,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}
