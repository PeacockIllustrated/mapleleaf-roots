'use client';

import { useConfigurator } from '@/lib/configurator/store';

interface Props {
  canEdit: boolean;
  shopBounds: { widthMm: number; heightMm: number } | null;
  onEditBounds?: () => void;
}

/**
 * Inline toolbar above the stage: zoom controls, bound-editing affordance,
 * and the zoom percentage. Sits in a compact pill.
 */
export function StageToolbar({ canEdit, shopBounds, onEditBounds }: Props) {
  const zoom = useConfigurator((s) => s.zoom);
  const setZoom = useConfigurator((s) => s.setZoom);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        alignSelf: 'flex-start',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <SmallButton
          label="−"
          onClick={() => setZoom(zoom - 0.1)}
          aria="Zoom out"
          disabled={zoom <= 0.25}
        />
        <span
          style={{
            minWidth: 52,
            textAlign: 'center',
            fontSize: 12,
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
            color: 'var(--ml-text-primary)',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <SmallButton
          label="+"
          onClick={() => setZoom(zoom + 0.1)}
          aria="Zoom in"
          disabled={zoom >= 2}
        />
      </div>

      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: 'var(--ml-border-default)',
        }}
      />

      <SmallButton
        label="100%"
        onClick={() => setZoom(1)}
        aria="Reset zoom"
        subtle
      />
      <SmallButton
        label="Fit"
        onClick={() => {
          if (shopBounds) {
            // Aim for shop bounds to fit at roughly 85% of viewport.
            const fit = Math.min(
              2,
              Math.max(0.25, 0.85 * (1 / Math.max(1, shopBounds.widthMm / 8000)))
            );
            setZoom(fit);
          } else {
            setZoom(1);
          }
        }}
        aria="Fit to shop"
        subtle
      />

      {canEdit && onEditBounds && (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 1,
              height: 18,
              background: 'var(--ml-border-default)',
            }}
          />
          <SmallButton
            label={shopBounds ? 'Edit shop bounds' : 'Set shop bounds'}
            onClick={onEditBounds}
            aria="Edit shop bounds"
            subtle
          />
        </>
      )}

      <span
        style={{
          fontSize: 11,
          color: 'var(--ml-text-muted)',
          marginLeft: 4,
        }}
      >
        Hold ⌘/Ctrl + scroll to zoom
      </span>
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  aria,
  disabled,
  subtle,
}: {
  label: string;
  onClick: () => void;
  aria: string;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 28,
        minWidth: 28,
        padding: subtle ? '0 10px' : 0,
        background: subtle ? 'transparent' : 'var(--ml-off-white)',
        color: 'var(--ml-charcoal)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition:
          'background var(--ml-motion-fast) var(--ml-ease-out), border-color var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      {label}
    </button>
  );
}
