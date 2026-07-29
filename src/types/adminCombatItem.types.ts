// ==========================================
// ADMIN COMBAT ITEM ("chưởng lực" — Character/Spell, cộng damage khi trang bị)
// Matches BE CombatItemDefinitionDto (HabitEvolve.Application/Common/DTOs/CombatItemDtos.cs)
// and CreateCombatItemCommand / UpdateCombatItemBody
// (HabitEvolve.Application/Features/CombatItems/CombatItemFeature.cs,
//  HabitEvolve.API/Controllers/AdminCombatItemController.cs).
// Deliberately separate from ItemDefinition (cosmetic-only, no damage stats).
// ==========================================

export type CombatItemKind = "CHARACTER" | "SPELL" | string;

// GET /api/admin/combat-items — one row. Matches BE CombatItemDefinitionDto exactly.
export interface CombatItemDefinitionDto {
    combatItemDefinitionId: number;
    kind: CombatItemKind;
    code: string;
    name: string;
    iconUrl: string | null;
    description: string | null;
    price: number;
    currency: string;
    damageBonus: number;
    isDefault: boolean;
    isActive: boolean;
}

// POST /api/admin/combat-items (CreateCombatItemCommand)
export interface CreateCombatItemPayload {
    kind: CombatItemKind;
    code: string;
    name: string;
    iconUrl?: string;
    description?: string;
    price: number;
    currency: string;
    damageBonus: number;
    isDefault: boolean;
}

// PUT /api/admin/combat-items/{id} (UpdateCombatItemBody) — Kind and Code are immutable
// after creation, so they're intentionally absent here.
export interface UpdateCombatItemPayload {
    name: string;
    iconUrl?: string;
    description?: string;
    price: number;
    damageBonus: number;
    isDefault: boolean;
}
