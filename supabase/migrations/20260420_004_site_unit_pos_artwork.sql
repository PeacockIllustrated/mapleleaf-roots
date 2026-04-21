-- ============================================================================
-- Mapleleaf Roots — Per-site POS artwork assignments
-- Migration: 20260420_004_site_unit_pos_artwork
-- ============================================================================
-- Today a unit type's POS positions (unit_type_pos_slots) define "there's a
-- header board here, a shelf strip there" — what they hold is the campaign
-- (Phase 2) or a site-manager's choice. This table captures the latter.
--
-- Each row pairs a site_unit with one of its unit_type_pos_slots and
-- records the artwork the site manager has designated to live there:
-- either a URL to the final print-ready file or a free-text note for the
-- HQ designer. Lives alongside pos_material_requests — one is "what should
-- be there", the other is "what went wrong with what's there".
-- ============================================================================

create table if not exists public.site_unit_pos_artwork (
  id uuid primary key default gen_random_uuid(),
  site_unit_id uuid not null references public.site_units(id) on delete cascade,
  unit_type_pos_slot_id uuid not null references public.unit_type_pos_slots(id) on delete restrict,
  artwork_url text,
  notes text,
  set_by uuid references public.user_profiles(id) on delete set null,
  set_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_unit_id, unit_type_pos_slot_id)
);

drop trigger if exists site_unit_pos_artwork_updated on public.site_unit_pos_artwork;
create trigger site_unit_pos_artwork_updated
  before update on public.site_unit_pos_artwork
  for each row execute function public.trg_set_updated_at();

create index if not exists idx_supa_site_unit
  on public.site_unit_pos_artwork(site_unit_id);

alter table public.site_unit_pos_artwork enable row level security;

drop policy if exists supa_read on public.site_unit_pos_artwork;
create policy supa_read on public.site_unit_pos_artwork for select using (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where sp.site_id in (select public.accessible_site_ids())
  )
);

drop policy if exists supa_write on public.site_unit_pos_artwork;
create policy supa_write on public.site_unit_pos_artwork for all using (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (
         public.current_user_role() = 'SITE_MANAGER'
         and public.assigned_to_site(sp.site_id)
       )
  )
) with check (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (
         public.current_user_role() = 'SITE_MANAGER'
         and public.assigned_to_site(sp.site_id)
       )
  )
);

-- ============================================================================
-- End of migration 20260420_004
-- ============================================================================
