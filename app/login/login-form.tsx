'use client';

import { useRouter } from 'next/navigation';
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
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'signing-in' }
  | { kind: 'error'; message: string };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  async function onSubmit(values: FormValues) {
    setState({ kind: 'signing-in' });

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setState({
        kind: 'error',
        message:
          error.message === 'Invalid login credentials'
            ? 'Email or password doesn’t match our records.'
            : error.message,
      });
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  const busy = state.kind === 'signing-in';

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
          disabled={busy}
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
          <span role="alert" style={{ fontSize: 12, color: 'var(--ml-red)' }}>
            {errors.email.message}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="password"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ml-text-primary)',
          }}
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          disabled={busy}
          {...register('password')}
          style={{
            height: 40,
            padding: '0 12px',
            border: errors.password
              ? '1px solid var(--ml-red)'
              : '1px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-md)',
            fontFamily: 'inherit',
            fontSize: 14,
            background: 'var(--ml-surface-panel)',
            color: 'var(--ml-text-primary)',
          }}
        />
        {errors.password && (
          <span role="alert" style={{ fontSize: 12, color: 'var(--ml-red)' }}>
            {errors.password.message}
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
        disabled={busy}
        style={{
          height: 44,
          background: 'var(--ml-action-primary)',
          color: '#FFFFFF',
          border: 0,
          borderRadius: 'var(--ml-radius-md)',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 500,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'opacity var(--ml-motion-fast) var(--ml-ease-out)',
        }}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
