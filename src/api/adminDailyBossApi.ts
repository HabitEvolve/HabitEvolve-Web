import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { DailyBossTemplateDto, DailyBossPayload } from '../types/adminDailyBoss.types';

const BASE = '/admin/daily-bosses';

export const adminDailyBossApi = {
    // GET /api/admin/daily-bosses?activeOnly=
    getAll: async (activeOnly?: boolean): Promise<ApiResponse<DailyBossTemplateDto[]>> => {
        const res = await axiosClient.get<ApiResponse<DailyBossTemplateDto[]>>(BASE, {
            params: activeOnly !== undefined ? { activeOnly } : undefined,
        });
        return res.data;
    },

    // POST /api/admin/daily-bosses
    create: async (payload: DailyBossPayload): Promise<ApiResponse<DailyBossTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<DailyBossTemplateDto>>(BASE, payload);
        return res.data;
    },

    // PUT /api/admin/daily-bosses/{id}
    update: async (id: number, payload: DailyBossPayload): Promise<ApiResponse<DailyBossTemplateDto>> => {
        const res = await axiosClient.put<ApiResponse<DailyBossTemplateDto>>(`${BASE}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/daily-bosses/{id}/active?isActive=
    toggleActive: async (id: number, isActive: boolean): Promise<ApiResponse<DailyBossTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<DailyBossTemplateDto>>(
            `${BASE}/${id}/active`,
            null,
            { params: { isActive } },
        );
        return res.data;
    },

    // DELETE /api/admin/daily-bosses/{id}
    delete: async (id: number): Promise<ApiResponse<void>> => {
        const res = await axiosClient.delete<ApiResponse<void>>(`${BASE}/${id}`);
        return res.data;
    },
};
