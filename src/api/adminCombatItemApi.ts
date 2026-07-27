import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    CombatItemDefinitionDto,
    CreateCombatItemPayload,
    UpdateCombatItemPayload,
} from '../types/adminCombatItem.types';

const COMBAT_ITEMS_URL = '/admin/combat-items';

export const adminCombatItemApi = {
    // GET /api/admin/combat-items?kind= — plain list, no pagination on this endpoint.
    getCombatItems: async (kind?: string): Promise<ApiResponse<CombatItemDefinitionDto[]>> => {
        const res = await axiosClient.get<ApiResponse<CombatItemDefinitionDto[]>>(COMBAT_ITEMS_URL, {
            params: kind ? { kind } : undefined,
        });
        return res.data;
    },

    // POST /api/admin/combat-items
    createCombatItem: async (payload: CreateCombatItemPayload): Promise<ApiResponse<CombatItemDefinitionDto>> => {
        const res = await axiosClient.post<ApiResponse<CombatItemDefinitionDto>>(COMBAT_ITEMS_URL, payload);
        return res.data;
    },

    // PUT /api/admin/combat-items/{id}
    updateCombatItem: async (id: number, payload: UpdateCombatItemPayload): Promise<ApiResponse<CombatItemDefinitionDto>> => {
        const res = await axiosClient.put<ApiResponse<CombatItemDefinitionDto>>(`${COMBAT_ITEMS_URL}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/combat-items/{id}/active?isActive= — BE reads isActive from the query
    // string ([FromQuery]), NOT the request body. Returns the full updated dto.
    setActive: async (id: number, isActive: boolean): Promise<ApiResponse<CombatItemDefinitionDto>> => {
        const res = await axiosClient.post<ApiResponse<CombatItemDefinitionDto>>(
            `${COMBAT_ITEMS_URL}/${id}/active`,
            null,
            { params: { isActive } },
        );
        return res.data;
    },
};
