// Types for the Admin Economy Hub: Items, Shop Listings, Loot Tables, Gacha Banners

// ── Item Catalog ──────────────────────────────────────────────────────────────
export type ItemType = "SKIN" | "SCENE" | "BADGE" | "TITLE" | "FRAME" | "EMOTE" | "CONSUMABLE" | string;
export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | string;

// Matches BE ItemDefinitionDto (Description/IconUrl are `string?` on the BE).
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

export interface CreateItemPayload {
  code: string;
  name: string;
  description: string;
  iconUrl: string;
  itemType: ItemType;
  rarity: ItemRarity;
  categoryCode?: string | null;
  isMentorExclusive: boolean;
  isStackable: boolean;
}

// PUT /api/admin/items/{id} (UpdateItemBody) — Code and ItemType are immutable after
// creation, so they're intentionally absent (BE doesn't accept them on update).
export interface UpdateItemPayload {
  name: string;
  description: string;
  iconUrl: string;
  rarity: ItemRarity;
  categoryCode?: string | null;
  isMentorExclusive: boolean;
  isStackable: boolean;
}

// ── Shop Listings ─────────────────────────────────────────────────────────────
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
  currency: string;
  price: number;
  stockLimit: number | null;
  stockSold: number;
  isActive: boolean;
  availableFrom: string | null;
  availableTo: string | null;
}

export interface CreateShopListingPayload {
  itemDefinitionId: number;
  shopType: string;
  currency: string;
  price: number;
  stockLimit?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
}

// PUT /api/admin/shop/listings/{id} (UpdateShopListingBody) — shopType/currency/item are
// immutable after creation; the BE update command only accepts price/stock/rotation window.
export interface UpdateShopListingPayload {
  price: number;
  stockLimit?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
}

// ── Loot Tables ───────────────────────────────────────────────────────────────
// Matches BE LootTableEntryDto exactly — no lootTableId on the entry (only on the parent
// table); itemName is included so item-kind entries can render without a lookup.
export interface LootTableEntryDto {
  lootTableEntryId: number;
  rewardKind: string;
  itemDefinitionId: number | null;
  itemName: string | null;
  amountMin: number;
  amountMax: number;
  weight: number;
}

export interface LootTableDto {
  lootTableId: number;
  code: string;
  isActive: boolean;
  entries: LootTableEntryDto[];
}

export interface AddLootTableEntryPayload {
  rewardKind: string;
  itemDefinitionId?: number | null;
  amountMin: number;
  amountMax: number;
  weight: number;
}

// ── Gacha Banners ─────────────────────────────────────────────────────────────
export interface GachaBannerDto {
  gachaBannerId: number;
  code: string;
  name: string;
  lootTableId: number;
  pullCostGems: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateGachaBannerPayload {
  code: string;
  name: string;
  lootTableId: number;
  pullCostGems: number;
}

export interface UpdateGachaBannerPayload {
  name: string;
  lootTableId: number;
  pullCostGems: number;
}
