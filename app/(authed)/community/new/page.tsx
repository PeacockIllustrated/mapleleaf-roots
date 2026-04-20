import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { NewSubmissionForm } from './new-submission-form';

type AssignedSite = { id: string; name: string; code: string };

export default async function NewSubmissionPage() {
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  const { data } = await supabase
    .from('site_user_assignments')
    .select('site:sites ( id, name, code )')
    .eq('user_id', profile.id);

  const sites = ((data ?? []) as unknown as Array<{
    site: AssignedSite | AssignedSite[] | null;
  }>)
    .flatMap((r) =>
      r.site ? (Array.isArray(r.site) ? r.site : [r.site]) : []
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (sites.length === 0) {
    redirect('/community');
  }

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 640,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link
          href="/community"
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          ← Community board
        </Link>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--ml-text-primary)',
          }}
        >
          Share an idea
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
          HQ reads every submission. Focus on the problem and the practical
          fix — specifics help.
        </p>
      </div>

      <NewSubmissionForm sites={sites} />
    </section>
  );
}
