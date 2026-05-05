import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';

interface Props {
  isAuthed: boolean;
}

/**
 * Sticky public-marketing header.
 *
 * Authenticated visitors get an "Open dashboard" CTA instead of "Sign in" —
 * brochure URL is shareable internally as well as externally.
 */
export function MarketingHeader({ isAuthed }: Props) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(245, 242, 238, 0.85)',
        backdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: '0.5px solid var(--ml-border-default)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            textDecoration: 'none',
          }}
          aria-label="Mapleleaf Roots — home"
        >
          <Wordmark division="roots" surface="light" size="sm" />
        </Link>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            fontSize: 13,
            color: 'var(--ml-text-muted)',
          }}
        >
          <a href="#challenge" style={navLink} className="ml-hide-sm">
            The challenge
          </a>
          <a href="#capabilities" style={navLink} className="ml-hide-sm">
            What it does
          </a>
          <a href="#roadmap" style={navLink} className="ml-hide-sm">
            Roadmap
          </a>
          <Link
            href={isAuthed ? '/dashboard' : '/login'}
            style={{
              padding: '8px 16px',
              background: 'var(--ml-red)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              borderRadius: 'var(--ml-radius-md)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {isAuthed ? 'Open dashboard →' : 'Sign in →'}
          </Link>
        </nav>
      </div>
    </header>
  );
}

const navLink: React.CSSProperties = {
  letterSpacing: '0.02em',
  textDecoration: 'none',
  color: 'inherit',
  fontWeight: 500,
};
