import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    BossTemplateDto,
    BossTemplatePayload,
    UpdateBossTemplatePayload,
    BossModePayload
} from '../types/adminBoss.types';

const BOSS_URL = '/admin/boss-templates';

export const adminBossApi = {
    // GET /admin/boss-templates?status=str
    // NOTE: BE does NOT support page/pageSize on this endpoint
    getTemplates: async (params?: { status?: string }): Promise<ApiResponse<BossTemplateDto[]>> => {
        const res = await axiosClient.get<ApiResponse<BossTemplateDto[]>>(BOSS_URL, { params });
        return res.data;
    },

    // GET /admin/boss-templates/{id}
    getTemplateById: async (id: number): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.get<ApiResponse<BossTemplateDto>>(`${BOSS_URL}/${id}`);
        return res.data;
    },

    // POST /admin/boss-templates
    createTemplate: async (payload: BossTemplatePayload): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<BossTemplateDto>>(BOSS_URL, payload);
        return res.data;
    },

    // PUT /admin/boss-templates/{id}
    // Matches BE UpdateBossTemplateRequest — proofPolicy/rewardPolicy NOT accepted here
    updateTemplate: async (id: number, payload: UpdateBossTemplatePayload): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.put<ApiResponse<any>>(`${BOSS_URL}/${id}`, payload);
        return res.data;
    },

    // POST /admin/boss-templates/{id}/modes
    // BE UpsertBossModeRequest.AllowedProofTypes is a single string (comma-separated)
    // This function joins the string[] from BossModePayload before sending
    addBossMode: async (templateId: number, payload: BossModePayload): Promise<ApiResponse<any>> => {
        const bePayload = {
            ...payload,
            allowedProofTypes: payload.allowedProofTypes.join(','),
        };
        const res = await axiosClient.post<ApiResponse<any>>(`${BOSS_URL}/${templateId}/modes`, bePayload);
        return res.data;
    },

    // POST /admin/boss-templates/{id}/status?action=publish|archive
    changeStatus: async (id: number, action: "publish" | "archive"): Promise<ApiResponse<any>> => {
        const res = await axiosClient.post<ApiResponse<any>>(`${BOSS_URL}/${id}/status`, null, {
            params: { action }
        });
        return res.data;
    }
};
