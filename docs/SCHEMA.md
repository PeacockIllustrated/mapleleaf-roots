# Schema — Mapleleaf Roots

The full schema is in `supabase/migrations/20260420_000_initial_schema.sql`. This doc is a map of the territory and the reasoning behind the non-obvious shapes.

---

## The big picture

Nine logical clusters of tables:

1. **Users and hierarchy** — `user_profiles`, `areas`, `area_manager_assignments`
2. **Sites** — `sites`, `classification_tags`, `site_classifications`, `site_user_assignments`
3. **Unit library** (HQ-owned) — `unit_types`, `unit_type_default_shelves`, `pos_slot_types`, `unit_type_pos_slots`
4. **Promo taxonomy** (HQ-owned) — `promo_sections`
5. **Site composition** — `site_planograms`, `site_units`, `site_unit_shelves`, `site_unit_slots`
6. **Product catalogue** — `product_categories`, `products`, `slot_product_assignments`
7. **Campaigns** — `campaigns`, `campaign_unit_targets`, `campaign_artwork`, `site_campaign_rollouts`, `rollout_install_tasks`
8. **Activity** — `slot_activity_log`
9. **Bridges** — `community_submissions`, `onesign_quotes`

---

## The hierarchy: users, areas, and sites

Four roles with a strict hierarchy, encoded in the `user_role` enum and policed via RLS helper functions.

```
HQ_ADMIN ──── reads everything, writes library/campaigns/catalogue
    │
    └── AREA_MANAGER ──── reads sites in assigned areas (via area_manager_assignments)
            │
            └── SITE_MANAGER ──── reads/writes one site (via site_user_assignments)
                    │
                    └── EMPLOYEE ──── reads same site, limited writes (activity log, install tasks)
```

Why the assignment tables? Because Area Managers may cover multiple areas, a Site Manager may be primary at one site and backup at another, and Employees move between sites during staff-sharing arrangements. A single foreign key wouldn't capture this.

The RLS helper `accessible_site_ids()` consolidates the three different paths (HQ sees all, AMs see their areas, SM/Employees see their assigned sites) into a single set, which all site-scoped policies use.

---

## HQ-owned library vs site-owned composition

This is the most important distinction in the schema, and it drives everything downstream.

**HQ-owned (templates):**
- `unit_types` — the Mapleleaf-approved catalogue of furniture
- `unit_type_default_shelves` — what the unit ships with
- `pos_slot_types` — every possible POS position
- `unit_type_pos_slots` — which POS positions each unit type carries
- `promo_sections` — the merchandising taxonomy

Only HQ Admins can write to these. Sites read them to compose their planogram.

**Site-owned (compositions):**
- `site_planograms` — one per site
- `site_units` — instances on the floor plan
- `site_unit_shelves` — materialised from defaults at placement time
- `site_unit_slots` — the product positions

Site Managers write to these within their own site.

### Why materialise shelves at placement time?

When a site_unit is placed, we copy `unit_type_default_shelves` into `site_unit_shelves`. We don't just reference the defaults, because:

1. A site may want to remove a shelf from a specific gondola (e.g., to fit an oversized dump bin alongside it)
2. A site may adjust a shelf's clearance (move it up 50mm to fit tall gift tins at Christmas)
3. Activity logs and task history reference specific shelves — if HQ changes the defaults later, we don't want to break historical queries

So defaults are a starting point, and the actual shelves are owned by the site.

The same logic applies to slots: they're owned by the site, not the unit type.

---

## Two-tier artwork targeting

A campaign targets unit *types*, not individual site units. This is critical for the "HQ authors once, rolls out network-wide" flow.

```
Campaign (Summer BBQ 2026)
  ├── campaign_unit_targets:
  │     ├── CHILL_MULTIDECK_1250 (all of them)
  │     ├── DUMP_BIN_RECT       (all CONFECTIONERY-tagged ones, via promo_section filter)
  │     └── ENDCAP_1000         (all SOFT_DRINKS-tagged ones)
  │
  └── campaign_artwork:
        ├── (CHILL_MULTIDECK_1250 × HEADER_BOARD_1250)  → chiller-header.pdf
        ├── (CHILL_MULTIDECK_1250 × SHELF_STRIP_1250)   → chiller-strip.pdf
        ├── (DUMP_BIN_RECT × DUMP_BIN_HEADER)           → bbq-dumpbin.pdf
        └── (ENDCAP_1000 × ENDCAP_POSTER_A1)            → bbq-endcap-poster.pdf
```

When HQ publishes the campaign, Roots runs a materialisation job:

