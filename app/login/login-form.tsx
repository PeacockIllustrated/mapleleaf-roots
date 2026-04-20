'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter your work email')
    .email('That doesn’t look like a valid email'),
});

type FormValues = z.infer<typeof schema>;

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  async function onSubmit(values: FormValues) {
    setState({ kind: 'sending' });

    const supabase = createClient();
    const redirectTo = new URL(
      `/auth/callback?next=${encodeURIComponent(nextPath)}`,
      window.location.origin
    ).toString();

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setState({ kind: 'error', message: error.message });
      return;
    }

    setState({ kind: 'sent', email: values.email });
  }

  async function resend() {
    const email = getValues('email');
    if (!email) return;
    await onSubmit({ email });
  }

  if (state.kind === 'sent') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 20,
          background: 'var(--ml-surface-muted)',
          borderRadius: 'var(--ml-radius-md)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ml-text-primary)' }}>
          Check your inbox — we’ve sent a sign-in link to{' '}
          <strong>{state.email}</strong>.
        </p>
        <button
          type="button"
          onClick={resend}
          style={{
            background: 'transparent',
            color: 'var(--ml-charcoal)',
            border: '1px solid var(--ml-charcoal)',
            borderRadius: 'var(--ml-radius-md)',
            height: 40,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Resend link
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="email"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ml-text-primary)',
          }}
        >
          Work email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={errors.email ? true : undefined}
          disabled={state.kind === 'sending'}
          {...register('email')}
          style={{
            height: 40,
            padding: '0 12px',
            border: errors.email
              ? '1px solid var(--ml-red)'
              : '1px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-md)',
            fontFamily: 'inherit',
            fontSize: 14,
            background: 'var(--ml-surface-panel)',
            color: 'var(--ml-text-primary)',
          }}
        />
        {errors.email && (
          <span
            role="alert"
            style={{ fontSize: 12, color: 'var(--ml-red)' }}
          >
            {errors.email.message}
          </span>
        )}
      </div>

      {state.kind === 'error' && (
        <div
          role="alert"
          style={{
            padding: 12,
            background: 'rgba(225, 40, 40, 0.06)',
            border: '1px solid rgba(225, 40, 40, 0.35)',
            borderRadius: 'var(--ml-radius-md)',
            fontSize: 13,
            color: 'var(--ml-red)',
          }}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={state.kind === 'sending'}
        style={{
          height: 44,
          background: 'var(--ml-action-primary)',
          color: '#FFFFFF',
          border: 0,
          borderRadius: 'var(--ml-radius-md)',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 500,
          cursor: state.kind === 'sending' ? 'wait' : 'pointer',
          opacity: state.kind === 'sending' ? 0.7 : 1,
          transition: 'opacity var(--ml-motion-fast) var(--ml-ease-out)',
        }}
      >
        {state.kind === 'sending' ? 'Sending link…' : 'Send magic link'}
      </button>
    </form>
  );
}
