import axiosClient from './axiosClient';
import {
    ApiResponse,
    PaginatedApiResponse,
    PartyItem,
    PartyMember,
    JoinRequestItem,
    CreatePartyPayload,
    UpdatePartyPayload,
} from '../types/api.types';
import { UserQuestDto } from '../types/userWorkspace.types';
import { AdminGetPartiesQueryParams, AdminTransferMentorPayload, PartyRaidDto } from '../types/adminParty.types';

const ADMIN_PARTY_URL = '/admin/parties';

// Admin-scoped party management — unlike mentorPartyApi.ts, none of these need a
// mentorUserId injected client-side: the BE controller resolves the party's real
// owner server-side before delegating to the same mentor-facing commands.
const adminPartyApi = {
    // GET /admin/parties?pageNumber=&pageSize=&search=&status=&mentorUserId=
    getParties: async (params?: AdminGetPartiesQueryParams): Promise<PaginatedApiResponse<PartyItem>> => {
        const response = await axiosClient.get<PaginatedApiResponse<PartyItem>>(ADMIN_PARTY_URL, { params });
        return response.data;
    },

    // GET /admin/parties/{partyId}
    getPartyById: async (partyId: number): Promise<ApiResponse<PartyItem>> => {
        const response = await axiosClient.get<ApiResponse<PartyItem>>(`${ADMIN_PARTY_URL}/${partyId}`);
        return response.data;
    },

    // GET /admin/parties/{partyId}/members
    getMembers: async (partyId: number): Promise<ApiResponse<PartyMember[]>> => {
        const response = await axiosClient.get<ApiResponse<PartyMember[]>>(`${ADMIN_PARTY_URL}/${partyId}/members`);
        return response.data;
    },

    // GET /admin/parties/{partyId}/join-requests
    getJoinRequests: async (partyId: number): Promise<ApiResponse<JoinRequestItem[]>> => {
        const response = await axiosClient.get<ApiResponse<JoinRequestItem[]>>(`${ADMIN_PARTY_URL}/${partyId}/join-requests`);
        return response.data;
    },

    // GET /admin/parties/{partyId}/quests?limit=
    getQuests: async (partyId: number, limit?: number): Promise<ApiResponse<UserQuestDto[]>> => {
        const response = await axiosClient.get<ApiResponse<UserQuestDto[]>>(`${ADMIN_PARTY_URL}/${partyId}/quests`, { params: { limit } });
        return response.data;
    },

    // GET /admin/parties/{partyId}/raids
    getRaids: async (partyId: number): Promise<ApiResponse<PartyRaidDto[]>> => {
        const response = await axiosClient.get<ApiResponse<PartyRaidDto[]>>(`${ADMIN_PARTY_URL}/${partyId}/raids`);
        return response.data;
    },

    // POST /admin/parties  (body: mentorUserId, name, description, joinPolicy)
    createParty: async (payload: CreatePartyPayload): Promise<ApiResponse<PartyItem>> => {
        const response = await axiosClient.post<ApiResponse<PartyItem>>(ADMIN_PARTY_URL, payload);
        return response.data;
    },

    // PUT /admin/parties/{partyId}  (body: name, description, joinPolicy)
    updateParty: async (partyId: number, payload: UpdatePartyPayload): Promise<ApiResponse<PartyItem>> => {
        const response = await axiosClient.put<ApiResponse<PartyItem>>(`${ADMIN_PARTY_URL}/${partyId}`, payload);
        return response.data;
    },

    // DELETE /admin/parties/{partyId}  (disband)
    disbandParty: async (partyId: number): Promise<ApiResponse<boolean>> => {
        const response = await axiosClient.delete<ApiResponse<boolean>>(`${ADMIN_PARTY_URL}/${partyId}`);
        return response.data;
    },

    // POST /admin/parties/{partyId}/transfer-mentor
    transferMentor: async (partyId: number, payload: AdminTransferMentorPayload): Promise<ApiResponse<PartyItem>> => {
        const response = await axiosClient.post<ApiResponse<PartyItem>>(`${ADMIN_PARTY_URL}/${partyId}/transfer-mentor`, payload);
        return response.data;
    },

    // POST /admin/parties/{partyId}/invite-code
    generateInviteCode: async (partyId: number): Promise<ApiResponse<string>> => {
        const response = await axiosClient.post<ApiResponse<string>>(`${ADMIN_PARTY_URL}/${partyId}/invite-code`);
        return response.data;
    },

    // DELETE /admin/parties/{partyId}/members/{userId}
    removeMember: async (partyId: number, userId: number): Promise<ApiResponse<boolean>> => {
        const response = await axiosClient.delete<ApiResponse<boolean>>(`${ADMIN_PARTY_URL}/${partyId}/members/${userId}`);
        return response.data;
    },

    // POST /admin/parties/{partyId}/join-requests/{requestId}/approve
    approveJoinRequest: async (partyId: number, requestId: number): Promise<ApiResponse<JoinRequestItem>> => {
        const response = await axiosClient.post<ApiResponse<JoinRequestItem>>(`${ADMIN_PARTY_URL}/${partyId}/join-requests/${requestId}/approve`);
        return response.data;
    },

    // POST /admin/parties/{partyId}/join-requests/{requestId}/reject
    rejectJoinRequest: async (partyId: number, requestId: number): Promise<ApiResponse<JoinRequestItem>> => {
        const response = await axiosClient.post<ApiResponse<JoinRequestItem>>(`${ADMIN_PARTY_URL}/${partyId}/join-requests/${requestId}/reject`);
        return response.data;
    },
};

export default adminPartyApi;
