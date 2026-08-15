import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { WalletDto, DailyStreakDto, UserProofDto, GrantWalletPayload } from '../types/userDetail.types';

// Player-facing endpoints, reused by the admin User Management detail view.
// All take an explicit userId query param (AllowAnonymous, no JWT extraction).
const playerDataApi = {
    // GET /me/wallet?userId=
    getWallet: async (userId: number): Promise<ApiResponse<WalletDto>> => {
        const response = await axiosClient.get<ApiResponse<WalletDto>>('/me/wallet', { params: { userId } });
        return response.data;
    },

    // GET /me/daily-streak?userId=
    getDailyStreak: async (userId: number): Promise<ApiResponse<DailyStreakDto>> => {
        const response = await axiosClient.get<ApiResponse<DailyStreakDto>>('/me/daily-streak', { params: { userId } });
        return response.data;
    },

    // GET /proofs?userId=&status=
    getProofs: async (userId: number, status?: string): Promise<ApiResponse<UserProofDto[]>> => {
        const response = await axiosClient.get<ApiResponse<UserProofDto[]>>('/proofs', { params: { userId, status } });
        return response.data;
    },

    // POST /me/wallet/grant — [DEMO/TEST] manual currency grant, reused by the admin console.
    grantWallet: async (payload: GrantWalletPayload): Promise<ApiResponse<WalletDto>> => {
        const response = await axiosClient.post<ApiResponse<WalletDto>>('/me/wallet/grant', payload);
        return response.data;
    },
};

export default playerDataApi;
