import axiosClient from './axiosClient';
import {
    PaginatedApiResponse,
    ApiResponse,
    UserItem,
    GetUsersQueryParams,
    CreateAdminUserPayload,
    UpdateUserPayload,
    UpdateUserStatusPayload,
    AssignRolePayload
} from '../types/api.types';

const ADMIN_USER_URL = '/admin/users';

const adminUserApi = {
    // 1. Danh sách user (có phân trang & lọc)
    getUsers: async (params?: GetUsersQueryParams): Promise<PaginatedApiResponse<UserItem>> => {
        const response = await axiosClient.get<PaginatedApiResponse<UserItem>>(ADMIN_USER_URL, { params });
        return response.data;
    },

    // 2. Xem chi tiết 1 user
    getUserById: async (userId: number): Promise<ApiResponse<UserItem>> => {
        const url = `${ADMIN_USER_URL}/${userId}`;
        const response = await axiosClient.get<ApiResponse<UserItem>>(url);
        return response.data;
    },

    // 3. Admin tạo tài khoản nhân sự/mentor
    createUser: async (payload: CreateAdminUserPayload): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.post<ApiResponse<UserItem>>(ADMIN_USER_URL, payload);
        return response.data;
    },

    // 4. Cập nhật hồ sơ user
    updateUser: async (userId: number, payload: UpdateUserPayload): Promise<ApiResponse<UserItem>> => {
        const url = `${ADMIN_USER_URL}/${userId}`;
        const response = await axiosClient.put<ApiResponse<UserItem>>(url, payload);
        return response.data;
    },

    // 5. Đổi trạng thái user (Kích hoạt/Ban/Khóa)
    updateUserStatus: async (userId: number, payload: UpdateUserStatusPayload): Promise<ApiResponse<any>> => {
        const url = `${ADMIN_USER_URL}/${userId}/status`;
        const response = await axiosClient.patch<ApiResponse<any>>(url, payload);
        return response.data;
    },

    // 6. Xóa user (Xóa mềm)
    deleteUser: async (userId: number): Promise<ApiResponse<any>> => {
        const url = `${ADMIN_USER_URL}/${userId}`;
        const response = await axiosClient.delete<ApiResponse<any>>(url);
        return response.data;
    },

    // 7. Gán role cho user
    assignRole: async (userId: number, payload: AssignRolePayload): Promise<ApiResponse<any>> => {
        const url = `${ADMIN_USER_URL}/${userId}/roles`;
        const response = await axiosClient.post<ApiResponse<any>>(url, payload);
        return response.data;
    },

    // 8. Gỡ role khỏi user
    removeRole: async (userId: number, roleCode: string): Promise<ApiResponse<any>> => {
        const url = `${ADMIN_USER_URL}/${userId}/roles/${roleCode}`;
        const response = await axiosClient.delete<ApiResponse<any>>(url);
        return response.data;
    },

    // 9. Danh sách role hệ thống
    getRoles: async (): Promise<ApiResponse<string[]>> => {
        const url = '/admin/roles';
        const response = await axiosClient.get<ApiResponse<string[]>>(url);
        return response.data;
    },

    // 10. Phiên đăng nhập của user
    // (Tôi để type `any` tạm thời vì chưa rõ cấu trúc Session, bạn có thể định nghĩa `SessionItem` sau)
    getUserSessions: async (userId: number): Promise<ApiResponse<any[]>> => {
        const url = `${ADMIN_USER_URL}/${userId}/sessions`;
        const response = await axiosClient.get<ApiResponse<any[]>>(url);
        return response.data;
    }
};

export default adminUserApi;