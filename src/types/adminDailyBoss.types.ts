export interface DailyBossTemplateDto {
    dailyBossTemplateId: number;
    name: string;
    description: string | null;
    /** Emoji string (e.g. "🐉") OR a Supabase https:// image URL uploaded via /icon. */
    icon: string | null;
    hpMin: number;
    hpMax: number;
    isActive: boolean;
    /** 0 = no sprite animation uploaded yet. */
    totalFrames: number;
    goalId: number | null;
    categoryCode: string | null;
    /**
     * Khoá bộ sprite art "có sẵn" (vd "goblin", "golem_01") — client resolve ra pack frame
     * bundled trong public/monsters (xem `data/monsterRoster.ts`). null = dùng Icon/animation Supabase.
     */
    spriteKey: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface DailyBossPayload {
    name: string;
    description?: string;
    icon?: string;
    hpMin: number;
    hpMax: number;
    /** Goal category this boss is themed for. null = generic boss (matches every goal). */
    categoryCode?: string | null;
    /** Khoá sprite art có sẵn (public/monsters). null/undefined = không dùng pack có sẵn. */
    spriteKey?: string | null;
}

// ── Sprite-sheet animation ──────────────────────────────────────────────────
export interface DailyBossAnimationFrameDto {
    dailyBossAnimationFrameId: number;
    dailyBossTemplateId: number;
    /** Free-form label, stored UPPERCASE by the BE (no enforced enum) — IDLE/ATTACK/HIT/DEFEAT by convention. */
    animationState: string;
    frameOrder: number;
    imageUrl: string;
    createdAt: string;
}

export interface UploadAnimationOptions {
    /** Comma-separated row labels top→bottom, e.g. "idle,attack,hit,defeat". Optional per-row frame count: "idle:4,attack:6". */
    states?: string;
    /** true = content-detection auto-slice (default). false = fixed grid via columns/rows. */
    auto?: boolean;
    /** Auto mode: padding px around detected content. Default 15. */
    margin?: number;
    /** Auto/detect mode: min px size of a band to count as content. Default 30. */
    minSize?: number;
    /** RGB threshold for white-background detection. Default 245. */
    rgb?: number;
    /** Alpha threshold for transparent-background detection. Default 10. */
    alpha?: number;
    /** Manual/grid mode only. */
    columns?: number;
    /** Manual/grid mode only. */
    rows?: number;
}

export interface DetectAnimationOptions {
    minSize?: number;
    rgb?: number;
    alpha?: number;
}

export interface SpriteSheetRowDto {
    index: number;
    y0: number;
    y1: number;
    height: number;
    frameCount: number;
}

export interface SpriteSheetDetectionDto {
    /** Free-text Vietnamese label ("Trong suốt (alpha)" / "Trắng/sáng (RGB)") — not an enum. */
    backgroundMode: string;
    imageWidth: number;
    imageHeight: number;
    minSize: number;
    rgbThreshold: number;
    alphaThreshold: number;
    rowCount: number;
    rows: SpriteSheetRowDto[];
}
