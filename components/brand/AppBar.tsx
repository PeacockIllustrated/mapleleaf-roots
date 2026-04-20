/**
 * AppBar
 *
 * The top navigation shell for Mapleleaf Roots.
 *
 * Brand treatment:
 *   - Charcoal background (--ml-charcoal)
 *   - Red Mapleleaf icon square on the left
 *   - "Mapleleaf" in white, "ROOTS" in light grey, separated by a subtle rule
 *
 * This is a Server Component. It receives the current user profile from
 * the parent layout and renders the user menu accordingly. Any interactive
 * bits (menu open/close, sign out) are delegated to client sub-components.
 */

import { MapleleafIcon } from './MapleleafIcon';
import { Wordmark } from './Wordmark';

interface AppBarProps {
  userName?: string;
  userRole?: 'HQ_ADMIN' | 'AREA_MANAGER' | 'SITE_MANAGER' | 'EMPLOYEE';
  children?: React.ReactNode; // Slot for nav links, actions
  userActions?: React.ReactNode; // Trailing slot for sign-out, menu triggers etc.
}

const roleLabels = {
  HQ_ADMIN: 'HQ Admin',
  AREA_MANAGER: 'Area Manager',
  SITE_MANAGER: 'Site Manager',
  EMPLOYEE: 'Employee',
};

export function AppBar({ userName, userRole, children, userActions }: AppBarProps) {
  return (
    <header
      style={{
        background: 'var(--ml-charcoal)',
        color: '#FFFFFF',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontFamily: 'Poppins, system-ui, sans-serif',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Brand lockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <MapleleafIcon size={36} variant="gold-on-red-square" />
        <span
          aria-hidden="true"
          style={{
            width: 1,
            height: 24,
            background: 'rgba(255, 255, 255, 0.18)',
            marginInline: '2px',
          }}
        />
        <Wordmark division="roots" surface="dark" size="sm" />
      </div>

      {/* Slot for navigation and actions */}
      <div style={{ flex: 1, display: 'flex', gap: '8px' }}>{children}</div>

      {/* User identity */}
      {userName && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
          }}
        >
          <span style={{ fontWeight: 500, fontSize: '13px', color: '#FFFFFF' }}>
            {userName}
          </span>
          {userRole && (
            <span
              style={{
                fontWeight: 400,
                fontSize: '11px',
                color: 'var(--ml-light-grey)',
                opacity: 0.7,
              }}
            >
              {roleLabels[userRole]}
            </span>
          )}
        </div>
      )}

      {userActions && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {userActions}
        </div>
      )}
    </header>
  );
}
