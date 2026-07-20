// ==========================================
// ADMIN ITEM CATALOG (cosmetic-only)
// Field names are inferred from the endpoint list — confirm against the real
// BE DTOs (ItemDto / CreateItemRequest) once available and adjust if they drift.
// ==========================================

export type ItemType = "AVATAR_FRAME" | "BADGE" | "TITLE" | "PET_SKIN" | "THEME" | string;
export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | string;

// GET /api/admin/items — one row
export interface ItemDto {
    itemId: number;
    name: string;
    description: string | null;
    itemType: ItemType;
    rarity: ItemRarity;
    iconUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
}

// GET /api/admin/items?itemType=&pageNumber=&pageSize=
// pageNumber/pageSize match the convention already confirmed working for
// GET /admin/users (see GetUsersQueryParams) — reused here for consistency
// rather than inventing a third page/limit naming scheme.
export interface GetItemsQueryParams {
    itemType?: ItemType;
    pageNumber?: number;
    pageSize?: number;
}

// POST /api/admin/items
export interface CreateItemPayload {
    name: string;
    description?: string;
    itemType: ItemType;
    rarity: ItemRarity;
    iconUrl?: string;
}

// PUT /api/admin/items/{id}
export interface UpdateItemPayload {
    name?: string;
    description?: string;
    itemType?: ItemType;
    rarity?: ItemRarity;
    iconUrl?: string;
}
