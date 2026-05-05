/**
 * Generate SQL that seeds five demo campaigns with full artwork.
 *
 * Usage:
 *   tsx scripts/seed-campaign-artwork/index.ts > /tmp/seed.sql
 *
 * Each design is rendered as a self-contained SVG, encoded as a data URL,
 * and stashed in campaign_artwork.artwork_url. The artwork-panel UI reads
 * the URL into an <img>, so SVG data URLs preview correctly in-browser.
 */

// ---- Brand tokens -----------------------------------------------------------

const BRAND = {
  red: '#E12828',
  charcoal: '#1F1F1F',
  cream: '#F7F5F0',
  gold: '#C9A24A',
  navy: '#15233D',
  blueIce: '#A6C8E5',
  lime: '#C9D960',
  ember: '#E8842A',
  muted: '#8A8580',
};

// ---- Static IDs from the live DB --------------------------------------------
// (resolved earlier via MCP — paste rather than re-fetch to keep things
// deterministic and reviewable.)

const HQ_USER_ID = '59d8a472-975f-460d-812c-2452692554d4';

const POS_SLOT = {
  SHELF_STRIP_1000: '8711474f-4576-42a4-92d5-060f4d7e31aa', // 1000×32
  ENDCAP_POSTER_A1: '5e956a12-79fc-4975-b3cf-950ab66a442a', // 594×841
  ENDCAP_POSTER_A2: '75d492e9-5d71-4c0f-a65b-1e5ffce2b967', // 420×594
  WALL_POSTER_A1: 'cee922c8-45a9-498b-9f07-41e2b1fa2a10',  // 594×841
  WALL_POSTER_A2: '6e52e3e4-d30f-42f5-8e91-278b2b30e819',  // 420×594
  HEADER_BOARD_1000: '986e479b-b561-496f-b78a-7e3f2357bb14', // 1000×300
  WINDOW_VINYL_FULL: 'f9b12a65-f766-4e51-9ebc-76492641ed54', // 1800×600
  WINDOW_DOOR_VINYL: '603aac39-b862-4b6b-a40e-39ec4ade8334', // 400×800
  COUNTER_MAT_A3: 'b10aa76d-e458-4456-b25f-bfeffdf56ad9',  // 420×297
  FLOOR_GRAPHIC_500: 'f36d8fed-8486-4458-b2c0-ab075457bd08', // 500×500
  CEILING_HANGER_A3: '2d21a822-25fd-4752-9167-a88cb091f318', // 420×297
  PUMP_TOPPER_1000: 'b745f54a-3cb8-4f1f-830b-6959d8a4872a', // 1000×250
  TOTEM_AD_PANEL: '1348c6b6-8619-4807-a636-5416b6a526c8',  // 1200×800
};

const UNIT = {
  GONDOLA_AISLE_1000: '74598132-5ff3-46af-8598-fdd99a8f464b',
  ENDCAP_1000: '757ea2e0-d0df-4d08-aa67-3b5749a0b09d',
  CHILL_MULTIDECK_1875: '9a9332c8-e936-445d-bdc5-cb4c80900441',
  COFFEE_STATION: '6abf5777-6062-44fe-bd73-c71b6cab23f5',
  TILL_STANDARD: '801ddaba-cd05-4475-a6de-334686fac8c9',
  WIN_FULL_1800: 'd973044a-c905-4e52-9cbb-dca63eb49248',
  TOTEM_MAIN: '3e1b3871-a057-4c36-918e-8adab1513f69',
  PUMP_ISLAND: 'd28ce882-861a-4053-90a4-d28c14a60ce5',
  ENTRY_SIGN: 'a0038dfc-297c-4bd6-9342-8b57e019d87a',
};

const PROMO = {
  SOFT_DRINKS: 'b40dab09-b268-4cab-b14f-30448e1975ab',
  CONFECTIONERY: '8246ea37-4299-4538-abf4-8f7b16436f49',
  MEAL_DEAL: '58dfaee6-eef2-49fe-998b-f6920ef9d91e',
  HOT_DRINKS: '51e156fe-aba7-4f37-909a-1cd86e178dc2',
  FORECOURT: 'c7e2aa1f-9c2b-4d8e-a106-cff3be22fc81',
  SEASONAL: 'c32b9f42-858e-4709-ac4d-81946a2e51db',
};

// ---- SVG helpers ------------------------------------------------------------

function svg(width: number, height: number, body: string): string {
  // Format-correct viewBox so the design scales cleanly to any print size.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" font-family="Poppins, system-ui, sans-serif">${body}</svg>`;
}

