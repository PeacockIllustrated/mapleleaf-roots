# Phase 2 prompt — Campaign System

**This is the exact prompt for Claude Code's Phase 2 sprint.** Paste the contents of this file into a fresh Claude Code session. Read `CLAUDE.md` and `PHASE1_PROMPT.md` first so you know what's already shipped.

---

## Objective

Ship a working Campaign System end-to-end: HQ Admin authors a time-bounded promotional campaign with artwork targeting specific unit types and site classifications, publishes it, and every matching site gets a materialised rollout with an Onesign print-pack quote and an install checklist their Employee works through.

Phase 2 is **Campaigns only**. Admin Dashboard network-wide reporting is Phase 2.5. Employee planogram viewer and substitution logging are Phase 3.

## Design decisions (locked)

These are settled before coding — don't relitigate them:

- **Targeting.** Campaigns target **unit types** + **site classification tags** (AND semantics). No individual-unit targeting, no OR-of-tags in v1.
- **Asset model.** One artwork per `(campaign, pos_slot_type)`. No site-specific variants — if HQ needs a Scottish-only variant, that's a second campaign with a different classification target.
- **Lifecycle.** `campaigns.status`: `DRAFT → PUBLISHED → CLOSED`. Publishing is a one-way door — artwork and targets are immutable once published.
- **Publish triggers materialisation.** Clicking Publish runs rollout materialisation synchronously: for each matching site, insert a `site_campaign_rollouts` row, create install tasks, and auto-generate one Onesign print-pack quote per site aggregating every POS item needed.
- **No cron auto-start.** HQ controls the moment of impact via the Publish button. No scheduled auto-publish.
- **Install proof is optional.** An Employee marking a task complete can optionally attach a photo. Required-proof is HQ-configurable in a later phase.
- **Overlapping campaigns.** If two published campaigns both target the same `(site_unit, pos_slot_type)` within the same date window, latest-published wins visually but both rollouts exist. HQ sees a warning modal at publish time listing the conflicts so they can close the earlier campaign first if they want.
- **POS issue handoff.** Missing/damaged install packs flow into the existing `pos_material_requests` table via the existing flow. No duplicate redelivery mechanism.
- **Artwork storage.** Supabase Storage bucket `campaign-assets/` with RLS-gated downloads (HQ write, authed read). No external hosting.
- **Site Managers cannot refuse a rollout.** Complaints go in the rollout's `notes` column; HQ reviews via the admin dashboard.

## Deliverables (definition of done)

**Schema**
- [ ] One migration adds five tables: `campaigns`, `campaign_assets`, `campaign_targets`, `campaign_classification_targets`, `site_campaign_rollouts`, `rollout_install_tasks`
- [ ] New enum `campaign_status` with values `DRAFT, PUBLISHED, CLOSED`
- [ ] New enum `rollout_status` with values `SCHEDULED, INSTALLING, COMPLETE`
- [ ] New enum `install_task_status` with values `PENDING, COMPLETE`
- [ ] RLS on every new table:
   - Read: `HQ_ADMIN` sees everything; `AREA_MANAGER` sees rollouts + tasks for sites in their area; `SITE_MANAGER` + `EMPLOYEE` see rollouts + tasks for their assigned sites
   - Write: `HQ_ADMIN` writes campaigns + assets + targets; Employees only `UPDATE rollout_install_tasks` rows belonging to their assigned site (status + photo fields only)
- [ ] Supabase Storage bucket `campaign-assets` created via migration with RLS policies mirroring the above (HQ Admin write, authed read)
- [ ] Triggers: `updated_at` on every new table; a trigger that flips `site_campaign_rollouts.status` to `INSTALLING` when the first task moves to `COMPLETE`, and to `COMPLETE` when every task is `COMPLETE`

