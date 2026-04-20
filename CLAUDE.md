# Mapleleaf Roots

**Franchise operations platform for Mapleleaf Petroleum Group.**

Roots is a bespoke enterprise application serving Mapleleaf's forecourt franchise network across the UK. It handles the full lifecycle of a franchise site — from initial fit-out through day-to-day operations to network-wide promotional campaign rollouts.

This document is the source of truth for every decision in this codebase. Read it in full before making significant changes. Other documents (schema, brand, architecture, glossary) go deeper on specific areas and are referenced from here.

---

## What Roots does

Roots has three primary modules and two supporting ones:

1. **Store Fitting Configurator** — franchisees onboard new sites by composing their shop floor from a library of standard units (gondolas, chillers, till counters, etc.), triggering an Onesign quote for all required signage and fixtures.
2. **Planogram Management** — per-site shelf-level visibility into every product slot, with main / substitute A / substitute B product configuration per slot, employee substitution logging, and real-time stocking status.
3. **Campaign System** — HQ-authored promotional campaigns targeting unit types, automatically rolled out per site with generated print packs and staff install checklists.
4. **Admin Dashboard** (supporting) — Mapleleaf HQ view of network-wide compliance, rollout status, substitution trends, and site performance.
5. **Community Board** (supporting) — franchisee-submitted product suggestions and fit-out ideas, with HQ moderation and promotion into the catalogue.

---

## Who uses Roots

Four user roles in strict hierarchy:

| Role | Scope | Primary actions |
|---|---|---|
| **HQ Admin** | Entire network | Author templates, create campaigns, manage product catalogue, moderate community board, run reports |
| **Area Manager** | Multiple sites in a geographic area | Onboard new sites, approve deviations, view compliance, review local campaigns |
| **Site Manager** | One site | Modify site planogram within HQ rails, confirm campaign installs, manage site staff, approve substitution escalations |
| **Employee** | One site, task-level access | Log substitutions, install POS during changeovers, report problems, confirm restocks |

Roots also serves as Mapleleaf HQ's operational window into the entire franchise network. Claude Code should never introduce a feature that bypasses this hierarchy.

---

## Product family context

Roots is the fourth product in the Mapleleaf brand family:

- **Mapleleaf Petroleum** — the fuel operation (totems, tankers, forecourt branding)
- **Mapleleaf Express** — the convenience shop brand
- **Mapleleaf Automotive** — the workshop / repair operation
- **Mapleleaf Roots** — the operations platform (this app)

The brand pack in `docs/BRAND.md` is the source of truth for all visual identity decisions. The non-negotiable rule: *Mapleleaf Red is NEVER used on division wordmarks (Petroleum, Express, Automotive, Roots) — only on "Mapleleaf" itself.* Breaking this rule breaks brand consistency across all Mapleleaf signage.

---

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components + streaming, matches Onesign Portal stack |
| Language | TypeScript, strict mode | No `any` without justification in a comment |
| Database | Supabase (dedicated project) | Isolated from other Onesign client DBs; PostgreSQL + RLS + Storage |
| Auth | Supabase Auth | Email/magic-link for Phase 1; SSO consideration for Phase 4 |
| Client state | Zustand + immer | Matches Benchmarx and Halman Thompson patterns |
| Styling | Tailwind 4 + CSS custom properties | Brand tokens as CSS vars, Tailwind for layout |
| UI primitives | shadcn/ui | Themed to Mapleleaf brand in `components/ui` |
| Floor plan canvas | Konva.js via react-konva | 2D drag-drop with transform/rotate, survives large unit rosters |
| Shelf visualiser | SVG (no library) | Lightweight, pixel-perfect, React-native |
| PDF generation | @react-pdf/renderer | Onesign quote PDFs |
| Email | Resend | Transactional only (invites, rollout notifications) |
| Product data | Open Food Facts + Open Products Facts | Nightly sync via `lib/seeds/off-sync.ts` |
| Deployment | Vercel | Under `roots.mapleleafpetroleum.com` (subdomain via Wix DNS CNAME) |
| Mobile (Phase 3) | PWA via next-pwa | Add-to-home-screen, service-worker offline support |

**Stack non-negotiables:**
- No localStorage/sessionStorage for domain data — Supabase is the source of truth
- No client-side-only state for anything a Manager or HQ Admin needs to see
- No secrets in client bundles — use Server Actions or API routes for anything touching service_role keys

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `site-unit-card.tsx` |
| React components | PascalCase | `SiteUnitCard` |
| Hooks | camelCase with `use` prefix | `useActiveCampaign` |
| DB tables | snake_case, plural | `site_units`, `campaigns` |
| DB columns | snake_case | `created_at`, `promo_section_id` |
| Enum values | SCREAMING_SNAKE | `'GONDOLA_AISLE_1000'` |
| Quote refs | `OSD-YYYY-NNNNNN` | `OSD-2026-001247` (matches existing Onesign Portal) |
| Branch names | `phase-N/short-description` | `phase-1/floor-plan-configurator` |

---

## Directory structure

