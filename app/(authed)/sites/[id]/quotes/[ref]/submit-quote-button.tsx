'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { submitQuote } from '@/lib/quote/actions';

interface Props {
  quoteRef: string;
}

/**
 * Submit a DRAFT quote → SUBMITTED. Shows a brief gold-gradient success
 * banner on the page when the transition lands.
 */
export function SubmitQuoteButton({ quoteRef }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'success' }
  >({ kind: 'idle' });

  function onClick() {
    if (isPending) return;
    startTransition(async () => {
      const res = await submitQuote({ quoteRef });
      if (res.ok) {
        setState({ kind: 'success' });
        router.refresh();
      } else {
        setState({ kind: 'error', message: res.message });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        style={{
          height: 36,
          padding: '0 18px',
          background: 'var(--ml-action-primary)',
          color: '#FFFFFF',
          border: 0,
          borderRadius: 'var(--ml-radius-md)',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.01em',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Submitting…' : 'Submit to Onesign'}
      </button>
      {state.kind === 'error' && (
        <span
          role="alert"
          style={{
            fontSize: 12,
            color: 'var(--ml-red)',
            marginLeft: 4,
          }}
        >
          {state.message}
        </span>
      )}
      {state.kind === 'success' && (
        <span
          role="status"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            padding: '10px 16px',
            borderRadius: 'var(--ml-radius-md)',
            background:
              'linear-gradient(90deg, var(--ml-gold-light), var(--ml-gold-mid), var(--ml-gold-dark))',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(65, 64, 66, 0.25)',
            zIndex: 10,
          }}
        >
          Submitted to Onesign. {quoteRef} is on its way.
        </span>
      )}
    </>
  );
}
