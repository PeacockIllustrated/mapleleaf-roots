'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { syncProductImagesFromOff } from './actions';

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; attempted: number; updated: number; skipped: number }
  | { kind: 'error'; message: string };

export function SyncImagesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: 'idle' });

  function run() {
    if (isPending) return;
    setState({ kind: 'running' });
    startTransition(async () => {
      const res = await syncProductImagesFromOff();
      if (res.ok) {
        setState({
          kind: 'done',
          attempted: res.attempted,
          updated: res.updated,
          skipped: res.skipped,
        });
        router.refresh();
      } else {
        setState({ kind: 'error', message: res.message });
      }
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {state.kind === 'done' && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
          }}
        >
          {state.updated}/{state.attempted} enriched
          {state.skipped ? ` · ${state.skipped} skipped` : ''}
        </span>
      )}
      {state.kind === 'error' && (
        <span role="alert" style={{ fontSize: 12, color: 'var(--ml-red)' }}>
          {state.message}
        </span>
      )}
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        style={{
          height: 36,
          padding: '0 16px',
          background: 'transparent',
          color: 'var(--ml-charcoal)',
          border: '1px solid var(--ml-charcoal)',
          borderRadius: 'var(--ml-radius-md)',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 500,
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending || state.kind === 'running'
          ? 'Fetching from Open Food Facts…'
          : 'Sync images from Open Food Facts'}
      </button>
    </div>
  );
}
