import axiosClient from './axiosClient';
import { ApiResponse, RegisterPayload, LoginPayload, GoogleLoginPayload, AuthUser } from '../types/api.types';

const authApi = {
    register: async (payload: RegisterPayload) => {
        const response = await axiosClient.post('/User/register', payload);
        return response.data;
    },

    login: async (payload: LoginPayload): Promise<ApiResponse<AuthUser>> => {
        const response = await axiosClient.post('/User/login', payload);
        const apiResponse: ApiResponse<any> = response.data;
        // BE returns "role" (single string) — normalize to "roles" (string[]) for all FE code.
        if (apiResponse?.data && !apiResponse.data.roles && apiResponse.data.role) {
            apiResponse.data.roles = [apiResponse.data.role];
        }
        return apiResponse as ApiResponse<AuthUser>;
    },

    // Upsert: BE finds-or-creates the user from Google identity and returns a JWT
    continueWithGoogle: async (payload: GoogleLoginPayload): Promise<ApiResponse<AuthUser>> => {
        const response = await axiosClient.post('/User/google-login', payload);
        const apiResponse: ApiResponse<any> = response.data;
        if (apiResponse?.data && !apiResponse.data.roles && apiResponse.data.role) {
            apiResponse.data.roles = [apiResponse.data.role];
        }
        return apiResponse as ApiResponse<AuthUser>;
    },
};

export default authApi;