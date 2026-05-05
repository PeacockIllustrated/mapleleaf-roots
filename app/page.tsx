import { createServerClient } from '@/lib/supabase/server';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  Hero,
  Challenge,
  Positioning,
  Family,
  Roles,
  Capabilities,
  ConfiguratorSection,
  PlanogramSection,
  CampaignSystem,
  Roadmap,
  Stack,
  Closing,
} from '@/components/marketing/sections';

/**
 * Root marketing landing.
 *
 * Public — anyone can view. Authenticated visitors see "Open dashboard"
 * instead of "Sign in". Layout intentionally bypasses the (authed) sidenav
 * shell so the page reads like a brochure.
 */
export const metadata = {
  title: 'Roots — One platform for every forecourt in the network.',
  description:
    'Mapleleaf Roots is the bespoke operations platform for the Mapleleaf franchise network — fit-out, planogram, campaigns. Project overview brochure for leadership review.',
};

export default async function RootPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  return (
    <div style={{ background: 'var(--ml-off-white)', minHeight: '100vh' }}>
      <MarketingHeader isAuthed={isAuthed} />
      <main>
        <Hero isAuthed={isAuthed} />
        <Challenge />
        <Positioning />
        <Family />
        <Roles />
        <Capabilities />
        <ConfiguratorSection />
        <PlanogramSection />
        <CampaignSystem />
        <Roadmap />
        <Stack />
        <Closing isAuthed={isAuthed} />
      </main>
      <MarketingFooter />
    </div>
  );
}
