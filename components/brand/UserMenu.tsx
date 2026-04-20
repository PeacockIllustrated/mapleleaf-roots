'use client';

import { useTransition } from 'react';

interface UserMenuProps {
  signOutAction: () => Promise<void>;
}

/**
 * Minimal user menu — a single sign-out button for Phase 1.
 * Renders inline in the app bar next to the user identity block.
 * A richer dropdown (profile, theme, etc.) can land later.
 */
export function UserMenu({ signOutAction }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOutAction())}
      disabled={isPending}
      style={{
        background: 'transparent',
        color: 'var(--ml-light-grey)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: 'var(--ml-radius-md)',
        height: 32,
        padding: '0 12px',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 500,
        cursor: isPending ? 'wait' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        transition: 'opacity var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
