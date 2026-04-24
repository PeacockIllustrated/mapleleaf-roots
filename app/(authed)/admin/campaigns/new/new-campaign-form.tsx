'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createCampaign } from '@/lib/campaigns/actions';

export function NewCampaignForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({
    code: '',
    name: '',
    description: '',
    starts_at: '',
    ends_at: '',
    brief_url: '',
  });

  function update<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCampaign({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description.trim() || null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
        brief_url: values.brief_url.trim() || null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/admin/campaigns/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <Field label="Code" hint="UPPERCASE, underscores only — e.g. SUMMER_BBQ_2026">
        <input
          required
          type="text"
          value={values.code}
          onChange={(e) => update('code', e.target.value.toUpperCase())}
          placeholder="SUMMER_BBQ_2026"
          style={{ ...inputStyle, fontFamily: 'ui-monospace, Menlo, monospace' }}
        />
      </Field>

      <Field label="Name">
        <input
          required
          type="text"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Summer BBQ 2026"
          style={inputStyle}
        />
      </Field>

      <Field label="Description" hint="Optional — shown alongside the campaign in HQ and site views.">
        <textarea
          rows={3}
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Promotion of BBQ essentials across all forecourt convenience sites…"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Starts">
          <input
            type="date"
            value={values.starts_at}
            onChange={(e) => update('starts_at', e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Ends">
          <input
            type="date"
            value={values.ends_at}
            onChange={(e) => update('ends_at', e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Brief URL" hint="Link to the design brief document (optional).">
        <input
          type="url"
          value={values.brief_url}
          onChange={(e) => update('brief_url', e.target.value)}
          placeholder="https://…"
          style={inputStyle}
        />
      </Field>

      {error && (
        <div role="alert" style={errorBanner}>
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={secondaryButton}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" style={primaryButton} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontSize: 13,
  color: 'var(--ml-text-primary)',
  background: 'var(--ml-off-white)',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  outline: 'none',
};

const primaryButton: React.CSSProperties = {
  padding: '9px 16px',
  background: 'var(--ml-red)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 'var(--ml-radius-md)',
  border: 'none',
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  padding: '9px 16px',
  background: 'transparent',
  color: 'var(--ml-charcoal)',
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 'var(--ml-radius-md)',
  border: '1px solid var(--ml-border-default)',
  cursor: 'pointer',
};

const errorBanner: React.CSSProperties = {
  padding: 12,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 13,
  color: 'var(--ml-red)',
};
