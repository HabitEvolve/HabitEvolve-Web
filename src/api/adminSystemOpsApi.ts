import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    BroadcastNotificationPayload,
    BroadcastResultDto,
    CreateInAppNotificationPayload,
    NotificationDto,
    AdminOverrideProofPayload,
    ProofDto,
    SharedHpChangePayload,
    SharedHpDto,
} from '../types/adminSystemOps.types';

export const adminSystemOpsApi = {
    // POST /api/admin/daily-monsters/spawn?date=YYYY-MM-DD
    spawnMonsters: async (date?: string): Promise<ApiResponse<number>> => {
        const params = date ? { date } : undefined;
        const res = await axiosClient.post<ApiResponse<number>>('/admin/daily-monsters/spawn', null, { params });
        return res.data;
    },

    // POST /api/admin/daily-streak/finalize?date=YYYY-MM-DD
    finalizeStreak: async (date?: string): Promise<ApiResponse<number>> => {
        const params = date ? { date } : undefined;
        const res = await axiosClient.post<ApiResponse<number>>('/admin/daily-streak/finalize', null, { params });
        return res.data;
    },

    // POST /api/admin/notifications/broadcast
    broadcastNotification: async (payload: BroadcastNotificationPayload): Promise<ApiResponse<BroadcastResultDto>> => {
        const res = await axiosClient.post<ApiResponse<BroadcastResultDto>>('/admin/notifications/broadcast', payload);
        return res.data;
    },

    // POST /api/notifications/in-app
    createInAppNotification: async (payload: CreateInAppNotificationPayload): Promise<ApiResponse<NotificationDto>> => {
        const res = await axiosClient.post<ApiResponse<NotificationDto>>('/notifications/in-app', payload);
        return res.data;
    },

    // POST /api/admin/proofs/{id}/override
    // decision: "approve" | "reject" — admin final verdict overriding normal review flow
    overrideProof: async (proofId: number, payload: AdminOverrideProofPayload): Promise<ApiResponse<ProofDto>> => {
        const res = await axiosClient.post<ApiResponse<ProofDto>>(`/admin/proofs/${proofId}/override`, payload);
        return res.data;
    },

    // POST /api/raids/{raidId}/shared-hp/penalty
    // amount?: int — if omitted BE uses default; reason optional
    applyHpPenalty: async (raidId: number, payload?: SharedHpChangePayload): Promise<ApiResponse<SharedHpDto>> => {
        const res = await axiosClient.post<ApiResponse<SharedHpDto>>(`/raids/${raidId}/shared-hp/penalty`, payload ?? {});
        return res.data;
    },

    // POST /api/raids/{raidId}/shared-hp/restore
    restoreHp: async (raidId: number, payload?: SharedHpChangePayload): Promise<ApiResponse<SharedHpDto>> => {
        const res = await axiosClient.post<ApiResponse<SharedHpDto>>(`/raids/${raidId}/shared-hp/restore`, payload ?? {});
        return res.data;
    },
};
