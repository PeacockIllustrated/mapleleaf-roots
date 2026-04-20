import { MapleleafIcon } from '@/components/brand/MapleleafIcon';
import { Wordmark } from '@/components/brand/Wordmark';
import { LoginForm } from './login-form';

interface LoginPageProps {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    params.from && params.from.startsWith('/') ? params.from : '/sites';
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

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
            fontSize: '13px',
            color: 'var(--ml-text-muted)',
            margin: 0,
          }}
        >
          Sign in with the credentials your admin issued.
        </p>

        {errorMessage && (
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
            Sign-in failed: {errorMessage}
          </div>
        )}

        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
