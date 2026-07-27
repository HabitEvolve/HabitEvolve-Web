import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    ItemDefinitionDto,
    CreateItemPayload,
    UpdateItemPayload,
} from '../types/adminItem.types';

const ITEMS_URL = '/admin/items';

export const adminItemApi = {
    // GET /api/admin/items?itemType= — BE (GetItemDefinitionsQuery) returns a plain list,
    // there is no pagination on this endpoint.
    getItems: async (itemType?: string): Promise<ApiResponse<ItemDefinitionDto[]>> => {
        const res = await axiosClient.get<ApiResponse<ItemDefinitionDto[]>>(ITEMS_URL, {
            params: itemType ? { itemType } : undefined,
        });
        return res.data;
    },

    // POST /api/admin/items
    createItem: async (payload: CreateItemPayload): Promise<ApiResponse<ItemDefinitionDto>> => {
        const res = await axiosClient.post<ApiResponse<ItemDefinitionDto>>(ITEMS_URL, payload);
        return res.data;
    },

    // PUT /api/admin/items/{id}
    updateItem: async (id: number, payload: UpdateItemPayload): Promise<ApiResponse<ItemDefinitionDto>> => {
        const res = await axiosClient.put<ApiResponse<ItemDefinitionDto>>(`${ITEMS_URL}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/items/{id}/active?isActive= — BE reads isActive from the query string
    // ([FromQuery]), NOT the request body. Returns the full updated ItemDefinitionDto.
    setActive: async (id: number, isActive: boolean): Promise<ApiResponse<ItemDefinitionDto>> => {
        const res = await axiosClient.post<ApiResponse<ItemDefinitionDto>>(
            `${ITEMS_URL}/${id}/active`,
            null,
            { params: { isActive } },
        );
        return res.data;
    },

    // POST /api/admin/items/{id}/icon (multipart) — overwrites IconUrl with the uploaded
    // image's public Supabase URL (mirrors adminDailyBossApi.uploadIcon).
    uploadIcon: async (id: number, file: File): Promise<ApiResponse<ItemDefinitionDto>> => {
        const form = new FormData();
        form.append('file', file);
        const res = await axiosClient.post<ApiResponse<ItemDefinitionDto>>(`${ITEMS_URL}/${id}/icon`, form);
        return res.data;
    },
};
