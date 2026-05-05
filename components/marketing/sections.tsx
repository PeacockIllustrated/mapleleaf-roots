/**
 * Marketing landing — section blocks.
 *
 * Faithful to docs/Mapleleaf Roots — Project Overview Brochure layout.
 * Brand rules:
 *   • Mapleleaf Red on the wordmark + section accents only — never on
 *     division names.
 *   • Gold gradient (var(--ml-gold-*)) reserved for premium moments —
 *     used here on the closing CTA only.
 *   • Sentence case throughout; all-caps only on tracked labels.
 */

import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';

// ===========================================================================
// 01 — Hero (red cover)
// ===========================================================================

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section
      style={{
        position: 'relative',
        background: 'var(--ml-red)',
        color: '#FFFFFF',
        overflow: 'hidden',
        padding: '64px 32px 88px',
      }}
    >
      {/* Faint maple-leaf watermark, top-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -120,
          top: -80,
          width: 720,
          height: 720,
          opacity: 0.12,
          background:
            'url(/brand/mapleleaf-icon.svg) center/contain no-repeat',
          filter: 'brightness(0) invert(1)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={metaLabel}>A Mapleleaf platform</span>
            <Wordmark division="roots" surface="dark" size="md" />
          </div>
          <span style={metaLabel}>
            Project overview · Issue 01 · April 2026
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(96px, 18vw, 220px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 0.92,
            color: '#FFFFFF',
            textTransform: 'uppercase',
          }}
        >
          Roots
        </h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
            alignItems: 'end',
            paddingTop: 28,
          }}
        >
          <div>
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                width: 64,
                height: 2,
                background: 'var(--ml-gold-mid)',
                marginBottom: 16,
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(28px, 3.4vw, 40px)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
                maxWidth: 520,
              }}
            >
              One platform for every forecourt in the network.
            </p>
          </div>
          <div style={{ maxWidth: 460, justifySelf: 'end' }}>
            <span style={metaLabel}>Project overview</span>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 14,
                lineHeight: 1.55,
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              A scoping brochure for the Mapleleaf Roots franchise operations
              platform — what it is, who it serves, what it does today, and
              where it goes next.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <Link href="#challenge" style={pillButtonGhost}>
                Start the brochure ↓
              </Link>
              <Link
                href={isAuthed ? '/dashboard' : '/login'}
                style={pillButtonSolid}
              >
                {isAuthed ? 'Open the app →' : 'Sign in →'}
              </Link>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            paddingTop: 20,
            borderTop: '0.5px solid rgba(255, 255, 255, 0.25)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 24,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          <div>
            <span style={metaLabelTight}>Prepared by</span>
            <span style={metaValue}>Onesign &amp; Digital</span>
          </div>
          <div>
            <span style={metaLabelTight}>For</span>
            <span style={metaValue}>Leadership review, Q2 2026</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={metaLabelTight}>Issue</span>
            <span style={metaValue}>01 / April 2026</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const metaLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(255, 255, 255, 0.78)',
};

const metaLabelTight: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(255, 255, 255, 0.55)',
  marginBottom: 4,
};

const metaValue: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '0.02em',
  textTransform: 'none',
  color: '#FFFFFF',
};

const pillButtonGhost: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: '#FFFFFF',
  border: '0.5px solid rgba(255, 255, 255, 0.4)',
  borderRadius: 9999,
  textDecoration: 'none',
};

const pillButtonSolid: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  background: '#FFFFFF',
  color: 'var(--ml-red)',
  borderRadius: 9999,
  textDecoration: 'none',
};

// ===========================================================================
// 02 — The challenge
// ===========================================================================

export function Challenge() {
  return (
    <SectionShell id="challenge" tone="cream">
      <SectionLabel>01 — The challenge</SectionLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <div>
          <BigDisplay>
            A franchise network <Hl>cannot be run</Hl> from a spreadsheet.
          </BigDisplay>
          <p style={subhead}>
            Every Mapleleaf forecourt is a small business — fit out once,
            merchandised daily, refreshed each campaign. At network scale,
            that’s thousands of moving parts changing in parallel.
          </p>
          <p style={smallCopy}>
            HQ needs a single operational window. Franchisees need one tool
            that knows their site. Employees need clear tasks, on their
            phone, on shift. Roots is that tool.
          </p>
        </div>
        <ul style={countdownList}>
          <CountdownItem n={4} title="User tiers" sub="HQ Admin · Area Manager · Site Manager · Employee" />
          <CountdownItem n={3} title="Core modules" sub="Store fitting · Planogram · Campaigns" />
          <CountdownItem n={2} title="Supporting modules" sub="Admin dashboard · Community board" />
          <CountdownItem n={1} title="Source of truth" sub="Supabase, role-scoped with row-level security" />
        </ul>
      </div>
    </SectionShell>
  );
}

function CountdownItem({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        alignItems: 'center',
        gap: 24,
        padding: '20px 0',
        borderBottom: '0.5px solid var(--ml-border-default)',
      }}
    >
      <span
        style={{
          fontSize: 'clamp(60px, 9vw, 92px)',
          fontWeight: 900,
          color: 'var(--ml-red)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ml-text-primary)' }}>
          {title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ml-text-muted)', lineHeight: 1.5 }}>
          {sub}
        </span>
      </div>
    </li>
  );
}

const countdownList: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  borderTop: '0.5px solid var(--ml-border-default)',
};

// ===========================================================================
// 03 — Positioning
// ===========================================================================

export function Positioning() {
  return (
    <SectionShell id="positioning" tone="cream">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr',
          gap: 48,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionLabel>02 — Positioning</SectionLabel>
          <span
            style={{
              marginTop: 24,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-text-muted)',
            }}
          >
            In a sentence
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 2,
              background: 'var(--ml-gold-mid)',
            }}
          />
        </div>
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.14em',
              color: 'var(--ml-text-muted)',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 12,
            }}
          >
            <span style={{ color: 'var(--ml-red)', fontWeight: 700 }}>Mapleleaf</span> Roots
          </span>
          <BigDisplay>
            Roots is the <Hl>operational nervous system</Hl> of the
            Mapleleaf franchise network.
          </BigDisplay>
          <p style={{ ...subhead, maxWidth: 720 }}>
            It handles the full lifecycle of a franchise site — from initial
            fit-out, through day-to-day merchandising, to network-wide
            promotional campaign rollouts. One bespoke application. Four
            user tiers. One version of the truth.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 64,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}
      >
        <PositioningCard
          title="Bespoke"
          body="Built for Mapleleaf’s exact operating model — not a configured SaaS."
        />
        <PositioningCard
          title="Hierarchical"
          body="Every action respects the HQ → Area → Site → Employee chain."
        />
        <PositioningCard
          title="Single-source"
          body="Supabase is the truth. No spreadsheets, no shadow data."
        />
      </div>
    </SectionShell>
  );
}

function PositioningCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderLeft: '4px solid var(--ml-red)',
        background: 'transparent',
      }}
    >
      <span
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--ml-text-primary)',
          display: 'block',
          marginBottom: 8,
        }}
      >
        {title}
      </span>
      <span style={{ fontSize: 13, color: 'var(--ml-text-muted)', lineHeight: 1.5 }}>
        {body}
      </span>
    </div>
  );
}

// ===========================================================================
// 04 — Family
// ===========================================================================

export function Family() {
  return (
    <SectionShell id="family" tone="cream">
      <SectionLabel>03 — Where Roots sits</SectionLabel>
      <BigDisplay>
        One master brand. Four divisions. One operations spine.
      </BigDisplay>
      <p style={subhead}>
        Mapleleaf is a single master brand with four divisions. Every
        division inherits the same wordmark, colour palette, and typographic
        system. Roots is the internal platform that keeps the other three
        moving as one.
      </p>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <DivisionCard
          division="petroleum"
          body="The fuel operation — totems, tankers, forecourt branding."
        />
        <DivisionCard
          division="express"
          body="The convenience shop brand — food to go, drinks, groceries."
        />
        <DivisionCard
          division="automotive"
          body="The workshop and repair operation — MOTORCARE signage."
        />
        <DivisionCard
          division="roots"
          highlight
          body="The operations platform that ties it all together. This is us."
        />
      </div>

      <div
        style={{
          marginTop: 36,
          paddingTop: 18,
          borderTop: '0.5px solid var(--ml-border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 12,
          color: 'var(--ml-text-muted)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--ml-text-primary)' }}>Brand rule.</strong>{' '}
          Mapleleaf Red (#E12828) is used only on the “Mapleleaf” wordmark.
          Division names stay charcoal on light, white on dark. Never red.
        </span>
        <span
          style={{
            color: 'var(--ml-red)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Non-negotiable
        </span>
      </div>
    </SectionShell>
  );
}

function DivisionCard({
  division,
  body,
  highlight,
}: {
  division: 'petroleum' | 'express' | 'automotive' | 'roots';
  body: string;
  highlight?: boolean;
}) {
  return (
    <article
      style={{
        position: 'relative',
        padding: '20px 22px 24px',
        background: highlight ? 'var(--ml-charcoal)' : '#FFFFFF',
        color: highlight ? '#FFFFFF' : 'var(--ml-text-primary)',
        borderRadius: 'var(--ml-radius-md)',
        borderLeft: highlight ? '4px solid var(--ml-red)' : 'none',
        minHeight: 240,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: highlight
          ? 'none'
          : '0 1px 0 rgba(65, 64, 66, 0.06)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: highlight ? 'rgba(255, 255, 255, 0.5)' : 'var(--ml-text-muted)',
          }}
        >
          Division
        </span>
        <img
          src={`/brand/mapleleaf-${division}-${highlight ? 'light' : 'dark'}.svg`}
          alt=""
          aria-hidden="true"
          style={{ display: 'block', height: 28, width: 'auto' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: highlight ? 'rgba(255, 255, 255, 0.78)' : 'var(--ml-text-muted)',
          }}
        >
          {body}
        </p>
        {highlight && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-red)',
            }}
          >
            ● This brochure
          </span>
        )}
      </div>
    </article>
  );
}

// ===========================================================================
// 05 — Roles
// ===========================================================================

export function Roles() {
  return (
    <SectionShell id="roles" tone="cream">
      <SectionLabel>04 — Who Roots serves</SectionLabel>
      <BigDisplay>Four roles. One strict hierarchy.</BigDisplay>
      <p style={subhead}>
        Roots enforces the chain of command end-to-end. HQ authors, Area
        Managers approve, Site Managers execute, Employees confirm. Every
        permission, every view, every write — scoped to role by row-level
        security in the database itself.
      </p>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        <RoleCard
          tier="01"
          title="HQ Admin"
          scope="Entire network"
          accent
          actions={[
            'Author unit, POS and promo templates',
            'Create network-wide campaigns',
            'Manage the product catalogue',
            'Moderate the community board',
            'Run compliance reports',
          ]}
          quote="From one screen, I see every site, every active campaign, every fit-out in flight."
        />
        <RoleCard
          tier="02"
          title="Area Manager"
          scope="Multiple sites · geographic"
          actions={[
            'Onboard new sites into Roots',
            'Approve deviations from HQ standards',
            'Review local campaign performance',
            'Cover multiple Site Managers',
          ]}
          quote="I cover twelve sites. Roots means I don’t have to be on a forecourt to know it’s on-plan."
        />
        <RoleCard
          tier="03"
          title="Site Manager"
          scope="One site"
          actions={[
            'Modify the site planogram within HQ rails',
            'Confirm campaign installs on arrival',
            'Manage site staff and permissions',
            'Approve escalated substitutions',
          ]}
          quote="I know exactly what to restock, what to swap, and what HQ expects on the shelf by Friday."
        />
        <RoleCard
          tier="04"
          title="Employee"
          scope="One site · task-level"
          actions={[
            'Log product substitutions on the floor',
            'Install POS during campaign changeovers',
            'Report problems with a photo',
            'Confirm restocks',
          ]}
          quote="I open the app, I see my tasks for today, I tick them off. No WhatsApp chaos."
        />
      </div>

      <div
        style={{
          marginTop: 36,
          paddingTop: 18,
          borderTop: '0.5px solid var(--ml-border-default)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          fontSize: 12,
          color: 'var(--ml-text-muted)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 24,
            height: 2,
            background: 'var(--ml-gold-mid)',
            flexShrink: 0,
          }}
        />
        Hierarchy is enforced at the data layer, not just the UI. An
        Employee querying another site’s data gets an empty result — the
        database itself refuses.
      </div>
    </SectionShell>
  );
}

function RoleCard({
  tier,
  title,
  scope,
  actions,
  quote,
  accent,
}: {
  tier: string;
  title: string;
  scope: string;
  actions: string[];
  quote: string;
  accent?: boolean;
}) {
  return (
    <article
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--ml-radius-md)',
        padding: '20px 20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 460,
        boxShadow: '0 1px 0 rgba(65, 64, 66, 0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          Tier {tier}
        </span>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 'var(--ml-radius-sm)',
            background: 'var(--ml-off-white)',
            color: accent ? 'var(--ml-red)' : 'var(--ml-text-muted)',
            fontSize: 14,
          }}
        >
          {accent ? '●' : '○'}
        </span>
      </div>

      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: accent ? 'var(--ml-red)' : 'var(--ml-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
          {scope}
        </span>
      </div>

      <hr
        aria-hidden="true"
        style={{
          border: 0,
          borderTop: '0.5px solid var(--ml-border-default)',
          margin: 0,
        }}
      />

      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        Primary actions
      </span>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: 12.5,
          color: 'var(--ml-text-primary)',
          lineHeight: 1.45,
        }}
      >
        {actions.map((a) => (
          <li
            key={a}
            style={{
              display: 'grid',
              gridTemplateColumns: '12px 1fr',
              gap: 8,
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: 'var(--ml-red)', fontWeight: 700 }}>—</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>

      <div style={{ flex: 1 }} />

      <p
        style={{
          margin: 0,
          paddingTop: 14,
          borderTop: '0.5px solid var(--ml-border-default)',
          fontSize: 12,
          fontStyle: 'italic',
          color: 'var(--ml-text-muted)',
          lineHeight: 1.5,
        }}
      >
        “{quote}”
      </p>
    </article>
  );
}

// ===========================================================================
// 06 — Capabilities (charcoal section)
// ===========================================================================

export function Capabilities() {
  return (
    <SectionShell id="capabilities" tone="dark">
      <SectionLabel tone="dark">05 — Capabilities</SectionLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)',
          gap: 32,
          alignItems: 'end',
          marginBottom: 40,
        }}
      >
        <BigDisplay tone="dark">
          Three primary modules. Two supporting. One spine.
        </BigDisplay>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.78)',
            textAlign: 'right',
          }}
        >
          Plus <strong style={{ color: '#FFFFFF' }}>Admin Dashboard</strong>{' '}
          for HQ compliance, and{' '}
          <strong style={{ color: '#FFFFFF' }}>Community Board</strong> for
          franchisee-submitted product and fit-out ideas.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <ModuleCard
          n="01"
          title="Store Fitting Configurator"
          tagline="From empty shell to costed fit-out in an afternoon."
          body="Franchisees compose their shop floor from a library of standard units — gondolas, chillers, till counters, dump bins, forecourt fixtures. On submit, Roots assembles a structured Onesign quote for every piece of signage and furniture needed."
          chips={['Konva 2D canvas', 'Unit library', 'Auto-quote', 'OSD-YYYY-NNNNNN']}
          icon={<IconConfigurator />}
        />
        <ModuleCard
          n="02"
          title="Planogram Management"
          tagline="Every shelf, every slot, every substitution logged."
          body="Per-site shelf-level visibility into every product slot, with main / substitute A / substitute B product configuration. Employees log substitutions on shift; Site Managers approve escalations; HQ sees network-wide trends in one view."
          chips={['Shelf visualiser', 'Main + Sub A + Sub B', 'Employee logs', 'Live stocking']}
          icon={<IconPlanogram />}
        />
        <ModuleCard
          n="03"
          title="Campaign System"
          tagline="HQ authors once. Roots fans it out to every matching site."
          body="HQ creates a campaign, picks target unit types, uploads artwork per POS slot. Roots materialises a rollout per site with generated print packs and per-employee install checklists. Status flows PENDING → QUOTED → SHIPPED → INSTALLED."
          chips={['Targeted rollout', 'Generated print packs', 'Install checklists', 'Idempotent']}
          icon={<IconCampaign />}
        />
      </div>

      <div
        style={{
          marginTop: 48,
          paddingTop: 20,
          borderTop: '0.5px solid rgba(255, 255, 255, 0.18)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 8,
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <span>Auth &amp; hierarchy</span>
        <span>Site onboarding</span>
        <span>Configurator</span>
        <span>Campaign &amp; rollout</span>
        <span>Catalogue &amp; community</span>
      </div>
    </SectionShell>
  );
}

function ModuleCard({
  n,
  title,
  tagline,
  body,
  chips,
  icon,
}: {
  n: string;
  title: string;
  tagline: string;
  body: string;
  chips: string[];
  icon: React.ReactNode;
}) {
  return (
    <article
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '0.5px solid rgba(255, 255, 255, 0.12)',
        borderLeft: '3px solid var(--ml-red)',
        borderRadius: 'var(--ml-radius-md)',
        padding: '22px 22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 420,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 38,
            fontWeight: 900,
            color: 'var(--ml-red)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {n}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--ml-radius-sm)',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
      </div>

      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </h3>
        <span
          style={{
            display: 'block',
            marginTop: 4,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--ml-gold-mid)',
          }}
        >
          {tagline}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: 'rgba(255, 255, 255, 0.78)',
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          paddingTop: 12,
          borderTop: '0.5px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {chips.map((c) => (
          <span
            key={c}
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.78)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '0.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 9999,
              padding: '4px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {c}
          </span>
        ))}
      </div>
    </article>
  );
}

// ===========================================================================
// 07 — Configurator deep-dive (with mockup)
// ===========================================================================

export function ConfiguratorSection() {
  return (
    <SectionShell id="configurator" tone="cream">
      <SectionLabel>Module 01 — Configurator</SectionLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <div>
          <BigDisplay>The floor plan, on a drag-drop canvas.</BigDisplay>
          <p style={subhead}>
            A franchisee opens an empty site. They drag units from the
            library rail onto a 2D canvas. Colour-code by promo section.
            Request a fit-out quote. Done.
          </p>

          <ul
            style={{
              listStyle: 'none',
              margin: '24px 0 0',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <FeaturePoint
              tag="A"
              title="Unit library"
              body="Standardised furniture from HQ — gondolas, chillers, tills."
            />
            <FeaturePoint
              tag="B"
              title="Floor-plan canvas"
              body="Konva-powered drag, rotate, resize. Debounced persistence."
            />
            <FeaturePoint
              tag="C"
              title="Inspector"
              body="Promo-section tagging, labels, shelf config per selected unit."
            />
            <FeaturePoint
              tag="D"
              title="Request quote"
              body="Primary red CTA. Generates OSD-YYYY-NNNNNN reference."
            />
          </ul>
        </div>

        <ConfiguratorMockup />
      </div>
    </SectionShell>
  );
}

function FeaturePoint({
  tag,
  title,
  body,
}: {
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--ml-red)',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {tag}
      </span>
      <div>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ml-text-primary)',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 2,
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            lineHeight: 1.5,
          }}
        >
          {body}
        </span>
      </div>
    </li>
  );
}

function ConfiguratorMockup() {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--ml-radius-lg)',
        boxShadow: '0 24px 64px rgba(65, 64, 66, 0.14), 0 1px 0 rgba(65,64,66,0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          background: 'var(--ml-charcoal)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Wordmark division="roots" surface="dark" size="sm" />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>Bromyard Express · Planogram</span>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--ml-red)',
              color: '#FFFFFF',
              fontSize: 9,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            HQ
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: '10px 18px',
          background: '#FFFFFF',
          borderBottom: '0.5px solid var(--ml-border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--ml-text-muted)' }}>
          Sites &nbsp;·&nbsp; Bromyard Express &nbsp;·&nbsp;{' '}
          <strong style={{ color: 'var(--ml-text-primary)' }}>
            Planogram
          </strong>
        </span>
        <span
          style={{
            background: 'var(--ml-red)',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: 'var(--ml-radius-md)',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          Request fit-out quote
        </span>
      </div>

      {/* Three-pane layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 160px',
          minHeight: 380,
        }}
      >
        {/* Library rail */}
        <div
          style={{
            padding: '14px 12px',
            borderRight: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-text-muted)',
              marginBottom: 4,
            }}
          >
            Library
          </span>
          {['Gondola', 'Endcap', 'Chiller', 'Till', 'Coffee', 'Dump bin'].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  background: 'var(--ml-off-white)',
                  borderRadius: 'var(--ml-radius-sm)',
                  fontSize: 11,
                  color: 'var(--ml-text-primary)',
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 8,
                    background: '#FFFFFF',
                    border: '0.5px solid var(--ml-border-default)',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                {label}
              </div>
            )
          )}
        </div>

        {/* Canvas */}
        <div
          style={{
            position: 'relative',
            background:
              'repeating-linear-gradient(0deg, var(--ml-off-white) 0 23px, transparent 23px 24px), repeating-linear-gradient(90deg, var(--ml-off-white) 0 23px, transparent 23px 24px), #FCFAF7',
            padding: 18,
            display: 'grid',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 18,
          }}
        >
          {/* Row 1: gondolas + endcap */}
          <div style={{ display: 'flex', gap: 10 }}>
            <CanvasUnit color="#E8B7B7" label="Gondola 1000" />
            <CanvasUnit color="#E8B7B7" label="Gondola 1000" />
            <CanvasUnit color="#E5C088" label="Endcap" />
          </div>
          {/* Row 2: chillers + coffee */}
          <div style={{ display: 'flex', gap: 10 }}>
            <CanvasUnit color="#A6C8E5" label="Chiller 1875" />
            <CanvasUnit color="#A6C8E5" label="Chiller 1250" />
            <CanvasUnit color="#C2A782" label="Coffee" />
          </div>
          {/* Row 3: tills + selected dump bin */}
          <div style={{ display: 'flex', gap: 10 }}>
            <CanvasUnit color="#D7D7D7" label="Till" />
            <CanvasUnit color="#D7D7D7" label="Till" />
            <CanvasUnit
              color="#F1C8C8"
              label="Dump bin"
              selected
            />
          </div>
        </div>

        {/* Inspector */}
        <div
          style={{
            padding: '14px 14px',
            borderLeft: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: 11,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-text-muted)',
            }}
          >
            Inspector
          </span>
          <div>
            <span
              style={{ fontWeight: 600, fontSize: 12, color: 'var(--ml-text-primary)' }}
            >
              Dump bin · A1
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: 'ui-monospace, Menlo, monospace',
                color: 'var(--ml-text-muted)',
                fontSize: 10,
                marginTop: 2,
              }}
            >
              DUMPBIN_750
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ml-text-muted)',
              }}
            >
              Promo section
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <PromoChip filled>Confectionery</PromoChip>
              <PromoChip>Soft Drinks</PromoChip>
              <PromoChip>Meal Deal</PromoChip>
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ml-text-muted)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Label
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 11,
                padding: '6px 10px',
                background: 'var(--ml-off-white)',
                borderRadius: 'var(--ml-radius-sm)',
                color: 'var(--ml-text-primary)',
              }}
            >
              A1 Easter dump
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasUnit({
  color,
  label,
  selected,
}: {
  color: string;
  label: string;
  selected?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: color,
        borderRadius: 4,
        padding: '10px 12px',
        fontSize: 10,
        fontWeight: 500,
        color: 'rgba(31, 31, 31, 0.78)',
        outline: selected ? '2px solid var(--ml-red)' : 'none',
        outlineOffset: 2,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {label}
    </div>
  );
}

