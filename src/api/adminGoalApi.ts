import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    GoalCategoryDto, GoalCategoryPayload,
    GoalDto, GoalPayload,
    QuestionnaireTemplateDto, QuestionnaireTemplatePayload,
    QuestionDto, QuestionOptionDto, GoalQuestionnaireDto
} from '../types/adminGoal.types';

const ADMIN_URL = '/admin';

export const adminGoalApi = {
    // ==========================================
    // 1. GOAL CATEGORIES
    // ==========================================
    getCategories: async (params?: { activeOnly?: boolean; page?: number; pageSize?: number; search?: string }): Promise<ApiResponse<GoalCategoryDto[]>> => {
        const res = await axiosClient.get(`/goal-categories`, { params });
        return res.data;
    },
    createCategory: async (payload: GoalCategoryPayload): Promise<ApiResponse<GoalCategoryDto>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/goal-categories`, payload);
        return res.data;
    },
    updateCategory: async (id: number, payload: GoalCategoryPayload): Promise<ApiResponse<GoalCategoryDto>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/goal-categories/${id}`, payload);
        return res.data;
    },

    // ==========================================
    // 2. GOALS
    // ==========================================
    getGoals: async (params?: { categoryCode?: string; page?: number; pageSize?: number; search?: string }): Promise<ApiResponse<GoalDto[]>> => {
        const res = await axiosClient.get(`/goals`, { params });
        return res.data;
    },
    createGoal: async (payload: GoalPayload): Promise<ApiResponse<GoalDto>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/goals`, payload);
        return res.data;
    },
    updateGoal: async (id: number, payload: GoalPayload): Promise<ApiResponse<GoalDto>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/goals/${id}`, payload);
        return res.data;
    },

    // ==========================================
    // 3. QUESTIONNAIRE TEMPLATES
    // ==========================================
    getTemplates: async (params?: { activeOnly?: boolean; page?: number; pageSize?: number }): Promise<ApiResponse<QuestionnaireTemplateDto[]>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/questionnaire-templates`, { params });
        return res.data;
    },
    createTemplate: async (payload: QuestionnaireTemplatePayload): Promise<ApiResponse<QuestionnaireTemplateDto>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/questionnaire-templates`, payload);
        return res.data;
    },
    updateTemplate: async (id: number, payload: QuestionnaireTemplatePayload): Promise<ApiResponse<any>> => {
        const res = await axiosClient.put(`${ADMIN_URL}/questionnaire-templates/${id}`, payload);
        return res.data;
    },

    // ==========================================
    // 4. QUESTIONS & OPTIONS
    // ==========================================
    getQuestionsByTemplate: async (templateId: number): Promise<ApiResponse<QuestionDto[]>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/questionnaire-templates/${templateId}/questions`);
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

    // ==========================================
    // 5. GOAL QUESTIONNAIRE (BINDING)
    // ==========================================
    getGoalQuestionnaires: async (goalId: number): Promise<ApiResponse<GoalQuestionnaireDto[]>> => {
        const res = await axiosClient.get(`${ADMIN_URL}/goals/${goalId}/questionnaires`);
        return res.data;
    },
    bindTemplateToGoal: async (goalId: number, templateId: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.post(`${ADMIN_URL}/goals/${goalId}/questionnaires`, { templateId });
        return res.data;
    }
};