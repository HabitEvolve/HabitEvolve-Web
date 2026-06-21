import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    PracticalTaskTemplateDto,
    TaskTemplateDto,
    TaskTemplatePayload
} from '../types/adminPracticalTask.types';

// ==========================================
// READ-ONLY: Practical Task Templates per Goal
// GET /admin/practical-task-templates?goalId=X
// ==========================================
export const adminPracticalTaskApi = {
    // Returns practical task templates assigned to a specific goal (read-only)
    getTasks: async (goalId: number): Promise<ApiResponse<PracticalTaskTemplateDto[]>> => {
        const res = await axiosClient.get<ApiResponse<PracticalTaskTemplateDto[]>>(
            '/admin/practical-task-templates',
            { params: { goalId } }
        );
        return res.data;
    },
};

// ==========================================
// CRUD: Generic Task Templates
// /admin/task-templates
// ==========================================
export const adminTaskTemplateApi = {
    // GET /admin/task-templates?activeOnly=bool
    getAll: async (params?: { activeOnly?: boolean }): Promise<ApiResponse<TaskTemplateDto[]>> => {
        const res = await axiosClient.get<ApiResponse<TaskTemplateDto[]>>('/admin/task-templates', { params });
        return res.data;
    },

    // POST /admin/task-templates
    create: async (payload: TaskTemplatePayload): Promise<ApiResponse<TaskTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<TaskTemplateDto>>('/admin/task-templates', payload);
        return res.data;
    },

    // PUT /admin/task-templates/{id}
    update: async (id: number, payload: TaskTemplatePayload): Promise<ApiResponse<TaskTemplateDto>> => {
        const res = await axiosClient.put<ApiResponse<TaskTemplateDto>>(`/admin/task-templates/${id}`, payload);
        return res.data;
    },

    // PATCH /admin/task-templates/{id}/status
    toggleStatus: async (id: number, isActive: boolean): Promise<ApiResponse<TaskTemplateDto>> => {
        const res = await axiosClient.patch<ApiResponse<TaskTemplateDto>>(
            `/admin/task-templates/${id}/status`,
            isActive
        );
        return res.data;
    }
};
