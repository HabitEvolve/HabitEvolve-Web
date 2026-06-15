import axiosClient from './axiosClient';
import { ApiResponse, PlayerProfile, UpdatePlayerProfilePayload } from '../types/api.types';

const playerProfileApi = {
    // 1. Lấy thông tin hồ sơ của chính mình
    getMyProfile: async (): Promise<ApiResponse<PlayerProfile>> => {
        const userId = localStorage.getItem('user_id');
        const url = `/profile/me?userId=${userId}`;
        const response = await axiosClient.get<ApiResponse<PlayerProfile>>(url);
        return response.data;
    },

    // 2. Cập nhật hồ sơ
    updateProfile: async (payload: UpdatePlayerProfilePayload): Promise<ApiResponse<any>> => {
        const url = '/profile/update';
        const userId = localStorage.getItem('user_id');
        const fullUrl = `${url}?userId=${userId}`;
        const response = await axiosClient.put<ApiResponse<any>>(fullUrl, payload);
        return response.data;
    }
};

export default playerProfileApi;