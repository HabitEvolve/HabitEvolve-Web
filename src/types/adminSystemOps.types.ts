// ==========================================
// ADMIN SYSTEM OPERATIONS
// Daily task triggers + notification broadcast
// ==========================================

export type BroadcastTarget = "ALL" | "ROLE" | "USERS";

// POST /api/admin/daily-monsters/spawn?date=YYYY-MM-DD
// Response: ApiResponse<int> — count of monsters spawned
export interface SpawnMonstersParams {
    date?: string;
}

// POST /api/admin/daily-streak/finalize?date=YYYY-MM-DD
// Response: ApiResponse<int> — count of player streaks finalized
export interface FinalizeStreakParams {
    date?: string;
}

// POST /api/admin/notifications/broadcast
export interface BroadcastNotificationPayload {
    target: BroadcastTarget;
    role?: string;       // required when target = "ROLE"
    userIds?: number[];  // required when target = "USERS"
    type?: string;
    title: string;
    body?: string;
    sourceType?: string;
    sourceId?: number;
}

// Response shape for broadcast — matches BE BroadcastResultDto
export interface BroadcastResultDto {
    target: string;
    totalRecipients: number;
    notificationsCreated: number;
    skippedByPreference: number;
}

// POST /api/admin/proofs/{id}/override
export type ProofDecision = "approve" | "reject";

export interface AdminOverrideProofPayload {
    adminUserId: number;
    decision: ProofDecision;
    reason?: string;
}

// Response — matches BE ProofDto (relevant fields)
export interface ProofDto {
    proofId: number;
    questId: number;
    questTitle: string | null;
    userId: number;
    username: string | null;
    proofType: string;
    status: string;
    reviewRoute: string;
    aiVerdict: string | null;
    deadlineMet: boolean;
    submittedAt: string;
    reviewedAt: string | null;
    rejectReason: string | null;
}

// POST /api/raids/{raidId}/shared-hp/penalty
// POST /api/raids/{raidId}/shared-hp/restore
export interface SharedHpChangePayload {
    amount?: number;
    reason?: string;
}

// Response — matches BE SharedHpDto
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

// POST /api/notifications/in-app
export interface CreateInAppNotificationPayload {
    userId: number;
    type?: string;
    title: string;
    body?: string;
    sourceType?: string;
    sourceId?: number;
}

// Response shape — matches BE NotificationDto
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
