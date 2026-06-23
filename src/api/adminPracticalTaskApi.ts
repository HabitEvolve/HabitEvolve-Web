import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { AdminTaskTemplateDto, PracticalTaskPayload } from '../types/adminGoal.types';

const BASE = '/admin/practical-task-templates';

// ==========================================
// PRACTICAL TASK TEMPLATE CRUD
// Controller: PracticalTaskTemplateController  [Route("api/admin/practical-task-templates")]
//
// BE returns AdminTaskTemplateDto (simplified) — NOT the full PracticalTaskTemplateDto
// Create: POST body = CreatePracticalTaskTemplateCommand(GoalId, Title, Description?, VerificationType, IsActive?)
// Update: PUT  body = UpdateTaskRequest(Title, Description?, VerificationType, IsActive)
// ==========================================
export const adminPracticalTaskApi = {
    // GET /admin/practical-task-templates?goalId={goalId}
    getTasks: async (goalId: number): Promise<ApiResponse<AdminTaskTemplateDto[]>> => {
        const res = await axiosClient.get<ApiResponse<AdminTaskTemplateDto[]>>(BASE, { params: { goalId } });
        return res.data;
    },

    // POST /admin/practical-task-templates
    createTask: async (payload: PracticalTaskPayload & { goalId: number }): Promise<ApiResponse<AdminTaskTemplateDto>> => {
        const res = await axiosClient.post<ApiResponse<AdminTaskTemplateDto>>(BASE, payload);
        return res.data;
    },

    // PUT /admin/practical-task-templates/{id}
    // BE UpdateTaskRequest: Title, Description?, VerificationType, IsActive (no GoalId in body)
    updateTask: async (id: number, payload: Omit<PracticalTaskPayload, 'goalId'>): Promise<ApiResponse<AdminTaskTemplateDto>> => {
        const res = await axiosClient.put<ApiResponse<AdminTaskTemplateDto>>(`${BASE}/${id}`, payload);
        return res.data;
    },

    // DELETE /admin/practical-task-templates/{id}
    deleteTask: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${BASE}/${id}`);
        return res.data;
    },
};
