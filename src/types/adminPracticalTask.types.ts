// MODULE 4B: PRACTICAL TASK TEMPLATES (ADMIN)

export type VerificationType = "GPS" | "PHOTO" | "NONE" | string;

export interface PracticalTaskDto {
    taskId: number;
    title: string;
    description: string | null;
    verificationType: VerificationType;
    isActive: boolean;
    createdAt: string;
}

// Payload dùng cho thao tác Tạo mới (POST) hoặc Cập nhật (PUT)
export interface PracticalTaskPayload {
    goalId: number;
    title: string;
    description?: string;
    verificationType: VerificationType;
    isActive: boolean;
}