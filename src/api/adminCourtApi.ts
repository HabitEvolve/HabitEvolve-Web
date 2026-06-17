import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { CourtCaseDto, ResolveVerdictPayload, KarmaLeaderboardDto } from '../types/adminCourt.types';

const COURT_URL = '/admin/court';

export const adminCourtApi = {
    // 1. Lấy danh sách case
    getCases: async (params?: { page?: number; pageSize?: number; status?: string }): Promise<ApiResponse<CourtCaseDto[]>> => {
        const res = await axiosClient.get<ApiResponse<CourtCaseDto[]>>(COURT_URL, { params });
        return res.data;
    },

    // 2. Lấy chi tiết 1 case
    getCaseById: async (id: number): Promise<ApiResponse<CourtCaseDto>> => {
        const res = await axiosClient.get<ApiResponse<CourtCaseDto>>(`${COURT_URL}/${id}`);
        return res.data;
    },

    // 3. Can thiệp khẩn / Ghi đè phán quyết
    resolveCase: async (id: number, payload: ResolveVerdictPayload): Promise<ApiResponse<any>> => {
        const res = await axiosClient.post<ApiResponse<any>>(`${COURT_URL}/${id}/resolve`, payload);
        return res.data;
    },

    // 4. Lấy BXH Karma
    getKarmaLeaderboard: async (top: number = 50): Promise<ApiResponse<KarmaLeaderboardDto[]>> => {
        const res = await axiosClient.get<ApiResponse<KarmaLeaderboardDto[]>>(`${COURT_URL}/karma/leaderboard`, { params: { top } });
        return res.data;
    }
};