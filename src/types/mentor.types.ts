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

export interface SubscriptionUsageDto {
    partiesUsed: number;
    maxParties: number;
    largestPartyMemberCount: number;
    maxMembersPerParty: number;
    questsAssignedToday: number;
    questsPerMemberPerDay: number;
    partyQuestsThisWeek: number;
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
    userId: number;
    username?: string;
    proofType: string;
    mediaUrls: string[];
    textNote?: string;
    metadata?: string;
    status: ProofStatus;
    reviewRoute: string;
    aiStatus?: AiVerdict;   // enriched by BE: "Not Used" | "Approved" | "Suspicious" | "Rejected"
    reviewType?: ReviewType; // enriched: "Manual" | "AI + Mentor"
    deadlineAt?: string;
    deadlineMet: boolean;
    submittedAt: string;
    reviewedAt?: string;
    reviewedByUserId?: number;
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
    sharedHpMax: number;
    sharedHpCurrent: number;
    rewardTier: string;
    weekStartDate: string;
    weekEndDate: string;
    status: string;
}

export interface RaidParticipantDto {
    userId: number;
    damageDealt: number;
    questsCompleted: number;
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
}

export interface RaidActivityDto {
    username: string;
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

export interface WeeklyChestDto {
    bossName: string;
    rewardTier: string;
    goldReward: number;
    mgoldReward: number;
    badge: string;
    eligibleMemberCount: number;
    claimedCount: number;
    alreadyClaimed: boolean;
}
