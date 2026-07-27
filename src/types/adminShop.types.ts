// ==========================================
// ADMIN SHOP LISTINGS
// Matches BE ShopListingDto (HabitEvolve.Application/Common/DTOs/ShopDtos.cs) and
// CreateShopListingCommand / UpdateShopListingBody
// (HabitEvolve.Application/Features/Shops/AdminShopFeature.cs,
//  HabitEvolve.API/Controllers/AdminShopController.cs).
// ==========================================

export type ShopCurrency = "GOLD" | "GEMS" | "MGOLD" | string;
export type ShopType = "SYSTEM" | "MENTOR" | string;

// GET /api/admin/shop/listings — one row. Matches BE ShopListingDto exactly.
// NOTE: the BE has no "rotationGroup" concept — rotation is just availableFrom/availableTo.
export interface ShopListingDto {
    shopListingId: number;
    itemDefinitionId: number;
    itemCode: string;
    itemName: string;
    itemDescription: string | null;
    itemIconUrl: string | null;
    itemType: string;
    rarity: string;
    categoryCode: string | null;
    shopType: string;
    currency: ShopCurrency;
    price: number;
    stockLimit: number | null;
    stockSold: number;
    isActive: boolean;
    availableFrom: string | null;
    availableTo: string | null;
}

// POST /api/admin/shop/listings (CreateShopListingCommand)
export interface CreateShopListingPayload {
    itemDefinitionId: number;
    shopType: ShopType;
    currency: ShopCurrency;
    price: number;
    stockLimit?: number | null;
    availableFrom?: string | null;
    availableTo?: string | null;
}

// PUT /api/admin/shop/listings/{id} (UpdateShopListingBody) — shopType/currency/item are
// immutable after creation, so only pricing/stock/rotation-window fields are accepted.
export interface UpdateShopListingPayload {
    price: number;
    stockLimit?: number | null;
    availableFrom?: string | null;
    availableTo?: string | null;
}
