import { MapleleafIcon } from '@/components/brand/MapleleafIcon';
import { Wordmark } from '@/components/brand/Wordmark';

/**
 * Login page — stub.
 *
 * Phase 1 Claude Code task: implement magic-link authentication.
 *
 * Minimum behaviour:
 *   1. Email input + "Send magic link" button
 *   2. On submit, call Supabase Auth signInWithOtp({ email, options: { emailRedirectTo: ... } })
 *   3. Show a success message with "Check your inbox" + resend option
 *   4. Magic link lands on /auth/callback which exchanges the code for a session
 *   5. Successful auth redirects to /sites
 *
 * Brand notes (from docs/BRAND.md):
 *   - The marque is the hero of this page — large, centred
 *   - Single-column form, max-width ~400px
 *   - Primary CTA in Mapleleaf red
 *   - No hero photography, no illustrations
 */

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--ml-off-white)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          padding: '40px 32px',
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <MapleleafIcon size={72} variant="gold-on-transparent" />
          <Wordmark division="roots" surface="light" size="lg" />
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--ml-text-muted)',
            margin: 0,
          }}
        >
          Franchise operations, grounded in the Mapleleaf brand system.
        </p>

        {/*
          TODO (Phase 1): replace with a client component that:
          - Captures email via react-hook-form + Zod
          - Calls supabase.auth.signInWithOtp(...)
          - Handles success, rate-limit, and error states
        */}
        <div
          style={{
            padding: '24px',
            background: 'var(--ml-surface-muted)',
            borderRadius: 'var(--ml-radius-md)',
            fontSize: '13px',
            color: 'var(--ml-text-primary)',
            textAlign: 'center',
          }}
        >
          Login form — implement in Phase 1.
        </div>
      </div>
    </main>
  );
}
