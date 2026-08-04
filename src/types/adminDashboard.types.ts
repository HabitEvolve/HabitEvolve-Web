// ==========================================
// ADMIN DASHBOARD — "System Overwatch"
// Synced against BE: HabitEvolve.Application.Features.Dashboard.DashboardFeature +
// HabitEvolve.API.Controllers.AdminDashboardController (GET /api/admin/dashboard/summary).
//
// This is the single consolidated payload for the Admin Dashboard page — it bundles the
// same range-scoped reports as adminReports.types.ts (userActivity/economy/questCompletion)
// plus action-required signals, vitals, and two live feeds (always top-5-most-recent,
// independent of the from/to range).
// ==========================================

import type {
    DateRangeQueryParams,
    EconomyReportDto,
    QuestCompletionReportDto,
    UserActivityReportDto,
} from './adminReports.types';

export type { DateRangeQueryParams };

// ── Action Required ──
export interface ActionRequiredDto {
    pendingCourtCases: number;
    missingWeeklyBosses: number;
}

// ── Recent Transactions ──
// BE note: the only real-money flow in this system is Gems top-up (SePay/DEMO) — subscriptions
// are purchased WITH Gems, not directly with VND, so packageName describes the Gems top-up here,
// not a subscription plan name.
export interface RecentTransactionDto {
    id: string;
    userName: string;
    userEmail: string;
    packageName: string;
    amount: number;
    status: string; // "COMPLETED" | "PENDING" | "CANCELLED"
    createdAt: string;
}

// ── Critical System Logs ──
// BE note: no dedicated abuse-report/anti-cheat table exists yet — this feed is composed from
// real signals already in the system: failed background jobs (CRITICAL), pending Appeals and
// pending Court Cases (WARNING), merged and sorted by recency.
export type CriticalLogLevel = 'WARNING' | 'CRITICAL';

export interface CriticalSystemLogDto {
    id: string;
    title: string;
    level: CriticalLogLevel;
    source: string;
    createdAt: string;
}

// ── Summary (top-level payload) ──
export interface AdminDashboardSummaryDto {
    userActivity: UserActivityReportDto;
    economy: EconomyReportDto;
    questCompletion: QuestCompletionReportDto;
    actionRequired: ActionRequiredDto;
    totalActiveMentors: number;
    recentTransactions: RecentTransactionDto[];
    criticalSystemLogs: CriticalSystemLogDto[];
}