```
mapleleaf-roots/
├── CLAUDE.md                    # This file
├── PHASE1_PROMPT.md             # First sprint scope for Claude Code
├── README.md                    # Setup instructions for the human
├── docs/
│   ├── GLOSSARY.md              # Every domain term and its precise meaning
│   ├── SCHEMA.md                # Entity relationships, diagrams, rationale
│   ├── BRAND.md                 # Visual identity rules, Mapleleaf brand system
│   └── ARCHITECTURE.md          # Module boundaries, data flow, auth model
├── supabase/
│   ├── migrations/              # Versioned, run in order
│   └── seed/                    # Reference data for unit library, promo sections etc.
├── app/                         # Next.js App Router pages
├── components/
│   ├── brand/                   # Mapleleaf-specific components
│   └── ui/                      # shadcn primitives themed to brand
├── lib/
│   ├── supabase/                # Client/server factories
│   └── tokens/                  # Brand design tokens (TypeScript + CSS)
├── public/brand/                # Logo assets
└── .claude/agents/              # Sub-agent definitions for Claude Code
```

---

## Non-negotiables

These are hard rules. Breaking them requires explicit human sign-off.

**Brand rules**
- Mapleleaf Red (`#E12828`) never appears on division wordmarks
- Gold gradient is reserved for premium moments only (quote approvals, campaign-complete celebrations, success states in PDF exports) — not for regular UI accents
- Poppins is the one and only UI typeface — no exceptions for "just this one screen"

**Data rules**
- Every table has `created_at`, `updated_at` timestamps with triggers
- Every user-visible table has RLS enabled — default-deny policy, explicit allow
- No raw hex colours in component code — always reference CSS custom properties from `lib/tokens/brand.ts`
- All UUIDs generated via `gen_random_uuid()` from pgcrypto — never client-generated

**Access rules**
- Employees can write to `slot_activity_log` and `rollout_install_tasks` only — nothing else
- Site Managers can modify their site's `site_units` and `site_unit_slots` but never `unit_types` or `promo_sections`
- Area Managers have read access across their area's sites; write access only to `site_campaign_rollouts` status transitions
- HQ Admin is the only role allowed to write to template tables (`unit_types`, `promo_sections`, `campaigns`)

**Quality rules**
- No `console.log` in committed code — use proper logging via `lib/log.ts`
- No `TODO` comments without a linked GitHub issue
- Server components by default; client components only when interactivity demands it (annotated with `'use client'`)
- No `any` type without a comment explaining why
- Every Server Action validates input with Zod before touching the DB

---

## Glossary (abbreviated)

The full glossary is in `docs/GLOSSARY.md`. Quick reference for the most-used terms:

- **Site** — a physical franchise location (e.g., Bromyard Express)
- **Unit** — a physical furniture item (gondola bay, chiller, till counter) placed in a site
- **Unit type** — an entry in the master library (`GONDOLA_AISLE_1000`, `CHILLER_MULTIDECK_1875`)
- **Section** — a subdivision of a fixture (front face, back face, endcap) — only for fixtures with multiple merchandising faces
- **Shelf** — a horizontal shelf within a unit, with a height constraint
- **Slot** — a position on a shelf where a product sits
- **Facing** — one unit of a product in a slot (e.g., "5 facings of Cadbury Dairy Milk" = five bars visible from the front)
- **Promo section** — a merchandising tag on a unit (Confectionery, Soft Drinks, Meal Deal, etc.)
- **Campaign** — a time-bounded promotional event (Summer BBQ 2026) with artwork targeting unit types
- **Rollout** — a campaign's materialised instance for one site, with install tasks
- **Install task** — a single piece of POS artwork applied to a specific position on a specific unit at a specific site
- **Substitution** — a product swap logged by an employee (Main → Sub A, Main → Sub B, etc.)
- **POS slot** — a named position on a unit type where artwork can be mounted (e.g., `SHELF_STRIP_1000`, `POSTER_A1_PORTRAIT`)
- **Onesign quote** — a request routed to the Onesign production team, formatted as `OSD-YYYY-NNNNNN`

---

## How Claude Code should work in this codebase

**Before starting any feature:**
1. Read `PHASE1_PROMPT.md` for scope context
2. Read the relevant section of `docs/SCHEMA.md` if the feature touches the database
3. Check `docs/BRAND.md` if the feature has any visual surface
4. Use sub-agents liberally — they're defined in `.claude/agents/` and each has a clear remit

**When modifying the database:**
1. Never edit an existing migration — always create a new one
2. Migrations run in alphabetical order; use the date-prefix convention `YYYYMMDD_NNN_description.sql`
3. Every new table needs RLS policies in the same migration
4. Run schema changes through the `schema-warden` agent

**When building UI:**
1. Use the `brand` tokens in `lib/tokens/brand.ts` — never inline hex values
2. Poppins is loaded at the root via `@fontsource/poppins` — don't re-import
3. All text uses Sentence case — never Title Case, never ALL CAPS (except where signage pack explicitly specifies, like "NO ENTRY" on external signage)
4. Run visual work through the `configurator-ux` agent

**When writing anything user-facing:**
- British English throughout (colour, realise, organisation, metres)
- Write for a forecourt manager — plain, direct, no jargon
- Never call users "guys" or "folks" — "you" and "team" and "staff" are fine
- "Mapleleaf" is one word, always

---

## Getting current state

This codebase starts empty. The init pack (this folder) is scoped for Phase 1 — see `PHASE1_PROMPT.md` for exact deliverables. Subsequent phases will be scoped separately as we learn from each phase's execution.
