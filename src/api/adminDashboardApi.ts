import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { AdminDashboardSummaryDto, DateRangeQueryParams } from '../types/adminDashboard.types';

const DASHBOARD_URL = '/admin/dashboard';

export const adminDashboardApi = {
    // GET /api/admin/dashboard/summary?from=&to=
    getSummary: async (params: DateRangeQueryParams): Promise<ApiResponse<AdminDashboardSummaryDto>> => {
        const res = await axiosClient.get<ApiResponse<AdminDashboardSummaryDto>>(`${DASHBOARD_URL}/summary`, { params });
        return res.data;
    },
};
