/**
 * Campaign system types.
 *
 * Enums mirror the Postgres types from migration 000. Keep in sync.
 */

export type CampaignScope = 'GLOBAL' | 'LOCAL';

export type CampaignStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'LIVE'
  | 'ARCHIVED'
  | 'REJECTED';

export type RolloutStatus =
  | 'PENDING'
  | 'QUOTED'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'INSTALLING'
  | 'INSTALLED'
  | 'PROBLEM';

export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'PROBLEM'
  | 'SKIPPED';

export type TaskProblemReason =
  | 'ARTWORK_DAMAGED'
  | 'ARTWORK_MISSING'
  | 'WRONG_SIZE'
  | 'MOUNT_FAILED'
  | 'SITE_CLOSED'
  | 'OTHER';

export interface CampaignSummary {
  id: string;
  code: string;
  name: string;
  scope: CampaignScope;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  description: string | null;
  owner_site_id: string | null;
  created_at: string;
}

export interface CampaignUnitTarget {
  id: string;
  campaign_id: string;
  unit_type_id: string;
  promo_section_id: string | null;
}

export interface CampaignClassificationTarget {
  id: string;
  campaign_id: string;
  classification_tag_id: string;
}

export interface CampaignArtwork {
  id: string;
  campaign_id: string;
  unit_type_id: string;
  pos_slot_type_id: string;
  target_promo_section_id: string | null;
  linked_product_id: string | null;
  artwork_url: string | null;
  preview_url: string | null;
  material: string | null;
  quantity_per_target: number;
  notes: string | null;
}

export interface RolloutSummary {
  id: string;
  site_id: string;
  campaign_id: string;
  status: RolloutStatus;
  quote_ref: string | null;
  total_tasks: number;
  completed_tasks: number;
  problem_tasks: number;
  shipped_at: string | null;
  install_started_at: string | null;
  install_completed_at: string | null;
}

export interface InstallTaskSummary {
  id: string;
  rollout_id: string;
  site_unit_id: string;
  campaign_artwork_id: string;
  pos_position_label: string | null;
  task_order: number;
  status: TaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  photo_url: string | null;
  problem_reason: TaskProblemReason | null;
  problem_notes: string | null;
}

/**
 * Result of materialising a campaign — one entry per site that got a
 * rollout. Surfaced back to the HQ Admin publish dialog so they see what
 * actually landed.
 */
export interface MaterialisationSummary {
  rollouts_created: number;
  tasks_created: number;
  quotes_created: number;
  sites: Array<{
    site_id: string;
    site_name: string;
    rollout_id: string;
    quote_ref: string;
    task_count: number;
  }>;
  warnings: string[];
}