function dataUrl(svgString: string): string {
  // base64 keeps it stable through SQL string-literal escaping.
  return `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
}

function bg(width: number, height: number, fill = BRAND.cream): string {
  return `<rect width="${width}" height="${height}" fill="${fill}"/>`;
}

function accentBar(
  x: number,
  y: number,
  w: number,
  h: number,
  fill = BRAND.red
): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="2"/>`;
}

// ---- Designs ----------------------------------------------------------------

interface Design {
  posSlotId: string;
  unitTypeId: string;
  promoSectionId?: string | null;
  notes: string;
  // SVG dimensions follow real-world mm × 1 (so 1000×32 = a tall narrow strip)
  svg: string;
}

// === Campaign 1: Summer BBQ 2026 ===========================================
// Theme: warm reds / ember orange / gold flame motif, charcoal base type.

function bbqShelfStrip(): string {
  return svg(
    1000,
    32,
    `${bg(1000, 32, BRAND.cream)}
     <!-- left flame motif -->
     <path d="M8 26 C 14 18, 22 22, 18 10 C 26 14, 30 22, 26 30 Z" fill="${BRAND.ember}"/>
     <path d="M28 28 C 32 22, 38 24, 36 14 C 42 18, 44 24, 40 30 Z" fill="${BRAND.red}"/>
     <text x="60" y="22" font-size="18" font-weight="700" fill="${BRAND.charcoal}" letter-spacing="0.5">BBQ essentials</text>
     <text x="220" y="22" font-size="12" font-weight="500" fill="${BRAND.muted}">Save on summer favourites</text>
     <!-- right price flash -->
     <rect x="900" y="4" width="92" height="24" fill="${BRAND.red}" rx="3"/>
     <text x="946" y="21" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">FROM £2</text>`
  );
}

function bbqA1Poster(): string {
  return svg(
    594,
    841,
    `${bg(594, 841, BRAND.cream)}
     <!-- top stripe -->
     <rect x="0" y="0" width="594" height="6" fill="${BRAND.red}"/>
     <!-- headline -->
     <text x="48" y="120" font-size="56" font-weight="700" fill="${BRAND.charcoal}" letter-spacing="-1">Fire up</text>
     <text x="48" y="180" font-size="56" font-weight="700" fill="${BRAND.charcoal}" letter-spacing="-1">the weekend.</text>
     <text x="48" y="222" font-size="20" font-weight="500" fill="${BRAND.muted}">BBQ essentials, all summer long.</text>
     <!-- burger silhouette hero -->
     <g transform="translate(297 480)">
       <ellipse cx="0" cy="100" rx="190" ry="22" fill="${BRAND.charcoal}" opacity="0.15"/>
       <path d="M-180 60 Q 0 -10 180 60 L 180 70 L -180 70 Z" fill="${BRAND.ember}"/>
       <rect x="-180" y="68" width="360" height="14" fill="#7B3F1F"/>
       <rect x="-180" y="80" width="360" height="10" fill="${BRAND.lime}"/>
       <rect x="-180" y="88" width="360" height="14" fill="#A33422"/>
       <path d="M-180 100 Q 0 130 180 100 L 180 90 L -180 90 Z" fill="${BRAND.ember}"/>
       <!-- sesame seeds -->
       <g fill="${BRAND.cream}">
         <circle cx="-100" cy="35" r="3"/><circle cx="-40" cy="20" r="3"/>
         <circle cx="20" cy="18" r="3"/><circle cx="80" cy="22" r="3"/>
         <circle cx="120" cy="40" r="3"/>
       </g>
     </g>
     <!-- flames behind -->
     <g opacity="0.18">
       <path d="M120 720 C 160 640, 220 660, 200 580 C 270 620, 290 700, 240 760 Z" fill="${BRAND.red}"/>
       <path d="M380 720 C 420 660, 460 670, 460 600 C 510 640, 510 720, 470 770 Z" fill="${BRAND.ember}"/>
     </g>
     <!-- price quiet zone -->
     <rect x="48" y="720" width="498" height="80" fill="none" stroke="${BRAND.charcoal}" stroke-dasharray="4 4" opacity="0.18" rx="6"/>
     <text x="60" y="752" font-size="11" font-weight="500" fill="${BRAND.muted}" letter-spacing="2">PRICE FLASH</text>`
  );
}