**HQ campaign authoring (`/admin/campaigns`)**
- [ ] List page with columns: code, name, date range, status, target unit types, matching sites count
- [ ] "New campaign" creates a `DRAFT` with code, name, description, start_date, end_date
- [ ] Campaign detail page has four sections:
   1. **Basics** — name, description, dates (editable while DRAFT)
   2. **Targets** — multi-select unit types, multi-select classification tags (AND). Live preview of matching sites count
   3. **Assets** — one uploader per `pos_slot_type` used by any target unit type. Each uploader accepts a single PDF/PNG/JPG, stored to `campaign-assets/{campaign_id}/{pos_slot_type_code}.{ext}`
   4. **Publish** — checklist gate (all required assets uploaded, at least one target, start_date in future) → warning modal listing any site/slot conflicts with existing PUBLISHED campaigns → confirm → materialisation
- [ ] Publish action: validates, finds matching sites, inserts rollout + tasks + quote per site, transitions campaign to PUBLISHED
- [ ] Matching-sites calculation lives in a SQL function `public.campaign_matching_sites(campaign_id uuid)` so the preview and the publish logic agree
- [ ] Close action on a PUBLISHED campaign sets `status = CLOSED` and cascades no further

**Per-site rollout (`/sites/[id]/rollouts/[rolloutId]`)**
- [ ] Site Manager sees: campaign name, dates, status, linked Onesign quote reference, list of install tasks grouped by unit, completion progress bar
- [ ] Notes field the Site Manager can edit at any time
- [ ] Link to the print-pack PDF (generated on demand from the rollout + assets)

**Employee install checklist (`/sites/[id]/rollouts/[rolloutId]/install`)**
- [ ] Tab-navigable list of tasks grouped by unit, each with the POS position, the artwork thumbnail, and a "Mark complete" button
- [ ] Optional photo upload on completion (stored in `campaign-assets/proofs/{task_id}.jpg`)
- [ ] "Report issue" button on a task spawns a `pos_material_requests` row via existing flow (reason defaults to `MISSING`)
- [ ] Completion timestamp + completed_by persist to `rollout_install_tasks`
- [ ] Progress bar updates live as tasks complete

**Print pack PDF**
- [ ] `@react-pdf/renderer` renders a PDF bundled per site:
   - Cover: site name + campaign name + date range + install deadline
   - Floor plan thumbnail with every target unit highlighted
   - One page per install task: unit elevation silhouette with the POS position marked, plus the artwork scaled to actual print dimensions for positioning reference
   - Packing slip: complete list of POS items required and their paper sizes
- [ ] PDF accessible via `/sites/[id]/rollouts/[rolloutId]/print-pack.pdf` (Server Component route handler)

**Onesign quote integration**
- [ ] Each materialised rollout creates one `onesign_quotes` row with:
   - `quote_type = CAMPAIGN_PACK` (new enum value if not present)
   - `quote_ref = OSD-YYYY-NNNNNN` via existing sequence
   - `payload` JSON listing every POS item (pos_slot_type_code, quantity, artwork_url, material, dimensions)
   - Status `SUBMITTED` on creation (HQ publishing = HQ committing; no DRAFT step for campaign quotes)
- [ ] Quote appears in `/sites/[id]/quotes`

**Visual and tone**
- [ ] All new pages use Poppins and brand tokens — no inline hex
- [ ] Campaign status badges: DRAFT charcoal, PUBLISHED red, CLOSED muted grey
- [ ] Rollout status badges: SCHEDULED charcoal, INSTALLING red-accent, COMPLETE gold-accent
- [ ] The gold gradient appears on: campaign publish success toast; rollout complete celebration. Nowhere else.

**Tests**
- [ ] RLS test: Employee from site A cannot update tasks on site B's rollout
- [ ] Idempotency test: publishing the same campaign twice does not double-materialise (should be guarded by campaign status check)
- [ ] Matching-sites function test: covers unit_type filter, tag filter, AND combination, empty results

## Explicit out of scope

- Campaign analytics / sell-through reporting (Phase 2.5 admin dashboard)
- Required-proof photo workflows (Phase 3)
- Scheduled auto-publish (never, unless explicitly re-scoped)
- Site-manager refusal / approval workflow (never — HQ is authoritative)
- Per-site artwork variants (deliberately excluded — use multiple campaigns)
- Campaign cloning / templates (Phase 2.5)
- Multi-language asset variants (Phase 4+)
- Email notifications on publish (Phase 2.5 via Resend)
- Employee planogram viewer (Phase 3)
- Substitution logging UI (Phase 3 — `slot_activity_log` already in schema, unused)

