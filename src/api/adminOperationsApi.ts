import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    AiVerifyTestPayload,
    AiVerificationResult,
    BroadcastPayload,
    BroadcastResultDto,
    SingleNotificationPayload,
    NotificationDto,
    ProofOverridePayload,
    ExpireOverdueQuestsResultDto,
    SharedHpChangePayload,
    SharedHpDto,
} from '../types/adminOperations.types';
import type { ProofDto } from '../types/mentor.types';

const adminOperationsApi = {
    // ── SCREEN 18: AI VERIFICATION TEST ──────────────────────────────────────

    // POST /api/admin/ai/verify-test
    // Calls IAiVerificationService (Gemini): confidence ≥0.85 → AutoApprove, 0.5–0.85 → RouteCourt, <0.5 → Reject
    aiVerifyTest: async (payload: AiVerifyTestPayload): Promise<ApiResponse<AiVerificationResult>> => {
        const res = await axiosClient.post<ApiResponse<AiVerificationResult>>(
            '/admin/ai/verify-test',
            payload
        );
        return res.data;
    },

    // ── SCREEN 19: NOTIFICATIONS ──────────────────────────────────────────────

    // POST /api/notifications/in-app — single user notification; BE returns the created NotificationDto (201)
    sendNotification: async (payload: SingleNotificationPayload): Promise<ApiResponse<NotificationDto>> => {
        const res = await axiosClient.post<ApiResponse<NotificationDto>>('/notifications/in-app', payload);
        return res.data;
    },

    // POST /api/admin/notifications/broadcast — ALL | ROLE | USERS
    broadcast: async (payload: BroadcastPayload): Promise<ApiResponse<BroadcastResultDto>> => {
        const res = await axiosClient.post<ApiResponse<BroadcastResultDto>>(
            '/admin/notifications/broadcast',
            payload
        );
        return res.data;
    },

    // ── SCREEN 19: PROOF OVERRIDE ─────────────────────────────────────────────

    // POST /api/admin/proofs/{id}/override — admin final verdict (overrides court/AI result)
    overrideProof: async (proofId: number, payload: ProofOverridePayload): Promise<ApiResponse<ProofDto>> => {
        const res = await axiosClient.post<ApiResponse<ProofDto>>(
            `/admin/proofs/${proofId}/override`,
            payload
        );
        return res.data;
    },

    // ── SCREEN 20: MANUAL JOB TRIGGERS ───────────────────────────────────────

    // POST /api/admin/daily-monsters/spawn?date=YYYY-MM-DD — Data = count of monsters created (int)
    spawnDailyMonsters: async (date?: string): Promise<ApiResponse<number>> => {
        const res = await axiosClient.post<ApiResponse<number>>(
            '/admin/daily-monsters/spawn',
            null,
            { params: date ? { date } : undefined }
        );
        return res.data;
    },

    // POST /api/admin/daily-streak/finalize?date=YYYY-MM-DD — Data = count of streaks reset (int)
    finalizeDailyStreak: async (date?: string): Promise<ApiResponse<number>> => {
        const res = await axiosClient.post<ApiResponse<number>>(
            '/admin/daily-streak/finalize',
            null,
            { params: date ? { date } : undefined }
        );
        return res.data;
    },

    // POST /api/parties/{partyId}/expire-overdue-quests — fail mandatory overdue quests + penalise Shared HP
    expireOverdueQuests: async (partyId: number): Promise<ApiResponse<ExpireOverdueQuestsResultDto>> => {
        const res = await axiosClient.post<ApiResponse<ExpireOverdueQuestsResultDto>>(
            `/parties/${partyId}/expire-overdue-quests`
        );
        return res.data;
    },

    // POST /api/raids/{raidId}/shared-hp/penalty — manually deduct Shared HP; BE returns the updated SharedHpDto
    applySharedHpPenalty: async (raidId: number, payload?: SharedHpChangePayload): Promise<ApiResponse<SharedHpDto>> => {
        const res = await axiosClient.post<ApiResponse<SharedHpDto>>(
            `/raids/${raidId}/shared-hp/penalty`,
            payload ?? {}
        );
        return res.data;
    },

    // POST /api/raids/{raidId}/shared-hp/restore — manually restore Shared HP; BE returns the updated SharedHpDto
    restoreSharedHp: async (raidId: number, payload?: SharedHpChangePayload): Promise<ApiResponse<SharedHpDto>> => {
        const res = await axiosClient.post<ApiResponse<SharedHpDto>>(
            `/raids/${raidId}/shared-hp/restore`,
            payload ?? {}
        );
        return res.data;
    },
};

export default adminOperationsApi;
