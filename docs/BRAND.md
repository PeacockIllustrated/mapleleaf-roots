# Brand — Mapleleaf Roots

Visual identity rules for Roots, inherited from the Mapleleaf brand pack and adapted for screen. When the brand pack (which covers physical signage) is ambiguous for a screen context, this document resolves it.

The brand pack PDF is the ultimate source of truth for anything not covered here.

---

## Product family

Roots is the fourth product in the Mapleleaf brand family:

| Product | Domain |
|---|---|
| Mapleleaf Petroleum | Fuel retail — totems, tankers, forecourt branding |
| Mapleleaf Express | Convenience shop brand |
| Mapleleaf Automotive | Workshop and vehicle services |
| Mapleleaf Roots | Franchise operations platform (this app) |

The four share the same marque, typography, and colour system. They differ only in the division wordmark.

---

## Colour palette

### Primary palette

| Token | Hex | Role |
|---|---|---|
| `ml-red` | `#E12828` | Primary action, Mapleleaf wordmark, active states, error alerts |
| `ml-charcoal` | `#414042` | Body text, panels, secondary signage, app bar |
| `ml-light-grey` | `#E6E7E7` | Surface backgrounds, descriptor text, inactive states |

### Gold gradient (premium accent)

| Token | Hex | Role |
|---|---|---|
| `ml-gold-light` | `#F8D3A3` | Gradient stop 1 |
| `ml-gold-mid` | `#ECBB7F` | Gradient stop 2 — solid usage default |
| `ml-gold-dark` | `#A96533` | Gradient stop 3 |

**Gold is reserved.** Not for routine UI accents. Use gold when a user has earned it or the moment matters:

- Quote approval success state
- Campaign rollout completion toast
- PDF export headers (the generated quote document)
- Milestone celebrations (first site onboarded, 100th rollout, etc.)

Using gold on every card dilutes its meaning. If in doubt, don't use gold.

### Non-negotiable rule

**Mapleleaf Red (`#E12828`) never appears on division wordmarks.**

The division names — "Petroleum", "Express", "Automotive", "Roots" — are always rendered in charcoal on light surfaces, or white on dark surfaces. Never red. This rule exists so that across the Mapleleaf signage estate, "Mapleleaf" is the consistent red element and the division name is the consistent secondary element.

Breaking this rule breaks brand consistency across every sign on every forecourt. Do not break it.

---

## Typography

**Poppins is the one and only UI typeface.** No exceptions.

Loaded via `@fontsource/poppins` — self-hosted, no external font CDN. The root layout imports the weights below; do not import additional weights without adding them here.

### Scale

| Token | Weight | Size | Usage |
|---|---|---|---|
| `type-hero` | Black · 900 | 36-48px | Marketing surfaces, empty-state headlines, the Mapleleaf wordmark |
| `type-section` | Bold · 700 | 22-28px | Page titles, major section headers |
| `type-subheading` | Medium · 500 | 16-18px | Card titles, sub-section headers |
| `type-label` | Medium · 500 | 12-13px | Buttons, chips, form labels, UI controls |
| `type-body` | Regular · 400 | 13-15px | Prose, body copy, descriptions |
| `type-caption` | Light · 300 | 11-12px | Metadata, timestamps, auxiliary info |
| `type-legal` | Light italic · 300 | 11px | Small print, legal, disclaimers |

### Rules

- Sentence case, never Title Case. "Create new campaign", not "Create New Campaign".
- ALL CAPS only where the brand pack explicitly prescribes it — division names on lockups ("PETROLEUM"), external directional signage ("NO ENTRY", "EXIT"). Never for UI labels.
- Letter-spacing: default for body/headers; `0.04em` for ALL CAPS labels; `-0.02em` for hero display.

---

## The marque

The Mapleleaf marque is the gold maple leaf with a red accent stroke. It appears on totems, tankers, windows, and in the app.

In Roots:
- App bar icon (22×22 or 24×24px, red background square with gold leaf)
- Login page hero
- PDF document headers

The icon component lives at `components/brand/MapleleafIcon.tsx`. It accepts `size` (defaults to 40) and `variant` (`gold-on-red`, `gold-on-transparent`, `mono-on-charcoal`).

