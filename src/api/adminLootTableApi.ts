import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    LootTableDto,
    AddLootTableEntryPayload,
} from '../types/adminLootTable.types';

const LOOT_TABLES_URL = '/admin/loot-tables';

export const adminLootTableApi = {
    // GET /api/admin/loot-tables — tables with their entries. BE (GetLootTablesQuery) takes
    // no params at all and returns a plain list, no pagination.
    getLootTables: async (): Promise<ApiResponse<LootTableDto[]>> => {
        const res = await axiosClient.get<ApiResponse<LootTableDto[]>>(LOOT_TABLES_URL);
        return res.data;
    },

    // POST /api/admin/loot-tables — Code only (CreateLootTableCommand has no name/description).
    createLootTable: async (code: string): Promise<ApiResponse<LootTableDto>> => {
        const res = await axiosClient.post<ApiResponse<LootTableDto>>(LOOT_TABLES_URL, { code });
        return res.data;
    },

    // POST /api/admin/loot-tables/{id}/active?isActive= — BE reads isActive from the query
    // string ([FromQuery]), NOT the request body. Returns a bare boolean, not the full table.
    setActive: async (id: number, isActive: boolean): Promise<ApiResponse<boolean>> => {
        const res = await axiosClient.post<ApiResponse<boolean>>(
            `${LOOT_TABLES_URL}/${id}/active`,
            null,
            { params: { isActive } },
        );
        return res.data;
    },

    // POST /api/admin/loot-tables/{id}/entries
    addEntry: async (id: number, payload: AddLootTableEntryPayload): Promise<ApiResponse<LootTableDto>> => {
        const res = await axiosClient.post<ApiResponse<LootTableDto>>(`${LOOT_TABLES_URL}/${id}/entries`, payload);
        return res.data;
    },

    // DELETE /api/admin/loot-tables/{id}/entries/{entryId}
    deleteEntry: async (id: number, entryId: number): Promise<ApiResponse<boolean>> => {
        const res = await axiosClient.delete<ApiResponse<boolean>>(`${LOOT_TABLES_URL}/${id}/entries/${entryId}`);
        return res.data;
    },
};
