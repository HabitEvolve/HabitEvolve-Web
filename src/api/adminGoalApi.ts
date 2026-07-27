import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    GoalCategoryDto, GoalCategoryPayload,
    GoalDto, GoalPayload,
    QuestionnaireTemplateDto, QuestionnaireTemplatePayload,
    QuestionDto, GoalQuestionnaireDto
} from '../types/adminGoal.types';

const ADMIN_URL = '/admin';

export const adminGoalApi = {
    // ==========================================
    // 1. GOAL CATEGORIES
    // Controller: GoalCategoryController [Route("api/goal-categories")]
    // Admin CRUD: [Route("api/admin/goal-categories")]
    // ==========================================
    getCategories: async (params?: { activeOnly?: boolean }): Promise<ApiResponse<GoalCategoryDto[]>> => {
        const res = await axiosClient.get(`/goal-categories`, { params });
        return res.data;
    },
    createCategory: async (payload: GoalCategoryPayload): Promise<ApiResponse<GoalCategoryDto>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/goal-categories`, payload);
        return res.data;
    },
    // BE UpdateCategoryCommand requires CategoryId in body to match route — injected here
    updateCategory: async (id: number, payload: GoalCategoryPayload): Promise<ApiResponse<GoalCategoryDto>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/goal-categories/${id}`, { ...payload, categoryId: id });
        return res.data;
    },
    toggleCategoryStatus: async (id: number, isActive: boolean): Promise<ApiResponse<GoalCategoryDto>> => {
        const res = await axiosClient.patch(`${ADMIN_URL}/goal-categories/${id}/status`, isActive);
        return res.data;
    },
    deleteCategory: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete(`${ADMIN_URL}/goal-categories/${id}`);
        return res.data;
    },

    // ==========================================
    // 2. GOALS
    // Controller: GoalController [Route("api/goals")]  — NO admin prefix!
    // CreateGoalCommand: CategoryCode, GoalCode, GoalName, MeasurementType, Description?, DisplayOrder, IsActive
    // UpdateGoalCommand: GoalId, GoalName, MeasurementType, Description?, DisplayOrder, IsActive
    //   (GoalCode and CategoryCode are NOT updatable)
    // ==========================================
    getGoals: async (params?: { categoryCode?: string }): Promise<ApiResponse<GoalDto[]>> => {
        const res = await axiosClient.get(`/goals`, { params });
        return res.data;
    },
    getGoalById: async (id: number): Promise<ApiResponse<GoalDto>> => {
        const res = await axiosClient.get(`/goals/${id}`);
        return res.data;
    },
    createGoal: async (payload: GoalPayload): Promise<ApiResponse<GoalDto>> => {
        const res = await axiosClient.post(`/goals`, payload);
        return res.data;
    },
    // BE UpdateGoalCommand requires GoalId in body to match route — injected here
    // categoryCode and goalCode are excluded as they're not in UpdateGoalCommand
    updateGoal: async (id: number, payload: GoalPayload): Promise<ApiResponse<GoalDto>> => {
        const { goalCode: _gc, categoryCode: _cc, ...updateFields } = payload;
        const res = await axiosClient.put(`/goals/${id}`, { ...updateFields, goalId: id });
        return res.data;
    },
    deleteGoal: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete(`/goals/${id}`);
        return res.data;
    },

    // ==========================================
    // 3. QUESTIONNAIRE TEMPLATES
    // Controller: QuestionnaireTemplateController [Route("api/admin/questionnaire-templates")]
    // ==========================================
    getTemplates: async (params?: { activeOnly?: boolean }): Promise<ApiResponse<QuestionnaireTemplateDto[]>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/questionnaire-templates`, { params });
        return res.data;
    },
    getTemplateById: async (templateId: number): Promise<ApiResponse<QuestionnaireTemplateDto>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/questionnaire-templates/${templateId}`);
        return res.data;
    },
    createTemplate: async (payload: QuestionnaireTemplatePayload): Promise<ApiResponse<QuestionnaireTemplateDto>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/questionnaire-templates`, payload);
        return res.data;
    },
    updateTemplate: async (id: number, payload: QuestionnaireTemplatePayload): Promise<ApiResponse<QuestionnaireTemplateDto>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/questionnaire-templates/${id}`, { ...payload, templateId: id });
        return res.data;
    },
    toggleTemplateStatus: async (id: number, isActive: boolean): Promise<ApiResponse<QuestionnaireTemplateDto>> => {
        const res = await axiosClient.patch(`${ADMIN_URL}/questionnaire-templates/${id}/status`, isActive);
        return res.data;
    },
    deleteTemplate: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete(`${ADMIN_URL}/questionnaire-templates/${id}`);
        return res.data;
    },

    // ==========================================
    // 4. QUESTIONS & OPTIONS
    // ==========================================
    getQuestionsByTemplate: async (templateId: number, params?: { activeOnly?: boolean }): Promise<ApiResponse<QuestionDto[]>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/questionnaire-templates/${templateId}/questions`, { params });
        return res.data;
    },
    createQuestion: async (templateId: number, payload: any): Promise<ApiResponse<QuestionDto>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/questionnaire-templates/${templateId}/questions`, payload);
        return res.data;
    },
    updateQuestion: async (questionId: number, payload: any): Promise<ApiResponse<any>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/questions/${questionId}`, payload);
        return res.data;
    },
    // PUT /admin/questions/{questionId}/field-key — BE: SetQuestionFieldKeyCommand (QuestionController.SetFieldKey)
    // Sets the semantic FieldKey used by ProgressionPlanService.ResolveAllBindings to pull answer values
    // into ComputedVariables (e.g. "baseline_count"). Omit/empty fieldKey clears it.
    // NOTE: BE's QuestionDto does not serialize FieldKey back — the current value can't be read from responses.
    setQuestionFieldKey: async (questionId: number, fieldKey?: string | null): Promise<ApiResponse<QuestionDto>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/questions/${questionId}/field-key`, { fieldKey });
        return res.data;
    },
    deleteQuestion: async (questionId: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete(`${ADMIN_URL}/questions/${questionId}`);
        return res.data;
    },
    createQuestionOption: async (questionId: number, payload: any): Promise<ApiResponse<any>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/questions/${questionId}/options`, payload);
        return res.data;
    },
    updateQuestionOption: async (optionId: number, payload: any): Promise<ApiResponse<any>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/question-options/${optionId}`, payload);
        return res.data;
    },
    deleteQuestionOption: async (optionId: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete(`${ADMIN_URL}/question-options/${optionId}`);
        return res.data;
    },

    // ==========================================
    // 5. GOAL <-> TEMPLATE BINDING
    // ==========================================
    getGoalQuestionnaires: async (goalId: number): Promise<ApiResponse<GoalQuestionnaireDto[]>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/goals/${goalId}/questionnaires`);
        return res.data;
    },
    bindTemplateToGoal: async (goalId: number, templateId: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/goals/${goalId}/questionnaires`, { goalId, templateId });
        return res.data;
    },
    activateGoalQuestionnaire: async (goalId: number, id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.patch(`${ADMIN_URL}/goals/${goalId}/questionnaires/${id}/activate`, { goalId, goalQuestionnaireId: id });
        return res.data;
    },
    deactivateGoalQuestionnaire: async (goalId: number, id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.patch(`${ADMIN_URL}/goals/${goalId}/questionnaires/${id}/deactivate`, { goalId, goalQuestionnaireId: id });
        return res.data;
    },
    deleteGoalQuestionnaire: async (goalId: number, id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete(`${ADMIN_URL}/goals/${goalId}/questionnaires/${id}`);
        return res.data;
    },
};
