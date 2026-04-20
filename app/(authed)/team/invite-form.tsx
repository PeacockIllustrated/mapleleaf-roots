'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { inviteSubordinate } from './actions';

type Role = 'HQ_ADMIN' | 'AREA_MANAGER' | 'SITE_MANAGER' | 'EMPLOYEE';

interface Props {
  callerRole: Role;
  allowedTargets: Role[];
  areas: Array<{ id: string; code: string; name: string }>;
  sites: Array<{ id: string; code: string; name: string }>;
}

const roleLabels: Record<Role, string> = {
  HQ_ADMIN: 'HQ Admin',
  AREA_MANAGER: 'Area Manager',
  SITE_MANAGER: 'Site Manager',
  EMPLOYEE: 'Employee',
};

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Too long'),
  full_name: z.string().min(2, 'Full name required').max(120),
  role: z.enum(['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE']),
  area_ids: z.array(z.string().uuid()).default([]),
  site_ids: z.array(z.string().uuid()).default([]),
});

type FormValues = z.infer<typeof schema>;

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

export function InviteForm({
  allowedTargets,
  areas,
  sites,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: allowedTargets[0] ?? 'EMPLOYEE',
      area_ids: [],
      site_ids: [],
    },
  });

  const role = watch('role');
  const selectedAreas = watch('area_ids') ?? [];
  const selectedSites = watch('site_ids') ?? [];

  const needsAreas = role === 'AREA_MANAGER';
  const needsSites = role === 'SITE_MANAGER' || role === 'EMPLOYEE';

  const visibleSites = useMemo(() => sites, [sites]);
  const visibleAreas = useMemo(() => areas, [areas]);

  function toggleArray(
    current: string[],
    id: string
  ): string[] {
    return current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
  }

  function generatePassword() {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 14; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    setValue('password', pw, { shouldValidate: true });
    setGeneratedPassword(pw);
  }

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await inviteSubordinate(values);
      if (res.ok) {
        reset({
          role: allowedTargets[0] ?? 'EMPLOYEE',
          area_ids: [],
          site_ids: [],
        });
        setOpen(false);
        setGeneratedPassword(null);
        router.refresh();
      } else {
        setServerError(res.message);
      }
    });
  }

  const busy = isPending || isSubmitting;

  if (!open) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            height: 40,
            padding: '0 18px',
            background: 'var(--ml-action-primary)',
            color: '#FFFFFF',
            border: 0,
            borderRadius: 'var(--ml-radius-md)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Invite someone
        </button>
      </div>
    );
  }

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
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            Invite someone
          </h2>
          <span
            style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}
          >
            Share the password with them out-of-band (Slack, SMS) — they can
            change it after signing in.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setGeneratedPassword(null);
          }}
          style={{
            background: 'transparent',
            border: 0,
            color: 'var(--ml-text-muted)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Cancel
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <Field label="Full name" error={errors.full_name?.message} htmlFor="full_name">
          <input
            id="full_name"
            {...register('full_name')}
            style={inputStyle}
            disabled={busy}
            placeholder="Jordan Lee"
          />
        </Field>
        <Field label="Email" error={errors.email?.message} htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="off"
            {...register('email')}
            style={inputStyle}
            disabled={busy}
            placeholder="jordan@mapleleaf.com"
          />
        </Field>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Field label="Role" error={errors.role?.message} htmlFor="role">
          <select
            id="role"
            {...register('role')}
            style={{ ...inputStyle, appearance: 'auto' }}
            disabled={busy}
          >
            {allowedTargets.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Temporary password"
          error={errors.password?.message}
          htmlFor="password"
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="password"
              type="text"
              autoComplete="off"
              {...register('password')}
              style={{ ...inputStyle, flex: 1 }}
              disabled={busy}
              placeholder="At least 10 characters"
            />
            <button
              type="button"
              onClick={generatePassword}
              disabled={busy}
              style={{
                height: 40,
                padding: '0 14px',
                background: 'transparent',
                color: 'var(--ml-charcoal)',
                border: '1px solid var(--ml-charcoal)',
                borderRadius: 'var(--ml-radius-md)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Generate
            </button>
          </div>
          {generatedPassword && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--ml-text-muted)',
                fontFamily:
                  'ui-monospace, "SFMono-Regular", Menlo, monospace',
              }}
            >
              Copy this to share: <strong>{generatedPassword}</strong>
            </span>
          )}
        </Field>
      </div>

      {needsAreas && (
        <Field label="Areas" htmlFor="area_ids">
          {visibleAreas.length === 0 ? (
            <span
              style={{
                fontSize: 12,
                color: 'var(--ml-text-muted)',
              }}
            >
              No areas in your scope to assign.
            </span>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 6,
              }}
            >
              {visibleAreas.map((a) => (
                <Pick
                  key={a.id}
                  label={a.name}
                  checked={selectedAreas.includes(a.id)}
                  onChange={() =>
                    setValue('area_ids', toggleArray(selectedAreas, a.id), {
                      shouldValidate: true,
                    })
                  }
                />
              ))}
            </div>
          )}
        </Field>
      )}

      {needsSites && (
        <Field label="Sites" htmlFor="site_ids">
          {visibleSites.length === 0 ? (
            <span
              style={{
                fontSize: 12,
                color: 'var(--ml-text-muted)',
              }}
            >
              No sites in your scope to assign.
            </span>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 6,
              }}
            >
              {visibleSites.map((s) => (
                <Pick
                  key={s.id}
                  label={s.name}
                  checked={selectedSites.includes(s.id)}
                  onChange={() =>
                    setValue('site_ids', toggleArray(selectedSites, s.id), {
                      shouldValidate: true,
                    })
                  }
                />
              ))}
            </div>
          )}
        </Field>
      )}

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
          {busy ? 'Creating…' : 'Send invitation'}
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

function Pick({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: checked ? 'var(--ml-charcoal)' : 'var(--ml-surface-panel)',
        color: checked ? '#FFFFFF' : 'var(--ml-text-primary)',
        border: checked
          ? '1.5px solid var(--ml-charcoal)'
          : '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition:
          'background var(--ml-motion-fast) var(--ml-ease-out), color var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          border: `1.5px solid ${checked ? '#FFFFFF' : 'var(--ml-charcoal)'}`,
          background: checked ? '#FFFFFF' : 'transparent',
          flexShrink: 0,
        }}
      />
      {label}
    </label>
  );
}
