import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    DateRangeQueryParams,
    EconomyReportDto,
    QuestCompletionReportDto,
    UserActivityReportDto,
} from '../types/adminReports.types';

const REPORTS_URL = '/admin/reports';

export const adminReportsApi = {
    // GET /api/admin/reports/economy?from=&to=
    getEconomyReport: async (params: DateRangeQueryParams): Promise<ApiResponse<EconomyReportDto>> => {
        const res = await axiosClient.get<ApiResponse<EconomyReportDto>>(`${REPORTS_URL}/economy`, { params });
        return res.data;
    },

    // GET /api/admin/reports/quest-completion?from=&to=
    getQuestCompletionReport: async (params: DateRangeQueryParams): Promise<ApiResponse<QuestCompletionReportDto>> => {
        const res = await axiosClient.get<ApiResponse<QuestCompletionReportDto>>(`${REPORTS_URL}/quest-completion`, { params });
        return res.data;
    },

    // GET /api/admin/reports/user-activity?from=&to=
    getUserActivityReport: async (params: DateRangeQueryParams): Promise<ApiResponse<UserActivityReportDto>> => {
        const res = await axiosClient.get<ApiResponse<UserActivityReportDto>>(`${REPORTS_URL}/user-activity`, { params });
        return res.data;
    },
};