1. For each site in the network:
2. Find all its `site_units` matching the campaign's `campaign_unit_targets`
3. For each matching site_unit, for each `unit_type_pos_slots` position:
4. Look up the relevant `campaign_artwork` for that (unit_type × pos_slot_type)
5. Create a `rollout_install_tasks` row

The result: one task per piece of artwork per site unit. Employees work the task list; HQ sees aggregate rollout status per site.

---

## Main / Sub A / Sub B stocking model

Every slot has up to three product assignments, stored as nullable FKs on `slot_product_assignments`:

- `main_product_id` — what *should* be in the slot
- `substitute_a_product_id` — the first fallback
- `substitute_b_product_id` — the second fallback

The slot itself has a `currently_stocking` enum (MAIN / SUB_A / SUB_B / EMPTY / OUT_OF_SPEC) that employees update tap-by-tap.

Why this model:
- Mapleleaf HQ wants visibility into *when* sites are operating off-main. The activity log captures every transition with a timestamp and an actor.
- Employees don't need to type product names. They tap Main/SubA/SubB/Empty. That's four taps on a mobile at most.
- HQ can run a report: "Across the network, how often is slot X operating on Sub B? That tells us our main supplier has a reliability problem."

Changes to `currently_stocking` trigger a row in `slot_activity_log` — that's an application-level responsibility (not a DB trigger) because the actor_id needs to come from the authenticated session.

---

## Onesign quote bridge

The `onesign_quotes` table is a bridge, not an authority. Roots generates a quote, serialises the line items into the `payload` JSONB column, and hands the quote reference to the Onesign Portal.

The split:
- Roots owns `DRAFT → SUBMITTED`
- Onesign Portal owns everything after (`ACKNOWLEDGED`, `PRICED`, `APPROVED`, production statuses, etc.)
- Onesign Portal sends webhook updates back to Roots (Phase 2+) which Roots uses to update `status` and flip `site_campaign_rollouts.status` accordingly

This keeps Roots out of the business of managing production. Roots says what it needs; Onesign handles how.

---

## RLS model summary

RLS is on for every table. The default is deny; every policy explicitly allows a specific case.

Helper functions in the migration provide:
- `current_user_role()` — returns the caller's role
- `is_hq_admin()` — boolean shortcut
- `manages_site_area(site_id)` — true if caller is an AM for this site's area
- `assigned_to_site(site_id)` — true if caller is SM or Employee at this site
- `accessible_site_ids()` — returns the set of sites the caller can read

Every site-scoped policy uses `site_id in (select accessible_site_ids())` for reads, and a combination of `is_hq_admin()`, `manages_site_area(...)`, and `assigned_to_site(...)` for writes with appropriate role checks.

### Special cases

**Employees updating site_unit_slots:** Employees can update a slot's stocking state but shouldn't be able to reconfigure shelves or delete units. The `sus2_emp_update_stocking` policy allows UPDATE scoped to site-assigned users, and application code must ensure only the `currently_stocking` and related fields are being mutated by Employee role. We do not try to police column-level access via RLS — that's the app's job via Server Actions.

**LOCAL vs GLOBAL campaigns:** A LOCAL campaign has an `owner_site_id` and can be authored by the site's manager. A GLOBAL campaign has no owner and is HQ-only. The CHECK constraint `check_local_has_site` enforces this at the DB level.

**Community submissions:** Any site-assigned user can INSERT, but only HQ can review (update status). No employee can see submissions from other sites — they see their own site's submissions and anything HQ has featured.

---

## What's deliberately NOT in Phase 1

The schema is designed to accommodate these without breaking changes:

- **Multi-tenancy (other franchise networks beyond Mapleleaf):** can be added by introducing an `owner_org_id` nullable FK on the library tables, with RLS scoping. All Phase 1 rows would be `NULL`, representing "shared" library.
- **Forecourt-specific sub-planograms:** `site_planograms` has a `name` column — a future enhancement could split a site into "Shop" and "Forecourt" planograms with separate floor plans.
- **Supplier management:** A `suppliers` table with FK from `products` would slot in without disrupting anything.
- **Pricing:** Deliberately out of scope for Phase 1. A `slot_prices` table with historical tracking would bolt on.
- **EPOS integration:** Would feed `slot_activity_log` from transactional data. The log is already designed for high-volume inserts.

---

## Indexes worth noting

- `idx_products_name` is a GIN index on `to_tsvector('english', name)` — full-text search on product names
- `idx_products_gtin` is partial (`where gtin is not null`) — most non-OFF products won't have a GTIN
- `idx_campaigns_dates` is partial (`where status in ('SCHEDULED', 'LIVE')`) — we only care about active campaigns for date-range queries
- `idx_sal_actor_time` supports "what did Jordan do today?" queries on the activity log

Add indexes as query patterns emerge. Don't pre-index speculatively.
