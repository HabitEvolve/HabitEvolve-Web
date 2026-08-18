// ==========================================
// ADMIN — USER 360 WORKSPACE (Quests / Analytics / Activity History)
// Matches BE HabitEvolve.Application/Common/DTOs/UserWorkspaceDtos.cs
// Endpoints: GET /admin/users/{userId}/quests | /stats | /history
// ==========================================

// GET /admin/users/{userId}/quests — matches BE UserQuestDto
export interface UserQuestDto {
    questId: number;
    title: string;
    questType: string; // SYSTEM_QUEST | GLOBAL_QUEST | MENTOR_QUEST | PARTY_QUEST | DAILY_TASK
    difficulty: string; // EASY | NORMAL | HARD
    status: string; // NotStarted | InProgress | Submitted | Approved | Rejected | Expired | Failed
    proofType: string | null;
    damage: number;
    rewardGold: number;
    rewardXp: number;
    startedAt: string | null;
    deadlineAt: string | null;
    completedAt: string | null;
    createdAt: string;
}

export interface UserQuestsDto {
    active: UserQuestDto[];
    recentCompleted: UserQuestDto[];
}

// GET /admin/users/{userId}/stats — matches BE UserDailyStatPointDto / UserStatsDto
export interface UserDailyStatPointDto {
    date: string; // "yyyy-MM-dd" (DateOnly)
    questsCompleted: number;
    questsTotal: number;
    completionRate: number; // 0-100
    damageDealt: number;
    goldEarned: number;
}

export interface UserStatsDto {
    rangeDays: number;
    daily: UserDailyStatPointDto[];
    totalQuestsCompleted: number;
    totalDamageDealt: number;
    totalGoldEarned: number;
    overallCompletionRate: number; // 0-100
}

// GET /admin/users/{userId}/history — matches BE UserActivityDto
export interface UserActivityDto {
    type: "PROOF_SUBMITTED" | "RAID_CONTRIBUTION" | "PARTY_JOIN_REQUESTED" | string;
    description: string;
    timestamp: string;
    refType: string | null;
    refId: number | null;
}

// GET /admin/users/{userId}/goals — matches BE GoalSummaryDto (1 row/goal, Active or Completed only)
export interface GoalSummaryDto {
    selectionId: number;
    goalId: number;
    goalName: string;
    status: string; // Active | Completed
    currentWeek: number;
    totalWeeks: number;
    tasksCompleted: number;
    tasksTotal: number;
    adherencePercent: number; // 0-100
    isFocused: boolean;
    completedAt: string | null;
}

// GET /admin/users/{userId}/tasks — matches BE UserTaskSubscriptionDto
export interface UserTaskSubscriptionDto {
    subscriptionId: number;
    userId: number;
    selectionId: number;
    practicalTaskTemplateId: number | null;
    taskName: string | null;
    taskDescription: string | null;
    taskType: string;
    difficulty: string; // EASY | NORMAL | HARD
    durationDays: number | null;
    status: string; // Active | Paused | Completed | Cancelled
    difficultyOffset: number;
    startedAt: string;
    completedAt: string | null;
    createdAt: string;
    // Joined via SelectionId → UserGoalSelection.GoalId, so FE can group tasks by goal.
    goalId: number | null;
    goalName: string | null;
}

// GET /admin/users/{userId}/goal-selections/{selectionId}/progress-chart — matches BE ProgressChartDto.
// Same shape the Mobile app reads for the player's own "Progress Chart" — Admin reuses it read-only.
export interface ProgressChartPointDto {
    week: number;
    targetValue: number;
    targetLabel: string;
    targetPercent: number;
    isManualOverride: boolean;
    actualValue: number | null;
    actualLabel: string | null;
    actualPercent: number | null;
    tasksTotal: number;
    tasksCompleted: number;
    completionRate: number;
}

export interface VariableChartDto {
    measurementType: string;
    unit: string;
    baselineValue: number;
    baselineLabel: string;
    finalValue: number;
    finalLabel: string;
    hasNumericTarget: boolean;
    isAlreadyAtTarget: boolean;
    points: ProgressChartPointDto[];
}

export interface ProgressChartDto {
    selectionId: number;
    goalId: number;
    goalName: string;
    totalWeeks: number;
    currentWeek: number;
    variables: VariableChartDto[];
}

// GET /admin/users/{userId}/goal-selections/{selectionId}/target-history — matches BE GoalTargetChangeDto.
// Newest first. ChangeType: SET_WEEK_TARGET | CLEAR_WEEK_TARGET | EXTEND_WEEKS.
export interface GoalTargetChangeDto {
    logId: number;
    selectionId: number;
    changeType: string;
    measurementType: string;
    weekNumber: number | null;
    oldValue: number | null;
    newValue: number | null;
    curveValue: number | null;
    oldLabel: string | null;
    newLabel: string | null;
    curveLabel: string | null;
    oldWeeks: number | null;
    newWeeks: number | null;
    createdAt: string;
}