## Suggested file structure

```
supabase/migrations/
└── 20260422_008_campaigns.sql                  # All five tables + enums + RLS + storage bucket

app/(authed)/
├── admin/
│   └── campaigns/
│       ├── page.tsx                            # List
│       ├── new/page.tsx                        # Create form
│       └── [id]/
│           ├── page.tsx                        # Detail (Basics + Targets + Assets + Publish)
│           ├── campaign-detail-client.tsx      # Client orchestrator for the four tabs
│           └── publish-dialog.tsx              # Conflict warning + confirm
└── sites/[id]/rollouts/
    ├── page.tsx                                # List of rollouts for this site
    └── [rolloutId]/
        ├── page.tsx                            # Site Manager summary
        ├── install/page.tsx                    # Employee checklist
        ├── install-client.tsx                  # Task completion UI
        └── print-pack.pdf/route.ts             # On-demand PDF generation

components/brand/
├── CampaignStatusBadge.tsx
├── RolloutStatusBadge.tsx
└── TaskProgressBar.tsx

lib/campaigns/
├── types.ts                                    # Campaign, Rollout, Task types
├── actions.ts                                  # Server actions: createCampaign, addTarget, uploadAsset, publishCampaign, markTaskComplete, closeCampaign
├── materialise.ts                              # publishCampaign calls this — pure function builds rollout + tasks + quote payload
├── matching-sites.ts                           # Wrapper over public.campaign_matching_sites SQL function
└── print-pack/
    ├── build-payload.ts                        # Rollout + tasks → PDF-ready payload
    ├── CoverPage.tsx
    ├── FloorPlanPage.tsx
    ├── TaskPage.tsx
    └── PackingSlip.tsx
```

## How to work

1. Start by reading `CLAUDE.md`, `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, and this file in full
2. Use the sub-agents in `.claude/agents/`:
   - `architect` — when the publish → materialisation flow touches quote, storage, and new tables in one shot
   - `schema-warden` — before the migration lands
   - `auth-guard` — every RLS policy on the five new tables gets reviewed
   - `quoter-bridge` — the campaign-pack quote payload
   - `configurator-ux` — the campaign detail page's asset uploader and target multi-select
3. Branch naming: `phase-2/short-description` (e.g. `phase-2/campaigns-schema`, `phase-2/hq-authoring`, `phase-2/publish-materialisation`)
4. Small commits. Typecheck clean before every push.
5. When you hit a design question this prompt doesn't answer, stop and ask — don't guess.

## Acceptance demo

At the end, demo this flow to confirm Phase 2 is done:

1. Log in as HQ Admin
2. Create a new campaign "Summer BBQ 2026" with dates 2026-06-01 → 2026-07-15
3. Add targets: unit types `GONDOLA_AISLE_1000` + `CHILLER_MULTIDECK_1875`, classification tag `ALCOHOL_LICENSED`
4. Matching-sites preview shows the expected count (at least the demo Bromyard site)
5. Upload one artwork per `pos_slot_type` used by those unit types
6. Click Publish — conflict modal appears empty (no overlaps), confirm → campaign moves to PUBLISHED
7. Navigate to `/sites/[bromyard_id]/rollouts` — new rollout is visible with SCHEDULED status
8. Open the rollout — Onesign quote `OSD-2026-NNNNNN` is linked, install tasks are listed grouped by unit
9. Download the print pack PDF — cover page, floor plan thumbnail, one task page per POS install, packing slip
10. Log out, log in as the Bromyard Employee
11. Open the install checklist, mark three tasks complete (one with a photo proof)
12. Rollout status flips to INSTALLING (auto via trigger)
13. Mark all remaining tasks complete — rollout flips to COMPLETE, gold toast fires
14. Log out, log in as an Area Manager for a different area — that area's sites don't see this rollout (RLS holds)

If all fourteen steps pass, Phase 2 is done.
