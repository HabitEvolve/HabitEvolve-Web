// ==========================================
// ADMIN OPERATIONS — Screens 18, 19, 20
// AI Test · Notifications · Proof Override · Manual Jobs
// ==========================================

// ── SCREEN 18: AI VERIFICATION TEST ──────────────────────────────────────────

// Route value returned by AI: AutoApprove / RouteCourt / Reject
export type AiVerificationRoute = "AutoApprove" | "RouteCourt" | "Reject";

// POST /api/admin/ai/verify-test — body (AdminAiController.AiVerifyTestRequest)
export interface AiVerifyTestPayload {
    proofType?: string;
    mediaUrls?: string[];
    questTitle?: string;
    questDescription?: string;
    textNote?: string;
}

// POST /api/admin/ai/verify-test — response data.
// Synced against HabitEvolve.Application.Common.Interfaces.AiVerifyDebugResult — this is a raw
// debug dump of the Gemini call, not a simplified {isApproved, confidence, route, reasoning}
// shape (that shape doesn't exist anywhere on the BE).
export interface AiVerificationResult {
    usedForceVerdict: boolean;
    forceVerdictValue: string | null;
    prompt: string;
    rawGeminiResponse: string | null;
    geminiParsedJson: string | null;
    confidence: number | null;
    geminiVerdictRaw: string | null; // PASS / FAIL (raw CV service verdict)
    reason: string | null;
    finalVerdict: AiVerificationRoute | string; // AutoApprove / RouteCourt / Reject
    errorMessage: string | null;
    blurredImageBase64: string | null;
    stepsJson: string | null;
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

// POST /api/notifications/in-app — response data (201 Created, Data = NotificationDto).
// See UserDto.cs NotificationDto — BE always returns the created row, never void.
export interface NotificationDto {
    notificationId: number;
    userId: number;
    type: string;
    title: string;
    body: string | null;
    sourceType: string | null;
    sourceId: number | null;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
}

// POST /api/admin/proofs/{id}/override — body
export interface ProofOverridePayload {
    adminUserId: number;
    decision: "approve" | "reject";
    reason?: string;
}

// ── SCREEN 20: MANUAL JOB TRIGGERS ───────────────────────────────────────────

// POST /api/admin/daily-monsters/spawn?date=YYYY-MM-DD — response data.
// DailyMonsterController.SpawnAll returns ApiResponse<int> directly (count created) — there is
// no DailyMonsterSpawnResultDto object on the BE.
// POST /api/admin/daily-streak/finalize?date=YYYY-MM-DD — response data.
// DailyStreakController.Finalize likewise returns ApiResponse<int> (count of streaks reset).

// POST /api/parties/{partyId}/expire-overdue-quests — response data
// (SharedHpController.ExpireOverdue → ExpireOverdueResultDto)
export interface ExpireOverdueQuestsResultDto {
    partyId: number;
    failedCount: number;
    penalizedCount: number;
    details: string[];
}

// POST /api/raids/{raidId}/shared-hp/penalty and /restore — body (SharedHpController.SharedHpChangeBody)
export interface SharedHpChangePayload {
    amount?: number;
    reason?: string;
}

// Response — matches BE SharedHpDto (HabitEvolve.Application.Common.DTOs.SharedHpDtos)
export interface SharedHpDto {
    raidId: number;
    partyId: number;
    enabled: boolean;
    sharedHpMax: number;
    sharedHpCurrent: number;
    percentage: number;
    status: string;
    riskLevel: string; // SAFE | LOW | MEDIUM | HIGH | WIPED
}
