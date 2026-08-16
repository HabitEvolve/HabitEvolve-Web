// Types for the Admin Economy Hub: Items, Combat Shop (Character/Spell), Loot Tables, Gacha Banners

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

// ── Combat Shop (Character/Spell "chưởng lực") ────────────────────────────────
// Matches BE CombatItemDefinition.ValidKinds/ValidCurrencies exactly. Separate
// from the cosmetic Item Catalog — these add real DamageBonus when equipped.
// Currency IS the storefront split: GOLD → Regular (System) shop, MGOLD →
// Mentor shop — there is no independent shopType field on this entity.
export type CombatItemKind = "CHARACTER" | "SPELL";
export type CombatItemCurrency = "GOLD" | "MGOLD";

export interface CombatItemDefinitionDto {
  combatItemDefinitionId: number;
  kind: CombatItemKind;
  code: string;
  name: string;
  iconUrl: string | null;
  description: string | null;
  price: number;
  currency: CombatItemCurrency;
  damageBonus: number;
  /** Every player already owns this for free (e.g. the starter character) — never purchasable. */
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateCombatItemPayload {
  kind: CombatItemKind;
  code: string;
  name: string;
  iconUrl?: string | null;
  price: number;
  currency: CombatItemCurrency;
  damageBonus: number;
  isDefault: boolean;
  description?: string | null;
}

// PUT /api/admin/combat-items/{id} (UpdateCombatItemBody) — Kind and Code are
// immutable after creation, so they're intentionally absent (BE doesn't accept them on update).
export interface UpdateCombatItemPayload {
  name: string;
  iconUrl?: string | null;
  price: number;
  currency: CombatItemCurrency;
  damageBonus: number;
  isDefault: boolean;
  description?: string | null;
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
