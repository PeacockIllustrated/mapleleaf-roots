'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MapleleafIcon } from './MapleleafIcon';
import { Wordmark } from './Wordmark';

type Role = 'HQ_ADMIN' | 'AREA_MANAGER' | 'SITE_MANAGER' | 'EMPLOYEE';

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
  visibleTo: readonly Role[];
}

const items: readonly Item[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <IconDashboard />,
    match: (p) => p === '/dashboard',
    visibleTo: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'],
  },
  {
    href: '/sites',
    label: 'Sites',
    icon: <IconSites />,
    match: (p) => p === '/sites' || p.startsWith('/sites/'),
    visibleTo: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'],
  },
  {
    href: '/team',
    label: 'Team',
    icon: <IconTeam />,
    match: (p) => p.startsWith('/team'),
    visibleTo: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER'],
  },
  {
    href: '/community',
    label: 'Community',
    icon: <IconCommunity />,
    match: (p) => p.startsWith('/community'),
    visibleTo: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'],
  },
  {
    href: '/admin/library/units',
    label: 'Library',
    icon: <IconLibrary />,
    match: (p) => p.startsWith('/admin/library'),
    visibleTo: ['HQ_ADMIN'],
  },
  {
    href: '/admin/campaigns',
    label: 'Campaigns',
    icon: <IconCampaigns />,
    match: (p) => p.startsWith('/admin/campaigns'),
    visibleTo: ['HQ_ADMIN'],
  },
];

const roleLabels: Record<Role, string> = {
  HQ_ADMIN: 'HQ Admin',
  AREA_MANAGER: 'Area Manager',
  SITE_MANAGER: 'Site Manager',
  EMPLOYEE: 'Employee',
};

interface Props {
  profile: { id: string; full_name: string; email: string; role: Role };
  userActions: React.ReactNode;
}

export function Sidenav({ profile, userActions }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visible = items.filter((i) => i.visibleTo.includes(profile.role));

  return (
    <aside
      style={{
        width: collapsed ? 68 : 248,
        flexShrink: 0,
        background: 'var(--ml-charcoal)',
        color: 'var(--ml-light-grey)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '0.5px solid rgba(255, 255, 255, 0.08)',
        transition: 'width var(--ml-motion-base) var(--ml-ease-out)',
      }}
    >
      {/* Brand lockup */}
      <div
        style={{
          padding: collapsed ? '18px 14px' : '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
          minHeight: 64,
        }}
      >
        <MapleleafIcon size={36} variant="gold-on-red-square" />
        {!collapsed && (
          <Wordmark division="roots" surface="dark" size="sm" />
        )}
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          padding: '14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {visible.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 14px' : '10px 12px',
                borderRadius: 'var(--ml-radius-md)',
                color: active ? '#FFFFFF' : 'rgba(230, 231, 231, 0.78)',
                background: active
                  ? 'rgba(225, 40, 40, 0.14)'
                  : 'transparent',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.01em',
                textDecoration: 'none',
                position: 'relative',
                transition:
                  'background var(--ml-motion-fast) var(--ml-ease-out), color var(--ml-motion-fast) var(--ml-ease-out)',
              }}
            >
              {active && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    background: 'var(--ml-red)',
                    borderRadius: 2,
                  }}
                />
              )}
              <span
                style={{
                  display: 'inline-flex',
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User identity */}
      <div
        style={{
          padding: collapsed ? '12px 10px' : '14px 16px',
          borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: collapsed ? 'stretch' : 'center',
          gap: collapsed ? 10 : 10,
        }}
      >
        {!collapsed && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile.full_name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--ml-light-grey)',
                opacity: 0.7,
              }}
            >
              {roleLabels[profile.role]}
            </span>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: collapsed ? 'center' : 'flex-end',
          }}
        >
          {userActions}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: 22,
          left: collapsed ? 68 - 10 : 248 - 10,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: 'var(--ml-charcoal)',
          color: 'var(--ml-light-grey)',
          border: '0.5px solid rgba(255, 255, 255, 0.18)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          lineHeight: 1,
          transition: 'left var(--ml-motion-base) var(--ml-ease-out)',
          zIndex: 5,
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Inline monoline icons — keep them consistent and brand-neutral.
// ---------------------------------------------------------------------------

function IconDashboard() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h7v7H4zM13 4h7v4h-7zM4 13h7v7H4zM13 10h7v10h-7z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSites() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20V9l8-5 8 5v11M9 20v-7h6v7"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <circle cx={9} cy={8} r={3} stroke="currentColor" strokeWidth={1.6} />
      <circle cx={16.5} cy={9.5} r={2.5} stroke="currentColor" strokeWidth={1.6} />
      <path
        d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M14 20c0-2.2 1.8-4 4-4s4 1.8 4 4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCommunity() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h16v10H8l-4 4z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 5h3v14H5zM10 5h3v14h-3zM15.5 5.5l3 .8-3 13.2-3-.8z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCampaigns() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10v4l11 5V5zM15 9a3 3 0 0 1 0 6"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
