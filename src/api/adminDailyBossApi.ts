import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    DailyBossTemplateDto,
    DailyBossPayload,
    DailyBossAnimationFrameDto,
    UploadAnimationOptions,
    DetectAnimationOptions,
    SpriteSheetDetectionDto,
} from '../types/adminDailyBoss.types';

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

    // GET /api/admin/daily-bosses/{id}/animation
    getAnimation: async (id: number): Promise<ApiResponse<DailyBossAnimationFrameDto[]>> => {
        const res = await axiosClient.get<ApiResponse<DailyBossAnimationFrameDto[]>>(`${BASE}/${id}/animation`);
        return res.data;
    },

    // POST /api/admin/daily-bosses/{id}/animation (multipart) — slices the sheet and REPLACES all existing frames.
    // NOTE: do not set a Content-Type header here — axios auto-detects FormData and lets the
    // browser attach the multipart boundary; forcing 'multipart/form-data' manually breaks BE parsing.
    uploadAnimation: async (
        id: number,
        file: File,
        options: UploadAnimationOptions = {},
    ): Promise<ApiResponse<DailyBossAnimationFrameDto[]>> => {
        const form = new FormData();
        form.append('file', file);
        if (options.states) form.append('states', options.states);
        form.append('auto', String(options.auto ?? true));
        if (options.margin !== undefined) form.append('margin', String(options.margin));
        if (options.minSize !== undefined) form.append('minSize', String(options.minSize));
        if (options.rgb !== undefined) form.append('rgb', String(options.rgb));
        if (options.alpha !== undefined) form.append('alpha', String(options.alpha));
        if (options.columns !== undefined) form.append('columns', String(options.columns));
        if (options.rows !== undefined) form.append('rows', String(options.rows));
        const res = await axiosClient.post<ApiResponse<DailyBossAnimationFrameDto[]>>(`${BASE}/${id}/animation`, form);
        return res.data;
    },

    // DELETE /api/admin/daily-bosses/{id}/animation — clears the whole sprite (no per-state delete on BE).
    deleteAnimation: async (id: number): Promise<ApiResponse<boolean>> => {
        const res = await axiosClient.delete<ApiResponse<boolean>>(`${BASE}/${id}/animation`);
        return res.data;
    },

    // POST /api/admin/daily-bosses/animation/detect (multipart, boss-agnostic) — dry-run preview, saves nothing.
    detectAnimation: async (
        file: File,
        options: DetectAnimationOptions = {},
    ): Promise<ApiResponse<SpriteSheetDetectionDto>> => {
        const form = new FormData();
        form.append('file', file);
        if (options.minSize !== undefined) form.append('minSize', String(options.minSize));
        if (options.rgb !== undefined) form.append('rgb', String(options.rgb));
        if (options.alpha !== undefined) form.append('alpha', String(options.alpha));
        const res = await axiosClient.post<ApiResponse<SpriteSheetDetectionDto>>(`${BASE}/animation/detect`, form);
        return res.data;
    },

    // POST /api/admin/daily-bosses/{id}/icon (multipart) — overwrites Icon with the uploaded image's public URL.
    uploadIcon: async (id: number, file: File): Promise<ApiResponse<DailyBossTemplateDto>> => {
        const form = new FormData();
        form.append('file', file);
        const res = await axiosClient.post<ApiResponse<DailyBossTemplateDto>>(`${BASE}/${id}/icon`, form);
        return res.data;
    },
};
