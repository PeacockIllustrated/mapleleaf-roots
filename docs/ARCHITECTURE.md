# Architecture — Mapleleaf Roots

How the app is organised, how data flows through it, and why. If this document and the code disagree, update one or the other — don't leave them out of sync.

---

## Modules

Roots has five app-level modules, each with clear ownership and limited coupling:

| Module | Surfaces | Primary DB tables | Primary consumer |
|---|---|---|---|
| **Auth and hierarchy** | `/login`, user menu | `user_profiles`, `areas`, `area_manager_assignments`, `site_user_assignments` | Everyone |
| **Site onboarding** | `/sites`, `/sites/new`, `/sites/[id]` | `sites`, `classification_tags`, `site_classifications`, `site_planograms` | HQ Admin, Area Manager |
| **Configurator** | `/sites/[id]/planogram` | `site_units`, `site_unit_shelves`, `site_unit_slots` (reads unit library) | Site Manager, Area Manager |
| **Campaign & rollout** | `/campaigns`, `/sites/[id]/rollouts` | `campaigns`, `campaign_artwork`, `site_campaign_rollouts`, `rollout_install_tasks` | HQ Admin, Site Manager, Employee |
| **Catalogue & community** | `/admin/library/*`, `/community` | `unit_types`, `pos_slot_types`, `promo_sections`, `products`, `community_submissions` | HQ Admin (library), all (community) |

The Onesign quote bridge (`onesign_quotes`) is cross-cutting — Configurator creates fitting quotes, Campaign module creates rollout quotes.

---

## Rendering model

Next.js App Router with the following rendering decisions:

- **Server components by default.** Most list views, detail pages, and admin surfaces are server-rendered.
- **Client components only for interactivity.** The floor plan canvas (Konva) is client-only. Form inputs, drag-drop surfaces, real-time presence are client-only.
- **Server Actions for mutations.** Every write goes through a Server Action that validates input with Zod and makes the RLS call using the authenticated session. No `fetch('/api/...')` from components for mutations.
- **API routes only for external integrations.** The Onesign webhook (Phase 2+) and any future public-facing endpoints.

### Pattern: page → server action → DB

```
app/sites/[id]/planogram/page.tsx             (server component, fetches initial state)
  └── components/configurator/FloorPlanCanvas.tsx   (client component, Konva)
         └── app/sites/[id]/planogram/actions.ts     (server actions: createUnit, moveUnit, etc.)
                └── lib/supabase/server.ts            (RLS-scoped client)
```

---

## Auth flow

1. User visits any page
2. Middleware (`middleware.ts`) checks for a valid Supabase session cookie
3. If no session and the page is not `/login` or public → redirect to `/login`
4. Login page shows email input; submits to Supabase Auth for magic link
5. Magic link redirects to `/auth/callback` which exchanges the code for a session
6. On first login, a trigger in the DB ensures a `user_profiles` row exists (or the callback creates one defensively)
7. User is routed to `/sites`

### Session handling in server components

```ts
import { createServerClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // queries from here on use the user's RLS context
}
```

### Role enforcement

Page-level role checks happen in server components using a `requireRole` helper:

```ts
await requireRole(['HQ_ADMIN']);  // throws → 404 if not HQ
```

RLS is the hard enforcement — `requireRole` is a UX safeguard to render "not authorised" pages rather than empty data.

---

## Data flow: Creating a fit-out quote

This is the canonical complex flow. Understand this and the rest of the app's data patterns will feel familiar.

```
1. User drags units onto the floor plan
   → FloorPlanCanvas (client) updates local Zustand state
   → Debounced action calls `saveSiteUnit(planogramId, unitData)` server action
   → Server action inserts into `site_units`, and `site_unit_shelves` from defaults
   → Server action returns the new site_unit; client updates Zustand

2. User clicks "Request fit-out quote"
   → `buildQuotePayload(siteId)` runs on the server:
     a. Fetches all site_units for this site with their unit_types joined
     b. For each site_unit, joins unit_type_pos_slots to count POS slots needed
     c. Assembles a JSON payload: site info + line items
   → `createQuote(siteId, 'SITE_FITTING', payload)` server action:
     a. Generates next quote_ref via a sequence
     b. Inserts into onesign_quotes with status='DRAFT'
     c. Returns the quote_ref

3. User reviews the quote at /sites/[id]/quotes/[quote_ref]
   → If correct, clicks "Submit to Onesign"
   → `submitQuote(quote_ref)` server action updates status to SUBMITTED
   → (Phase 2+) A webhook fires to the Onesign Portal with the full payload
```

The payload shape is defined in `lib/quote/types.ts` and versioned via a `payload_version` field. The Onesign Portal is responsible for interpreting it.

---

## Data flow: Campaign rollout materialisation

HQ authors a campaign once; Roots fans it out to every matching site automatically.

