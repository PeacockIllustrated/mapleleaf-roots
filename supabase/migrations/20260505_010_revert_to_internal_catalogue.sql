-- ============================================================================
-- 010: Revert product catalogue to INTERNAL_CATALOGUE baseline
-- ============================================================================
-- The Open*Facts nightly sync introduced a large volume of low-quality stub
-- rows (missing brand/image/dimensions, non-UK products). Roll back to the
-- 27 hand-curated products in seed 008. Synced rows that are already
-- referenced by a planogram slot are kept but soft-deleted (is_active=false)
-- because slot_product_assignments uses ON DELETE RESTRICT.
-- ============================================================================

-- 1. Soft-delete synced products that are referenced by any slot assignment
update public.products
set is_active = false, updated_at = now()
where data_source <> 'INTERNAL_CATALOGUE'
  and id in (
    select main_product_id from public.slot_product_assignments where main_product_id is not null
    union
    select substitute_a_product_id from public.slot_product_assignments where substitute_a_product_id is not null
    union
    select substitute_b_product_id from public.slot_product_assignments where substitute_b_product_id is not null
  );

-- 2. Hard-delete every other synced product
delete from public.products
where data_source <> 'INTERNAL_CATALOGUE'
  and id not in (
    select main_product_id from public.slot_product_assignments where main_product_id is not null
    union
    select substitute_a_product_id from public.slot_product_assignments where substitute_a_product_id is not null
    union
    select substitute_b_product_id from public.slot_product_assignments where substitute_b_product_id is not null
  );

-- 3. Re-activate any INTERNAL_CATALOGUE rows accidentally deactivated
update public.products
set is_active = true, updated_at = now()
where data_source = 'INTERNAL_CATALOGUE'
  and is_active = false;
