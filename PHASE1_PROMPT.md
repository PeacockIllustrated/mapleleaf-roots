# Phase 1 prompt — Mapleleaf Roots

**This is the exact prompt for Claude Code's first sprint.** Paste the contents of this file into a fresh Claude Code session after cloning the repo. Read `CLAUDE.md` before starting.

---

## Objective

Ship a working Phase 1 of Mapleleaf Roots: authenticated users can onboard a new franchise site and compose its shop-floor planogram using the drag-and-drop configurator, then request an Onesign quote for their full fit-out. Everything else is out of scope for this sprint.

Phase 1 is **Layout mode only**. Campaign view and Print preview are Phase 2. Shelf visualiser is Phase 1.5. Employee mobile is Phase 3.

## Deliverables (definition of done)

At the end of this sprint, all of the following must be true:

**Infrastructure**
- [ ] `npm install` from a clean clone succeeds on Node 20 LTS
- [ ] `npm run dev` starts the app on `http://localhost:3000` with no console errors
- [ ] Supabase local dev environment is configured and the initial migration applies cleanly via `supabase db reset`
- [ ] All seed files (001 through 007) run without error and produce the expected counts (verifiable via a `scripts/verify-seed.ts` check)
- [ ] `.env.example` matches what the app actually reads from the environment

**Authentication**
- [ ] Magic-link email auth via Supabase Auth works end-to-end
- [ ] On first login, a row is created in `user_profiles` with role `EMPLOYEE` by default (HQ Admin promotion is manual via SQL for Phase 1)
- [ ] The four-role hierarchy is enforced via the RLS helper functions — confirmed by a test that tries to read another site's data as a Site Manager and gets an empty result
- [ ] Logged-out users are redirected to `/login`; logged-in users landing on `/login` go to `/sites`

**Sites**
- [ ] HQ Admin can create a new site via `/sites/new` with: code, name, area, tier, address, postcode
- [ ] Area Manager can onboard a new site within their assigned area
- [ ] Site list at `/sites` shows every site the current user can access, with onboarding status badge
- [ ] Clicking a site opens `/sites/[id]` — the site detail page
- [ ] Site classifications (MOTORWAY, ALCOHOL_LICENSED, etc.) can be toggled on the site detail page

**Library (read-only in Phase 1)**
- [ ] Unit types, POS slot types, promo sections are visible at `/admin/library/units` etc. for HQ Admin
- [ ] Non-HQ users cannot reach `/admin/*` routes (404 or redirect)

**Configurator — Layout mode**
- [ ] At `/sites/[id]/planogram`, the user sees a floor plan canvas
- [ ] Left rail shows unit library grouped by category (DRY_SHELVING, CHILLED_FROZEN, PROMO_SEASONAL, COUNTER_TILL, FORECOURT, WINDOWS_POS_ONLY)
- [ ] Units can be dragged from the library onto the canvas and placed
- [ ] Placed units snap to a 100mm grid and can be rotated in 90° increments
- [ ] Units can be moved and deleted
- [ ] Each placed unit gets a label (`Aisle 1`, `Endcap A`, etc.) which can be edited
- [ ] Each placed unit can be tagged with a promo section (Confectionery, Soft Drinks, etc.) and reflects the section's colour on the floor plan
- [ ] Floor plan state is saved to `site_units` on every change (debounced — not on every pixel of drag)
- [ ] When the page is refreshed, the previous floor plan is loaded from the database
- [ ] When a unit is placed, `site_unit_shelves` rows are created from the unit type's default shelf grid (so downstream visualiser work can assume they exist)
- [ ] Floor plan canvas uses Konva.js via react-konva — no HTML-based drag-drop

**Onesign quote stub**
- [ ] A "Request fit-out quote" button on the planogram page generates a draft `onesign_quotes` row
- [ ] Quote payload is valid JSON containing: site reference, quote type `SITE_FITTING`, a line item per placed unit with (unit_type_code, label, position, promo_section, POS slot counts derived from unit_type_pos_slots)
- [ ] Quote reference is generated in format `OSD-YYYY-NNNNNN` using a sequence
- [ ] Quote appears in a `/sites/[id]/quotes` list
- [ ] Quote is submittable (status transitions `DRAFT → SUBMITTED`) but not further — acknowledgement/pricing is Onesign team's job, not in scope

