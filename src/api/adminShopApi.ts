import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    ShopListingDto,
    CreateShopListingPayload,
    UpdateShopListingPayload,
} from '../types/adminShop.types';

const SHOP_URL = '/admin/shop/listings';

export const adminShopApi = {
    // GET /api/admin/shop/listings?shopType= — BE returns a plain list (all listings,
    // including inactive/expired rotation), no pagination.
    getListings: async (shopType?: string): Promise<ApiResponse<ShopListingDto[]>> => {
        const res = await axiosClient.get<ApiResponse<ShopListingDto[]>>(SHOP_URL, {
            params: shopType ? { shopType } : undefined,
        });
        return res.data;
    },

    // POST /api/admin/shop/listings
    createListing: async (payload: CreateShopListingPayload): Promise<ApiResponse<ShopListingDto>> => {
        const res = await axiosClient.post<ApiResponse<ShopListingDto>>(SHOP_URL, payload);
        return res.data;
    },

    // PUT /api/admin/shop/listings/{id} — price/stock/rotation-window only. BE
    // (UpdateShopListingCommand) returns a bare boolean, not the updated listing.
    updateListing: async (id: number, payload: UpdateShopListingPayload): Promise<ApiResponse<boolean>> => {
        const res = await axiosClient.put<ApiResponse<boolean>>(`${SHOP_URL}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/shop/listings/{id}/active?isActive= — BE reads isActive from the query
    // string ([FromQuery]), NOT the request body. Returns a bare boolean, not the full listing.
    setActive: async (id: number, isActive: boolean): Promise<ApiResponse<boolean>> => {
        const res = await axiosClient.post<ApiResponse<boolean>>(
            `${SHOP_URL}/${id}/active`,
            null,
            { params: { isActive } },
        );
        return res.data;
    },
};
