// ==========================================
// ADMIN ITEM CATALOG (cosmetic-only)
// Matches BE ItemDefinitionDto (HabitEvolve.Application/Common/DTOs/InventoryDtos.cs)
// and CreateItemDefinitionCommand / UpdateItemBody
// (HabitEvolve.Application/Features/ItemCatalog/ItemDefinitionFeature.cs,
//  HabitEvolve.API/Controllers/AdminItemController.cs).
// ==========================================

export type ItemType = "SKIN" | "SCENE" | "BADGE" | "TITLE" | "FRAME" | "EMOTE" | "CONSUMABLE" | string;
export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | string;

// GET /api/admin/items — one row. Matches BE ItemDefinitionDto exactly.
export interface ItemDefinitionDto {
    itemDefinitionId: number;
    code: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    itemType: ItemType;
    rarity: ItemRarity;
    categoryCode: string | null;
    isMentorExclusive: boolean;
    isStackable: boolean;
    isActive: boolean;
}

// POST /api/admin/items (CreateItemDefinitionCommand)
export interface CreateItemPayload {
    code: string;
    name: string;
    description?: string;
    iconUrl?: string;
    itemType: ItemType;
    rarity: ItemRarity;
    categoryCode?: string | null;
    isMentorExclusive: boolean;
    isStackable: boolean;
}

// PUT /api/admin/items/{id} (UpdateItemBody) — Code and ItemType are immutable after
// creation, so they're intentionally absent here (BE doesn't accept them on update).
export interface UpdateItemPayload {
    name: string;
    description?: string;
    iconUrl?: string;
    rarity: ItemRarity;
    categoryCode?: string | null;
    isMentorExclusive: boolean;
    isStackable: boolean;
}
