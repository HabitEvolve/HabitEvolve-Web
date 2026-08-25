import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { AppealDto, AppealQueueItemDto, ResolveAppealPayload } from '../types/adminAppeal.types';

const BASE = '/admin/appeals';

export const adminAppealApi = {
  getQueue: async (): Promise<ApiResponse<AppealQueueItemDto[]>> => {
    const res = await axiosClient.get<ApiResponse<AppealQueueItemDto[]>>(`${BASE}/queue`);
    return res.data;
  },
  resolve: async (id: number, payload: ResolveAppealPayload): Promise<ApiResponse<AppealDto>> => {
    const res = await axiosClient.post<ApiResponse<AppealDto>>(`${BASE}/${id}/resolve`, payload);
    return res.data;
  },
};
