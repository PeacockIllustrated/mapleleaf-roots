import { z } from 'zod';

/**
 * Onesign quote payload — v1.
 *
 * This shape is the contract with the Onesign Portal. Changes to it require
 * bumping `payload_version` and coordinating with the Onesign team. See
 * `.claude/agents/quoter-bridge.md`.
 */

export const quoteTypeEnum = z.enum([
  'SITE_FITTING',
  'CAMPAIGN_PACK',
  'ADDITIONAL_SIGNAGE',
]);

export const lineTypeEnum = z.enum(['UNIT', 'POS_ARTWORK', 'INSTALL_SERVICE']);

export const addressSchema = z.object({
  line_1: z.string().min(1),
  line_2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
});

export const lineItemSchema = z.object({
  line_type: lineTypeEnum,
  unit_type_code: z.string().optional(),
  unit_label: z.string().optional(),
  pos_slot_type_code: z.string().optional(),
  pos_position_label: z.string().optional(),
  promo_section_code: z.string().optional(),
  artwork_url: z.string().optional(),
  material: z.string().optional(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const quotePayloadV1Schema = z.object({
  payload_version: z.literal(1),
  site: z.object({
    code: z.string(),
    name: z.string(),
    address: addressSchema,
  }),
  quote_type: quoteTypeEnum,
  linked_rollout_id: z.string().uuid().optional(),
  requested_by: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  line_items: z.array(lineItemSchema),
  target_install_date: z.string().optional(),
  notes: z.string().optional(),
});

export type QuoteType = z.infer<typeof quoteTypeEnum>;
export type LineType = z.infer<typeof lineTypeEnum>;
export type LineItem = z.infer<typeof lineItemSchema>;
export type QuotePayloadV1 = z.infer<typeof quotePayloadV1Schema>;

export type QuoteStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'PRICED'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'CLOSED'
  | 'CANCELLED';

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  PRICED: 'Priced',
  APPROVED: 'Approved',
  IN_PRODUCTION: 'In production',
  SHIPPED: 'Shipped',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};
