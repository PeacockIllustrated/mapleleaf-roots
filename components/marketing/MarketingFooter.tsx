import { Wordmark } from '@/components/brand/Wordmark';

export function MarketingFooter() {
  return (
    <footer
      style={{
        background: 'var(--ml-charcoal)',
        color: 'rgba(255, 255, 255, 0.78)',
        padding: '60px 32px 40px',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 36,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Wordmark division="roots" surface="dark" size="md" />
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: 280,
            }}
          >
            The operations platform that ties the Mapleleaf petroleum,
            convenience and workshop divisions into one network.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FooterTitle>The product</FooterTitle>
          <FooterLink href="#challenge">The challenge</FooterLink>
          <FooterLink href="#positioning">Positioning</FooterLink>
          <FooterLink href="#capabilities">Modules</FooterLink>
          <FooterLink href="#roadmap">Roadmap</FooterLink>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FooterTitle>The family</FooterTitle>
          <FooterStatic>Mapleleaf Petroleum</FooterStatic>
          <FooterStatic>Mapleleaf Express</FooterStatic>
          <FooterStatic>Mapleleaf Automotive</FooterStatic>
          <FooterStatic style={{ color: '#FFFFFF', fontWeight: 500 }}>
            Mapleleaf Roots
          </FooterStatic>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FooterTitle>Build partner</FooterTitle>
          <FooterStatic style={{ color: '#FFFFFF', fontWeight: 500 }}>
            Onesign &amp; Digital
          </FooterStatic>
          <FooterStatic>Project lead — Michael Peacock</FooterStatic>
          <a
            href="mailto:michael@onesign.co.uk"
            style={{ ...footerLinkStyle, color: 'var(--ml-gold-mid)' }}
          >
            michael@onesign.co.uk
          </a>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '40px auto 0',
          paddingTop: 24,
          borderTop: '0.5px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.5)',
          letterSpacing: '0.04em',
        }}
      >
        <span>Issue 01 · April 2026 · Confidential</span>
        <span>© Mapleleaf Petroleum Group</span>
      </div>
    </footer>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
      }}
    >
      {children}
    </span>
  );
}

const footerLinkStyle: React.CSSProperties = {
  fontSize: 13,
  textDecoration: 'none',
  color: 'rgba(255, 255, 255, 0.78)',
};

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} style={footerLinkStyle}>
      {children}
    </a>
  );
}

function FooterStatic({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span style={{ ...footerLinkStyle, ...style }}>{children}</span>
  );
}