function PromoChip({
  children,
  filled,
}: {
  children: React.ReactNode;
  filled?: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '3px 8px',
        borderRadius: 9999,
        background: filled ? 'var(--ml-red)' : 'transparent',
        color: filled ? '#FFFFFF' : 'var(--ml-charcoal)',
        border: filled ? 'none' : '0.5px solid var(--ml-border-default)',
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

// ===========================================================================
// 08 — Planogram deep-dive (mockup left, copy right)
// ===========================================================================

export function PlanogramSection() {
  return (
    <SectionShell id="planogram" tone="cream">
      <SectionLabel>Module 02 — Planogram</SectionLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <PlanogramMockup />

        <div>
          <BigDisplay>Every shelf. Every slot. Every swap, logged.</BigDisplay>
          <p style={subhead}>
            Site Managers see their shop at the slot level. Every position
            has a main product and two defined substitutes — so when Dairy
            Milk runs out, staff know exactly what to put in its place.
          </p>

          <dl
            style={{
              margin: '24px 0 0',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 14,
            }}
          >
            <DefRow term="Facings" def="How many units of a product are visible from the front." />
            <DefRow term="Main / Sub A / Sub B" def="A primary product plus two approved fallbacks per slot." />
            <DefRow term="Activity log" def="Append-only audit trail of every substitution." />
            <DefRow term="Shelf canvas" def="Lightweight SVG — no heavy libraries, pixel-perfect." />
          </dl>
        </div>
      </div>
    </SectionShell>
  );
}

function DefRow({ term, def }: { term: string; def: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 14,
        alignItems: 'baseline',
        paddingBottom: 12,
        borderBottom: '0.5px solid var(--ml-border-default)',
      }}
    >
      <dt
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ml-red)',
        }}
      >
        {term}
      </dt>
      <dd style={{ margin: 0, fontSize: 12.5, color: 'var(--ml-text-muted)', lineHeight: 1.5 }}>
        {def}
      </dd>
    </div>
  );
}

