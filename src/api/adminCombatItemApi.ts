import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    CombatItemDefinitionDto,
    CreateCombatItemPayload,
    UpdateCombatItemPayload,
} from '../types/adminEconomy.types';

const BASE = '/admin/combat-items';

export const adminCombatItemApi = {
    // GET /api/admin/combat-items?kind= — BE (GetCombatItemsQuery) returns a plain list,
    // there is no pagination on this endpoint.
    getItems: async (kind?: string): Promise<ApiResponse<CombatItemDefinitionDto[]>> => {
        const res = await axiosClient.get<ApiResponse<CombatItemDefinitionDto[]>>(BASE, {
            params: kind ? { kind } : undefined,
        });
        return res.data;
    },

    // POST /api/admin/combat-items
    createItem: async (payload: CreateCombatItemPayload): Promise<ApiResponse<CombatItemDefinitionDto>> => {
        const res = await axiosClient.post<ApiResponse<CombatItemDefinitionDto>>(BASE, payload);
        return res.data;
    },

    // PUT /api/admin/combat-items/{id}
    updateItem: async (id: number, payload: UpdateCombatItemPayload): Promise<ApiResponse<CombatItemDefinitionDto>> => {
        const res = await axiosClient.put<ApiResponse<CombatItemDefinitionDto>>(`${BASE}/${id}`, payload);
        return res.data;
    },

    // POST /api/admin/combat-items/{id}/active?isActive= — BE reads isActive from the query
    // string ([FromQuery]), NOT the request body. Returns the full updated CombatItemDefinitionDto.
    setActive: async (id: number, isActive: boolean): Promise<ApiResponse<CombatItemDefinitionDto>> => {
        const res = await axiosClient.post<ApiResponse<CombatItemDefinitionDto>>(
            `${BASE}/${id}/active`,
            null,
            { params: { isActive } },
        );
        return res.data;
    },
};
