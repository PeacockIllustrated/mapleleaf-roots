import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';

/**
 * Admin shell. HQ Admin only. Anyone else gets a 404 — we don't announce
 * that this route exists.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(['HQ_ADMIN']);
  } catch {
    notFound();
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 12,
          borderBottom: '0.5px solid var(--ml-border-default)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          HQ Admin
        </span>
        <span
          aria-hidden="true"
          style={{
            height: 12,
            width: 1,
            background: 'var(--ml-border-default)',
          }}
        />
        <nav style={{ display: 'flex', gap: 4 }}>
          <AdminTab href="/admin/library/units" label="Unit library" />
          <AdminTab href="/admin/library/pos-slots" label="POS slot types" />
          <AdminTab
            href="/admin/library/promo-sections"
            label="Promo sections"
          />
        </nav>
      </div>

      {children}
    </section>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--ml-text-primary)',
        textDecoration: 'none',
        borderRadius: 'var(--ml-radius-md)',
        transition:
          'background var(--ml-motion-fast) var(--ml-ease-out), color var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      {label}
    </Link>
  );
}