function PlanogramMockup() {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--ml-radius-lg)',
        boxShadow: '0 24px 64px rgba(65, 64, 66, 0.14)',
        overflow: 'hidden',
      }}
    >
      {/* chrome */}
      <div
        style={{
          background: 'var(--ml-charcoal)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={dotStyle('#ff5f57')} />
        <span style={dotStyle('#febb2e')} />
        <span style={dotStyle('#28c840')} />
        <span
          style={{
            marginLeft: 12,
            fontSize: 11,
            color: 'rgba(255,255,255,0.78)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Roots
        </span>
        <span
          style={{
            marginLeft: 12,
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Bromyard Express · Planogram
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.16em',
          }}
        >
          SITE MANAGER
        </span>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--ml-red)',
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          KP
        </span>
      </div>

      {/* breadcrumb + actions */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '0.5px solid var(--ml-border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--ml-text-muted)' }}>
          Sites &nbsp;·&nbsp; Bromyard Express &nbsp;·&nbsp;{' '}
          <strong style={{ color: 'var(--ml-text-primary)' }}>Planogram</strong>
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
            Autosaved 11:42
          </span>
          <span
            style={{
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              border: '0.5px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-sm)',
            }}
          >
            Preview
          </span>
          <span
            style={{
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'var(--ml-red)',
              color: '#FFFFFF',
              borderRadius: 'var(--ml-radius-sm)',
            }}
          >
            Publish
          </span>
        </div>
      </div>

      {/* stats */}
      <div
        style={{
          padding: '14px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '0.5px solid var(--ml-border-default)',
          gap: 0,
        }}
      >
        <Stat n="5" label="Shelves" />
        <Stat n="21" label="Slots filled" />
        <Stat n="3" label="Over-height flags" emphasis />
        <Stat n="2" label="Empty shelves" />
      </div>

      {/* Section header + shelves */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            background:
              'linear-gradient(120deg, var(--ml-gold-light) 0%, var(--ml-gold-mid) 50%, var(--ml-gold-dark) 100%)',
            padding: '20px 22px',
            borderRadius: 'var(--ml-radius-md)',
            color: '#FFFFFF',
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.005em',
            }}
          >
            BAKERY
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 11,
              color: 'rgba(255,255,255,0.85)',
              marginTop: 2,
              letterSpacing: '0.04em',
            }}
          >
            1000×300 mm · right jnc
          </span>
        </div>

        <ShelfRow
          label="SHELF 5"
          chip="SHELF STRIP 1M"
          fill="948 / 1000 mm"
          slots={[
            { code: 'AI', name: 'AB InBev' },
            { code: 'CO', name: 'Coca-Cola', warn: true, warnText: '< 1W · 2H' },
            { code: 'CO', name: 'Coca-Cola' },
            { code: 'CO', name: 'Coca-Cola' },
            { code: 'CA', name: 'Cadbury' },
            { code: 'HO', name: 'Hovis' },
            { code: 'KS', name: 'KP Snacks' },
            { code: 'KS', name: 'KP Snacks' },
          ]}
        />

        <ShelfRow
          label="SHELF 4"
          chip="SHELF STRIP 1M"
          fill="960 / 1000 mm"
          slots={[
            { code: 'CO', name: 'Coca-Cola' },
            { code: 'HA', name: 'Haribo', warn: true, warnText: 'OVER HEIGHT' },
            { code: 'HA', name: 'Haribo' },
            { code: 'HA', name: 'Haribo' },
            { code: 'HA', name: 'Haribo', warn: true, warnText: 'OVER HEIGHT' },
            { code: 'HA', name: 'Haribo' },
            { code: 'HA', name: 'Haribo', sub: '2W' },
          ]}
        />

        <ShelfRow
          label="SHELF 3"
          chip="SHELF STRIP 1M"
          fill="328 / 1000 mm"
          slots={[
            { code: 'CA', name: 'Cadbury' },
            { code: 'HS', name: 'Highstreet', warn: true, warnText: 'OVER HEIGHT' },
            { code: 'HA', name: 'Maltesers', warn: true, warnText: 'OVER HEIGHT' },
          ]}
        />
      </div>
    </div>
  );
}