function bbqWindowCling(): string {
  // 400×800 door vinyl
  return svg(
    400,
    800,
    `${bg(400, 800, BRAND.cream)}
     <rect x="0" y="0" width="400" height="800" fill="none" stroke="${BRAND.charcoal}" stroke-width="2" opacity="0.1"/>
     <text x="200" y="80" font-size="34" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle">BBQ ready.</text>
     <!-- icon grid 2×3 -->
     ${[
       { x: 100, y: 180, label: 'Sausages' },
       { x: 300, y: 180, label: 'Burgers' },
       { x: 100, y: 360, label: 'Charcoal' },
       { x: 300, y: 360, label: 'Lighter' },
       { x: 100, y: 540, label: 'Buns' },
       { x: 300, y: 540, label: 'Tongs' },
     ]
       .map(
         ({ x, y, label }) =>
           `<g transform="translate(${x} ${y})">
              <circle r="46" fill="none" stroke="${BRAND.charcoal}" stroke-width="2"/>
              <text y="6" font-size="13" font-weight="500" fill="${BRAND.charcoal}" text-anchor="middle">${label}</text>
            </g>
            <text x="${x}" y="${y + 80}" font-size="11" font-weight="400" fill="${BRAND.muted}" text-anchor="middle">In store now</text>`
       )
       .join('')}
     <!-- bottom band -->
     <rect x="0" y="740" width="400" height="60" fill="${BRAND.red}"/>
     <text x="200" y="780" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">Summer 2026</text>`
  );
}

// === Campaign 2: Meal Deal Refresh =========================================
// Theme: clean, generous whitespace, three-icon row.

function mealShelfStrip(): string {
  return svg(
    1000,
    32,
    `${bg(1000, 32, BRAND.cream)}
     ${accentBar(0, 0, 4, 32)}
     <!-- 3 icons left -->
     <g transform="translate(20 16)">
       <rect x="0" y="-7" width="20" height="14" fill="${BRAND.gold}" rx="2"/>
       <circle cx="40" cy="0" r="8" fill="${BRAND.charcoal}"/>
       <rect x="60" y="-9" width="10" height="18" fill="${BRAND.blueIce}" rx="3"/>
     </g>
     <text x="500" y="22" font-size="18" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle">Meal deal £3.50</text>
     <text x="970" y="22" font-size="11" font-weight="500" fill="${BRAND.muted}" text-anchor="end">Pick any three</text>`
  );
}

function mealEndcapHeader(): string {
  // header_board 1000×300
  return svg(
    1000,
    300,
    `${bg(1000, 300, BRAND.cream)}
     <rect x="0" y="0" width="1000" height="6" fill="${BRAND.red}"/>
     <text x="60" y="140" font-size="78" font-weight="700" fill="${BRAND.charcoal}" letter-spacing="-2">Lunch sorted.</text>
     <text x="60" y="190" font-size="22" font-weight="500" fill="${BRAND.muted}">Pick a main, snack and drink.</text>
     <!-- icon trio right -->
     <g transform="translate(740 150)">
       <g><rect x="-110" y="-50" width="80" height="50" fill="${BRAND.gold}" rx="4"/><text x="-70" y="-15" font-size="11" fill="${BRAND.charcoal}" text-anchor="middle" font-weight="500">Main</text></g>
       <g><circle cx="0" cy="-25" r="34" fill="${BRAND.charcoal}"/><text x="0" y="-20" font-size="11" fill="#fff" text-anchor="middle" font-weight="500">Snack</text></g>
       <g><rect x="40" y="-60" width="50" height="68" fill="${BRAND.blueIce}" rx="6"/><text x="65" y="-22" font-size="11" fill="${BRAND.charcoal}" text-anchor="middle" font-weight="500">Drink</text></g>
     </g>`
  );
}

function mealFloorDecal(): string {
  // 500×500 circle decal
  return svg(
    500,
    500,
    `${bg(500, 500, BRAND.cream)}
     <circle cx="250" cy="250" r="240" fill="${BRAND.cream}" stroke="${BRAND.charcoal}" stroke-width="6"/>
     <circle cx="250" cy="250" r="222" fill="none" stroke="${BRAND.red}" stroke-width="3" stroke-dasharray="6 6"/>
     <text x="250" y="232" font-size="40" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle">Meal deal</text>
     <text x="250" y="278" font-size="40" font-weight="700" fill="${BRAND.red}" text-anchor="middle">this way →</text>
     <text x="250" y="328" font-size="14" font-weight="500" fill="${BRAND.muted}" text-anchor="middle" letter-spacing="3">£3.50 · ANY MAIN, SNACK, DRINK</text>`
  );
}

// === Campaign 3: Hot Drinks Winter =========================================
// Theme: navy + cream, steam motif.

