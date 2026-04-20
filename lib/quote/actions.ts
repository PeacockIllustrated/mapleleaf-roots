'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { buildFittingPayload } from './build-fitting-payload';
import type { QuoteStatus } from './types';

export type RequestFittingQuoteResult =
  | { ok: true; quoteRef: string; quoteId: string }
  | { ok: false; message: string };

export type SubmitQuoteResult =
  | { ok: true; status: QuoteStatus }
  | { ok: false; message: string };

const WRITE_ROLES = ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER'] as const;

const requestSchema = z.object({ siteId: z.string().uuid() });
const submitSchema = z.object({
  quoteRef: z.string().regex(/^OSD-\d{4}-\d{6}$/, 'Invalid quote ref'),
});

/**
 * Create a DRAFT site-fitting quote from the current planogram.
 * Idempotency is the caller's responsibility — pressing the button twice
 * creates two drafts. We intentionally do NOT collapse drafts into a single
 * row because a site may legitimately want to version a fit-out request.
 */
export async function requestFittingQuote(
  input: unknown
): Promise<RequestFittingQuoteResult> {
  const profile = await requireRole(WRITE_ROLES);

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Bad input' };
  }
  const { siteId } = parsed.data;

  const supabase = await createServerClient();

  let payload;
  try {
    payload = await buildFittingPayload(supabase, siteId, {
      name: profile.full_name,
      email: profile.email,
    });
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Payload build failed',
    };
  }

  if (payload.line_items.length === 0) {
    return {
      ok: false,
      message: 'Place at least one unit on the planogram before requesting a quote.',
    };
  }

  // Generate OSD-YYYY-NNNNNN via the sequence helper from migration 001.
  const { data: refRow, error: refErr } = await supabase
    .rpc('next_onesign_quote_ref')
    .single();

  if (refErr || !refRow) {
    return {
      ok: false,
      message: refErr?.message ?? 'Could not generate quote ref',
    };
  }

  const quoteRef = refRow as unknown as string;

  const { data: quote, error: insErr } = await supabase
    .from('onesign_quotes')
    .insert({
      quote_ref: quoteRef,
      site_id: siteId,
      quote_type: 'SITE_FITTING',
      status: 'DRAFT',
      payload,
      requested_by: profile.id,
    })
    .select('id, quote_ref')
    .single();

  if (insErr || !quote) {
    return { ok: false, message: insErr?.message ?? 'Insert failed' };
  }

  revalidatePath(`/sites/${siteId}/quotes`);
  revalidatePath(`/sites/${siteId}/planogram`);

  return {
    ok: true,
    quoteRef: quote.quote_ref as string,
    quoteId: quote.id as string,
  };
}

/**
 * Move a quote from DRAFT → SUBMITTED. Anything beyond SUBMITTED is
 * driven by the Onesign Portal via webhooks (Phase 2+).
 */
export async function submitQuote(
  input: unknown
): Promise<SubmitQuoteResult> {
  await requireRole(WRITE_ROLES);

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const { quoteRef } = parsed.data;

  const supabase = await createServerClient();

  // Fetch current state — we only allow DRAFT → SUBMITTED.
  const { data: current, error: fetchErr } = await supabase
    .from('onesign_quotes')
    .select('id, status, site_id')
    .eq('quote_ref', quoteRef)
    .single();

  if (fetchErr || !current) {
    return { ok: false, message: fetchErr?.message ?? 'Quote not found' };
  }

  if (current.status !== 'DRAFT') {
    return {
      ok: false,
      message: `Quote is already ${current.status as string} — no further action needed here.`,
    };
  }

  const { error: updErr } = await supabase
    .from('onesign_quotes')
    .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
    .eq('id', current.id);

  if (updErr) return { ok: false, message: updErr.message };

  revalidatePath(`/sites/${current.site_id}/quotes`);
  revalidatePath(`/sites/${current.site_id}/planogram`);

  return { ok: true, status: 'SUBMITTED' };
}
