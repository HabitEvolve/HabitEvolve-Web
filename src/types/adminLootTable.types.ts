// ==========================================
// ADMIN LOOT TABLES (gacha / chest drop rates)
// Matches BE LootTableDto/LootTableEntryDto (HabitEvolve.Application/Common/DTOs/LootTableDtos.cs)
// and CreateLootTableCommand / AddLootTableEntryCommand
// (HabitEvolve.Application/Features/LootTables/LootTableFeature.cs,
//  HabitEvolve.API/Controllers/AdminLootTableController.cs).
// NOTE: a loot table has NO name/description on the BE — only a unique `code`
// (e.g. DAILY_CHEST, WEEKLY_CHEST_EASY, GACHA_STANDARD).
// ==========================================

export type RewardKind = "GOLD" | "GEMS" | "MGOLD" | "ITEM" | string;

// One weighted entry inside a loot table. Matches BE LootTableEntryDto exactly.
export interface LootTableEntryDto {
    lootTableEntryId: number;
    rewardKind: RewardKind;
    itemDefinitionId: number | null;
    itemName: string | null;
    amountMin: number;
    amountMax: number;
    weight: number;        // relative drop weight — chance = weight / sum(all weights)
}

// GET /api/admin/loot-tables — one row, entries included. Matches BE LootTableDto exactly.
export interface LootTableDto {
    lootTableId: number;
    code: string;
    isActive: boolean;
    entries: LootTableEntryDto[];
}

// POST /api/admin/loot-tables (CreateLootTableCommand) — Code only.
export interface CreateLootTablePayload {
    code: string;
}

// POST /api/admin/loot-tables/{id}/entries (AddLootTableEntryCommand)
export interface AddLootTableEntryPayload {
    rewardKind: RewardKind;
    itemDefinitionId?: number | null;
    amountMin: number;
    amountMax: number;
    weight: number;
}
