import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    RecommendationRuleDto,
    RecommendationRuleConditionDto,
    CreateRulePayload,
    UpdateRulePayload_Rec,
    AddConditionPayload,
    UpdateConditionPayload,
} from '../types/adminGoal.types';

const BASE = '/admin/recommendation-rules';

// ==========================================
// RECOMMENDATION RULE CRUD
// Controller: RecommendationRuleController  [Route("api/admin/recommendation-rules")]
//
// Rules:
//   GET    /admin/recommendation-rules?goalId={id}  → list for a goal
//   GET    /admin/recommendation-rules/{ruleId}      → single rule
//   POST   /admin/recommendation-rules               → create
//   PUT    /admin/recommendation-rules/{ruleId}      → update
//   DELETE /admin/recommendation-rules/{ruleId}      → delete
//   PATCH  /admin/recommendation-rules/{ruleId}/active?isActive=bool
//
// Conditions:
//   POST   /admin/recommendation-rules/{ruleId}/conditions
//   PUT    /admin/recommendation-rules/conditions/{conditionId}
//   DELETE /admin/recommendation-rules/conditions/{conditionId}
// ==========================================
export const adminRecommendationRuleApi = {
    // GET ?goalId={id} — returns all rules for a goal (with conditions embedded)
    getRules: async (goalId: number): Promise<ApiResponse<RecommendationRuleDto[]>> => {
        const res = await axiosClient.get<ApiResponse<RecommendationRuleDto[]>>(BASE, { params: { goalId } });
        return res.data;
    },

    // GET /{ruleId}
    getRuleById: async (ruleId: number): Promise<ApiResponse<RecommendationRuleDto>> => {
        const res = await axiosClient.get<ApiResponse<RecommendationRuleDto>>(`${BASE}/${ruleId}`);
        return res.data;
    },

    // POST — CreateRecommendationRuleCommand(GoalId, RuleName, Description?, Priority, MatchMode, IsActive)
    createRule: async (payload: CreateRulePayload): Promise<ApiResponse<RecommendationRuleDto>> => {
        const res = await axiosClient.post<ApiResponse<RecommendationRuleDto>>(BASE, payload);
        return res.data;
    },

    // PUT /{ruleId} — UpdateRecommendationRuleCommand(RuleId, RuleName, Description?, Priority, MatchMode)
    updateRule: async (ruleId: number, payload: UpdateRulePayload_Rec): Promise<ApiResponse<RecommendationRuleDto>> => {
        const res = await axiosClient.put<ApiResponse<RecommendationRuleDto>>(`${BASE}/${ruleId}`, payload);
        return res.data;
    },

    // DELETE /{ruleId}
    deleteRule: async (ruleId: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${BASE}/${ruleId}`);
        return res.data;
    },

    // PATCH /{ruleId}/active?isActive=bool
    toggleActive: async (ruleId: number, isActive: boolean): Promise<ApiResponse<RecommendationRuleDto>> => {
        const res = await axiosClient.patch<ApiResponse<RecommendationRuleDto>>(
            `${BASE}/${ruleId}/active`,
            null,
            { params: { isActive } }
        );
        return res.data;
    },

    // POST /{ruleId}/conditions — AddRuleConditionCommand(RuleId, QuestionId, OptionId?, Operator?, ConditionValue?)
    addCondition: async (ruleId: number, payload: AddConditionPayload): Promise<ApiResponse<RecommendationRuleConditionDto>> => {
        const res = await axiosClient.post<ApiResponse<RecommendationRuleConditionDto>>(
            `${BASE}/${ruleId}/conditions`,
            payload
        );
        return res.data;
    },

    // PUT /conditions/{conditionId} — UpdateRuleConditionCommand(ConditionId, OptionId?, Operator?, ConditionValue?)
    updateCondition: async (conditionId: number, payload: UpdateConditionPayload): Promise<ApiResponse<RecommendationRuleConditionDto>> => {
        const res = await axiosClient.put<ApiResponse<RecommendationRuleConditionDto>>(
            `${BASE}/conditions/${conditionId}`,
            payload
        );
        return res.data;
    },

    // DELETE /conditions/{conditionId}
    deleteCondition: async (conditionId: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${BASE}/conditions/${conditionId}`);
        return res.data;
    },
};
