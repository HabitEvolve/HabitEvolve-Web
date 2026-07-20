// ==========================================
// ADMIN SHOP LISTINGS
// Field names are inferred from the endpoint list — confirm against the real
// BE DTOs (ShopListingDto) once available and adjust if they drift.
// ==========================================

export type ShopCurrency = "GOLD" | "GEMS" | "MGOLD" | string;

// GET /api/admin/shop/listings — one row
export interface ShopListingDto {
    listingId: number;
    itemId: number;
    itemName: string | null;
    price: number;
    currency: ShopCurrency;
    stock: number | null;       // null = unlimited
    rotationGroup: string | null;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    createdAt: string;
}

// GET /api/admin/shop/listings?pageNumber=&pageSize=
// pageNumber/pageSize match the convention already confirmed working for
// GET /admin/users (see GetUsersQueryParams) — reused here for consistency.
export interface GetShopListingsQueryParams {
    pageNumber?: number;
    pageSize?: number;
}

// POST /api/admin/shop/listings
export interface CreateShopListingPayload {
    itemId: number;
    price: number;
    currency: ShopCurrency;
    stock?: number | null;
    rotationGroup?: string;
    startsAt?: string;
    endsAt?: string;
}

// PUT /api/admin/shop/listings/{id} — price/stock/rotation
export interface UpdateShopListingPayload {
    price?: number;
    stock?: number | null;
    rotationGroup?: string;
    startsAt?: string;
    endsAt?: string;
}
