// Types for the Admin Economy Hub: Items, Shop Listings, Loot Tables, Gacha Banners

// ── Item Catalog ──────────────────────────────────────────────────────────────
export type ItemType = "SKIN" | "SCENE" | "BADGE" | "TITLE" | "FRAME" | "EMOTE" | "CONSUMABLE" | string;
export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | string;

export interface ItemDefinitionDto {
  itemDefinitionId: number;
  code: string;
  name: string;
  description: string;
  iconUrl: string;
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
  itemDescription: string;
  itemIconUrl: string;
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

export interface UpdateShopListingPayload {
  shopType: string;
  currency: string;
  price: number;
  stockLimit?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
}

// ── Loot Tables ───────────────────────────────────────────────────────────────
export interface LootTableEntryDto {
  lootTableEntryId: number;
  lootTableId: number;
  rewardKind: string;
  itemDefinitionId: number | null;
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
