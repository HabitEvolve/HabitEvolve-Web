// ==========================================
// ADMIN — USER DETAIL (Wallet / Streak / Proofs)
// Player-facing BE endpoints reused by the admin User Management detail view.
// All three accept an explicit ?userId= query param and are AllowAnonymous,
// so the admin panel can call them for any target user.
// ==========================================

// GET /api/me/wallet?userId=  — matches BE WalletDto (UserDto.cs)
export interface WalletDto {
    walletId: number;
    userId: number;
    goldBalance: number;
    bonusGoldBalance: number;
    gemsBalance: number;
    mentorGoldBalance: number;
    totalGold: number;
    cosmeticLevel: number;
    updatedAt: string | null;
}

// GET /api/me/daily-streak?userId=  — matches BE DailyStreakDto (DailyRuntimeDtos.cs)
export interface DailyStreakDto {
    streakId: number;
    userId: number;
    currentStreak: number;
    bestStreak: number;
    lastStreakDate: string | null;
    pendingStreakDate: string | null;
    hasStreakToday: boolean;
    hasPendingToday: boolean;
    updatedAt: string;
}

// GET /api/proofs?userId=&status=  — matches BE ProofDto (ProofDtos.cs)
// Only the fields the admin detail view actually renders are typed here.
export interface UserProofDto {
    proofId: number;
    questId: number;
    questTitle: string | null;
    questType: string | null;
    userId: number;
    username: string | null;
    proofType: string;
    mediaUrls: string[];
    originalMediaUrls: string[];
    textNote: string | null;
    status: string;
    reviewRoute: string;
    deadlineMet: boolean;
    submittedAt: string;
    reviewedAt: string | null;
    rejectReason: string | null;
    aiVerdict: "approve" | "reject" | "suspicious" | null;
    aiStatus: string;
    aiConfidence: number | null;
}
