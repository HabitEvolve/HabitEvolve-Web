// Matches GlobalSearchResultDto / GlobalSearchItemDto from
// AdminSearchController.GlobalSearch (GET /api/admin/global-search?q&limit).
// Every group uses the SAME normalized item shape — no per-entity DTOs.

export type GlobalSearchItemType =
    | 'user'
    | 'party'
    | 'goal'
    | 'quest-template'
    | 'boss-template'
    | 'package';

export interface GlobalSearchItemDto {
    id: number;
    type: GlobalSearchItemType;
    title: string;
    subtitle?: string | null;
    status?: string | null;
}

export interface GlobalSearchResultDto {
    query: string;
    totalResults: number;
    users: GlobalSearchItemDto[];
    parties: GlobalSearchItemDto[];
    goals: GlobalSearchItemDto[];
    questTemplates: GlobalSearchItemDto[];
    bossTemplates: GlobalSearchItemDto[];
    packages: GlobalSearchItemDto[];
}
