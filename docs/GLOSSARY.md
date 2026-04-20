# Glossary — Mapleleaf Roots

Every domain term used in this codebase, precisely defined. When a word appears in code, comments, UI copy, or docs, it means what this file says it means.

If a concept is missing, add it here before using it in code.

---

## People and access

**HQ Admin** — a user with `role = 'HQ_ADMIN'` in `user_profiles`. Full read/write on everything. Only role that can create campaigns, manage the unit library, or moderate the community board.

**Area Manager** — a user with `role = 'AREA_MANAGER'` and one or more rows in `area_manager_assignments`. Read access across all sites in their areas; can onboard new sites and approve rollouts but cannot modify HQ-owned resources.

**Site Manager** — a user with `role = 'SITE_MANAGER'` and a primary row in `site_user_assignments`. Manages their site's planogram and staff. Cannot see other sites.

**Employee** — a user with `role = 'EMPLOYEE'` and a row in `site_user_assignments`. Can log substitutions, complete install tasks, and submit community board ideas. Cannot modify site configuration.

**Onesign team** — external Mapleleaf & Digital employees who process quotes. Not users of Roots; they interact with quotes via the existing Onesign Portal. The handoff is through `onesign_quotes`.

---

## Places

**Site** — a single franchise location. Identified by `code` (e.g., `BROMYARD_EXPRESS`). Has an address, a tier (SMALL / MEDIUM / LARGE), and a set of classification tags.

**Area** — a geographic grouping of sites, assigned to one or more Area Managers. Not a legal entity, just an operational grouping (e.g., "Midlands West").

**Classification tag** — a characteristic of a site used for campaign targeting and reporting. Examples: `MOTORWAY`, `ALCOHOL_LICENSED`, `COFFEE_STATION`, `TWENTY_FOUR_HOUR`, `EV_CHARGING`. A site can have many tags.

---

## Furniture and fixtures

**Unit type** — an entry in the master library (`unit_types` table). Owned by HQ. Examples: `GONDOLA_AISLE_1000`, `CHILL_MULTIDECK_1875`, `TOTEM_MAIN`. Has fixed dimensions, a category, and a set of POS slots it can carry.

**Unit** — an instance of a unit type placed at a site. A site's planogram consists of many units. Each has a label ("Aisle 1 Left", "Endcap A"), a floor-plan position, a rotation, and optionally a promo section tag.

**Unit category** — a broad grouping of unit types. The six categories are `DRY_SHELVING`, `CHILLED_FROZEN`, `PROMO_SEASONAL`, `COUNTER_TILL`, `FORECOURT`, `WINDOWS_POS_ONLY`.

**Shelf** — a horizontal merchandising surface inside a unit. Has a clearance (the space above it) and a depth. A gondola typically has 5 shelves; a wall bay has 6. Shelves are numbered top-down starting at 1.

**Base shelf** — the bottom shelf of a shelving unit, typically deeper and used for larger items.

**Slot** — a position on a shelf where one specific product is merchandised. Has a width, a facing count (how many copies of the product are visible from the front), and a currently-stocking state (main / sub A / sub B / empty / out of spec).

**Facing** — one unit of a product visible from the front of a slot. "5 facings of Cadbury Dairy Milk" means five bars can be seen by a customer without moving the shelf.

**Temperature zone** — ambient, chilled, or frozen. Constrains which products can be placed where.

---

## Merchandising taxonomy

**Promo section** — a category tag for merchandising zones. Examples: `CONFECTIONERY`, `SOFT_DRINKS`, `MEAL_DEAL`. Every placed unit is tagged with one (optional for forecourt/POS-only units). Used by campaigns to target "all CONFECTIONERY units".

**Promo section source** — whether the section was defined by `HQ` or `PROMOTED_SUGGESTION` (i.e., originated from the community board and was adopted).

---

## POS and signage

**POS** — point-of-sale. Used here in the signage-industry sense: any printed or illuminated merchandising artwork applied to a unit, a window, a wall, or the forecourt.

**POS slot type** — a named artwork position with fixed dimensions. Examples: `SHELF_STRIP_1000` (1000mm × 32mm, slots into a price channel), `POSTER_A1` (594×841mm), `PUMP_TOPPER_800` (800×200mm, rail insert). The master list of all possible artwork surfaces.

**POS slot position (position_label)** — a named location on a specific unit type where a POS slot type is mounted. Example: on `GONDOLA_AISLE_1000`, `SHELF_1` is the top shelf's price channel, which accepts a `SHELF_STRIP_1000`. The tuple (unit_type, position_label, pos_slot_type) is what campaign_artwork targets.

