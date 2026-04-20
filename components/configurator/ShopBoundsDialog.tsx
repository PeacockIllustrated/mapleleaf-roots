'use client';

import { useEffect, useState } from 'react';
import type { ShopBounds } from '@/lib/configurator/types';

interface Props {
  open: boolean;
  initialBounds: ShopBounds | null;
  onClose: () => void;
  onSave: (bounds: ShopBounds) => Promise<void>;
  onClear: () => Promise<void>;
}

/**
 * Shop bounds editor — a small modal. Users enter the shop floor's
 * external dimensions in metres (converted to mm at commit time).
 * Rectangle-only in Phase 1; future phases can support polygonal floors.
 */
export function ShopBoundsDialog({
  open,
  initialBounds,
  onClose,
  onSave,
  onClear,
}: Props) {
  const [widthM, setWidthM] = useState('');
  const [depthM, setDepthM] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWidthM(
      initialBounds ? String(initialBounds.widthMm / 1000) : ''
    );
    setDepthM(
      initialBounds ? String(initialBounds.heightMm / 1000) : ''
    );
    setError(null);
  }, [open, initialBounds]);

  if (!open) return null;

  async function handleSave() {
    const w = Number.parseFloat(widthM);
    const d = Number.parseFloat(depthM);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(d) || d <= 0) {
      setError('Both dimensions need to be positive numbers in metres.');
      return;
    }
    if (w > 200 || d > 200) {
      setError('That’s bigger than a stadium — try smaller numbers.');
      return;
    }
    setBusy(true);
    try {
      await onSave({ widthMm: Math.round(w * 1000), heightMm: Math.round(d * 1000) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await onClear();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(65, 64, 66, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          width: 420,
          maxWidth: 'calc(100vw - 48px)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 18px 40px rgba(65, 64, 66, 0.25)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            Shop bounds
          </h2>
          <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
            Tell the configurator the size of this site’s physical floor. The
            outline appears on the stage so you know where furniture fits.
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <DimField
            label="Width (m)"
            value={widthM}
            onChange={setWidthM}
            disabled={busy}
          />
          <DimField
            label="Depth (m)"
            value={depthM}
            onChange={setDepthM}
            disabled={busy}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: 'var(--ml-red)',
              background: 'rgba(225, 40, 40, 0.06)',
              padding: '8px 10px',
              borderRadius: 'var(--ml-radius-sm)',
              border: '1px solid rgba(225, 40, 40, 0.35)',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button
            type="button"
            onClick={handleClear}
            disabled={busy || !initialBounds}
            style={{
              height: 36,
              padding: '0 14px',
              background: 'transparent',
              color: 'var(--ml-text-muted)',
              border: '0.5px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: busy || !initialBounds ? 'not-allowed' : 'pointer',
              opacity: busy || !initialBounds ? 0.5 : 1,
            }}
          >
            Clear bounds
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                height: 36,
                padding: '0 14px',
                background: 'transparent',
                color: 'var(--ml-charcoal)',
                border: '1px solid var(--ml-charcoal)',
                borderRadius: 'var(--ml-radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              style={{
                height: 36,
                padding: '0 18px',
                background: 'var(--ml-action-primary)',
                color: '#FFFFFF',
                border: 0,
                borderRadius: 'var(--ml-radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DimField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'var(--ml-text-primary)',
        }}
      >
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          height: 40,
          padding: '0 12px',
          border: '1px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-md)',
          background: 'var(--ml-off-white)',
          fontSize: 14,
          fontFamily: 'inherit',
          color: 'var(--ml-text-primary)',
        }}
      />
    </label>
  );
}
