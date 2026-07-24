import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { EconomyReportDto, QuestCompletionReportDto, UserActivityReportDto } from '../types/adminReporting.types';

const BASE = '/admin/reports';

export const adminReportingApi = {
  getEconomyReport: async (from: string, to: string): Promise<ApiResponse<EconomyReportDto>> => {
    const res = await axiosClient.get<ApiResponse<EconomyReportDto>>(`${BASE}/economy`, { params: { from, to } });
    return res.data;
  },
  getQuestCompletionReport: async (from: string, to: string): Promise<ApiResponse<QuestCompletionReportDto>> => {
    const res = await axiosClient.get<ApiResponse<QuestCompletionReportDto>>(`${BASE}/quest-completion`, { params: { from, to } });
    return res.data;
  },
  getUserActivityReport: async (from: string, to: string): Promise<ApiResponse<UserActivityReportDto>> => {
    const res = await axiosClient.get<ApiResponse<UserActivityReportDto>>(`${BASE}/user-activity`, { params: { from, to } });
    return res.data;
  },
};
