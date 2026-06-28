export interface DailyBossTemplateDto {
    dailyBossTemplateId: number;
    name: string;
    description: string | null;
    icon: string | null;
    hpMin: number;
    hpMax: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
}

export interface DailyBossPayload {
    name: string;
    description?: string;
    icon?: string;
    hpMin: number;
    hpMax: number;
}
