// ==========================================
// ADMIN LOOT TABLES (gacha / chest drop rates)
// Field names are inferred from the endpoint list — confirm against the real
// BE DTOs (LootTableDto / LootTableEntryDto) once available and adjust if they drift.
// ==========================================

// One weighted entry inside a loot table
export interface LootTableEntryDto {
    entryId: number;
    itemId: number;
    itemName: string | null;
    weight: number;        // relative drop weight — chance = weight / sum(all weights)
    minQuantity: number;
    maxQuantity: number;
}

// GET /api/admin/loot-tables — one row, entries included
export interface LootTableDto {
    lootTableId: number;
    name: string;
    description: string | null;
    isActive: boolean;
    entries: LootTableEntryDto[];
    createdAt: string;
    updatedAt: string | null;
}

// GET /api/admin/loot-tables?pageNumber=&pageSize=
// pageNumber/pageSize match the convention already confirmed working for
// GET /admin/users (see GetUsersQueryParams) — reused here for consistency.
export interface GetLootTablesQueryParams {
    pageNumber?: number;
    pageSize?: number;
}

// POST /api/admin/loot-tables
export interface CreateLootTablePayload {
    name: string;
    description?: string;
}

// POST /api/admin/loot-tables/{id}/entries
export interface AddLootTableEntryPayload {
    itemId: number;
    weight: number;
    minQuantity: number;
    maxQuantity: number;
}
