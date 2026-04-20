# Mapleleaf Roots

Franchise operations platform for Mapleleaf Petroleum Group. Built by Onesign & Digital.

This repo is scaffolded for Phase 1. Claude Code does the heavy lifting from here — this README is just to get you to the point where it can start.

## What you're building

Four user tiers (HQ Admin → Area Manager → Site Manager → Employee) operating three core modules: store fitting configurator, planogram management, and network-wide promo campaign rollouts. Full scope is in `CLAUDE.md`.

## Getting started

### 1. Prerequisites

- Node.js 20 LTS (use nvm: `nvm install 20 && nvm use 20`)
- pnpm or npm (pnpm preferred for speed)
- Docker Desktop running (for the Supabase local dev environment)
- Supabase CLI: `npm install -g supabase`
- Vercel CLI (optional, for deployment): `npm install -g vercel`

### 2. Create a Supabase project

Two options:

**Local dev (recommended for Phase 1)**
```bash
supabase init
supabase start
```
Take note of the local API URL, anon key, and service_role key it prints.

**Cloud project**
Create a new project at supabase.com (dedicated to Roots — do not reuse the shared Onesign Supabase instance). Grab the project URL and anon key from Project Settings → API.

### 3. Run the migration and seeds

```bash
supabase db reset
# This applies supabase/migrations/*.sql, then runs all seed/*.sql files in order.
```

Verify the seeds loaded:
```bash
psql "$(supabase status | grep 'DB URL' | awk '{print $NF}')" -c "select count(*) from unit_types;"
# Should return 33
```

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

You'll need:
- `NEXT_PUBLIC_SUPABASE_URL` — from step 2
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from step 2
- `SUPABASE_SERVICE_ROLE_KEY` — from step 2 (server-side only, never expose to the browser)
- `RESEND_API_KEY` — create at resend.com for transactional email (Phase 2+, optional for Phase 1)

### 5. Install dependencies

```bash
pnpm install
# or: npm install
```

### 6. Promote yourself to HQ Admin

After your first login via magic link, a row will be created in `user_profiles` with role `EMPLOYEE`. Promote yourself:

```bash
psql "$(supabase status | grep 'DB URL' | awk '{print $NF}')" \
  -c "update public.user_profiles set role = 'HQ_ADMIN' where email = 'your@email.com';"
```

### 7. Start Claude Code for Phase 1

In the repo root:
```bash
claude
```

Then paste the contents of `PHASE1_PROMPT.md` as your first message. Claude Code will read `CLAUDE.md` and the docs, then start building.

## Repo structure

```
CLAUDE.md             # Project north star — read this first
PHASE1_PROMPT.md      # First-sprint scope for Claude Code
README.md             # This file

docs/
  GLOSSARY.md         # Every domain term, precisely defined
  SCHEMA.md           # Entity relationships, rationale
  BRAND.md            # Mapleleaf brand rules, colours, type
  ARCHITECTURE.md     # Module boundaries, auth model, data flow

supabase/
  migrations/         # Versioned SQL — never edit, always add
  seed/               # Reference data: unit library, promo sections, etc.

.claude/agents/       # Sub-agent definitions for Claude Code

app/                  # Next.js App Router (mostly empty — Claude Code fills this)
components/
  brand/              # Mapleleaf-specific components (starter scaffolding provided)
  ui/                 # shadcn primitives (add with `npx shadcn@latest add ...`)
lib/
  supabase/           # Client/server factories
  tokens/             # Brand design tokens
public/brand/         # Logo assets — drop real vectors here when ready
```

## Brand assets

The maple-leaf icon used in the starter scaffolding is a stylised approximation. Drop the real vector into `public/brand/mapleleaf.svg` when Mapleleaf supplies it, and update `components/brand/MapleleafIcon.tsx` to reference it.

The same applies to the "E" in PETROLEUM/EXPRESS/AUTOMOTIVE wordmarks if they have custom letterforms — the Phase 1 scaffolding uses regular Poppins Black.

## Deploying

Phase 1 doesn't need to be deployed, but when you're ready:

1. Create a Vercel project pointing at this repo
2. Add the environment variables to Vercel (same ones as `.env.local`, but pointing at your production Supabase project)
3. Configure the custom domain: `roots.mapleleafpetroleum.com` via Wix DNS (same CNAME pattern you used for Persimmon)

## When to talk to the human (Michael)

- Before adding a new npm dependency that weighs >50kb gzipped
- Before altering the RLS model (any change to `public.current_user_role` or helpers)
- Before changing brand tokens
- Before adding a new top-level route
- Before deleting or restructuring any existing migration
- When scope feels like it's slipping beyond `PHASE1_PROMPT.md`

## Troubleshooting

**Seeds fail with "violates foreign key constraint"**
→ The seeds run in order. Make sure `supabase db reset` ran the migration first, not just the seed files on an existing DB.

**"permission denied for table X" on a query that should work**
→ You're hitting RLS. Check that you're authenticated (not using the anon key for server-side queries) and that your user has the right role in `user_profiles`.

**The map import for the floor plan is throwing SSR errors**
→ Konva needs to be client-only. Wrap the canvas in a `dynamic(() => import(...), { ssr: false })` call. There should be a pattern for this in `components/configurator/FloorPlanCanvas.tsx` once Phase 1 is built.

**Magic links aren't arriving**
→ Check Supabase Auth logs in the dashboard. For local dev, emails print to the Supabase local logs rather than actually sending — look at `supabase logs` output.