function dotStyle(color: string): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
  };
}

function Stat({
  n,
  label,
  emphasis,
}: {
  n: string;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: emphasis ? 'var(--ml-red)' : 'var(--ml-text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ShelfRow({
  label,
  chip,
  fill,
  slots,
}: {
  label: string;
  chip: string;
  fill: string;
  slots: Array<{ code: string; name: string; warn?: boolean; warnText?: string; sub?: string }>;
}) {
  return (
    <div
      style={{
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 90px',
          alignItems: 'stretch',
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            background: 'var(--ml-off-white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ml-text-muted)',
            fontWeight: 700,
            fontSize: 13,
            borderRight: '0.5px solid var(--ml-border-default)',
          }}
        >
          {label.replace(/\D/g, '')}
        </div>
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: '1fr',
            gap: 0,
          }}
        >
          {slots.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                padding: '14px 8px 12px',
                borderRight:
                  i === slots.length - 1
                    ? 'none'
                    : '0.5px solid var(--ml-border-default)',
                background: s.warn ? 'rgba(225, 40, 40, 0.06)' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {s.warn && s.warnText && (
                <span
                  style={{
                    position: 'absolute',
                    top: -1,
                    left: -1,
                    right: -1,
                    background: 'var(--ml-red)',
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '2px 4px',
                    textAlign: 'center',
                  }}
                >
                  ⚠ {s.warnText}
                </span>
              )}
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--ml-text-muted)',
                  marginTop: s.warn ? 14 : 0,
                }}
              >
                #{i + 1}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ml-text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                {s.code}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--ml-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {s.name}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: 8,
              fontSize: 10,
              color: 'var(--ml-text-muted)',
              borderRight: 'none',
              borderLeft: '0.5px dashed var(--ml-border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            + Add slot
          </div>
        </div>
        <div
          style={{
            background: 'var(--ml-off-white)',
            borderLeft: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--ml-text-muted)',
          }}
        >
          {fill}
        </div>
      </div>
      <div
        style={{
          padding: '4px 12px',
          background: 'var(--ml-off-white)',
          borderTop: '0.5px solid var(--ml-border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        <span>{label}</span>
        <span>{chip}</span>
      </div>
    </div>
  );
}

