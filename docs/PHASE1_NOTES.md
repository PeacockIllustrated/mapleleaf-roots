# Phase 1 build notes

A short record of what shipped in Phase 1, how to verify it, and the things
we deliberately punted to later phases. Written at the close of Phase 1 so
reviewers can get from zero to a running demo in under ten minutes.

---

## Milestone map (branches)

Each branch contains exactly one milestone. Reviewed independently, they
merge cleanly in order.

| Branch | What landed |
|---|---|
| `phase-1/m0-unblock-scaffold` | Tailwind v3 pin, `supabase/config.toml` seed path fix, migration `20260420_001` (AM INSERT, first-login trigger, quote sequence), SSR cookie types, `seed:verify` autoloading `.env.local`. |
| `phase-1/m1-auth-spine` | Magic-link login, `/auth/callback` with open-redirect guard, `(authed)` route group, AppBar shell + sign-out, RLS-scoped `/sites` landing, Vitest harness with a skippable cross-site isolation test. |
| `phase-1/m1.5-brand-polish` *(squashed into m1 branch)* | Authentic Mapleleaf SVG icon and division wordmarks wired via `/public/brand/*.svg`. |
| `phase-1/m2-sites-admin-library` | `/sites/new` (HQ + AM), `/sites/[id]` detail with classification toggles, HQ admin library views (units, POS slots, promo sections), AppBar `PrimaryNav` with role-scoped items. |
| `phase-1/m3-m4-configurator` | Zustand + immer store, Konva floor-plan stage, library rail, inspector, persistence via `placeSiteUnit` (with `site_unit_shelves` materialisation), `updateSiteUnit`, `deleteSiteUnit`. Includes `app/auth/dev/route.ts` — a dev-only token_hash bridge for local sign-in. |
| `phase-1/m5-onesign-quote-stub` | `lib/quote/types.ts` (QuotePayloadV1 Zod schema), `build-fitting-payload.ts`, `requestFittingQuote` using `next_onesign_quote_ref()`, `submitQuote` (DRAFT → SUBMITTED only), `/sites/[id]/quotes` list, `/sites/[id]/quotes/[ref]` detail with gold-gradient success toast. |
| `phase-1/m6-community-stub` | `/community` list with featured gold-gradient treatment, `/community/new` form gated to site-assigned users. |
| `phase-1/m7-tidy-up` | This file. |

Merge order is the milestone order. Each branch cleanly rebases onto its
predecessor.

---

## How to run the acceptance demo

1. Make sure migrations `20260420_000_initial_schema.sql` and
   `20260420_001_am_inserts_first_login_quote_seq.sql` are applied to your
   Supabase project, along with seeds 001–007.
2. `pnpm install`
3. Populate `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. `pnpm seed:verify` — should report six `[ OK ]` lines.
5. `pnpm typecheck` — should be silent.
6. `pnpm dev` and open `http://localhost:3000`.

### Sign in without waiting for an email

If your Supabase project hasn't yet whitelisted `localhost:3000/auth/callback`:

```bash
pnpm tsx --env-file=.env.local scripts/dev-login.ts tom@onesignanddigital.com
```

Copy the URL containing `/auth/dev?token_hash=…` (or paste the Option A
magic-link URL if your project *is* whitelisted). That route verifies the
one-time token and sets the session cookie, landing you on `/sites`. The
route 404s in production.

### Ten-step acceptance walk-through

1. **Sign in as an Area Manager (or HQ Admin for the full view).** Promote
   the profile via SQL once the first magic-link lands:
   `update public.user_profiles set role = 'AREA_MANAGER' where email = …`,
   and attach them to an area via `insert into area_manager_assignments …`.
