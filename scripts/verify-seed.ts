/**
 * verify-seed — confirm seed data loaded as expected.
 *
 * Run: `pnpm seed:verify`
 *
 * Checks table counts against expected values. Exits non-zero if anything
 * looks wrong. Designed to run after `supabase db reset` as a smoke test.
 */

import { createClient } from '@supabase/supabase-js';

const EXPECTED = {
  classification_tags: 15,
  promo_sections: 17,
  pos_slot_types: 29,
  unit_types: 33,
  unit_type_default_shelves: 45,
  // unit_type_pos_slots: not counted — varies and is boring to maintain
  product_categories: 58,
} as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  let allOk = true;

  for (const [table, expected] of Object.entries(EXPECTED)) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`[FAIL] ${table}: ${error.message}`);
      allOk = false;
      continue;
    }

    const actual = count ?? 0;
    const ok = actual === expected;
    console.log(
      `${ok ? '[ OK ]' : '[FAIL]'} ${table}: expected ${expected}, got ${actual}`
    );
    if (!ok) allOk = false;
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
