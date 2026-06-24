import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { SystemConfigDto, UpsertConfigRequest, GetConfigsParams } from '../types/adminConfig.types';

const BASE = '/admin/config';

export const adminConfigApi = {
  // GET /api/admin/config?group=...&page=1&pageSize=50
  getAll: async (params?: GetConfigsParams): Promise<ApiResponse<SystemConfigDto[]>> => {
    const res = await axiosClient.get<ApiResponse<SystemConfigDto[]>>(BASE, { params });
    return res.data;
  },

  // GET /api/admin/config/{key}
  getByKey: async (key: string): Promise<ApiResponse<SystemConfigDto>> => {
    const res = await axiosClient.get<ApiResponse<SystemConfigDto>>(
      `${BASE}/${encodeURIComponent(key)}`
    );
    return res.data;
  },

  // PUT /api/admin/config/{key}  — creates if not exists, updates if exists
  upsert: async (key: string, payload: UpsertConfigRequest): Promise<ApiResponse<SystemConfigDto>> => {
    const res = await axiosClient.put<ApiResponse<SystemConfigDto>>(
      `${BASE}/${encodeURIComponent(key)}`,
      payload
    );
    return res.data;
  },

  // POST /api/admin/config/reload  — invalidates cache, returns count of active configs
  reloadCache: async (): Promise<ApiResponse<{ count: number }>> => {
    const res = await axiosClient.post<ApiResponse<{ count: number }>>(`${BASE}/reload`);
    return res.data;
  },
};