```
1. HQ Admin creates a campaign:
   - Sets name, dates, description
   - Selects target unit_types (e.g., "all CHILL_MULTIDECK_1250")
   - Optionally narrows by promo section
   - Uploads artwork per (unit_type × pos_slot_type)

2. HQ Admin clicks "Schedule rollout"
   → `materialiseRollouts(campaignId)` server action runs:
     a. Finds all sites with at least one matching site_unit
     b. For each site, creates a site_campaign_rollouts row (status='PENDING')
     c. For each site_unit matching the campaign's targets, creates
        rollout_install_tasks — one per POS position that has artwork
   → Campaign status → SCHEDULED

3. On the campaign's start date, a daily cron job:
   → Updates matching rollouts: PENDING → QUOTED
   → Optionally triggers Onesign quote creation for the campaign pack
   → Once quote is approved and shipped, status → SHIPPED (via Onesign webhook)

4. On arrival, Site Manager marks rollout as INSTALLING
   → Employees see the task list in the mobile app (Phase 3)
   → Each task is picked up, executed, and marked DONE with optional photo
   → When all tasks are DONE or PROBLEM, rollout status → INSTALLED or PROBLEM
```

The materialisation job is idempotent — running it twice on the same campaign doesn't create duplicate tasks. We use UPSERT on a unique constraint covering (rollout_id, site_unit_id, campaign_artwork_id, pos_position_label).

---

## File layout

```
app/                        # Next.js App Router
├── (marketing)/            # Public pages (not auth-gated) — future
├── (authed)/               # Auth-gated pages — route group
│   ├── layout.tsx          # Auth shell (app bar, user menu, sidebar)
│   ├── sites/
│   ├── campaigns/
│   ├── admin/
│   └── community/
├── login/                  # Unauthed
├── auth/callback/          # Magic-link landing
├── api/                    # API routes (webhooks only)
└── globals.css             # Brand tokens, Tailwind directives

components/
├── brand/                  # Mapleleaf-specific (MapleleafIcon, Wordmark, AppBar)
├── configurator/           # Floor plan canvas and related
├── planogram/              # Shelf visualiser (Phase 1.5)
├── campaign/               # Campaign authoring, artwork uploader
├── rollout/                # Rollout status, task list
├── community/              # Submission forms, moderation
├── data/                   # Tables, list views
└── ui/                     # shadcn primitives, themed

lib/
├── supabase/               # Client factories (browser + server variants)
├── tokens/                 # Brand design tokens (TS + CSS export)
├── validators/             # Zod schemas for all server action inputs
├── quote/                  # Quote payload builders and types
├── rollout/                # Materialisation logic
└── log.ts                  # Structured logger

supabase/
├── migrations/             # Versioned SQL
└── seed/                   # Reference data
```

---

## State management

Client state is minimal. Server is the source of truth.

- **Zustand** for ephemeral UI state (floor plan drag position, inspector open/closed, form drafts)
- **React Query / SWR** — not used. Server Components handle data fetching; Server Actions handle mutations and invalidate via `revalidatePath`.
- **localStorage / sessionStorage** — not used for domain data. Only used for user preferences (collapsed sidebar state, theme preference) that the user wouldn't miss if they cleared their browser.

---

## Testing approach

Phase 1 aims for:
- **Unit tests** for Zod validators, quote payload builders, rollout materialisation logic — pure functions with clear inputs/outputs
- **RLS integration tests** — a small suite that spins up a test Supabase instance, seeds two users in two different areas, and asserts that user A cannot see user B's site data. Non-negotiable.
- **End-to-end tests** — deferred to Phase 2. Playwright against a staging Supabase instance for the canonical flows (onboard site, request quote, complete rollout).

Don't write tests to chase coverage numbers. Write tests for the things that break the app if they break: RLS, mutations, and payload serialisation.

---

## Environments

| Env | Supabase | Domain | Use |
|---|---|---|---|
| Local | `supabase start` | `localhost:3000` | Dev loop |
| Staging | Cloud project `roots-staging` | `roots-staging.vercel.app` | Internal review, client demo |
| Production | Cloud project `roots-prod` | `roots.mapleleafpetroleum.com` | Live |

Migrations are applied to staging first via `supabase db push`, reviewed, then applied to prod with the same command. Never apply untested migrations to prod.

---

## What we don't do

- **No microservices.** Monolith for now. If/when we split, start with the Onesign webhook handler.
- **No serverless background jobs in Phase 1.** The campaign materialisation is a Server Action triggered by HQ. Cron-style jobs come in Phase 2 when needed.
- **No GraphQL.** Supabase's generated REST + PostgREST is enough. We write Server Actions on top, not GraphQL resolvers.
- **No caching layer.** Postgres + Next.js fetch cache is enough until proven otherwise.
- **No event sourcing.** The activity log is append-only but we don't reconstruct state from it — it's for audit, not for truth. Truth is the current-state columns.
