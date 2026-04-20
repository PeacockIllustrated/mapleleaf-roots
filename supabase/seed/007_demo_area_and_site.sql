-- ============================================================================
-- Seed 007: Demo area and demo site
-- ============================================================================
-- DEVELOPMENT ONLY. This seed creates a single demo area and a single demo
-- site (Bromyard Express) for local dev and staging use. It does NOT create
-- any auth users — those must be provisioned via the app's invite flow so
-- that they exist in auth.users with proper credentials.
--
-- Safe to skip in production environments.
-- ============================================================================

-- Demo area
insert into public.areas (code, name, description)
values ('MIDLANDS_WEST', 'Midlands West', 'Demo area covering Herefordshire, Worcestershire and Shropshire')
on conflict (code) do nothing;

-- Demo site: Bromyard Express (the archetype site we've wireframed against)
insert into public.sites (
  code, name, area_id, tier,
  address_line_1, address_line_2, city, postcode,
  latitude, longitude,
  onboarding_status, opened_at
)
select
  'BROMYARD_EXPRESS',
  'Mapleleaf Express Bromyard',
  a.id,
  'MEDIUM',
  'Bromyard Road',
  null,
  'Bromyard',
  'HR7 4QP',
  52.1921,
  -2.5092,
  'ACTIVE',
  '2024-05-01'
from public.areas a
where a.code = 'MIDLANDS_WEST'
on conflict (code) do nothing;

-- Classify the demo site
insert into public.site_classifications (site_id, tag_id)
select s.id, ct.id
from public.sites s, public.classification_tags ct
where s.code = 'BROMYARD_EXPRESS'
  and ct.code in ('RURAL', 'TWENTY_FOUR_HOUR', 'ALCOHOL_LICENSED', 'COFFEE_STATION', 'HOT_FOOD_TO_GO', 'LOTTERY')
on conflict do nothing;

-- Create the site's planogram shell (empty — will be populated via the configurator)
insert into public.site_planograms (site_id, name)
select id, 'Current planogram'
from public.sites
where code = 'BROMYARD_EXPRESS'
on conflict (site_id) do nothing;
