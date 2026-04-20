'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Role = 'HQ_ADMIN' | 'AREA_MANAGER' | 'SITE_MANAGER' | 'EMPLOYEE';

interface Item {
  href: string;
  label: string;
  match: (path: string) => boolean;
  visibleTo: readonly Role[];
}

const items: readonly Item[] = [
  {
    href: '/sites',
    label: 'Sites',
    match: (p) => p === '/sites' || p.startsWith('/sites/'),
    visibleTo: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'],
  },
  {
    href: '/community',
    label: 'Community',
    match: (p) => p.startsWith('/community'),
    visibleTo: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'],
  },
  {
    href: '/admin/library/units',
    label: 'Admin',
    match: (p) => p.startsWith('/admin'),
    visibleTo: ['HQ_ADMIN'],
  },
];

/**
 * Primary navigation inside the AppBar.
 *
 * Role-filtered — an item never renders for a role that can't use it, which
 * keeps the bar clean and prevents the "404 surprise" pattern.
 * The active item gets an underline in Mapleleaf red.
 */
export function PrimaryNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: 'flex',
        gap: 4,
        marginLeft: 12,
      }}
    >
      {items
        .filter((i) => i.visibleTo.includes(role))
        .map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                position: 'relative',
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                borderRadius: 'var(--ml-radius-sm)',
                transition:
                  'color var(--ml-motion-fast) var(--ml-ease-out)',
              }}
            >
              {item.label}
              {active && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: -13,
                    height: 2,
                    background: 'var(--ml-red)',
                    borderRadius: 2,
                  }}
                />
              )}
            </Link>
          );
        })}
    </nav>
  );
}