// ===========================================================================
// 09 — Campaign system (6-step flow)
// ===========================================================================

export function CampaignSystem() {
  return (
    <SectionShell id="campaigns" tone="cream">
      <SectionLabel>Module 03 — Campaign system</SectionLabel>
      <BigDisplay>From HQ approval to forecourt install — one tracked flow.</BigDisplay>
      <p style={subhead}>
        HQ creates a campaign once. Roots materialises it across every
        matching site in the network, idempotent by design. No duplicate
        quotes. No missed sites. No WhatsApp follow-ups.
      </p>

      <ol
        style={{
          listStyle: 'none',
          margin: '40px 0 0',
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <FlowStep n="01" title="HQ authors" body="Name, dates, target unit types, artwork uploaded per POS slot." status="DRAFT" first />
        <FlowStep n="02" title="Schedule rollout" body="Roots finds every matching site and creates a per-site rollout." status="PENDING" />
        <FlowStep n="03" title="Onesign quote fires" body="Print packs quoted via a structured payload." status="QUOTED" />
        <FlowStep n="04" title="Packs shipped" body="Webhook confirms dispatch from the Onesign production line." status="SHIPPED" />
        <FlowStep n="05" title="Staff install" body="Employees tick off install tasks on shift, with a photo." status="INSTALLING" />
        <FlowStep n="06" title="Campaign live" body="Rollout transitions to INSTALLED. HQ sees 100% network compliance." status="INSTALLED" />
      </ol>

      <div
        style={{
          marginTop: 36,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        <div
          style={{
            background: 'var(--ml-charcoal)',
            color: '#FFFFFF',
            borderRadius: 'var(--ml-radius-md)',
            padding: '20px 22px',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: 'var(--ml-radius-sm)',
              background:
                'linear-gradient(135deg, var(--ml-gold-light), var(--ml-gold-dark))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 18,
            }}
          >
            ✓
          </span>
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.55)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              What the customer sees
            </span>
            <h4
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              Quote approved — print pack auto-generated
            </h4>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 12.5,
                color: 'rgba(255, 255, 255, 0.78)',
                lineHeight: 1.55,
              }}
            >
              When HQ approves a campaign, every affected site instantly
              gets a ready-to-install pack: printable shelf strips, signage
              at the right dimensions, and a step-by-step checklist keyed
              to their exact planogram. No follow-up email, no phone call.
            </p>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderLeft: '4px solid var(--ml-red)',
            borderRadius: 'var(--ml-radius-md)',
            padding: '20px 22px',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-red)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Why it matters
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: 'var(--ml-text-primary)',
              lineHeight: 1.55,
            }}
          >
            Today, a campaign across 40 sites means 40 phone calls, 40
            email threads and 40 risks of something being wrong. Roots
            collapses that into one approval and one live dashboard.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

