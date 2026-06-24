// ==========================================
// MODULE 19: SUBSCRIPTION PACKAGES (ADMIN)
// ==========================================

// CSV-encoded values stored on the BE entity
export type BossMode = "EASY" | "NORMAL" | "HARD";
export type ProofType =
  | "PHOTO"
  | "VIDEO"
  | "TIMER"
  | "SCREENSHOT"
  | "GPS"
  | "STEP_COUNTER"
  | "TEXT_LOG"
  | "SELF_CHECK";
// Matches BE RewardTier strings — PascalCase
export type RewardTier = "Basic" | "Standard" | "Premium";

// Matches BE SubscriptionPackageDto exactly.
// BossModes, ProofTypes, AiVerificationBossModes are CSV strings on the BE
// (e.g. "EASY,NORMAL") — parse with csvToArr() / join with arrToCsv() in the UI.
export interface SubscriptionPackageDto {
  packageId: number;
  code: string;              // unique, immutable after creation (e.g. FREE, BASIC, PREMIUM)
  name: string;
  description: string | null;
  price: number;             // Gems; 0 = free
  durationDays: number;      // 0 = unlimited
  maxParties: number;
  maxMembersPerParty: number;
  questsPerMemberPerDay: number;
  partyQuestsPerWeek: number;
  bossModes: string;         // CSV: "EASY,NORMAL,HARD"
  maxDamagePerQuest: number;
  maxMGoldRewardPerQuest: number;
  proofTypes: string;        // CSV: "PHOTO,VIDEO"
  rewardTier: RewardTier;
  aiVerificationBossModes: string; // CSV — boss modes that support AI proof verification
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payload for POST /api/admin/packages  (BE: CreatePackageCommand)
export interface CreatePackagePayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  maxParties: number;
  maxMembersPerParty: number;
  questsPerMemberPerDay: number;
  partyQuestsPerWeek: number;
  bossModes: string;              // CSV
  maxDamagePerQuest: number;
  maxMGoldRewardPerQuest: number;
  proofTypes: string;             // CSV
  rewardTier: RewardTier;
  aiVerificationBossModes?: string; // CSV — optional
}

// Payload for PUT /api/admin/packages/{id}  (BE: UpdatePackageCommand)
// Code is immutable — excluded from this payload.
export interface UpdatePackagePayload {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  maxParties: number;
  maxMembersPerParty: number;
  questsPerMemberPerDay: number;
  partyQuestsPerWeek: number;
  bossModes: string;
  maxDamagePerQuest: number;
  maxMGoldRewardPerQuest: number;
  proofTypes: string;
  rewardTier: RewardTier;
  aiVerificationBossModes?: string;
}

// Payload for PATCH /api/admin/packages/{id}/status  (BE: TogglePackageStatusCommand)
export interface TogglePackageStatusPayload {
  isActive: boolean;
}

export interface GetPackagesQueryParams {
  includeInactive?: boolean;
}
