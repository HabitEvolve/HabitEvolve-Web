import axiosClient from './axiosClient';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';
import type {
    LootTableDto,
    GetLootTablesQueryParams,
    CreateLootTablePayload,
    AddLootTableEntryPayload,
} from '../types/adminLootTable.types';

const LOOT_TABLES_URL = '/admin/loot-tables';

export const adminLootTableApi = {
    // GET /api/admin/loot-tables?pageNumber=&pageSize= — tables with their entries
    getLootTables: async (params?: GetLootTablesQueryParams): Promise<PaginatedApiResponse<LootTableDto>> => {
        const res = await axiosClient.get<PaginatedApiResponse<LootTableDto>>(LOOT_TABLES_URL, { params });
        return res.data;
    },

    // POST /api/admin/loot-tables
    createLootTable: async (payload: CreateLootTablePayload): Promise<ApiResponse<LootTableDto>> => {
        const res = await axiosClient.post<ApiResponse<LootTableDto>>(LOOT_TABLES_URL, payload);
        return res.data;
    },

    // POST /api/admin/loot-tables/{id}/active — body sends the explicit target state so
    // the call is unambiguous/idempotent regardless of whether the BE reads it or just
    // flips. Response shape isn't guaranteed to be the full entity (may omit `entries`)
    // — callers must not replace local state with it wholesale, only merge.
    toggleActive: async (id: number, isActive: boolean): Promise<ApiResponse<Partial<LootTableDto>>> => {
        const res = await axiosClient.post<ApiResponse<Partial<LootTableDto>>>(`${LOOT_TABLES_URL}/${id}/active`, { isActive });
        return res.data;
    },

    // POST /api/admin/loot-tables/{id}/entries
    addEntry: async (id: number, payload: AddLootTableEntryPayload): Promise<ApiResponse<LootTableDto>> => {
        const res = await axiosClient.post<ApiResponse<LootTableDto>>(`${LOOT_TABLES_URL}/${id}/entries`, payload);
        return res.data;
    },

    // DELETE /api/admin/loot-tables/{id}/entries/{entryId}
    deleteEntry: async (id: number, entryId: number): Promise<ApiResponse<void>> => {
        const res = await axiosClient.delete<ApiResponse<void>>(`${LOOT_TABLES_URL}/${id}/entries/${entryId}`);
        return res.data;
    },
};