function FlowStep({
  n,
  title,
  body,
  status,
  first,
}: {
  n: string;
  title: string;
  body: string;
  status: string;
  first?: boolean;
}) {
  return (
    <li
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--ml-radius-md)',
        padding: '14px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        minHeight: 220,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -10,
          left: 14,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: first ? 'var(--ml-red)' : '#FFFFFF',
          color: first ? '#FFFFFF' : 'var(--ml-red)',
          border: first ? 'none' : '1.5px solid var(--ml-red)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {n}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 1,
          left: 36,
          right: -6,
          height: 1,
          background: 'var(--ml-border-default)',
        }}
      />
      <span
        style={{
          marginTop: 12,
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ml-text-primary)',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--ml-text-muted)',
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {body}
      </span>
      <span
        style={{
          alignSelf: 'flex-start',
          marginTop: 8,
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ml-red)',
          background: 'rgba(225, 40, 40, 0.08)',
          padding: '3px 8px',
          borderRadius: 9999,
        }}
      >
        {status}
      </span>
    </li>
  );
}

// ===========================================================================
// 10 — Roadmap (5 phase cards)
// ===========================================================================

export function Roadmap() {
  return (
    <SectionShell id="roadmap" tone="cream">
      <SectionLabel>06 — Where we are, where we’re going</SectionLabel>
      <BigDisplay>Phased delivery. Phase 1 on the floor today.</BigDisplay>
      <p style={subhead}>
        Roots is built in independently reviewable phases. Each milestone
        merges cleanly on the last. This scope map shows what is already
        in production, what is mid-build, and what leadership sign-off
        unlocks next.
      </p>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <PhaseCard
          phase="Phase 1"
          title="Foundations"
          status="SHIPPED"
          done
          highlight
          items={[
            'Authentication spine + role hierarchy',
            'Sites admin + HQ library',
            'Configurator with Konva canvas',
            'Onesign quote bridge (stub)',
            'Community board (stub)',
          ]}
        />
        <PhaseCard
          phase="Phase 1.5"
          title="Shelf visualiser"
          status="IN FLIGHT"
          items={[
            'SVG shelf canvas (no library)',
            'Slot-level product picker',
            'Main / Sub A / Sub B config',
            'Open Food Facts nightly sync',
            'Activity-log surface in UI',
          ]}
        />
        <PhaseCard
          phase="Phase 2"
          title="Campaigns at network scale"
          status="NEXT"
          items={[
            'Campaign authoring UI',
            'Rollout materialisation engine',
            'Onesign Portal webhook',
            'Per-rollout PDF print packs',
            'Cross-site rollout dashboard',
          ]}
        />
        <PhaseCard
          phase="Phase 3"
          title="Mobile for shift staff"
          status="PLANNED"
          items={[
            'PWA wrapper, add-to-home-screen',
            'Employee task lists on phone',
            'Photo-confirm installs',
            'Offline-first for the aisle',
            'Substitution logging on the floor',
          ]}
        />
        <PhaseCard
          phase="Phase 4"
          title="Analytics & SSO"
          status="PLANNED"
          items={[
            'Admin dashboard analytics',
            'Community → catalogue promotion',
            'SSO via Azure / Google Workspace',
            'Substitution trend intelligence',
            'Network performance reporting',
          ]}
        />
      </div>

      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            padding: '16px 18px',
            borderRadius: 'var(--ml-radius-md)',
            borderLeft: '4px solid var(--ml-red)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-red)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Phase 1 acceptance
          </span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-primary)', lineHeight: 1.5 }}>
            Ten-step walkthrough, from sign-in to submitting a live Onesign
            quote on a real forecourt. Reviewable today.
          </p>
        </div>
        <div
          style={{
            background: 'rgba(236, 187, 127, 0.18)',
            padding: '16px 18px',
            borderRadius: 'var(--ml-radius-md)',
            borderLeft: '4px solid var(--ml-gold-mid)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-gold-dark)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Decision needed
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ml-text-primary)',
              lineHeight: 1.5,
            }}
          >
            Buy-in to scope Phase 2 — the campaign engine that lets HQ roll
            a promo across the entire network in one action.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

