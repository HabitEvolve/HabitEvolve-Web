// ==========================================
// ADMIN REPORTING & ANALYTICS
// Synced against BE: HabitEvolve.Application.Features.Reporting.ReportingFeature +
// HabitEvolve.API.Controllers.AdminReportingController (api/admin/reports).
//
// NOTE: these reports are aggregate-over-range only — the BE does NOT return a
// per-day time series (no "entries"/"date" breakdown). Economy is one row per
// currency for the whole range; quest completion is one row per QuestType;
// user activity is a single pair of numbers for the whole range.
// ==========================================

// GET /api/admin/reports/*?from=&to= (DateTime query params, ISO date strings accepted)
export interface DateRangeQueryParams {
    from: string;
    to: string;
}

// ── Economy ──
export interface EconomyCurrencyStatDto {
    currency: string; // "GOLD" | "GEMS" | "MGOLD"
    earned: number;
    spent: number;
    net: number; // BE-computed: earned - spent
}

export interface EconomyReportDto {
    from: string;
    to: string;
    byCurrency: EconomyCurrencyStatDto[];
}

// ── Quest completion ──
export interface QuestTypeStatDto {
    questType: string;
    total: number;
    approved: number;
    rejected: number;
    failed: number;
    completionRate: number; // 0–1 fraction (BE: Math.Round(Approved / Total, 4))
}

export interface QuestCompletionReportDto {
    from: string;
    to: string;
    byQuestType: QuestTypeStatDto[];
}

// ── User activity ──
export interface UserActivityReportDto {
    from: string;
    to: string;
    newUsers: number;
    activeUsers: number; // proxy: users with >= 1 quest created in range
}