function hotShelfStrip(): string {
  return svg(
    1000,
    32,
    `${bg(1000, 32, BRAND.navy)}
     <!-- cup -->
     <g transform="translate(14 16)">
       <rect x="-7" y="-8" width="14" height="14" fill="${BRAND.cream}" rx="2"/>
       <path d="M-3 -12 q -1 -3 1 -5 m 4 0 q 1 3 -1 5" stroke="${BRAND.cream}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
     </g>
     <text x="40" y="22" font-size="17" font-weight="700" fill="${BRAND.cream}">Warm up — hot drinks from 99p</text>
     <!-- snowflakes -->
     <g fill="${BRAND.cream}" opacity="0.6">
       <circle cx="540" cy="10" r="1.5"/><circle cx="600" cy="22" r="1.5"/>
       <circle cx="660" cy="14" r="1.5"/><circle cx="720" cy="20" r="1.5"/>
       <circle cx="780" cy="12" r="1.5"/><circle cx="840" cy="22" r="1.5"/>
     </g>
     <rect x="900" y="4" width="92" height="24" fill="${BRAND.cream}" rx="3"/>
     <text x="946" y="21" font-size="13" font-weight="700" fill="${BRAND.navy}" text-anchor="middle">99p</text>`
  );
}

function hotA2Poster(): string {
  return svg(
    420,
    594,
    `${bg(420, 594, BRAND.navy)}
     <!-- cup hero -->
     <g transform="translate(210 320)">
       <ellipse cx="0" cy="120" rx="80" ry="10" fill="#000" opacity="0.3"/>
       <rect x="-60" y="-20" width="120" height="130" fill="${BRAND.cream}" rx="6"/>
       <path d="M60 0 q 40 20 0 60" stroke="${BRAND.cream}" stroke-width="14" fill="none" stroke-linecap="round"/>
       <rect x="-40" y="-2" width="80" height="6" fill="${BRAND.red}"/>
       <text x="0" y="68" font-size="14" font-weight="500" fill="${BRAND.navy}" text-anchor="middle">Mapleleaf</text>
       <!-- steam -->
       <g stroke="${BRAND.cream}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7">
         <path d="M-20 -40 q -8 -20 0 -40 q 8 -20 0 -40"/>
         <path d="M0 -50 q -8 -20 0 -40 q 8 -20 0 -40"/>
         <path d="M22 -40 q -8 -20 0 -40 q 8 -20 0 -40"/>
       </g>
     </g>
     <text x="210" y="82" font-size="58" font-weight="700" fill="${BRAND.cream}" text-anchor="middle" letter-spacing="-1">Take five.</text>
     <text x="210" y="118" font-size="18" font-weight="500" fill="${BRAND.cream}" opacity="0.85" text-anchor="middle">Hot drinks, any time.</text>
     <text x="210" y="556" font-size="13" font-weight="500" fill="${BRAND.cream}" opacity="0.65" text-anchor="middle" letter-spacing="3">FROM 99p · ALL WINTER</text>`
  );
}

function hotCounterCard(): string {
  // counter mat A3 landscape 420×297
  return svg(
    420,
    297,
    `${bg(420, 297, BRAND.cream)}
     <text x="30" y="48" font-size="20" font-weight="700" fill="${BRAND.charcoal}">Buy nine, the tenth is on us.</text>
     <text x="30" y="68" font-size="11" font-weight="500" fill="${BRAND.muted}" letter-spacing="2">MAPLELEAF EXPRESS LOYALTY</text>
     <!-- 5 × 2 stamp grid -->
     ${Array.from({ length: 10 })
       .map((_, i) => {
         const cx = 50 + (i % 5) * 76;
         const cy = 130 + Math.floor(i / 5) * 76;
         const filled = i < 3;
         return `<circle cx="${cx}" cy="${cy}" r="26" fill="${
           filled ? BRAND.charcoal : 'none'
         }" stroke="${BRAND.charcoal}" stroke-width="2"/>${
           filled
             ? `<text x="${cx}" y="${cy + 4}" font-size="14" font-weight="700" fill="${BRAND.cream}" text-anchor="middle">✓</text>`
             : ''
         }`;
       })
       .join('')}
     <!-- coffee bean accents -->
     <g fill="${BRAND.muted}" opacity="0.55">
       <ellipse cx="370" cy="40" rx="12" ry="7" transform="rotate(35 370 40)"/>
       <ellipse cx="392" cy="58" rx="12" ry="7" transform="rotate(-25 392 58)"/>
       <ellipse cx="350" cy="270" rx="12" ry="7" transform="rotate(-15 350 270)"/>
     </g>`
  );
}

// === Campaign 4: Soft Drinks Summer Refresh ================================
// Theme: ice blue + lime + droplets.