function PhaseCard({
  phase,
  title,
  items,
  status,
  done,
  highlight,
}: {
  phase: string;
  title: string;
  items: string[];
  status: string;
  done?: boolean;
  highlight?: boolean;
}) {
  return (
    <article
      style={{
        background: highlight ? 'var(--ml-charcoal)' : '#FFFFFF',
        color: highlight ? '#FFFFFF' : 'var(--ml-text-primary)',
        borderRadius: 'var(--ml-radius-md)',
        padding: '18px 18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 360,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: highlight ? 'rgba(255, 255, 255, 0.6)' : 'var(--ml-text-muted)',
          }}
        >
          {phase}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 9999,
            background: done
              ? 'var(--ml-red)'
              : highlight
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(65, 64, 66, 0.08)',
            color: done
              ? '#FFFFFF'
              : highlight
                ? 'rgba(255, 255, 255, 0.7)'
                : 'var(--ml-text-muted)',
          }}
        >
          {status}
        </span>
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          color: highlight ? '#FFFFFF' : 'var(--ml-text-primary)',
        }}
      >
        {title}
      </h3>
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 2,
          background: highlight ? 'var(--ml-red)' : 'var(--ml-gold-mid)',
        }}
      />
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          fontSize: 12,
          color: highlight ? 'rgba(255, 255, 255, 0.78)' : 'var(--ml-text-muted)',
          lineHeight: 1.5,
        }}
      >
        {items.map((it) => (
          <li
            key={it}
            style={{
              display: 'grid',
              gridTemplateColumns: '12px 1fr',
              gap: 6,
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: highlight ? 'var(--ml-red)' : 'var(--ml-red)' }}>
              —
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// ===========================================================================
// 11 — Stack
// ===========================================================================

export function Stack() {
  const rows: [string, string, string][] = [
    ['FRAMEWORK', 'Next.js 15 · App Router', 'Server components, streaming, matches in-house stack.'],
    ['LANGUAGE', 'TypeScript · strict', 'No ‘any’ without an explanation.'],
    ['DATABASE', 'Supabase · Postgres + RLS', 'Row-level security is the auth model, not a layer on top.'],
    ['AUTH', 'Supabase Auth · magic link', 'SSO considered for Phase 4.'],
    ['CLIENT STATE', 'Zustand + immer', 'Minimal. Server is the source of truth.'],
    ['STYLING', 'Tailwind 4 + CSS variables', 'Brand tokens as CSS vars; Tailwind for layout.'],
    ['UI PRIMITIVES', 'shadcn/ui, themed', 'Accessible base, brandable defaults.'],
    ['FLOOR-PLAN CANVAS', 'Konva.js · react-konva', '2D drag-rotate-transform, survives large rosters.'],
    ['SHELF CANVAS', 'SVG · no library', 'Pixel-perfect, lightweight, React-native.'],
    ['PDF GENERATION', '@react-pdf/renderer', 'Quote packs, rendered server-side.'],
    ['EMAIL', 'Resend', 'Transactional invites and rollout alerts.'],
    ['DEPLOYMENT', 'Vercel · roots.mapleleafpetroleum.com', 'Subdomain via DNS CNAME.'],
  ];
  const principles: [string, string][] = [
    ['01', 'Supabase is the source of truth — no localStorage for domain data.'],
    ['02', 'Row-level security is the auth model — the UI is only a safeguard.'],
    ['03', 'Server components by default. Client only when interactivity demands it.'],
    ['04', 'Every Server Action validates input with Zod before touching the DB.'],
    ['05', 'British English. Sentence case. Plain words, not jargon.'],
    ['06', 'Mapleleaf Red on the wordmark only. Gold for premium moments only.'],
  ];
  return (
    <SectionShell id="stack" tone="cream">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <div>
          <SectionLabel>07 — Under the bonnet</SectionLabel>
          <BigDisplay>Stack at a glance.</BigDisplay>
          <table
            style={{
              marginTop: 24,
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
            }}
          >
            <tbody>
              {rows.map(([label, value, body]) => (
                <tr key={label}>
                  <td
                    style={{
                      padding: '12px 0',
                      borderTop: '0.5px solid var(--ml-border-default)',
                      verticalAlign: 'top',
                      width: 130,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.16em',
                      color: 'var(--ml-text-muted)',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: '12px 12px',
                      borderTop: '0.5px solid var(--ml-border-default)',
                      verticalAlign: 'top',
                      width: 200,
                      fontWeight: 600,
                      color: 'var(--ml-text-primary)',
                    }}
                  >
                    {value}
                  </td>
                  <td
                    style={{
                      padding: '12px 0',
                      borderTop: '0.5px solid var(--ml-border-default)',
                      verticalAlign: 'top',
                      color: 'var(--ml-text-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    {body}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-red)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Engineering principles
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--ml-text-primary)',
            }}
          >
            How we keep Roots buildable for years.
          </h3>

          <ul
            style={{
              listStyle: 'none',
              margin: '24px 0 0',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {principles.map(([n, body]) => (
              <li
                key={n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: 'var(--ml-red)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {n}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ml-text-primary)', lineHeight: 1.5 }}>
                  {body}
                </span>
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 28,
              padding: '18px 20px',
              background: 'var(--ml-off-white)',
              borderLeft: '4px solid var(--ml-red)',
              borderRadius: 'var(--ml-radius-md)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ml-red)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              SKU visual guidance
            </span>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ml-text-primary)' }}>
              Every product, pictured — so employees can’t mis-stock.
            </h4>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12.5,
                color: 'var(--ml-text-muted)',
                lineHeight: 1.55,
              }}
            >
              Roots pulls the full SKU catalogue from Open Food Facts
              nightly — product name, brand, category, and front-pack
              photo. Every shelf slot in the planogram renders the real
              pack image at the right facing count, so an employee
              re-merchandising an aisle sees exactly what goes where
              before they touch a single box.
            </p>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '0.5px solid var(--ml-border-default)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              <SkuStat n="~72k" label="UK SKUs synced" emphasis />
              <SkuStat n="Nightly" label="Refresh cadence" />
              <SkuStat n="Off-brand" label="Fallback icon" />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function SkuStat({
  n,
  label,
  emphasis,
}: {
  n: string;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: emphasis ? 'var(--ml-red)' : 'var(--ml-text-primary)',
          letterSpacing: '-0.01em',
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ===========================================================================
// 12 — Closing CTA
// ===========================================================================

export function Closing({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section
      style={{
        background: 'var(--ml-charcoal)',
        color: '#FFFFFF',
        padding: '88px 32px 96px',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <div>
          <img
            src="/brand/mapleleaf-icon.svg"
            alt=""
            aria-hidden="true"
            style={{ display: 'block', height: 64, width: 'auto', marginBottom: 14 }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 16,
            }}
          >
            <span style={{ color: 'var(--ml-red)', fontWeight: 700 }}>Mapleleaf</span>{' '}
            Roots
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(48px, 7vw, 84px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: '#FFFFFF',
            }}
          >
            Let’s put{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--ml-gold-light) 0%, var(--ml-gold-mid) 50%, var(--ml-gold-dark) 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              Phase 2
            </span>{' '}
            on the roadmap.
          </h2>
          <p
            style={{
              margin: '20px 0 0',
              maxWidth: 460,
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.78)',
            }}
          >
            Phase 1 is on the floor. Phase 1.5 is in flight. The next
            unlock — the campaign engine that rolls a promo across the
            network in one action — needs leadership sign-off.
          </p>

          <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={isAuthed ? '/dashboard' : '/login'}
              style={{
                padding: '12px 22px',
                background: 'var(--ml-red)',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                borderRadius: 9999,
                textDecoration: 'none',
              }}
            >
              {isAuthed ? 'Open the app →' : 'Sign in →'}
            </Link>
            <a
              href="mailto:michael@onesign.co.uk?subject=Mapleleaf%20Roots%20%E2%80%94%20Phase%202%20scoping"
              style={{
                padding: '12px 22px',
                background: 'transparent',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                borderRadius: 9999,
                textDecoration: 'none',
                border: '0.5px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              Book a Phase 2 review →
            </a>
          </div>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                width: 28,
                height: 2,
                background: 'var(--ml-gold-mid)',
                marginBottom: 6,
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.55)',
              }}
            >
              Next meeting
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
              Scope Phase 2 · Early May 2026
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '0.5px solid rgba(255, 255, 255, 0.12)',
            borderLeft: '4px solid var(--ml-red)',
            borderRadius: 'var(--ml-radius-md)',
            padding: '24px 26px',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ml-gold-mid)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Build partner
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.005em',
            }}
          >
            Onesign &amp; Digital
          </h3>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.78)',
              lineHeight: 1.55,
            }}
          >
            Design and engineering, end to end. Onesign production
            pipeline for quotes and print packs. Claude Code for milestone
            delivery under human review.
          </p>

          <hr
            style={{
              margin: '20px 0',
              border: 0,
              borderTop: '0.5px solid rgba(255, 255, 255, 0.12)',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            <div>
              <span style={contactLabel}>Project lead</span>
              <span style={contactValue}>Michael Peacock</span>
              <a
                href="mailto:michael@onesign.co.uk"
                style={{ ...contactValue, color: 'var(--ml-gold-mid)' }}
              >
                michael@onesign.co.uk
              </a>
            </div>
            <div>
              <span style={contactLabel}>Repository</span>
              <span style={contactValue}>mapleleaf-roots</span>
              <span
                style={{ ...contactValue, color: 'rgba(255, 255, 255, 0.6)' }}
              >
                PeacockIllustrated/GitHub
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const contactLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(255, 255, 255, 0.55)',
  marginBottom: 6,
};
const contactValue: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#FFFFFF',
  textDecoration: 'none',
};

// ===========================================================================
// Shared bits
// ===========================================================================

function SectionShell({
  id,
  tone,
  children,
}: {
  id?: string;
  tone: 'cream' | 'dark';
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        background: tone === 'dark' ? 'var(--ml-charcoal)' : 'transparent',
        color: tone === 'dark' ? '#FFFFFF' : 'var(--ml-text-primary)',
        padding: '96px 32px',
        scrollMarginTop: 88,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

function SectionLabel({
  children,
  tone = 'cream',
}: {
  children: React.ReactNode;
  tone?: 'cream' | 'dark';
}) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: tone === 'dark' ? 'var(--ml-gold-mid)' : 'var(--ml-red)',
        marginBottom: 16,
      }}
    >
      {children}
    </span>
  );
}

function BigDisplay({
  children,
  tone = 'cream',
}: {
  children: React.ReactNode;
  tone?: 'cream' | 'dark';
}) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 'clamp(38px, 5.4vw, 72px)',
        fontWeight: 900,
        lineHeight: 1.02,
        letterSpacing: '-0.02em',
        color: tone === 'dark' ? '#FFFFFF' : 'var(--ml-text-primary)',
        maxWidth: 920,
      }}
    >
      {children}
    </h2>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'var(--ml-red)' }}>{children}</span>;
}

const subhead: React.CSSProperties = {
  margin: '20px 0 0',
  maxWidth: 640,
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--ml-text-muted)',
};

const smallCopy: React.CSSProperties = {
  margin: '14px 0 0',
  maxWidth: 480,
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--ml-text-muted)',
};

// ===========================================================================
// Module icons (small, inline, recoloured by parent)
// ===========================================================================

function IconConfigurator() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

function IconPlanogram() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <rect x={3} y={5} width={18} height={4} stroke="currentColor" strokeWidth={1.6} />
      <rect x={3} y={11} width={18} height={4} stroke="currentColor" strokeWidth={1.6} />
      <rect x={3} y={17} width={18} height={2} stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

function IconCampaign() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6l11 5V4z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M15 9a3 3 0 0 1 0 6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
