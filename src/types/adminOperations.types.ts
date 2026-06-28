// ==========================================
// ADMIN OPERATIONS — Screens 18, 19, 20
// AI Test · Notifications · Proof Override · Manual Jobs
// ==========================================

// ── SCREEN 18: AI VERIFICATION TEST ──────────────────────────────────────────

// Route value returned by AI: AutoApprove / RouteCourt / Reject
export type AiVerificationRoute = "AutoApprove" | "RouteCourt" | "Reject";

// POST /api/admin/ai/verify-test — body
export interface AiVerifyTestPayload {
    proofType: string;
    mediaUrls: string[];
    questTitle?: string;
    textNote?: string;
}

// POST /api/admin/ai/verify-test — response data
export interface AiVerificationResult {
    isApproved: boolean;
    confidence: number;  // 0.0–1.0; ≥0.85 = AutoApprove, 0.5–0.85 = RouteCourt, <0.5 = Reject
    route: AiVerificationRoute;
    reasoning: string;
}

// ── SCREEN 19: NOTIFICATIONS & PROOF OVERRIDE ─────────────────────────────────

export type BroadcastTarget = "ALL" | "ROLE" | "USERS";

// POST /api/admin/notifications/broadcast — body
export interface BroadcastPayload {
    target: BroadcastTarget;
    role?: string;          // required when target = "ROLE"
    userIds?: number[];     // required when target = "USERS"
    type?: string;
    title: string;
    body?: string;
}

// POST /api/admin/notifications/broadcast — response data
export interface BroadcastResultDto {
    target: BroadcastTarget;
    totalRecipients: number;
    notificationsCreated: number;
    skippedByPreference: number;
}

// POST /api/notifications/in-app (single user) — body
export interface SingleNotificationPayload {
    userId: number;
    type?: string;
    title: string;
    body?: string;
    sourceType?: string;
    sourceId?: number;
}

// POST /api/admin/proofs/{id}/override — body
export interface ProofOverridePayload {
    adminUserId: number;
    decision: "approve" | "reject";
    reason?: string;
}

// ── SCREEN 20: MANUAL JOB TRIGGERS ───────────────────────────────────────────

// POST /api/admin/daily-monsters/spawn?date=YYYY-MM-DD — response data
export interface DailyMonsterSpawnResultDto {
    date: string;
    spawned: number;
    skipped: number;
}

// POST /api/admin/daily-streak/finalize?date=YYYY-MM-DD — response data
export interface DailyStreakFinalizeResultDto {
    date: string;
    processed: number;
    streaksReset: number;
}

// POST /api/parties/{partyId}/expire-overdue-quests — response data
export interface ExpireOverdueQuestsResultDto {
    partyId: number;
    expiredCount: number;
    sharedHpPenaltyApplied: number;
}
