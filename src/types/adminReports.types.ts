// ==========================================
// ADMIN REPORTING & ANALYTICS
// Field names are inferred from the endpoint list — confirm against the real
// BE DTOs once available and adjust if they drift.
// ==========================================

// Shared query params — GET /api/admin/reports/*?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export interface DateRangeQueryParams {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

// GET /api/admin/reports/economy — one row per day
export interface EconomyReportEntryDto {
    date: string;
    goldInflow: number;
    goldOutflow: number;
    gemsInflow: number;
    gemsOutflow: number;
    mGoldInflow: number;
    mGoldOutflow: number;
}

export interface EconomyReportDto {
    startDate: string;
    endDate: string;
    entries: EconomyReportEntryDto[];
    totalGoldInflow: number;
    totalGoldOutflow: number;
    totalGemsInflow: number;
    totalGemsOutflow: number;
    totalMGoldInflow: number;
    totalMGoldOutflow: number;
}

// GET /api/admin/reports/quest-completion — one row per QuestType
export interface QuestCompletionReportEntryDto {
    questType: string;
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number; // 0–100
}

export interface QuestCompletionReportDto {
    startDate: string;
    endDate: string;
    entries: QuestCompletionReportEntryDto[];
}

// GET /api/admin/reports/user-activity — one row per day
export interface UserActivityReportEntryDto {
    date: string;
    newSignups: number;
    activeUsers: number;
}

export interface UserActivityReportDto {
    startDate: string;
    endDate: string;
    entries: UserActivityReportEntryDto[];
    totalNewSignups: number;
}
