'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addClassificationTarget,
  removeClassificationTarget,
} from '@/lib/campaigns/actions';
import type { CampaignClassificationTarget } from '@/lib/campaigns/types';

interface Tag {
  id: string;
  code: string;
  name: string;
}

interface Props {
  campaignId: string;
  editable: boolean;
  tags: Tag[];
  targets: CampaignClassificationTarget[];
}

export function ClassificationTargetsPanel({
  campaignId,
  editable,
  tags,
  targets,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const appliedById = new Map(targets.map((t) => [t.classification_tag_id, t]));

  function onToggle(tag: Tag) {
    if (!editable || isPending) return;
    setError(null);
    const existing = appliedById.get(tag.id);
    startTransition(async () => {
      const res = existing
        ? await removeClassificationTarget({
            campaign_id: campaignId,
            target_id: existing.id,
          })
        : await addClassificationTarget({
            campaign_id: campaignId,
            classification_tag_id: tag.id,
          });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map((tag) => {
          const isApplied = appliedById.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag)}
              disabled={!editable || isPending}
              aria-pressed={isApplied}
              style={{
                padding: '6px 14px',
                height: 32,
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 9999,
                border: isApplied
                  ? '1px solid var(--ml-charcoal)'
                  : '1px solid var(--ml-border-default)',
                background: isApplied
                  ? 'var(--ml-charcoal)'
                  : 'var(--ml-surface-panel)',
                color: isApplied ? '#FFFFFF' : 'var(--ml-charcoal)',
                cursor: editable
                  ? isPending
                    ? 'wait'
                    : 'pointer'
                  : 'not-allowed',
                opacity: editable ? 1 : 0.7,
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      {error && (
        <div role="alert" style={errorBanner}>
          {error}
        </div>
      )}
    </div>
  );
}

const errorBanner: React.CSSProperties = {
  padding: 10,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 12,
  color: 'var(--ml-red)',
};
