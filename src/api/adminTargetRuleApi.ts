import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { TargetCalculationRuleDto, UpdateRulePayload, TargetCalculationRulePayload } from '../types/adminGoal.types';

const TARGET_RULE_URL = '/admin/target-calculation-rules';

export const adminTargetRuleApi = {
    // GET /admin/target-calculation-rules
    getRules: async (): Promise<ApiResponse<TargetCalculationRuleDto[]>> => {
        const res = await axiosClient.get<ApiResponse<TargetCalculationRuleDto[]>>(TARGET_RULE_URL);
        return res.data;
    },

    // POST /admin/target-calculation-rules
    // Matches BE CreateRuleRequest: MeasurementType, Difficulty, CalculationMethod, ChangeValue, MinValue?, MaxValue?, Description?, Example?, GoalId?
    createRule: async (payload: TargetCalculationRulePayload): Promise<ApiResponse<TargetCalculationRuleDto>> => {
        const res = await axiosClient.post<ApiResponse<TargetCalculationRuleDto>>(TARGET_RULE_URL, payload);
        return res.data;
    },

    // DELETE /admin/target-calculation-rules/{id}
    deleteRule: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${TARGET_RULE_URL}/${id}`);
        return res.data;
    },

    // GET /admin/target-calculation-rules/{id}
    getRuleById: async (id: number): Promise<ApiResponse<TargetCalculationRuleDto>> => {
        const res = await axiosClient.get<ApiResponse<TargetCalculationRuleDto>>(`${TARGET_RULE_URL}/${id}`);
        return res.data;
    },

    // PUT /admin/target-calculation-rules/{id}
    // Matches BE UpdateRuleRequest: CalculationMethod, ChangeValue, MinValue, MaxValue, Description, Example
    // measurementType and difficulty are NOT updatable via this endpoint
    updateRule: async (id: number, payload: UpdateRulePayload): Promise<ApiResponse<any>> => {
        const res = await axiosClient.put<ApiResponse<any>>(`${TARGET_RULE_URL}/${id}`, payload);
        return res.data;
    },

    // PATCH /admin/target-calculation-rules/{id}/active?isActive=bool
    toggleActive: async (id: number, isActive: boolean): Promise<ApiResponse<any>> => {
        const res = await axiosClient.patch<ApiResponse<any>>(`${TARGET_RULE_URL}/${id}/active`, null, {
            params: { isActive }
        });
        return res.data;
    }
};
