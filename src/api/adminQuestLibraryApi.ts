import axiosClient from './axiosClient';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';
import type {
    QuestLibraryItemDto,
    CreateQuestLibraryItemPayload,
    UpdateQuestLibraryItemPayload,
    ChangeQuestLibraryStatusPayload,
    SetRewardMatrixPayload,
    SetPersonalizationPayload,
    ToggleGlobalPayload,
    SetRequiredThresholdPayload,
    GetQuestLibraryParams,
} from '../types/adminQuestLibrary.types';

const BASE = '/admin/quest-library';

export const adminQuestLibraryApi = {
    // GET /api/admin/quest-library?pageNumber=&pageSize=&status=&difficulty=&goalId=
    // Returns PagedResponse (which extends ApiResponse) — data field is the items array.
    // Was previously hardcoding pageNumber:1/pageSize:100 and discarding the pagination
    // metadata entirely — callers now get the real page and totalPages back.
    getItems: async (params?: GetQuestLibraryParams): Promise<PaginatedApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.get<PaginatedApiResponse<QuestLibraryItemDto>>(BASE, {
            params: {
                pageNumber: params?.pageNumber ?? 1,
                pageSize: params?.pageSize ?? 20,
                search: params?.search,
                status: params?.status,
                difficulty: params?.difficulty,
                goalId: params?.goalId,
                isGlobal: params?.isGlobal,
            },
        });
        return res.data;
    },

    // GET /api/admin/quest-library/{id}
    getById: async (id: number): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.get<ApiResponse<QuestLibraryItemDto>>(`${BASE}/${id}`);
        return res.data;
    },

    // POST /api/admin/quest-library
    create: async (payload: CreateQuestLibraryItemPayload): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.post<ApiResponse<QuestLibraryItemDto>>(BASE, payload);
        return res.data;
    },

    // PUT /api/admin/quest-library/{id}
    // BE validates that id == payload.templateId
    update: async (id: number, payload: UpdateQuestLibraryItemPayload): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.put<ApiResponse<QuestLibraryItemDto>>(`${BASE}/${id}`, payload);
        return res.data;
    },

    // PATCH /api/admin/quest-library/{id}/status
    // payload.action: "publish" | "archive"
    changeStatus: async (id: number, payload: ChangeQuestLibraryStatusPayload): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.patch<ApiResponse<QuestLibraryItemDto>>(`${BASE}/${id}/status`, payload);
        return res.data;
    },

    // DELETE /api/admin/quest-library/{id}
    deleteItem: async (id: number): Promise<ApiResponse<void>> => {
        const res = await axiosClient.delete<ApiResponse<void>>(`${BASE}/${id}`);
        return res.data;
    },

    // POST /api/admin/quest-library/{id}/reward-matrix
    // Sets flat reward values (Gold, BonusGold, Xp, Gems) — not per-difficulty
    setRewardMatrix: async (id: number, payload: SetRewardMatrixPayload): Promise<ApiResponse<object>> => {
        const res = await axiosClient.post<ApiResponse<object>>(`${BASE}/${id}/reward-matrix`, payload);
        return res.data;
    },

    // POST /api/admin/quest-library/{id}/personalization
    // Replaces the full goalIds mapping list
    setPersonalization: async (id: number, payload: SetPersonalizationPayload): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.post<ApiResponse<QuestLibraryItemDto>>(`${BASE}/${id}/personalization`, payload);
        return res.data;
    },

    // PATCH /api/admin/quest-library/{id}/global
    toggleGlobal: async (id: number, payload: ToggleGlobalPayload): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.patch<ApiResponse<QuestLibraryItemDto>>(`${BASE}/${id}/global`, payload);
        return res.data;
    },

    // POST /api/admin/quest-library/{id}/required-threshold
    setRequiredThreshold: async (id: number, payload: SetRequiredThresholdPayload): Promise<ApiResponse<QuestLibraryItemDto>> => {
        const res = await axiosClient.post<ApiResponse<QuestLibraryItemDto>>(`${BASE}/${id}/required-threshold`, payload);
        return res.data;
    },
};
