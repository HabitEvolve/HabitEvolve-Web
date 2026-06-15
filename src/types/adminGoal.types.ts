// ==========================================
// MODULE 4: GOAL & QUESTIONNAIRE (ADMIN)
// ==========================================

export type QuestionType = "SingleChoice" | "MultipleChoice" | "NumberInput" | "TextInput" | "RatingScale" | "YesNo";

// 1. Goal Category
export interface GoalCategoryDto {
    categoryId: number;
    categoryCode: string;
    categoryName: string;
    description: string | null;
    iconCode: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
}

export interface GoalCategoryPayload {
    categoryCode: string;
    categoryName: string;
    description?: string;
    iconCode?: string;
    displayOrder: number;
    isActive: boolean;
}

// 2. Goal
export interface GoalDto {
    goalId: number;
    goalCode: string;
    goalName: string;
    description: string | null;
    categoryId: number;
    categoryCode: string; // Trả về kèm từ BE để hiển thị
    isActive: boolean;
    createdAt: string;
}

export interface GoalPayload {
    goalCode: string;
    goalName: string;
    description?: string;
    categoryId: number;
    isActive: boolean;
}

// 3. Questionnaire Template
export interface QuestionnaireTemplateDto {
    templateId: number;
    templateName: string;
    description: string | null;
    version: number;
    isActive: boolean;
    questionCount: number;
    createdAt: string;
}

export interface QuestionnaireTemplatePayload {
    templateName: string;
    description?: string;
}

// 4. Question & Options
export interface QuestionOptionDto {
    optionId: number;
    questionId: number;
    optionText: string;
    optionValue: string;
    displayOrder: number;
    isActive: boolean;
}

export interface QuestionDto {
    questionId: number;
    templateId: number;
    questionText: string;
    questionType: QuestionType;
    isRequired: boolean;
    displayOrder: number;
    isActive: boolean;
    options: QuestionOptionDto[];
}

// 5. Liên kết Goal <-> Template
export interface GoalQuestionnaireDto {
    goalQuestionnaireId: number;
    goalId: number;
    templateId: number;
    templateName: string;
    version: number;
    isActive: boolean;
    effectiveFrom: string;
}
// TARGET CALCULATION RULES TYPES (MODULE 4B)

export type MeasurementType = "CHECK_IN" | "COUNTABLE" | "FREQUENCY_BASED" | "QUALITY_BASED" | "SCHEDULE_BASED" | "TIME_BASED" | string;
export type RuleDifficulty = "Any" | "Easy" | "Normal" | "Hard" | string;
export type CalculationMethod = "None" | "PercentageReduce" | "FixedAdd" | "FixedSubtract" | string;

export interface TargetCalculationRuleDto {
    ruleId: number;
    measurementType: MeasurementType;
    difficulty: RuleDifficulty;
    calculationMethod: CalculationMethod;
    changeValue: number;
    minValue: number | null;
    maxValue: number | null;
    description: string | null;
    example: string | null;
    isActive: boolean;
}

// Payload dùng cho thao tác Tạo mới (POST) hoặc Cập nhật (PUT)
export interface TargetCalculationRulePayload {
    measurementType: MeasurementType;
    difficulty: RuleDifficulty;
    calculationMethod: CalculationMethod;
    changeValue: number;
    minValue: number | null;
    maxValue: number | null;
    description?: string;
    example?: string;
    isActive: boolean;
}