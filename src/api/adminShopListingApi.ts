import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { ShopListingDto, CreateShopListingPayload, UpdateShopListingPayload } from '../types/adminEconomy.types';

const BASE = '/admin/shop/listings';

export const adminShopListingApi = {
  getListings: async (shopType?: string): Promise<ApiResponse<ShopListingDto[]>> => {
    const res = await axiosClient.get<ApiResponse<ShopListingDto[]>>(BASE, { params: { shopType } });
    return res.data;
  },
  createListing: async (payload: CreateShopListingPayload): Promise<ApiResponse<ShopListingDto>> => {
    const res = await axiosClient.post<ApiResponse<ShopListingDto>>(BASE, payload);
    return res.data;
  },
  updateListing: async (id: number, payload: UpdateShopListingPayload): Promise<ApiResponse<ShopListingDto>> => {
    const res = await axiosClient.put<ApiResponse<ShopListingDto>>(`${BASE}/${id}`, payload);
    return res.data;
  },
  setActive: async (id: number, isActive: boolean): Promise<ApiResponse<ShopListingDto>> => {
    const res = await axiosClient.post<ApiResponse<ShopListingDto>>(`${BASE}/${id}/active`, null, { params: { isActive } });
    return res.data;
  },
};
