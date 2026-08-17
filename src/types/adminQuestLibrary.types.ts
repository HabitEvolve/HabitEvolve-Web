// ==========================================
// MODULE 5 (M5): SYSTEM QUEST LIBRARY (ADMIN)
// Matches BE SystemQuestTemplateDto exactly
// ==========================================

export type QuestLibraryDifficulty = "EASY" | "NORMAL" | "HARD" | "EPIC";
export type QuestLibraryStatus = "Draft" | "Published" | "Archived";
export type RepeatRule = "Daily" | "Weekly" | "Monthly" | "OneTime" | string;
export type QuestAction = "publish" | "archive";

// Matches BE VerificationGuidance.ValidTags — CSV combination of these on VerificationTags.
// FACE blocks proof submission until the player has a verified portrait; ITEM/ACTION are
// informational hints (for the player and as AI request context) only.
export type VerificationTag = "FACE" | "ITEM" | "ACTION";

// Matches BE SystemQuestTemplateDto (AdminQuestLibraryController)
export interface QuestLibraryItemDto {
    templateId: number;
    title: string;
    description: string | null;
    difficulty: QuestLibraryDifficulty;
    damage: number;
    proofType: string;
    repeatRule: RepeatRule;
    rewardGold: number;
    rewardBonusGold: number;
    rewardXp: number;
    rewardGems: number;
    verificationPolicyId: number | null;
    status: QuestLibraryStatus;
    isActive: boolean;
    goalIds: number[];
    createdAt: string;
    updatedAt: string | null;
    // Player-facing submission instructions (max 500 chars).
    howToSubmit: string | null;
    // CSV of VerificationTag values, e.g. "FACE,ITEM".
    verificationTags: string | null;
}

// POST /api/admin/quest-library — CreateQuestTemplateCommand
export interface CreateQuestLibraryItemPayload {
    title: string;
    description?: string;
    difficulty: QuestLibraryDifficulty;
    damage: number; // BE: CreateQuestTemplateCommand.Damage is required (int, no default)
    proofType: string;
    repeatRule: RepeatRule;
    rewardGold: number;
    rewardBonusGold?: number;
    rewardXp: number;
    rewardGems?: number;
    goalIds: number[];
    verificationPolicyId?: number;
    isActive?: boolean;
    howToSubmit?: string;
    verificationTags?: string;
}

// PUT /api/admin/quest-library/{id} — UpdateQuestTemplateCommand
// NOTE: templateId must be included in body (BE validates id == command.TemplateId)
export interface UpdateQuestLibraryItemPayload {
    templateId: number;
    title: string;
    description?: string;
    difficulty: QuestLibraryDifficulty;
    damage: number; // BE: UpdateQuestTemplateCommand.Damage is required (int, no default)
    proofType: string;
    repeatRule: RepeatRule;
    verificationPolicyId?: number;
    howToSubmit?: string;
    verificationTags?: string;
}

// PATCH /api/admin/quest-library/{id}/status — ChangeQuestStatusRequest
export interface ChangeQuestLibraryStatusPayload {
    action: QuestAction; // "publish" | "archive"
}

// POST /api/admin/quest-library/{id}/reward-matrix — SetRewardMatrixRequest
export interface SetRewardMatrixPayload {
    gold: number;
    bonusGold: number;
    xp: number;
    gems: number;
}

// POST /api/admin/quest-library/{id}/personalization — SetPersonalizationRequest
// Replaces the full goalIds list
export interface SetPersonalizationPayload {
    goalIds: number[];
}

// PATCH /api/admin/quest-library/{id}/global — SetGlobalRequest
export interface ToggleGlobalPayload {
    isGlobal: boolean;
}

// pageNumber/pageSize match the convention confirmed working for GET /admin/users
// (see GetUsersQueryParams) and reused across the other Admin list endpoints.
export interface GetQuestLibraryParams {
    search?: string;
    status?: QuestLibraryStatus;
    difficulty?: QuestLibraryDifficulty;
    goalId?: number;
    pageNumber?: number;
    pageSize?: number;
}
