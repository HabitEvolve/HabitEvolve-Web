import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { PracticalTaskDto, PracticalTaskPayload } from '../types/adminPracticalTask.types';

// TODO: Đổi URL này nếu tài liệu Backend (Swagger) của bạn ghi khác
const TASK_URL = '/admin/practical-task-templates';

export const adminPracticalTaskApi = {
    // 1. Lấy danh sách nhiệm vụ (có hỗ trợ phân trang và tìm kiếm)
    // Bắt buộc params phải có goalId
    getTasks: async (params: { goalId: number; page?: number; pageSize?: number; search?: string; isActive?: boolean }): Promise<ApiResponse<PracticalTaskDto[]>> => {
        const res = await axiosClient.get<ApiResponse<PracticalTaskDto[]>>(TASK_URL, { params });
        return res.data;
    },

    // 2. Lấy chi tiết 1 nhiệm vụ (nếu cần)
    getTaskById: async (id: number): Promise<ApiResponse<PracticalTaskDto>> => {
        const res = await axiosClient.get<ApiResponse<PracticalTaskDto>>(`${TASK_URL}/${id}`);
        return res.data;
    },

    // 3. Tạo mới
    createTask: async (payload: PracticalTaskPayload): Promise<ApiResponse<PracticalTaskDto>> => {
        const res = await axiosClient.post<ApiResponse<PracticalTaskDto>>(TASK_URL, payload);
        return res.data;
    },

    // 4. Cập nhật
    updateTask: async (id: number, payload: PracticalTaskPayload): Promise<ApiResponse<any>> => {
        const res = await axiosClient.put<ApiResponse<any>>(`${TASK_URL}/${id}`, payload);
        return res.data;
    },

    // 5. Xóa (hoặc vô hiệu hóa)
    deleteTask: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${TASK_URL}/${id}`);
        return res.data;
    }
};