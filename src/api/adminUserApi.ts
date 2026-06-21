import axiosClient from './axiosClient';
import {
    PaginatedApiResponse,
    ApiResponse,
    UserItem,
    GetUsersQueryParams,
    UpdateUserStatusPayload,
    AssignRolePayload
} from '../types/api.types';

const ADMIN_USER_URL = '/admin/users';

const adminUserApi = {
    // GET /admin/users?pageNumber=&pageSize=&search=&status=&roleCode=
    getUsers: async (params?: GetUsersQueryParams): Promise<PaginatedApiResponse<UserItem>> => {
        const response = await axiosClient.get<PaginatedApiResponse<UserItem>>(ADMIN_USER_URL, { params });
        return response.data;
    },

    // GET /admin/users/{userId}
    getUserById: async (userId: number): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.get<ApiResponse<UserItem>>(`${ADMIN_USER_URL}/${userId}`);
        return response.data;
    },

    // PATCH /admin/users/{userId}/status
    updateUserStatus: async (userId: number, payload: UpdateUserStatusPayload): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.patch<ApiResponse<UserItem>>(`${ADMIN_USER_URL}/${userId}/status`, payload);
        return response.data;
    },

    // DELETE /admin/users/{userId}  (soft delete)
    deleteUser: async (userId: number): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.delete<ApiResponse<UserItem>>(`${ADMIN_USER_URL}/${userId}`);
        return response.data;
    },

    // POST /admin/users/{userId}/roles
    assignRole: async (userId: number, payload: AssignRolePayload): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.post<ApiResponse<UserItem>>(`${ADMIN_USER_URL}/${userId}/roles`, payload);
        return response.data;
    },

    // DELETE /admin/users/{userId}/roles/{roleCode}
    removeRole: async (userId: number, roleCode: string): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.delete<ApiResponse<UserItem>>(`${ADMIN_USER_URL}/${userId}/roles/${roleCode}`);
        return response.data;
    },

    // GET /admin/roles
    getRoles: async (): Promise<ApiResponse<string[]>> => {
        const response = await axiosClient.get<ApiResponse<string[]>>('/admin/roles');
        return response.data;
    },
};

export default adminUserApi;