**Mount method** — how the artwork attaches to the unit. One of `PRICE_CHANNEL` (slides into the shelf-edge channel), `ADHESIVE` (peel-and-stick), `POSTER_POCKET` (slides into a frame/pocket), `MAGNETIC`, `RAIL_INSERT` (slides into a header rail), `FREESTANDING` (self-supporting), `VINYL_DIRECT` (applied directly to a window or floor).

**Material** — what the artwork is printed on. `PAPER`, `RIGID_PVC`, `FOAMEX`, `CORRUGATED_CARD`, `VINYL`, `ACRYLIC`, `FABRIC`.

---

## Campaigns

**Campaign** — a time-bounded promotional event. Has a code (`SUMMER_BBQ_2026`), a scope (`GLOBAL` for HQ-run or `LOCAL` for a single site's own promo), start/end dates, and a status that progresses through DRAFT → SUBMITTED → APPROVED → SCHEDULED → LIVE → ARCHIVED.

**Campaign scope** — `GLOBAL` (authored by HQ, rolls out to all matching sites in the network) or `LOCAL` (authored by a site's manager, applies only to that site).

**Campaign unit target** — a row in `campaign_unit_targets` declaring "this campaign affects all units of type X" (optionally narrowed to a specific promo section). Drives which sites get rollouts and which POS slots get artwork.

**Campaign artwork** — one printable piece per (campaign × unit type × POS slot type). Has a final file URL, a preview URL, a material, and a quantity per target.

**Rollout** — a campaign's materialised instance for one specific site. A row in `site_campaign_rollouts`. Has a status (pending → quoted → in_production → shipped → installing → installed) and a task count.

**Install task** — the smallest unit of campaign work. A row in `rollout_install_tasks` saying "at this site, on this specific unit, at this position_label, apply this piece of campaign_artwork". Employees complete these.

**Problem reason** — why an install task couldn't be completed. `ARTWORK_DAMAGED`, `WRONG_SIZE`, `MISSING_FROM_PACK`, `CANNOT_FIND_LOCATION`, `OTHER`. Reported by employees with optional notes and photo.

---

## Products

**Product** — an SKU-level item. May come from Open Food Facts, Open Products Facts, internal catalogue, or franchisee submission. Has dimensions (for shelf fit calculations), image, GTIN (barcode), and a category.

**GTIN** — Global Trade Item Number. The barcode. EAN-13 is most common in the UK. Use this as the dedupe key when syncing from OFF.

**Data source** — where this product row came from. `OPEN_FOOD_FACTS`, `OPEN_PRODUCTS_FACTS`, `INTERNAL_CATALOGUE`, or `FRANCHISEE_SUBMITTED`.

**Slot assignment** — the specification of which products sit in a given slot. Every slot has a `main_product_id`; optionally a `substitute_a_product_id` and `substitute_b_product_id` for when the main is out of stock.

**Main / Sub A / Sub B** — the three tiers of product stocking for a slot. The employee app lets staff tap to record which one is currently in the slot ("We're out of main, selling Sub A"), and this feeds the activity log for reporting.

---

## Activity

**Slot activity log** — the audit trail for every slot-level change. Each row records who did what, when, and includes before/after JSON snapshots. Immutable after insert.

**Substitution** — a specific type of activity where the currently-stocking state changes from MAIN to SUB_A or SUB_B.

---

## Onesign integration

**Onesign quote** — a formal request to the Onesign production team for signage/fixtures. Identified by a reference in format `OSD-YYYY-NNNNNN` (matches the existing Onesign Portal format). Types: `SITE_FITTING` (initial fit-out), `CAMPAIGN_PACK` (per-rollout print pack), `ADDITIONAL_SIGNAGE` (ad-hoc).

**Quote payload** — the JSON body of an Onesign quote: line items with unit references, quantities, materials, artwork links, delivery address. Onesign Portal consumes this.

**Quote status** — progresses `DRAFT → SUBMITTED → ACKNOWLEDGED → PRICED → APPROVED → IN_PRODUCTION → SHIPPED → CLOSED`. Roots owns the transition from DRAFT to SUBMITTED; Onesign Portal owns everything after.

---

## Community board

**Submission** — a franchisee-authored idea (product, fixture, POS) posted for HQ review. Has a category, title, description, optional images, and a status.

**Featured submission** — a submission that HQ has elevated to community visibility (shown first, upvotable).

**Promoted suggestion** — a submission that HQ has accepted into the catalogue (e.g., added as a new `promo_section` with `source = 'PROMOTED_SUGGESTION'`).
