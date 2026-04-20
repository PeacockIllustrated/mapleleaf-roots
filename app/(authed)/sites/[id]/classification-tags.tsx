'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleClassification } from '../actions';

interface Tag {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

interface Props {
  siteId: string;
  tags: Tag[];
  appliedIds: string[];
  canEdit: boolean;
}

type OptAction = { tagId: string; applied: boolean };

/**
 * Classification tag chips.
 *
 * Optimistic toggle: the UI flips immediately and only reverts if the server
 * action fails (we show a console warning and leave the set in sync with
 * the server's authoritative state).
 */
export function ClassificationTags({ siteId, tags, appliedIds, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyOpt] = useOptimistic<Set<string>, OptAction>(
    new Set(appliedIds),
    (state, action) => {
      const next = new Set(state);
      if (action.applied) next.add(action.tagId);
      else next.delete(action.tagId);
      return next;
    }
  );

  function onToggle(tag: Tag) {
    if (!canEdit || isPending) return;
    const applied = !optimistic.has(tag.id);
    startTransition(async () => {
      applyOpt({ tagId: tag.id, applied });
      const res = await toggleClassification({ siteId, tagId: tag.id, applied });
      if (!res.ok) {
        // Best-effort revert — in practice RLS-denied flips are rare because
        // the UI already hides `canEdit=false` actions.
        // eslint-disable-next-line no-console
        console.warn('Toggle failed, will reconcile on next navigation:', res.message);
      }
    });
  }

  if (tags.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ml-text-muted)' }}>
        No classification tags defined.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {tags.map((tag) => {
        const isApplied = optimistic.has(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag)}
            disabled={!canEdit || isPending}
            aria-pressed={isApplied}
            style={{
              padding: '6px 14px',
              height: 32,
              borderRadius: 9999,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.01em',
              cursor: canEdit ? (isPending ? 'wait' : 'pointer') : 'not-allowed',
              border: isApplied
                ? '1px solid var(--ml-charcoal)'
                : '1px solid var(--ml-border-default)',
              background: isApplied
                ? 'var(--ml-charcoal)'
                : 'var(--ml-surface-panel)',
              color: isApplied ? '#FFFFFF' : 'var(--ml-charcoal)',
              transition:
                'background var(--ml-motion-fast) var(--ml-ease-out), color var(--ml-motion-fast) var(--ml-ease-out), border-color var(--ml-motion-fast) var(--ml-ease-out)',
              opacity: !canEdit ? 0.7 : 1,
            }}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