2. **Onboard a site.** `/sites/new` → fill in code, name, area (only the
   AM's areas appear), tier, address. On submit, lands on the site detail
   page. `site_planograms` shell is created in the same flow.
3. **Open the planogram.** `/sites/[id]/planogram`. Drag 8–10 units from
   the library rail covering multiple categories (gondola, chiller, till,
   dump bin, forecourt).
4. **Tag units with promo sections.** Click a unit, use the inspector's
   chip grid. The fill colour updates immediately.
5. **Label the units.** Rename in the inspector; label saves debounced.
6. **Refresh the page.** Everything persists — shelves are materialised
   at placement time, so the data model is ready for the Phase 1.5 shelf
   visualiser.
7. **Request a fit-out quote.** Red CTA on the planogram header. Redirects
   to `/sites/[id]/quotes/[ref]` showing the `OSD-YYYY-NNNNNN` reference,
   the site metadata, and the UNIT + POS_ARTWORK line groups.
8. **Submit the quote.** Red "Submit to Onesign" button on the quote detail
   page transitions DRAFT → SUBMITTED and fires the gold-gradient toast.
9. **View the quote list.** `/sites/[id]/quotes` — the SITE_FITTING row
   gets the red left-border brand treatment.
10. **Cross-site RLS check.** Sign in as a Site Manager assigned to a
    different site (provision via SQL + site_user_assignments) and confirm
    only their site appears on `/sites`.

---

## Deliberately deferred

Everything below is out of scope for Phase 1. Links are to the agent that
owns them so the next engineer knows who to hand off to.

- **Shelf visualiser** (`configurator-ux`, Phase 1.5).
- **Campaign authoring and rollout materialisation** (`quoter-bridge` +
  `architect`, Phase 2).
- **Open Food Facts / Open Products Facts sync** (`seeder`, Phase 1.5).
- **Employee mobile PWA** (`configurator-ux` for canvas-adjacent,
  `auth-guard` for employee-scoped mutations, Phase 3).
- **Community board moderation and promotion to catalogue**
  (`seeder` + `auth-guard`, Phase 4).
- **Admin dashboard analytics** (Phase 4).
- **Onesign Portal webhook** (`quoter-bridge`, Phase 2+).
- **PDF generation for quotes** (`quoter-bridge`, Phase 2).
- **SSO** (Phase 4).
- **Dedicated test Supabase project** — the Vitest harness exists and the
  isolation test runs end-to-end when `TEST_SUPABASE_*` env vars are set.
  Phase 1 keeps the suite skipped by default so CI doesn't need a second
  Supabase project yet.

---

## Known rough edges

Things that work but a future pass should polish:

- **No Supabase-generated DB types yet.** We use hand-written row types at
  each query site. Running `pnpm db:types` against a linked project will
  generate `lib/supabase/database.types.ts`; after that, the inline row
  shapes can be replaced with `Database['public']['Tables'][…]['Row']`.
- **Server-side Supabase joins return `T | T[] | null`** on the generated
  types — we defend against both shapes via `Array.isArray` branches. A
  cleaner fix lives in the typed client pass above.
- **Dev sign-in route** (`/auth/dev`) is guarded with
  `process.env.NODE_ENV !== 'production'`. Also consider stripping it
  entirely from production bundles via a route-level `notFound()` guard
  at the file level — a belt-and-braces follow-up.
- **No Playwright smoke suite.** Phase 2 or M7+ can add one — the
  acceptance walk-through above is the target script.
- **Edge-runtime compatibility not verified.** Middleware uses
  `@supabase/ssr` which is edge-safe, but we haven't explicitly exported
  `export const runtime = 'edge'` on any route.

---

## Things the Supabase project still needs

Local dev works as-is. For the staging/production deployment:

- **Redirect URL allow-list.** Add `<domain>/auth/callback` to Supabase Auth
  → URL Configuration → Redirect URLs for each environment. Until this is
  set, magic links from the real flow (not the `/auth/dev` bridge) land
  users on the default post-verify page instead of our callback.
- **Site URL.** Set the project's Site URL to match so email templates use
  the right domain.
- **Rate limits.** Default Supabase anon rate limits are generous enough
  for launch — revisit if we see sign-in throttling.

---

## Phase 1 to Phase 2 hand-off

When you start Phase 2 (campaign authoring + rollout materialisation), the
three hooks you'll build on are:

1. `unit_type_pos_slots` with `position_label` — the materialisation query
   reads these alongside each site_unit.
2. `site_campaign_rollouts` + `rollout_install_tasks` — already schema'd;
   no schema work needed unless the install-task UX needs extra columns.
3. `onesign_quotes.linked_rollout_id` — already nullable FK on rollouts,
   ready for CAMPAIGN_PACK quotes.

The existing `build-fitting-payload` is a good template for
`build-campaign-payload`. The `quoter-bridge` agent knows the rules.
