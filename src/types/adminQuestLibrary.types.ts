// ==========================================
// MODULE 5 (M5): SYSTEM QUEST LIBRARY (ADMIN)
// Matches BE SystemQuestTemplateDto exactly
// ==========================================

export type QuestLibraryDifficulty = "EASY" | "NORMAL" | "HARD" | "EPIC";
export type QuestLibraryStatus = "Draft" | "Published" | "Archived";
export type RepeatRule = "Daily" | "Weekly" | "Monthly" | "OneTime" | string;
export type QuestAction = "publish" | "archive";

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
}

// POST /api/admin/quest-library — CreateQuestTemplateCommand
export interface CreateQuestLibraryItemPayload {
    title: string;
    description?: string;
    difficulty: QuestLibraryDifficulty;
    damage?: number;
    proofType: string;
    repeatRule: RepeatRule;
    rewardGold: number;
    rewardBonusGold?: number;
    rewardXp: number;
    rewardGems?: number;
    goalIds: number[];
    verificationPolicyId?: number;
    isActive?: boolean;
}

// PUT /api/admin/quest-library/{id} — UpdateQuestTemplateCommand
// NOTE: templateId must be included in body (BE validates id == command.TemplateId)
export interface UpdateQuestLibraryItemPayload {
    templateId: number;
    title: string;
    description?: string;
    difficulty: QuestLibraryDifficulty;
    damage?: number;
    proofType: string;
    repeatRule: RepeatRule;
    verificationPolicyId?: number;
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

export interface GetQuestLibraryParams {
    status?: QuestLibraryStatus;
    difficulty?: QuestLibraryDifficulty;
    goalId?: number;
    page?: number;
    pageSize?: number;
}