function softShelfStrip(): string {
  return svg(
    1000,
    32,
    `${bg(1000, 32, BRAND.cream)}
     <!-- droplets -->
     <g fill="${BRAND.blueIce}">
       <path d="M14 22 a 5 5 0 1 1 0 -10 q 0 8 0 10z"/>
       <path d="M40 24 a 4 4 0 1 1 0 -8 q 0 6 0 8z"/>
       <path d="M64 22 a 5 5 0 1 1 0 -10 q 0 8 0 10z"/>
     </g>
     <text x="100" y="22" font-size="17" font-weight="700" fill="${BRAND.charcoal}">Stay cool — 2 for £2.50</text>
     <!-- citrus segments -->
     <g transform="translate(720 16)">
       <circle r="11" fill="${BRAND.lime}"/>
       <line x1="0" y1="-9" x2="0" y2="9" stroke="${BRAND.cream}" stroke-width="1.4"/>
       <line x1="-9" y1="0" x2="9" y2="0" stroke="${BRAND.cream}" stroke-width="1.4"/>
     </g>
     <rect x="900" y="4" width="92" height="24" fill="${BRAND.red}" rx="3"/>
     <text x="946" y="21" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">2 / £2.50</text>`
  );
}

function softChillerCling(): string {
  // window door vinyl 400×800 — works as our chiller cling shape
  return svg(
    400,
    800,
    `${bg(400, 800, BRAND.blueIce)}
     <!-- side red stripe -->
     <rect x="370" y="0" width="30" height="800" fill="${BRAND.red}"/>
     <!-- big rotated headline -->
     <g transform="translate(180 400) rotate(-90)">
       <text x="0" y="0" font-size="92" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle" letter-spacing="-2">Ice cold.</text>
       <text x="0" y="80" font-size="92" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle" letter-spacing="-2">Always.</text>
     </g>
     <!-- droplets -->
     <g fill="${BRAND.cream}" opacity="0.85">
       <circle cx="60" cy="80" r="6"/><circle cx="90" cy="160" r="4"/>
       <circle cx="50" cy="240" r="5"/><circle cx="100" cy="700" r="6"/>
       <circle cx="70" cy="600" r="4"/><circle cx="60" cy="500" r="5"/>
     </g>`
  );
}

function softCeilingHanger(): string {
  // 420×297 hanger (designed double-sided — we render face A here)
  return svg(
    420,
    297,
    `${bg(420, 297, BRAND.cream)}
     <circle cx="210" cy="148" r="120" fill="${BRAND.blueIce}"/>
     <!-- bottle silhouette -->
     <g transform="translate(210 148)">
       <rect x="-22" y="-78" width="44" height="14" fill="${BRAND.charcoal}"/>
       <path d="M -28 -64 q 28 -10 56 0 L 26 70 q 0 14 -16 14 L -10 84 q -16 0 -16 -14 Z" fill="${BRAND.charcoal}"/>
       <rect x="-26" y="-30" width="52" height="32" fill="${BRAND.cream}"/>
       <text x="0" y="-8" font-size="11" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle">REFRESH</text>
     </g>
     <text x="210" y="40" font-size="22" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle">Refresh</text>
     <text x="210" y="280" font-size="13" font-weight="500" fill="${BRAND.muted}" text-anchor="middle" letter-spacing="3">CHILLED ALL SUMMER</text>`
  );
}

// === Campaign 5: Forecourt Clean Car =======================================
// Theme: water + chrome blues, charcoal anchor.

function carTotemTopper(): string {
  // totem ad panel 1200×800
  return svg(
    1200,
    800,
    `${bg(1200, 800, BRAND.charcoal)}
     <!-- water splash band -->
     <path d="M0 480 q 200 -90 400 0 t 400 0 t 400 0 L 1200 800 L 0 800 Z" fill="${BRAND.blueIce}" opacity="0.85"/>
     <path d="M0 540 q 220 -90 440 0 t 440 0 t 320 0 L 1200 800 L 0 800 Z" fill="#cfe1f0"/>
     <!-- suds -->
     <g fill="${BRAND.cream}" opacity="0.85">
       <circle cx="180" cy="500" r="16"/><circle cx="240" cy="490" r="10"/>
       <circle cx="800" cy="510" r="14"/><circle cx="850" cy="500" r="9"/>
       <circle cx="1080" cy="520" r="12"/>
     </g>
     <text x="60" y="200" font-size="86" font-weight="700" fill="${BRAND.cream}" letter-spacing="-2">Car wash</text>
     <text x="60" y="290" font-size="86" font-weight="700" fill="${BRAND.red}" letter-spacing="-2">£6 · 90 secs.</text>
     <text x="60" y="340" font-size="22" font-weight="500" fill="${BRAND.cream}" opacity="0.8">Open every day. Drive in, drive on.</text>
     <!-- chrome glint -->
     <rect x="60" y="380" width="200" height="3" fill="${BRAND.cream}"/>`
  );
}

