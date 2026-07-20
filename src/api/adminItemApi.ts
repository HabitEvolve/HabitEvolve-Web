import axiosClient from './axiosClient';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';
import type {
    ItemDto,
    GetItemsQueryParams,
    CreateItemPayload,
    UpdateItemPayload,
} from '../types/adminItem.types';

const ITEMS_URL = '/admin/items';

export const adminItemApi = {
    // GET /api/admin/items?itemType=&pageNumber=&pageSize=
    getItems: async (params?: GetItemsQueryParams): Promise<PaginatedApiResponse<ItemDto>> => {
        const res = await axiosClient.get<PaginatedApiResponse<ItemDto>>(ITEMS_URL, { params });
        return res.data;
    },

    // POST /api/admin/items
    createItem: async (payload: CreateItemPayload): Promise<ApiResponse<ItemDto>> => {
        const res = await axiosClient.post<ApiResponse<ItemDto>>(ITEMS_URL, payload);
        return res.data;
    },

    // PUT /api/admin/items/{id}
    updateItem: async (id: number, payload: UpdateItemPayload): Promise<ApiResponse<ItemDto>> => {
        const res = await axiosClient.put<ApiResponse<ItemDto>>(`${ITEMS_URL}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/items/{id}/active — body sends the explicit target state so the
    // call is unambiguous/idempotent regardless of whether the BE reads it or just flips.
    // Response shape isn't guaranteed to be the full entity — callers must not replace
    // local state with it wholesale, only merge.
    toggleActive: async (id: number, isActive: boolean): Promise<ApiResponse<Partial<ItemDto>>> => {
        const res = await axiosClient.post<ApiResponse<Partial<ItemDto>>>(`${ITEMS_URL}/${id}/active`, { isActive });
        return res.data;
    },
};
