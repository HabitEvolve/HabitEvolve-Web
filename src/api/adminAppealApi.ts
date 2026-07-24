import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { AppealDto, ResolveAppealPayload } from '../types/adminAppeal.types';

const BASE = '/admin/appeals';

export const adminAppealApi = {
  getQueue: async (): Promise<ApiResponse<AppealDto[]>> => {
    const res = await axiosClient.get<ApiResponse<AppealDto[]>>(`${BASE}/queue`);
    return res.data;
  },
  resolve: async (id: number, payload: ResolveAppealPayload): Promise<ApiResponse<AppealDto>> => {
    const res = await axiosClient.post<ApiResponse<AppealDto>>(`${BASE}/${id}/resolve`, payload);
    return res.data;
  },
};
