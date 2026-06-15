import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    TargetCalculationRuleDto,
    TargetCalculationRulePayload
} from '../types/adminGoal.types';

const TARGET_RULE_URL = '/admin/target-calculation-rules';

const mapCalculationMethodToInt = (methodString: string) => {
    switch (methodString) {
        case "None": return 0;
        case "PercentageReduce": return 1;
        case "FixedAdd": return 2;
        case "FixedSubtract": return 3;
        default: return 0; // Fallback an toàn
    }
};

export const adminTargetRuleApi = {
    // 1. Lấy toàn bộ danh sách quy tắc tính toán
    getRules: async (): Promise<ApiResponse<TargetCalculationRuleDto[]>> => {
        const res = await axiosClient.get<ApiResponse<TargetCalculationRuleDto[]>>(TARGET_RULE_URL);
        return res.data;
    },

    // 2. Lấy chi tiết 1 quy tắc (dùng khi mở Modal Edit)
    getRuleById: async (id: number): Promise<ApiResponse<TargetCalculationRuleDto>> => {
        const res = await axiosClient.get<ApiResponse<TargetCalculationRuleDto>>(`${TARGET_RULE_URL}/${id}`);
        return res.data;
    },

    createRule: async (payload: TargetCalculationRulePayload): Promise<ApiResponse<TargetCalculationRuleDto>> => {
        // Ép kiểu CalculationMethod thành số trước khi gửi
        const safePayload = {
            ...payload,
            calculationMethod: mapCalculationMethodToInt(payload.calculationMethod as string) as any
        };
        const res = await axiosClient.post<ApiResponse<TargetCalculationRuleDto>>(TARGET_RULE_URL, safePayload);
        return res.data;
    },
    updateRule: async (id: number, payload: TargetCalculationRulePayload): Promise<ApiResponse<any>> => {
        // Ép kiểu CalculationMethod thành số trước khi gửi
        const safePayload = {
            ...payload,
            calculationMethod: mapCalculationMethodToInt(payload.calculationMethod as string) as any
        };
        const res = await axiosClient.put<ApiResponse<any>>(`${TARGET_RULE_URL}/${id}`, safePayload);
        return res.data;
    },

    // 5. Xóa (hoặc vô hiệu hóa) quy tắc
    deleteRule: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${TARGET_RULE_URL}/${id}`);
        return res.data;
    }
};