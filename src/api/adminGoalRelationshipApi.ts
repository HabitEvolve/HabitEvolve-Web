import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
    GoalRelationshipDto,
    CreateGoalRelationshipPayload,
    UpdateGoalRelationshipPayload,
} from '../types/adminGoal.types';

const BASE = '/admin/goal-relationships';

// ==========================================
// GOAL RELATIONSHIP CRUD
// Controller: GoalRelationshipController  [Route("api/admin/goal-relationships")]
//
//   GET    /admin/goal-relationships       → list all pairs
//   POST   /admin/goal-relationships       → create
//   PUT    /admin/goal-relationships/{id}  → update (relationType/reasonText only)
//   DELETE /admin/goal-relationships/{id}  → delete
// ==========================================
export const adminGoalRelationshipApi = {
    // GET — no filters, BE returns the full list
    getAll: async (): Promise<ApiResponse<GoalRelationshipDto[]>> => {
        const res = await axiosClient.get<ApiResponse<GoalRelationshipDto[]>>(BASE);
        return res.data;
    },

    // POST — CreateGoalRelationshipCommand(GoalId, RelatedGoalId, RelationType, ReasonText?)
    create: async (payload: CreateGoalRelationshipPayload): Promise<ApiResponse<GoalRelationshipDto>> => {
        const res = await axiosClient.post<ApiResponse<GoalRelationshipDto>>(BASE, payload);
        return res.data;
    },

    // PUT /{id} — UpdateGoalRelationshipCommand(Id, RelationType, ReasonText?)
    update: async (id: number, payload: UpdateGoalRelationshipPayload): Promise<ApiResponse<GoalRelationshipDto>> => {
        const res = await axiosClient.put<ApiResponse<GoalRelationshipDto>>(`${BASE}/${id}`, payload);
        return res.data;
    },

    // DELETE /{id}
    delete: async (id: number): Promise<ApiResponse<any>> => {
        const res = await axiosClient.delete<ApiResponse<any>>(`${BASE}/${id}`);
        return res.data;
    },
};
