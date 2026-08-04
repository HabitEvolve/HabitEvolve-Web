import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { MentorDashboardSummaryDto } from '../types/mentorDashboard.types';

const DASHBOARD_URL = '/mentor/dashboard';

// GET /api/mentor/dashboard/summary — [Authorize(Roles="MENTOR")], mentorUserId resolved
// server-side from the JWT (access_token, attached by axiosClient's request interceptor).
// No mentorUserId param — unlike the rest of mentorApi.ts's mid()-based calls.
export const mentorDashboardApi = {
    getSummary: async (): Promise<ApiResponse<MentorDashboardSummaryDto>> => {
        const res = await axiosClient.get<ApiResponse<MentorDashboardSummaryDto>>(`${DASHBOARD_URL}/summary`);
        return res.data;
    },
};
