// ==========================================
// MODULE 4B: PRACTICAL TASK TEMPLATES (ADMIN)
// ==========================================
// Two separate BE controllers:
//   GET /admin/practical-task-templates?goalId=X  →  PracticalTaskTemplateDto (read-only)
//   CRUD /admin/task-templates                    →  TaskTemplateDto

// Matches BE PracticalRepeatType enum
export type PracticalRepeatType = "DailyRepeatable" | "Rotatable" | "Optional" | "Bonus";

// Matches BE RecommendationLevel enum
export type RecommendationLevel = "MustDo" | "Recommended" | "Optional" | "Bonus";

// Matches BE TaskRole enum
export type TaskRole = "Core" | "Support" | "Tracking" | "Reflection" | "Challenge" | "Review";

// Matches BE TaskStrategy enum
export type TaskStrategy =
    | "Main" | "Prepare" | "Track" | "Trigger" | "Environment"
    | "Reflect" | "SmallExtra" | "Rating" | "BonusChallenge" | "WeeklyReview";

// ----------------------------------------
// GET /admin/practical-task-templates?goalId=X
// Matches BE PracticalTaskTemplateDto exactly
// ----------------------------------------
export interface PracticalTaskTemplateDto {
    templateId: number;
    goalId: number;
    templateCode: string;
    rankDefault: number;
    recommendationLevel: RecommendationLevel;
    taskRole: TaskRole;
    strategy: TaskStrategy;
    titleTemplate: string;
    descriptionTemplate: string | null;
    requiredVariables: string | null;
    repeatType: PracticalRepeatType;
    defaultRecommendScore: number;
    defaultDamage: number;
    defaultRewardGold: number;
    sampleRenderedTask: string | null;
    isActive: boolean;
}

// ----------------------------------------
// GET /admin/task-templates
// Matches BE TaskTemplateDto exactly
// ----------------------------------------
export interface TaskTemplateDto {
    taskTemplateId: number;
    taskCode: string;
    taskName: string;
    taskDescription: string | null;
    taskType: string;
    difficulty: string;
    durationDays: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
}

// POST /admin/task-templates & PUT /admin/task-templates/{id}
export interface TaskTemplatePayload {
    taskCode: string;
    taskName: string;
    taskDescription?: string;
    taskType: string;
    difficulty: string;
    durationDays?: number;
    isActive: boolean;
}
