// ==========================================
// MODULE 12 & 13: WEEKLY BOSS TEMPLATES (ADMIN)
// ==========================================

export type BossTemplateStatus = "Draft" | "Published" | "Archived";
export type ProofPolicyType = "BY_SUBSCRIPTION" | string;
export type RewardPolicyType = "BY_MODE" | string;

// Matches BE BossMode enum — PascalCase
export type BossModeType = "Easy" | "Normal" | "Hard";
export type PackageTier = "Free" | "Basic" | "Premium";
export type RewardTierType = "BASIC" | "STANDARD" | "PREMIUM";

// Matches BE BossModeConfigDto exactly.
// NOTE: allowedProofTypes removed — proof types are now per subscription package (SubscriptionPackageDto.proofTypes)
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

// ── ATOMIC CREATE (B7) ────────────────────────────────────────────────────────
// POST /admin/boss-templates now creates the theme + ALL 3 modes in one request.
// There is no "create empty theme then add modes" flow — a missing mode = nothing created.
// One mode block inside the create payload. NOTE: no `mode` field (keyed by easy/normal/hard),
// and `rewardTier` is a free-text display label (BRONZE/SILVER/GOLD…), not the enum.
export interface BossModeInput {
    minTier: PackageTier;
    partyMin: number;
    partyMax: number;
    bossHp: number;
    maxQuestPerMemberPerDay: number;
    maxPartyQuestPerWeek: number;
    maxDamagePerQuest: number;
    mGoldRewardCapPerQuest: number;
    rewardTier: string;
}

export interface CreateBossTemplatePayload {
    themeName: string;
    description?: string;
    easy: BossModeInput;
    normal: BossModeInput;
    hard: BossModeInput;
}

// Payload for PUT /admin/boss-templates/{id}
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

// Payload for POST /admin/boss-templates/{id}/modes (UpsertBossModeRequest)
// NOTE: allowedProofTypes removed — proof types are per subscription package, not per mode
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
    rewardTier: RewardTierType;
}

// ── WEEKLY BOSS SCHEDULE ──────────────────────────────────────────────────────
// GET /admin/boss-templates/schedules — WeeklyBossScheduleDto
export interface WeeklyBossScheduleDto {
    weeklyBossScheduleId: number;
    bossTemplateId: number;
    themeName: string;
    bossStatus: BossTemplateStatus;
    weekStart: string;  // ISO date string (Monday of the week)
    weekEnd: string;    // ISO date string (Sunday of the week)
    isCurrentWeek: boolean;
}

// POST /admin/boss-templates/schedules — body
export interface WeeklyBossSchedulePayload {
    bossTemplateId: number;
    weekDate: string;   // any date within target week → BE normalises to Monday
}
