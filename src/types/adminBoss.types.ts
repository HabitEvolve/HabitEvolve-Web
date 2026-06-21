// ==========================================
// MODULE 12 & 13: WEEKLY BOSS TEMPLATES (ADMIN)
// ==========================================

export type BossTemplateStatus = "Draft" | "Published" | "Archived";
export type ProofPolicyType = "BY_SUBSCRIPTION" | string;
export type RewardPolicyType = "BY_MODE" | string;

// Matches BE BossMode enum — PascalCase
export type BossModeType = "Easy" | "Normal" | "Hard";
export type PackageTier = "FREE" | "BASIC" | "PREMIUM";
export type RewardTierType = "BASIC" | "STANDARD" | "PREMIUM";

// Matches BE BossModeConfigDto exactly
// CRITICAL: field is minTier (not minPackage); deadlineMax does NOT exist in BE
export interface BossModeDto {
    bossModeConfigId: number;
    mode: BossModeType;
    minTier: PackageTier;
    partyMin: number;
    partyMax: number;
    bossHp: number;
    maxQuestPerMemberPerDay: number;
    maxPartyQuestPerWeek: number;
    maxDamagePerQuest: number;
    mGoldRewardCapPerQuest: number;
    allowedProofTypes: string[];
    rewardTier: RewardTierType;
}

// Matches BE BossTemplateDto exactly
export interface BossTemplateDto {
    bossTemplateId: number;
    themeName: string;
    description: string | null;
    activeWeekStart: string;
    activeWeekEnd: string;
    startTime: string;
    endTime: string;
    registrationWindow: string;
    lateRegistrationWindow: string;
    requestExceptionWindow: string;
    proofPolicy: ProofPolicyType;
    rewardPolicy: RewardPolicyType;
    status: BossTemplateStatus;
    createdAt: string;
    updatedAt: string | null;
    modes: BossModeDto[];
}

// Payload for POST /admin/boss-templates (CreateBossTemplateCommand)
// proofPolicy and rewardPolicy required for creation
export interface BossTemplatePayload {
    themeName: string;
    description?: string;
    activeWeekStart: string;
    activeWeekEnd: string;
    startTime: string;
    endTime: string;
    registrationWindow: string;
    lateRegistrationWindow?: string;
    requestExceptionWindow?: string;
    proofPolicy: ProofPolicyType;
    rewardPolicy: RewardPolicyType;
}

// Payload for PUT /admin/boss-templates/{id}
// Matches BE UpdateBossTemplateRequest — all fields optional (partial update)
// NOTE: proofPolicy and rewardPolicy are NOT in the BE update request
export interface UpdateBossTemplatePayload {
    themeName?: string;
    description?: string;
    activeWeekStart?: string;
    activeWeekEnd?: string;
    startTime?: string;
    endTime?: string;
    registrationWindow?: string;
    lateRegistrationWindow?: string;
    requestExceptionWindow?: string;
}

// Payload for POST /admin/boss-templates/{id}/modes
// Matches BE UpsertBossModeRequest exactly
// NOTE: allowedProofTypes is kept as string[] here for UI convenience;
// adminBossApi.addBossMode joins to comma-separated string before sending to BE
export interface BossModePayload {
    mode: BossModeType;
    minTier: PackageTier;
    partyMin: number;
    partyMax: number;
    bossHp: number;
    maxQuestPerMemberPerDay: number;
    maxPartyQuestPerWeek: number;
    maxDamagePerQuest: number;
    mGoldRewardCapPerQuest: number;
    allowedProofTypes: string[];
    rewardTier: RewardTierType;
}
