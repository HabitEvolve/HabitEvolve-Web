import axiosClient from './axiosClient';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';
import type {
    ShopListingDto,
    GetShopListingsQueryParams,
    CreateShopListingPayload,
    UpdateShopListingPayload,
} from '../types/adminShop.types';

const SHOP_URL = '/admin/shop/listings';

export const adminShopApi = {
    // GET /api/admin/shop/listings?pageNumber=&pageSize=
    getListings: async (params?: GetShopListingsQueryParams): Promise<PaginatedApiResponse<ShopListingDto>> => {
        const res = await axiosClient.get<PaginatedApiResponse<ShopListingDto>>(SHOP_URL, { params });
        return res.data;
    },

    // POST /api/admin/shop/listings
    createListing: async (payload: CreateShopListingPayload): Promise<ApiResponse<ShopListingDto>> => {
        const res = await axiosClient.post<ApiResponse<ShopListingDto>>(SHOP_URL, payload);
        return res.data;
    },

    // PUT /api/admin/shop/listings/{id} — price/stock/rotation
    updateListing: async (id: number, payload: UpdateShopListingPayload): Promise<ApiResponse<ShopListingDto>> => {
        const res = await axiosClient.put<ApiResponse<ShopListingDto>>(`${SHOP_URL}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/shop/listings/{id}/active — body sends the explicit target state so
    // the call is unambiguous/idempotent regardless of whether the BE reads it or just
    // flips. Response shape isn't guaranteed to be the full entity — callers must not
    // replace local state with it wholesale, only merge.
    toggleActive: async (id: number, isActive: boolean): Promise<ApiResponse<Partial<ShopListingDto>>> => {
        const res = await axiosClient.post<ApiResponse<Partial<ShopListingDto>>>(`${SHOP_URL}/${id}/active`, { isActive });
        return res.data;
    },
};
