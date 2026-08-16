import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { ShopListingDto, CreateShopListingPayload, UpdateShopListingPayload, ShopPurchaseRowDto } from '../types/adminEconomy.types';

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
  // BE (UpdateShopListingCommand) returns a bare boolean, not the updated listing.
  updateListing: async (id: number, payload: UpdateShopListingPayload): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.put<ApiResponse<boolean>>(`${BASE}/${id}`, payload);
    return res.data;
  },
  // BE (SetShopListingActiveCommand) returns a bare boolean, not the updated listing.
  setActive: async (id: number, isActive: boolean): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.post<ApiResponse<boolean>>(`${BASE}/${id}/active`, null, { params: { isActive } });
    return res.data;
  },
  getPurchases: async (id: number): Promise<ApiResponse<ShopPurchaseRowDto[]>> => {
    const res = await axiosClient.get<ApiResponse<ShopPurchaseRowDto[]>>(`${BASE}/${id}/purchases`);
    return res.data;
  },
};