**The vector in the scaffolding is a stylised approximation.** When Mapleleaf supplies the authentic SVG, drop it into `public/brand/mapleleaf.svg` and update the component to reference it.

---

## Lockups

The four product lockups follow the same pattern:

```
Mapleleaf    PETROLEUM
   (red)     (charcoal, uppercase, tracked)
```

Construction:
- "Mapleleaf" in Poppins Black 900, red, tracking -0.02em
- Division name in Poppins Black 900, charcoal, uppercase, tracking 0.12em
- Baseline aligned; division name typically ~60% the height of "Mapleleaf"
- The two words sit close together (gap ~0.4em of the wordmark height)

On dark backgrounds, both words are rendered in white. The red version is light-background only.

The `Wordmark` component at `components/brand/Wordmark.tsx` takes a `division` prop (`petroleum | express | automotive | roots`) and handles this.

---

## Surfaces

### App bar

Dark. Specifically `--ml-charcoal` (`#414042`). The red Mapleleaf icon square anchors the left edge. "Mapleleaf" in white + "ROOTS" in light grey, separated by a subtle vertical rule. No shadow, no gradient.

### Cards

White on light surfaces (`--color-background-primary`). A thin charcoal border (0.5px) and a subtle border-radius (8px). No drop shadow by default — use elevation only for modals and active drags.

### Status cards

A red left-border (4px) denotes Mapleleaf brand cards as distinct from generic content. Use this pattern for:
- Active campaigns
- Quote cards
- Rollout progress indicators
- Anything that is "Mapleleaf-authored" rather than user-generated

Not for every card. Overuse makes the pattern meaningless.

### Forms

- Input height: 40px
- Input border-radius: 6px
- Focus ring: 2px `--ml-red` with 2px offset
- Error state: red border + red helper text
- Labels sit above inputs in `type-label` style

---

## Interaction

### Buttons

| Variant | Background | Text | Usage |
|---|---|---|---|
| Primary | `--ml-red` | White | Main CTA on a page (one per page when possible) |
| Secondary | `--ml-charcoal` | White | Save draft, secondary confirm |
| Outline | Transparent + charcoal border | Charcoal | Cancel, dismiss, tertiary actions |
| Ghost | Transparent | Charcoal | In-card actions, table row actions |

Button height: 40px default, 44px on primary actions, 32px on dense/compact surfaces. Padding: horizontal 16px minimum.

Never use red for destructive-only actions. Destructive actions (delete, revoke) show a confirmation modal; the confirmation's primary button is red, cancel is outline.

### Motion

Short, decisive transitions. 150ms for hover/focus, 200ms for state changes, 250ms for layout shifts. Ease-out for entrances, ease-in for exits. No bounce, no elastic.

---

## Density

Roots is a professional tool used daily. Optimise for information density over whitespace.

- Table row height: 44px (touch-friendly but not wasteful)
- Card padding: 20-24px
- Inter-card gap: 12-16px
- Page side margins: 24-32px on desktop
- Max content width: 1440px — don't let tables stretch infinitely

---

## Imagery

No stock photos. Ever.

- Site photos come from the site's own uploads (always permissioned, never fetched from third parties)
- Product images come from Open Food Facts (CC-BY-SA — credit retained via `image_url` linking)
- Marketing imagery is Mapleleaf-supplied

When a photo is needed but unavailable, show a neutral placeholder tile in `--ml-light-grey` with a simple icon. Do not substitute a stock photo.

---

## Tone of voice

Roots is used by:
- Forecourt managers at 7am, mid-shift, tired
- HQ planners running Q4 campaigns
- Employees during shift changeovers

Write plainly. Instructions should read like a colleague explaining something in person, not a manual.

- "Mark task complete" not "Submit task completion"
- "You'll need to onboard the site first" not "Site onboarding is a prerequisite"
- "This site doesn't have a coffee station" not "No COFFEE_STATION classification is applied to this site"
- "Something went wrong" then a specific cause beneath — never only "Error"

Never call users "guys" or "folks". "You" is the default; "team" and "staff" are fine for groups.

British English throughout: colour, realise, organisation, metres, centre.

"Mapleleaf" is one word, always. Not "Maple Leaf" or "MapleLeaf".
