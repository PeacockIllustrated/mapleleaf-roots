'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSite } from '../actions';

const schema = z.object({
  code: z
    .string()
    .min(3, 'At least 3 characters')
    .max(64)
    .regex(
      /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
      'UPPERCASE letters, numbers, underscores'
    ),
  name: z.string().min(2, 'Name is required').max(120),
  area_id: z.string().uuid('Select an area'),
  tier: z.enum(['SMALL', 'MEDIUM', 'LARGE']),
  address_line_1: z.string().max(160).optional(),
  address_line_2: z.string().max(160).optional(),
  city: z.string().max(80).optional(),
  postcode: z.string().max(16).optional(),
});

type FormValues = z.infer<typeof schema>;

interface NewSiteFormProps {
  areas: Array<{ id: string; code: string; name: string }>;
}

const fieldStyles: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  fontFamily: 'inherit',
  fontSize: 14,
  background: 'var(--ml-surface-panel)',
  color: 'var(--ml-text-primary)',
};

const labelStyles: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--ml-text-primary)',
  letterSpacing: '0.02em',
};

const fieldGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

export function NewSiteForm({ areas }: NewSiteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tier: 'MEDIUM' },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createSite(values);
      if (result.ok) {
        router.push(`/sites/${result.siteId}`);
        router.refresh();
      } else {
        setServerError(result.message);
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
        gap: 20,
        padding: 24,
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <div style={fieldGroupStyles}>
          <label htmlFor="name" style={labelStyles}>
            Site name
          </label>
          <input
            id="name"
            {...register('name')}
            placeholder="Mapleleaf Express Bromyard"
            style={fieldStyles}
            disabled={busy}
          />
          {errors.name && (
            <span style={errorMsg}>{errors.name.message}</span>
          )}
        </div>

        <div style={fieldGroupStyles}>
          <label htmlFor="code" style={labelStyles}>
            Site code
          </label>
          <input
            id="code"
            {...register('code')}
            placeholder="BROMYARD_EXPRESS"
            style={{ ...fieldStyles, textTransform: 'uppercase' }}
            disabled={busy}
          />
          {errors.code && (
            <span style={errorMsg}>{errors.code.message}</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
        }}
      >
        <div style={fieldGroupStyles}>
          <label htmlFor="area_id" style={labelStyles}>
            Area
          </label>
          <select
            id="area_id"
            {...register('area_id')}
            style={{ ...fieldStyles, appearance: 'auto' }}
            disabled={busy}
            defaultValue=""
          >
            <option value="" disabled>
              Select an area…
            </option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.area_id && (
            <span style={errorMsg}>{errors.area_id.message}</span>
          )}
        </div>

        <div style={fieldGroupStyles}>
          <label htmlFor="tier" style={labelStyles}>
            Tier
          </label>
          <select
            id="tier"
            {...register('tier')}
            style={{ ...fieldStyles, appearance: 'auto' }}
            disabled={busy}
          >
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </select>
          {errors.tier && (
            <span style={errorMsg}>{errors.tier.message}</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <div style={fieldGroupStyles}>
          <label htmlFor="address_line_1" style={labelStyles}>
            Address line 1
          </label>
          <input
            id="address_line_1"
            {...register('address_line_1')}
            placeholder="Bromyard Road"
            style={fieldStyles}
            disabled={busy}
          />
        </div>

        <div style={fieldGroupStyles}>
          <label htmlFor="address_line_2" style={labelStyles}>
            Address line 2
          </label>
          <input
            id="address_line_2"
            {...register('address_line_2')}
            style={fieldStyles}
            disabled={busy}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
        }}
      >
        <div style={fieldGroupStyles}>
          <label htmlFor="city" style={labelStyles}>
            City
          </label>
          <input
            id="city"
            {...register('city')}
            placeholder="Bromyard"
            style={fieldStyles}
            disabled={busy}
          />
        </div>

        <div style={fieldGroupStyles}>
          <label htmlFor="postcode" style={labelStyles}>
            Postcode
          </label>
          <input
            id="postcode"
            {...register('postcode')}
            placeholder="HR7 4QP"
            style={{ ...fieldStyles, textTransform: 'uppercase' }}
            disabled={busy}
          />
        </div>
      </div>

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
          onClick={() => router.push('/sites')}
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
          {busy ? 'Creating…' : 'Create site'}
        </button>
      </div>
    </form>
  );
}

const errorMsg: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--ml-red)',
};
