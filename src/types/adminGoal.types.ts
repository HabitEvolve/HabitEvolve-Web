// ==========================================
// MODULE 4: GOAL & QUESTIONNAIRE (ADMIN)
// ==========================================

// Matches BE QuestionType enum (PascalCase)
export type QuestionType = "SingleChoice" | "MultipleChoice" | "NumberInput" | "TextInput" | "RatingScale" | "YesNo" | "Time";

// 1. Goal Category
// Matches BE CategoryDto
export interface GoalCategoryDto {
    categoryId: number;
    categoryCode: string;
    categoryName: string;
    description: string | null;
    iconCode: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
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
// Matches BE GoalDto — NOTE: no categoryId, only categoryCode
export type MeasurementType = "CHECK_IN" | "COUNTABLE" | "FREQUENCY_BASED" | "QUALITY_BASED" | "SCHEDULE_BASED" | "TIME_BASED" | string;

export interface GoalDto {
    goalId: number;
    categoryCode: string;
    goalCode: string;
    goalName: string;
    measurementType: MeasurementType;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
}

// Payload for POST /admin/goals & PUT /admin/goals/{id}
// Uses categoryCode (string), not categoryId (number)
export interface GoalPayload {
    goalCode: string;
    goalName: string;
    description?: string;
    categoryCode: string;
    measurementType: MeasurementType;
    displayOrder: number;
    isActive: boolean;
}

// 3. Questionnaire Template
// Matches BE QuestionnaireTemplateDto — no version, no questionCount
export interface QuestionnaireTemplateDto {
    templateId: number;
    templateName: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
}

export interface QuestionnaireTemplatePayload {
    templateName: string;
    description?: string;
}

// 4. Question & Options
// Matches BE QuestionDto and QuestionOptionDto
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

// 5. Goal <-> Template Binding
// Matches BE GoalQuestionnaireDto — no version field
export interface GoalQuestionnaireDto {
    goalQuestionnaireId: number;
    goalId: number;
    templateId: number;
    templateName: string | null;
    isActive: boolean;
    effectiveFrom: string;
    createdAt: string;
}

// ==========================================
// TARGET CALCULATION RULES (MODULE 4B)
// ==========================================

// Matches BE TargetCalculationMethod enum (PascalCase)
export type CalculationMethod = "None" | "PercentageReduce" | "PercentageIncrease" | "FixedSubtract" | "FixedAdd" | string;

// Matches BE RuleDifficulty — used in DTO responses only
export type RuleDifficulty = "Any" | "Easy" | "Normal" | "Hard" | string;

// Matches BE TargetCalculationRuleDto
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

// Payload for PUT /admin/target-calculation-rules/{id}
// Matches BE UpdateRuleRequest exactly — measurementType and difficulty are NOT updatable
export interface UpdateRulePayload {
    calculationMethod: CalculationMethod;
    changeValue: number;
    minValue: number | null;
    maxValue: number | null;
    description: string;
    example?: string;
}