function carPumpTopper(): string {
  // pump topper 1000×250
  return svg(
    1000,
    250,
    `${bg(1000, 250, BRAND.cream)}
     <rect x="0" y="0" width="500" height="250" fill="${BRAND.charcoal}"/>
     <text x="40" y="100" font-size="34" font-weight="700" fill="${BRAND.cream}">Fill up.</text>
     <text x="40" y="148" font-size="34" font-weight="700" fill="${BRAND.cream}">Wash up.</text>
     <text x="40" y="196" font-size="34" font-weight="700" fill="${BRAND.red}">Drive on.</text>
     <text x="540" y="80" font-size="18" font-weight="500" fill="${BRAND.muted}" letter-spacing="2">CAR WASH</text>
     <text x="540" y="148" font-size="58" font-weight="700" fill="${BRAND.charcoal}">£6</text>
     <text x="540" y="186" font-size="14" font-weight="500" fill="${BRAND.muted}">with any fuel purchase</text>
     <!-- diagonal line -->
     <line x1="500" y1="0" x2="500" y2="250" stroke="${BRAND.red}" stroke-width="6"/>`
  );
}

function carEntrySign(): string {
  // entry/exit panel — use 800×1200 portrait. We use TOTEM_AD_PANEL as host slot for simplicity? No, let's pick something portrait. We'll re-use WALL_POSTER_A1 since we don't have a true entry-sign poster slot.
  return svg(
    594,
    841,
    `${bg(594, 841, BRAND.cream)}
     <rect x="0" y="0" width="594" height="841" fill="none" stroke="${BRAND.charcoal}" stroke-width="6"/>
     <rect x="14" y="14" width="566" height="813" fill="none" stroke="${BRAND.red}" stroke-width="2" stroke-dasharray="8 8"/>
     <text x="297" y="220" font-size="98" font-weight="700" fill="${BRAND.charcoal}" text-anchor="middle" letter-spacing="-3">Tuesday.</text>
     <text x="297" y="320" font-size="42" font-weight="500" fill="${BRAND.charcoal}" text-anchor="middle">Wash &amp; Go</text>
     <text x="297" y="370" font-size="22" font-weight="500" fill="${BRAND.muted}" text-anchor="middle">with any fuel purchase</text>
     <!-- centred wash icon -->
     <g transform="translate(297 540)">
       <rect x="-110" y="-30" width="220" height="80" fill="${BRAND.charcoal}" rx="12"/>
       <circle cx="-70" cy="60" r="22" fill="${BRAND.charcoal}"/>
       <circle cx="70" cy="60" r="22" fill="${BRAND.charcoal}"/>
       <!-- water drops above -->
       <circle cx="-60" cy="-58" r="6" fill="${BRAND.blueIce}"/>
       <circle cx="0" cy="-66" r="6" fill="${BRAND.blueIce}"/>
       <circle cx="60" cy="-58" r="6" fill="${BRAND.blueIce}"/>
     </g>
     <rect x="48" y="760" width="498" height="50" fill="${BRAND.red}"/>
     <text x="297" y="794" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">Every Tuesday this summer</text>`
  );
}

// ---- Campaign definitions --------------------------------------------------

interface Campaign {
  code: string;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  unitTargets: {
    unit_type_id: string;
    promo_section_id?: string | null;
  }[];
  artwork: Design[];
}

