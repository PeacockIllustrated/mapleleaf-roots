'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSubmission } from '../actions';

const schema = z.object({
  site_id: z.string().uuid('Select a site'),
  title: z.string().min(3, 'At least 3 characters').max(120),
  description: z.string().min(10, 'Describe the idea').max(2000),
  category: z.enum(['FIXTURE', 'POS_IDEA', 'EXTERIOR', 'PROMO_SECTION', 'OTHER']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  sites: Array<{ id: string; name: string; code: string }>;
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.02em',
  color: 'var(--ml-text-primary)',
};

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  background: 'var(--ml-surface-panel)',
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--ml-text-primary)',
};

export function NewSubmissionForm({ sites }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      site_id: sites.length === 1 && sites[0] ? sites[0].id : '',
      category: 'FIXTURE',
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await createSubmission(values);
      if (res.ok) {
        router.push('/community');
        router.refresh();
      } else {
        setServerError(res.message);
      }
    });
  }

  const busy = isPending || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: 24,
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Field
          label="Site"
          error={errors.site_id?.message}
          htmlFor="site_id"
        >
          <select
            id="site_id"
            {...register('site_id')}
            style={{ ...inputStyle, appearance: 'auto' }}
            disabled={busy || sites.length === 1}
            defaultValue={sites.length === 1 && sites[0] ? sites[0].id : ''}
          >
            {sites.length > 1 && (
              <option value="" disabled>
                Select a site…
              </option>
            )}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Category"
          error={errors.category?.message}
          htmlFor="category"
        >
          <select
            id="category"
            {...register('category')}
            style={{ ...inputStyle, appearance: 'auto' }}
            disabled={busy}
          >
            <option value="FIXTURE">Fixture</option>
            <option value="POS_IDEA">POS idea</option>
            <option value="EXTERIOR">Exterior</option>
            <option value="PROMO_SECTION">Promo section</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      </div>

      <Field label="Title" error={errors.title?.message} htmlFor="title">
        <input
          id="title"
          {...register('title')}
          placeholder="Short and specific"
          style={inputStyle}
          disabled={busy}
        />
      </Field>

      <Field
        label="Description"
        error={errors.description?.message}
        htmlFor="description"
      >
        <textarea
          id="description"
          {...register('description')}
          rows={6}
          placeholder="What problem does this fix? What would success look like?"
          style={{
            ...inputStyle,
            height: 'auto',
            padding: 12,
            lineHeight: 1.5,
            resize: 'vertical',
          }}
          disabled={busy}
        />
      </Field>

      {serverError && (
        <div
          role="alert"
          style={{
            padding: 12,
            background: 'rgba(225, 40, 40, 0.06)',
            border: '1px solid rgba(225, 40, 40, 0.35)',
            borderRadius: 'var(--ml-radius-md)',
            fontSize: 13,
            color: 'var(--ml-red)',
          }}
        >
          {serverError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="button"
          onClick={() => router.push('/community')}
          disabled={busy}
          style={{
            height: 40,
            padding: '0 18px',
            background: 'transparent',
            color: 'var(--ml-charcoal)',
            border: '1px solid var(--ml-charcoal)',
            borderRadius: 'var(--ml-radius-md)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          style={{
            height: 40,
            padding: '0 22px',
            background: 'var(--ml-action-primary)',
            color: '#FFFFFF',
            border: 0,
            borderRadius: 'var(--ml-radius-md)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Submitting…' : 'Post to board'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--ml-red)' }}>{error}</span>
      )}
    </div>
  );
}
