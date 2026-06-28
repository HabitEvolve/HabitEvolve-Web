import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    BossTemplateDto,
    BossTemplatePayload,
    UpdateBossTemplatePayload,
    BossModePayload,
    WeeklyBossScheduleDto,
    WeeklyBossSchedulePayload,
} from '../types/adminBoss.types';

const BOSS_URL = '/admin/boss-templates';

export const adminBossApi = {
    // ── TEMPLATES ─────────────────────────────────────────────────────────────

    // GET /admin/boss-templates?status=str
    getTemplates: async (params?: { status?: string }): Promise<ApiResponse<BossTemplateDto[]>> => {
        const res = await axiosClient.get<ApiResponse<BossTemplateDto[]>>(BOSS_URL, { params });
        return res.data;
    },

    // GET /admin/boss-templates/{id}
    getTemplateById: async (id: number): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.get<ApiResponse<BossTemplateDto>>(`${BOSS_URL}/${id}`);
        return res.data;
    },

    // GET /admin/boss-templates/current?date=YYYY-MM-DD
    getCurrentTemplate: async (date?: string): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.get<ApiResponse<BossTemplateDto>>(`${BOSS_URL}/current`, {
            params: date ? { date } : undefined,
        });
        return res.data;
    },

    // POST /admin/boss-templates
    createTemplate: async (payload: BossTemplatePayload): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<BossTemplateDto>>(BOSS_URL, payload);
        return res.data;
    },

    // PUT /admin/boss-templates/{id}
    updateTemplate: async (id: number, payload: UpdateBossTemplatePayload): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.put<ApiResponse<BossTemplateDto>>(`${BOSS_URL}/${id}`, payload);
        return res.data;
    },

    // POST /admin/boss-templates/{id}/modes
    // allowedProofTypes removed — proof types are per subscription package (SubscriptionPackageDto.proofTypes)
    addBossMode: async (templateId: number, payload: BossModePayload): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<BossTemplateDto>>(
            `${BOSS_URL}/${templateId}/modes`,
            payload
        );
        return res.data;
    },

    // POST /admin/boss-templates/{id}/status?action=publish|archive
    changeStatus: async (id: number, action: 'publish' | 'archive'): Promise<ApiResponse<BossTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<BossTemplateDto>>(
            `${BOSS_URL}/${id}/status`,
            null,
            { params: { action } }
        );
        return res.data;
    },

    // ── SCHEDULES ─────────────────────────────────────────────────────────────

    // GET /admin/boss-templates/schedules?includePast=true|false
    getSchedules: async (includePast = false): Promise<ApiResponse<WeeklyBossScheduleDto[]>> => {
        const res = await axiosClient.get<ApiResponse<WeeklyBossScheduleDto[]>>(
            `${BOSS_URL}/schedules`,
            { params: { includePast } }
        );
        return res.data;
    },

    // POST /admin/boss-templates/schedules — assign theme to a week; replaces existing for that week
    setSchedule: async (payload: WeeklyBossSchedulePayload): Promise<ApiResponse<WeeklyBossScheduleDto>> => {
        const res = await axiosClient.post<ApiResponse<WeeklyBossScheduleDto>>(
            `${BOSS_URL}/schedules`,
            payload
        );
        return res.data;
    },

    // DELETE /admin/boss-templates/schedules/{scheduleId}
    deleteSchedule: async (scheduleId: number): Promise<ApiResponse<void>> => {
        const res = await axiosClient.delete<ApiResponse<void>>(
            `${BOSS_URL}/schedules/${scheduleId}`
        );
        return res.data;
    },
};
