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

// BE consistently returns "role" (singular string) instead of "roles" (string[]).
// Normalize at the API boundary so all consumers can safely call user.roles.
const normalizeUserRoles = (user: any): UserItem => ({
    ...user,
    roles: Array.isArray(user.roles) ? user.roles
        : user.role ? [user.role]
        : [],
});

const adminUserApi = {
    // GET /admin/users?pageNumber=&pageSize=&search=&status=&roleCode=
    getUsers: async (params?: GetUsersQueryParams): Promise<PaginatedApiResponse<UserItem>> => {
        const response = await axiosClient.get<PaginatedApiResponse<any>>(ADMIN_USER_URL, { params });
        const res = response.data;
        return { ...res, data: (res.data ?? []).map(normalizeUserRoles) };
    },

    // GET /admin/users/{userId}
    getUserById: async (userId: number): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.get<ApiResponse<any>>(`${ADMIN_USER_URL}/${userId}`);
        const res = response.data;
        return { ...res, data: res.data ? normalizeUserRoles(res.data) : res.data };
    },

    // POST /admin/users  (admin creates a user directly)
    createUser: async (payload: { username: string; email: string; password: string; role: string }): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.post<ApiResponse<any>>(ADMIN_USER_URL, payload);
        const res = response.data;
        return { ...res, data: res.data ? normalizeUserRoles(res.data) : res.data };
    },

    // PUT /admin/users/{userId}  (update profile fields: username, email)
    // BE: [HttpPut("{userId:long}")] on AdminUserController.Update — NOT PATCH.
    updateUser: async (userId: number, payload: { username?: string; email?: string }): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.put<ApiResponse<any>>(`${ADMIN_USER_URL}/${userId}`, payload);
        const res = response.data;
        return { ...res, data: res.data ? normalizeUserRoles(res.data) : res.data };
    },

    // PATCH /admin/users/{userId}/status
    updateUserStatus: async (userId: number, payload: UpdateUserStatusPayload): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.patch<ApiResponse<any>>(`${ADMIN_USER_URL}/${userId}/status`, payload);
        const res = response.data;
        return { ...res, data: res.data ? normalizeUserRoles(res.data) : res.data };
    },

    // DELETE /admin/users/{userId}  (soft delete)
    deleteUser: async (userId: number): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.delete<ApiResponse<UserItem>>(`${ADMIN_USER_URL}/${userId}`);
        return response.data;
    },

    // POST /admin/users/{userId}/roles
    assignRole: async (userId: number, payload: AssignRolePayload): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.post<ApiResponse<any>>(`${ADMIN_USER_URL}/${userId}/roles`, payload);
        const res = response.data;
        return { ...res, data: res.data ? normalizeUserRoles(res.data) : res.data };
    },

    // DELETE /admin/users/{userId}/roles/{roleCode}
    removeRole: async (userId: number, roleCode: string): Promise<ApiResponse<UserItem>> => {
        const response = await axiosClient.delete<ApiResponse<any>>(`${ADMIN_USER_URL}/${userId}/roles/${roleCode}`);
        const res = response.data;
        return { ...res, data: res.data ? normalizeUserRoles(res.data) : res.data };
    },

    // GET /admin/roles
    getRoles: async (): Promise<ApiResponse<string[]>> => {
        const response = await axiosClient.get<ApiResponse<string[]>>('/admin/roles');
        return response.data;
    },
};

export default adminUserApi;