const campaigns: Campaign[] = [
  {
    code: 'SUMMER_BBQ_2026',
    name: 'Summer BBQ 2026',
    description:
      'BBQ essentials promotion across forecourt convenience sites — confectionery, snacks and seasonal aisles featured.',
    starts_at: '2026-06-01',
    ends_at: '2026-08-31',
    unitTargets: [
      { unit_type_id: UNIT.GONDOLA_AISLE_1000, promo_section_id: PROMO.CONFECTIONERY },
      { unit_type_id: UNIT.ENDCAP_1000, promo_section_id: PROMO.SEASONAL },
      { unit_type_id: UNIT.WIN_FULL_1800, promo_section_id: null },
    ],
    artwork: [
      {
        posSlotId: POS_SLOT.SHELF_STRIP_1000,
        unitTypeId: UNIT.GONDOLA_AISLE_1000,
        promoSectionId: PROMO.CONFECTIONERY,
        notes: 'Shelf strip — BBQ essentials front-of-aisle.',
        svg: bbqShelfStrip(),
      },
      {
        posSlotId: POS_SLOT.ENDCAP_POSTER_A1,
        unitTypeId: UNIT.ENDCAP_1000,
        promoSectionId: PROMO.SEASONAL,
        notes: 'Endcap poster A1 — burger hero.',
        svg: bbqA1Poster(),
      },
      {
        posSlotId: POS_SLOT.WINDOW_DOOR_VINYL,
        unitTypeId: UNIT.WIN_FULL_1800,
        promoSectionId: null,
        notes: 'Window cling — six-icon grid, summer band.',
        svg: bbqWindowCling(),
      },
    ],
  },
  {
    code: 'MEAL_DEAL_REFRESH_2026',
    name: 'Meal deal refresh',
    description:
      'Refreshed meal-deal kit: tighter typography, three-icon row across shelf and endcap.',
    starts_at: '2026-05-15',
    ends_at: '2026-12-31',
    unitTargets: [
      { unit_type_id: UNIT.GONDOLA_AISLE_1000, promo_section_id: PROMO.MEAL_DEAL },
      { unit_type_id: UNIT.ENDCAP_1000, promo_section_id: PROMO.MEAL_DEAL },
    ],
    artwork: [
      {
        posSlotId: POS_SLOT.SHELF_STRIP_1000,
        unitTypeId: UNIT.GONDOLA_AISLE_1000,
        promoSectionId: PROMO.MEAL_DEAL,
        notes: 'Meal deal shelf strip — three-icon row.',
        svg: mealShelfStrip(),
      },
      {
        posSlotId: POS_SLOT.HEADER_BOARD_1000,
        unitTypeId: UNIT.ENDCAP_1000,
        promoSectionId: PROMO.MEAL_DEAL,
        notes: 'Endcap header board — Lunch sorted.',
        svg: mealEndcapHeader(),
      },
      {
        posSlotId: POS_SLOT.FLOOR_GRAPHIC_500,
        unitTypeId: UNIT.ENDCAP_1000,
        promoSectionId: PROMO.MEAL_DEAL,
        notes: 'Floor graphic 500mm — directional.',
        svg: mealFloorDecal(),
      },
    ],
  },
  {
    code: 'HOT_DRINKS_WINTER_2026',
    name: 'Hot drinks — winter 2026',
    description:
      'Cosy navy-and-cream campaign for the hot drinks bar with loyalty card.',
    starts_at: '2026-10-01',
    ends_at: '2027-02-28',
    unitTargets: [
      { unit_type_id: UNIT.COFFEE_STATION, promo_section_id: PROMO.HOT_DRINKS },
      { unit_type_id: UNIT.TILL_STANDARD, promo_section_id: PROMO.HOT_DRINKS },
    ],
    artwork: [
      {
        posSlotId: POS_SLOT.SHELF_STRIP_1000,
        unitTypeId: UNIT.COFFEE_STATION,
        promoSectionId: PROMO.HOT_DRINKS,
        notes: 'Coffee station shelf strip — Warm up.',
        svg: hotShelfStrip(),
      },
      {
        posSlotId: POS_SLOT.WALL_POSTER_A2,
        unitTypeId: UNIT.COFFEE_STATION,
        promoSectionId: PROMO.HOT_DRINKS,
        notes: 'Wall poster A2 — Take five.',
        svg: hotA2Poster(),
      },
      {
        posSlotId: POS_SLOT.COUNTER_MAT_A3,
        unitTypeId: UNIT.TILL_STANDARD,
        promoSectionId: PROMO.HOT_DRINKS,
        notes: 'Counter mat A3 — loyalty card.',
        svg: hotCounterCard(),
      },
    ],
  },
  {
    code: 'SOFT_DRINKS_SUMMER_2026',
    name: 'Soft drinks — summer refresh',
    description:
      'Summer refresh kit for the chilled soft drinks bay — ice blue, lime, droplets.',
    starts_at: '2026-06-01',
    ends_at: '2026-09-15',
    unitTargets: [
      { unit_type_id: UNIT.CHILL_MULTIDECK_1875, promo_section_id: PROMO.SOFT_DRINKS },
    ],
    artwork: [
      {
        posSlotId: POS_SLOT.SHELF_STRIP_1000,
        unitTypeId: UNIT.CHILL_MULTIDECK_1875,
        promoSectionId: PROMO.SOFT_DRINKS,
        notes: 'Chiller shelf strip — Stay cool.',
        svg: softShelfStrip(),
      },
      {
        posSlotId: POS_SLOT.WINDOW_DOOR_VINYL,
        unitTypeId: UNIT.CHILL_MULTIDECK_1875,
        promoSectionId: PROMO.SOFT_DRINKS,
        notes: 'Chiller door cling — Ice cold. Always.',
        svg: softChillerCling(),
      },
      {
        posSlotId: POS_SLOT.CEILING_HANGER_A3,
        unitTypeId: UNIT.CHILL_MULTIDECK_1875,
        promoSectionId: PROMO.SOFT_DRINKS,
        notes: 'Ceiling hanger A3 — Refresh / Hydrate.',
        svg: softCeilingHanger(),
      },
    ],
  },
  {
    code: 'FORECOURT_CLEAN_CAR_2026',
    name: 'Forecourt clean car',
    description:
      'Car wash promotion across the forecourt — totem, pump, and entry sign artwork.',
    starts_at: '2026-05-01',
    ends_at: '2026-09-30',
    unitTargets: [
      { unit_type_id: UNIT.TOTEM_MAIN, promo_section_id: PROMO.FORECOURT },
      { unit_type_id: UNIT.PUMP_ISLAND, promo_section_id: PROMO.FORECOURT },
      { unit_type_id: UNIT.ENTRY_SIGN, promo_section_id: PROMO.FORECOURT },
    ],
    artwork: [
      {
        posSlotId: POS_SLOT.TOTEM_AD_PANEL,
        unitTypeId: UNIT.TOTEM_MAIN,
        promoSectionId: PROMO.FORECOURT,
        notes: 'Totem ad panel — Car wash hero.',
        svg: carTotemTopper(),
      },
      {
        posSlotId: POS_SLOT.PUMP_TOPPER_1000,
        unitTypeId: UNIT.PUMP_ISLAND,
        promoSectionId: PROMO.FORECOURT,
        notes: 'Pump topper 1m — Fill up. Wash up. Drive on.',
        svg: carPumpTopper(),
      },
      {
        posSlotId: POS_SLOT.WALL_POSTER_A1,
        unitTypeId: UNIT.ENTRY_SIGN,
        promoSectionId: PROMO.FORECOURT,
        notes: 'Wall poster A1 — Tuesday Wash & Go.',
        svg: carEntrySign(),
      },
    ],
  },
];

