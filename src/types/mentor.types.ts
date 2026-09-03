// ── SUBSCRIPTION PACKAGES ─────────────────────────────────────────────────────
export interface SubscriptionPackageDto {
    packageId: number;
    code: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    maxParties: number;
    maxMembersPerParty: number;
    questsPerMemberPerDay: number;
    partyQuestsPerWeek: number;
    bossModes: string;               // CSV: "Easy,Normal"
    maxDamagePerQuest: number;
    maxMGoldRewardPerQuest: number;
    proofTypes: string;              // CSV: "Photo,Video"
    rewardTier: string;
    aiVerificationBossModes: string; // CSV: "" | "Normal" | "Normal,Hard"
    // Per-difficulty quest caps — SPLIT questsPerMemberPerDay/partyQuestsPerWeek above:
    // the EASY+NORMAL+HARD caps that are set must sum to at most the overall cap.
    // null = no separate cap for that difficulty.
    maxEasyQuestsPerMemberPerDay: number | null;
    maxNormalQuestsPerMemberPerDay: number | null;
    maxHardQuestsPerMemberPerDay: number | null;
    maxEasyPartyQuestsPerWeek: number | null;
    maxNormalPartyQuestsPerWeek: number | null;
    maxHardPartyQuestsPerWeek: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface MentorSubscriptionDto {
    mentorSubscriptionId: number;
    mentorUserId: number;
    packageId: number;
    packageCode?: string;
    packageName?: string;
    status: 'Active' | 'PendingPayment' | 'Expired' | 'Cancelled';
    billingCycle: string;
    paymentMethod: string;
    pricePaid: number;
    startsAt: string;
    expiresAt?: string;
    cancelledAt?: string;
    createdAt: string;
    isCurrentlyActive: boolean;
}

export interface DifficultyQuotaDto {
    assignedToday: number;
    cap: number;
}

/** Screen 14 — how many quests assigned to ONE member today vs the cap (BR-14, per recipient). */
export interface MemberQuestQuotaDto {
    targetUserId: number;
    assignedToday: number;
    cap: number;
    /** Keyed EASY/NORMAL/HARD — only present for a difficulty the plan caps separately. */
    perDifficulty: Record<string, DifficultyQuotaDto>;
}

export interface SubscriptionUsageDto {
    partiesUsed: number;
    maxParties: number;
    largestPartyMemberCount: number;
    maxMembersPerParty: number;
    /** Most quests the mentor has assigned to a SINGLE member today (grouped by recipient, max) —
     *  mirrors BR-14, which caps questsPerMemberPerDay per recipient, not in total. */
    busiestMemberQuestsToday: number;
    questsPerMemberPerDay: number;
    /** Most party-quest batches in a SINGLE party this week (max over parties) —
     *  partyQuestsPerWeek is enforced per party, not summed across all of them. */
    busiestPartyQuestsThisWeek: number;
    partyQuestsPerWeek: number;
}

export interface ActiveSubscriptionDto {
    isDefaultFree: boolean;
    subscription?: MentorSubscriptionDto;
    package: SubscriptionPackageDto;
    usage: SubscriptionUsageDto;
}

export interface PurchaseSubscriptionRequest {
    mentorUserId: number;
    packageId: number;
    billingCycle?: string;
    paymentMethod?: string;
}

export interface PurchaseSubscriptionResultDto {
    subscription: MentorSubscriptionDto;
    requiresPayment: boolean;
    checkoutUrl?: string;
    paymentFormFields?: Record<string, string>;
    orderInvoiceNumber?: string;
}

// ── WALLET & GEMS ─────────────────────────────────────────────────────────────
export interface MentorWalletDto {
    userId: number;
    gemsBalance: number;
    vndPerGem: number;
    updatedAt?: string;
}

export interface GemTransactionDto {
    gemTransactionId: number;
    userId: number;
    type: string;
    gemAmount: number;
    status: string;
    balanceAfter: number;
    reference?: string;
    description?: string;
    amountVnd: number;
    paymentMethod?: string;
    createdAt: string;
    completedAt?: string;
}

export interface TopUpGemsRequest {
    mentorUserId: number;
    gemAmount: number;
    paymentMethod?: string;
}

export interface TopUpGemsResultDto {
    transaction: GemTransactionDto;
    gemsBalance: number;
    requiresPayment: boolean;
    checkoutUrl?: string;
    orderInvoiceNumber?: string;
}

// ── QUESTS ────────────────────────────────────────────────────────────────────
export type QuestStatus =
    | 'NotStarted' | 'InProgress' | 'Submitted'
    | 'Approved' | 'Rejected' | 'Expired' | 'Failed';

export type QuestDifficulty = 'EASY' | 'NORMAL' | 'HARD';

// Matches BE VerificationGuidance.ValidTags — CSV combination of these on VerificationTags.
// FACE blocks proof submission until the player has a verified portrait; ITEM/ACTION are
// informational hints (for the player and as AI request context) only.
export type VerificationTag = 'FACE' | 'ITEM' | 'ACTION';

export interface QuestDto {
    questId: number;
    userId: number;
    username?: string;
    partyId?: number;
    assignedByMentorId?: number;
    systemQuestTemplateId?: number;
    title: string;
    description?: string;
    questType: string;
    difficulty?: QuestDifficulty;
    damage: number;
    rewardMGold: number;      // M-Gold rewarded on approval (replaces rewardGold)
    proofType?: string;
    aiCheckEnabled: boolean;
    isMandatory: boolean;
    status: QuestStatus;
    startedAt?: string;
    completedAt?: string;
    deadlineAt?: string;
    createdAt: string;
}

export interface MentorQuestRangeDto {
    difficulty: QuestDifficulty;
    damageMin: number;
    damageMax: number;
    mGoldMin: number;
    mGoldMax: number;
}

export interface QuestDetailDto {
    questId: number;
    title: string;
    description?: string;
    questType: string;
    difficulty?: QuestDifficulty;
    damage: number;
    rewardMGold: number;
    proofType: string;
    isMandatory: boolean;
    status: QuestStatus;
    startedAt?: string;
    deadlineAt?: string;
    mentorUsername?: string;
    partyName?: string;
    bossName?: string;
    bossDifficulty?: string;
    sharedHpPenalty: number;
    reviewType: string;              // "Manual" | "AI + Mentor"
    aiVerificationEnabled: boolean;
    canUseLeavePass: boolean;
}

export interface CreateMentorQuestRequest {
    mentorUserId: number;
    targetUserId: number;
    partyId: number;
    title: string;
    description?: string;
    difficulty: QuestDifficulty;
    damage: number;
    rewardMGold: number;
    proofType?: string;
    isMandatory: boolean;
    deadlineAt: string;
    howToSubmit?: string;
    verificationTags?: string;
    /** Opt this quest into AI Check — proof submitted for it always goes through AI first, but AI
     *  only suggests (confidence/reasoning); the Mentor still makes the final approve/reject call.
     *  BE rejects this when proofType is SELF_CHECK or the mentor's package has no AI Verification. */
    aiCheckEnabled?: boolean;
}

export interface CreatePartyQuestRequest {
    mentorUserId: number;
    partyId: number;
    title: string;
    description?: string;
    difficulty: QuestDifficulty;
    damage: number;
    rewardMGold: number;
    proofType?: string;
    isMandatory: boolean;
    deadlineAt: string;
    howToSubmit?: string;
    verificationTags?: string;
    /** Opt this quest into AI Check — see CreateMentorQuestRequest.aiCheckEnabled. */
    aiCheckEnabled?: boolean;
}

export interface CreatePartyQuestResultDto {
    memberCount: number;
    generatedQuestIds: number[];
    partyName: string;
}

// ── PROOFS ────────────────────────────────────────────────────────────────────
export type ProofStatus =
    | 'Pending' | 'AiChecking' | 'Approved'
    | 'Suspicious' | 'Rejected' | 'AppealPending';

export type AiVerdict = 'Not Used' | 'Approved' | 'Suspicious' | 'Rejected';
export type ReviewType = 'Manual' | 'AI + Mentor';

export interface ProofDto {
    proofId: number;
    questId: number;
    questTitle?: string;
    questType?: string;
    questDescription?: string;
    questHowToSubmit?: string;
    userId: number;
    username?: string;
    partyId?: number | null;
    partyName?: string | null;
    proofType: string;
    mediaUrls: string[];
    textNote?: string;
    metadata?: string;
    status: ProofStatus;
    reviewRoute: string;
    aiStatus?: AiVerdict;   // enriched by BE: "Not Used" | "Approved" | "Suspicious" | "Rejected"
    aiConfidence?: number | null; // BE AiConfidence — 0..1
    aiReasoning?: string | null;  // BE AiReasoning — AI's explanation text for its verdict
    reviewType?: ReviewType; // enriched: "Manual" | "AI + Mentor"
    deadlineAt?: string;
    deadlineMet: boolean;
    submittedAt: string;
    reviewedAt?: string;
    reviewedByUserId?: number;
    reviewedByUsername?: string;
    rejectReason?: string;
    resubmitOfProofId?: number;
}

// ── BOSS RAID ─────────────────────────────────────────────────────────────────
export type BossMode = 'Easy' | 'Normal' | 'Hard';
export type MentorTier = 'Free' | 'Basic' | 'Premium';

export interface BossModeConfigDto {
    bossModeConfigId: number;
    mode: BossMode;
    minTier: MentorTier;
    partyMin: number;
    partyMax: number;
    bossHp: number;
    maxQuestPerMemberPerDay: number;
    maxPartyQuestPerWeek: number;
    maxDamagePerQuest: number;
    mGoldRewardCapPerQuest: number;
    // allowedProofTypes removed — proof type is now per subscription package
    rewardTier: string;
}

export interface BossTemplateDto {
    bossTemplateId: number;
    themeName: string;
    description?: string;
    // Art key — khớp BE BossTemplate.SpriteKey + roster monsterRoster.ts (resolve → ảnh public/monsters).
    spriteKey?: string | null;
    activeWeekStart: string;
    activeWeekEnd: string;
    startTime: string;
    endTime: string;
    registrationWindow: string;
    lateRegistrationWindow: string;
    requestExceptionWindow: string;
    proofPolicy: string;
    rewardPolicy: string;
    status: 'Draft' | 'Published' | 'Archived';
    createdAt: string;
    updatedAt?: string;
    modes: BossModeConfigDto[];
}

export interface RegisterWeeklyBossRequest {
    mentorUserId: number;
    partyId: number;
    bossTemplateId: number;
    difficulty: BossMode;
}

export interface WeeklyBossRegisterResultDto {
    raidId: number;
    partyId: number;
    partyName: string;
    bossTemplateId: number;
    bossName: string;
    difficulty: string;
    maxHp: number;
    currentHp: number;
    /** Nullable on the BE (int?) — a raid can exist before Shared HP is provisioned. */
    sharedHpMax: number | null;
    sharedHpCurrent: number | null;
    rewardTier: string;
    weekStartDate: string;
    weekEndDate: string;
    status: string;
}

/** BE has no username on this DTO — the UI can only show the id. */
export interface RaidParticipantDto {
    userId: number;
    damageDealt: number;
    questsCompleted: number;
}

/**
 * One row of a party's raid history (BE RaidDto), newest first.
 *
 * Needed because /party/{id}/status only ever returns the raid in progress, or
 * the most recent one when none is active — so once this week's Boss is
 * registered there is no other way to reach the weeks before it.
 */
export interface RaidHistoryDto {
    raidId: number;
    partyId: number;
    bossName: string;
    maxHp: number;
    currentHp: number;
    status: string;
    healthPercentage: number;
    weekStartDate: string;
    weekEndDate: string;
}

/** Cosmetic scene the *viewer* has equipped. Only populated when the status call
 *  passes a userId; the mentor view does not, so it stays null there. */
export interface ActiveSceneDto {
    code: string;
    name: string;
    backgroundUrl?: string | null;
}

export interface WeeklyBossStatusDto {
    raidId: number;
    partyId: number;
    bossName: string;
    difficulty: string;
    maxHp: number;
    currentHp: number;
    hpPercent: number;
    totalDamageDealt: number;
    status: string;
    rewardTier: string;
    weekStartDate: string;
    weekEndDate: string;
    defeatedAt?: string;
    participants: RaidParticipantDto[];
    activeScene?: ActiveSceneDto | null;
}

export interface RaidActivityDto {
    userId: number;
    username: string;
    questId?: number | null;
    questTitle: string;
    damageDealt: number;
    bossHpAfter: number;
    createdAt: string;
}

export interface SharedHpDto {
    raidId: number;
    partyId: number;
    enabled: boolean;
    sharedHpCurrent: number;
    sharedHpMax: number;
    percentage: number;
    status: string;       // Active | WipeOut | Defeated
    riskLevel: string;    // SAFE | LOW | MEDIUM | HIGH | WIPED
}

// ── PARTY REMINDER ────────────────────────────────────────────────────────────
export interface PartyReminderSettingDto {
    partyId: number;
    questDeadline2hEnabled: boolean;
    questDeadline30mEnabled: boolean;
    dailyReminderEnabled: boolean;
    dailyReminderHour: number;
    weeklyBossReminderEnabled: boolean;
    weeklyBossReminderDay: number;
    weeklyBossReminderHour: number;
    sendInApp: boolean;
    sendPush: boolean;
    sendEmail: boolean;
    sendPartyChat: boolean;
}

export interface ReminderDispatchResultDto {
    partyId: number;
    reminderType: string;
    notificationsCreated: number;
    chatMessagesCreated: number;
    details: string[];
}

export interface UpdateReminderSettingsPayload extends Omit<PartyReminderSettingDto, 'partyId'> {
    mentorUserId: number;
}

/**
 * Weekly Chest — created when the Boss is defeated (HP 0). A party WIPE produces
 * no chest. The list of people who may claim is frozen at the moment the Boss
 * falls (BE `EligibleUserIds`): joining afterwards earns nothing, and leaving
 * later still keeps your share. Chests never expire, so a party that has downed
 * several bosses carries several chests.
 *
 * A Mentor is not a PartyMember, so a Mentor is never eligible — the BE rejects
 * their claim outright. The mentor-facing UI therefore tracks progress only.
 */
export interface WeeklyChestDto {
    weeklyChestId: number;
    raidId: number;
    partyId: number;
    /** Only filled by GET /api/me/weekly-chests; party-scoped endpoints leave it "". */
    partyName: string;
    bossName: string;
    rewardTier: string;
    /** Gold EACH member receives — not the pot to divide. */
    goldReward: number;
    mgoldReward: number;
    badge: string;
    /** Size of the snapshot taken when the Boss fell. */
    eligibleMemberCount: number;
    claimedCount: number;
    /** Relative to the userId passed on the query — false when none was sent. */
    alreadyClaimed: boolean;
    /** Whether that userId is in the snapshot. BE contract: enable Claim on
     *  `eligible && !alreadyClaimed`. False when no userId was sent. */
    eligible: boolean;
    createdAt: string;
}
