import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { GachaBannerDto, CreateGachaBannerPayload, UpdateGachaBannerPayload } from '../types/adminEconomy.types';

const BASE = '/admin/gacha/banners';

export const adminGachaBannerApi = {
  getBanners: async (): Promise<ApiResponse<GachaBannerDto[]>> => {
    const res = await axiosClient.get<ApiResponse<GachaBannerDto[]>>(BASE);
    return res.data;
  },
  getBannerById: async (id: number): Promise<ApiResponse<GachaBannerDto>> => {
    const res = await axiosClient.get<ApiResponse<GachaBannerDto>>(`${BASE}/${id}`);
    return res.data;
  },
  createBanner: async (payload: CreateGachaBannerPayload): Promise<ApiResponse<GachaBannerDto>> => {
    const res = await axiosClient.post<ApiResponse<GachaBannerDto>>(BASE, payload);
    return res.data;
  },
  updateBanner: async (id: number, payload: UpdateGachaBannerPayload): Promise<ApiResponse<GachaBannerDto>> => {
    const res = await axiosClient.put<ApiResponse<GachaBannerDto>>(`${BASE}/${id}`, payload);
    return res.data;
  },
  setActive: async (id: number, isActive: boolean): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.post<ApiResponse<boolean>>(`${BASE}/${id}/active`, null, { params: { isActive } });
    return res.data;
  },
};