// ---- SQL emit ---------------------------------------------------------------

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

function emit(): string {
  const lines: string[] = [];
  lines.push('-- Seed: campaign artwork demo set ----------------------------');
  lines.push('begin;');

  for (const c of campaigns) {
    lines.push(
      `with up as (
  insert into public.campaigns (code, name, scope, status, starts_at, ends_at, description, created_by)
  values ('${c.code}', '${sqlEscape(c.name)}', 'GLOBAL', 'DRAFT', '${c.starts_at}', '${c.ends_at}', '${sqlEscape(c.description)}', '${HQ_USER_ID}')
  on conflict (code) do update set
    name = excluded.name,
    description = excluded.description,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at
  returning id
)
, c as (select id from up)`
    );

    for (const t of c.unitTargets) {
      const promo = t.promo_section_id
        ? `'${t.promo_section_id}'`
        : 'null';
      lines.push(
        `, t_${cryptoId()} as (
  insert into public.campaign_unit_targets (campaign_id, unit_type_id, promo_section_id)
  select c.id, '${t.unit_type_id}', ${promo} from c
  on conflict (campaign_id, unit_type_id, promo_section_id) do nothing
  returning 1
)`
      );
    }

    for (const a of c.artwork) {
      const url = dataUrl(a.svg);
      const promo = a.promoSectionId ? `'${a.promoSectionId}'` : 'null';
      lines.push(
        `, a_${cryptoId()} as (
  insert into public.campaign_artwork (
    campaign_id, unit_type_id, pos_slot_type_id, target_promo_section_id,
    artwork_url, quantity_per_target, notes, uploaded_by, uploaded_at
  )
  select c.id, '${a.unitTypeId}', '${a.posSlotId}', ${promo},
         '${sqlEscape(url)}', 1, '${sqlEscape(a.notes)}', '${HQ_USER_ID}', now()
  from c
  on conflict (campaign_id, unit_type_id, pos_slot_type_id, target_promo_section_id)
  do update set
    artwork_url = excluded.artwork_url,
    notes = excluded.notes,
    uploaded_at = excluded.uploaded_at
  returning 1
)`
      );
    }

    lines.push('select 1 from c;');
  }

  lines.push('commit;');
  return lines.join('\n');
}

// CTE alias names need to be unique within a single statement.
let _idCtr = 0;
function cryptoId(): string {
  _idCtr += 1;
  return `n${_idCtr}`;
}

process.stdout.write(emit());