**Community board stub**
- [ ] A submission form at `/community/new` creates a row in `community_submissions`
- [ ] A list at `/community` shows existing submissions (read-only for Phase 1)
- [ ] Moderation flows are Phase 4 — leave them unbuilt

**Visual and tone**
- [ ] Every page uses Poppins via `@fontsource/poppins`
- [ ] Brand tokens from `lib/tokens/brand.ts` are the only source of colour — no inline hex values
- [ ] Division wordmarks ("Roots", "Petroleum", etc.) render in charcoal, never red
- [ ] The app bar is charcoal with a red accent square for the Mapleleaf icon (matches the style tile)
- [ ] Primary CTAs are Mapleleaf red (`#E12828`)
- [ ] The gold gradient is reserved for the quote-submitted success toast — nowhere else in Phase 1

## Explicit out of scope

Do not build any of this in Phase 1 — each has its own phase:

- Campaign view overlay on the floor plan
- Print preview mode
- Campaign authoring (Phase 2)
- Shelf visualiser with product slots (Phase 1.5)
- Product catalogue UI beyond the initial seed (Phase 1.5)
- Open Food Facts sync pipeline (Phase 1.5)
- Employee mobile app / PWA (Phase 3)
- Admin dashboard analytics (Phase 4)
- Community board moderation and promotion to catalogue (Phase 4)
- SSO (Phase 4)
- Slot-level product assignments and substitution logging (Phase 3)
- PDF generation for the Onesign quote — just structured JSON in the payload column is enough for the bridge

## Suggested file structure

```
app/
├── layout.tsx                        # Root layout, loads Poppins, wraps auth
├── page.tsx                           # Landing — redirects based on auth state
├── login/
│   └── page.tsx                       # Magic-link form
├── sites/
│   ├── page.tsx                       # List
│   ├── new/page.tsx                   # Create form
│   └── [id]/
│       ├── page.tsx                   # Detail
│       ├── planogram/page.tsx         # Layout-mode configurator
│       └── quotes/page.tsx            # Site's quotes
├── admin/
│   └── library/
│       ├── units/page.tsx
│       ├── pos-slots/page.tsx
│       └── promo-sections/page.tsx
├── community/
│   ├── page.tsx
│   └── new/page.tsx
└── api/
    └── quotes/
        └── route.ts                   # POST to create a quote from a planogram
components/
├── brand/
│   ├── MapleleafIcon.tsx
│   ├── Wordmark.tsx
│   └── AppBar.tsx
├── configurator/
│   ├── FloorPlanCanvas.tsx           # Konva stage wrapper
│   ├── UnitLibraryRail.tsx
│   ├── PlacedUnit.tsx
│   └── UnitInspector.tsx
└── ui/                                 # shadcn primitives
lib/
├── supabase/
│   ├── client.ts                      # Browser client
│   └── server.ts                      # Server client (cookies-based)
├── tokens/
│   └── brand.ts                       # Exported CSS variable names + hex fallbacks
└── quote/
    └── build-quote-payload.ts         # Reads planogram, builds OSD payload
```

## How to work

1. Start by reading `CLAUDE.md`, then `docs/SCHEMA.md`, then `docs/BRAND.md`.
2. Use the sub-agents in `.claude/agents/`:
   - `architect` for decisions about module structure
   - `schema-warden` before any SQL changes
   - `configurator-ux` for the floor plan canvas
   - `auth-guard` for anything touching RLS or sessions
   - `quoter-bridge` for the Onesign quote generation
3. Make small commits with clear messages. Branch naming: `phase-1/short-description`.
4. When you hit a design question the docs don't answer, stop and ask the human rather than guessing.
5. When in doubt, do less. Phase 1 is small on purpose.

## Acceptance demo

At the end, demo the following flow to confirm Phase 1 is done:

1. Log in as an Area Manager via magic link
2. Create a new site in their area
3. Open the planogram page for that site
4. Drag in 8-10 units covering multiple categories (at least one gondola, one chiller, one till, one dump bin)
5. Tag units with promo sections
6. Label the units ("Aisle 1 Left", "Endcap A", etc.)
7. Refresh the page — everything persists
8. Click "Request fit-out quote" — a DRAFT quote is created with correct payload
9. Submit the quote — status moves to SUBMITTED
10. Log out, log in as a different Site Manager from a different area — confirm that the first site is not visible (RLS is enforced)

If all ten steps pass, Phase 1 is done.
