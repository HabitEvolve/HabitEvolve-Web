import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    LiveChallengeBankItemDto, ImportBankResultDto,
    LiveChallengeSessionDto, LiveChallengeDto, CreateChallengeRequest,
} from '../types/partyCall.types';

const mid = (): number => {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : 0;
};

const partyCallApi = {
    // ── Ngân hàng câu hỏi ────────────────────────────────────────────────────
    getBankItems: async (): Promise<ApiResponse<LiveChallengeBankItemDto[]>> => {
        const r = await axiosClient.get<ApiResponse<LiveChallengeBankItemDto[]>>(
            `/party-call/mentors/${mid()}/question-bank`
        );
        return r.data;
    },

    addBankItem: async (promptText: string, mode: string, points: number): Promise<ApiResponse<LiveChallengeBankItemDto>> => {
        const r = await axiosClient.post<ApiResponse<LiveChallengeBankItemDto>>(
            `/party-call/mentors/${mid()}/question-bank`, { promptText, mode, points }
        );
        return r.data;
    },

    importBankItems: async (file: File): Promise<ApiResponse<ImportBankResultDto>> => {
        const form = new FormData();
        form.append('file', file);
        const r = await axiosClient.post<ApiResponse<ImportBankResultDto>>(
            `/party-call/mentors/${mid()}/question-bank/import`, form,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return r.data;
    },

    deleteBankItem: async (bankItemId: number): Promise<ApiResponse<boolean>> => {
        const r = await axiosClient.delete<ApiResponse<boolean>>(
            `/party-call/question-bank/${bankItemId}`, { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    // ── Vòng đời buổi Đấu Trường ─────────────────────────────────────────────
    createSession: async (partyId: number): Promise<ApiResponse<LiveChallengeSessionDto>> => {
        const r = await axiosClient.post<ApiResponse<LiveChallengeSessionDto>>(
            '/party-call/sessions', { mentorUserId: mid(), partyId }
        );
        return r.data;
    },

    getSessionStatus: async (sessionId: number): Promise<ApiResponse<LiveChallengeSessionDto>> => {
        const r = await axiosClient.get<ApiResponse<LiveChallengeSessionDto>>(`/party-call/sessions/${sessionId}`);
        return r.data;
    },

    getActiveSessionByParty: async (partyId: number): Promise<ApiResponse<LiveChallengeSessionDto | null>> => {
        const r = await axiosClient.get<ApiResponse<LiveChallengeSessionDto | null>>(
            '/party-call/sessions/active', { params: { partyId } }
        );
        return r.data;
    },

    endSession: async (sessionId: number): Promise<ApiResponse<LiveChallengeSessionDto>> => {
        const r = await axiosClient.post<ApiResponse<LiveChallengeSessionDto>>(
            `/party-call/sessions/${sessionId}/end`, null, { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    // ── Vòng đời 1 thử thách ─────────────────────────────────────────────────
    createChallenge: async (sessionId: number, req: CreateChallengeRequest): Promise<ApiResponse<LiveChallengeDto>> => {
        const r = await axiosClient.post<ApiResponse<LiveChallengeDto>>(
            `/party-call/sessions/${sessionId}/challenges`, { mentorUserId: mid(), ...req }
        );
        return r.data;
    },

    judgeChallenge: async (challengeId: number, approve: boolean): Promise<ApiResponse<LiveChallengeDto>> => {
        const r = await axiosClient.post<ApiResponse<LiveChallengeDto>>(
            `/party-call/challenges/${challengeId}/judge`, { mentorUserId: mid(), approve }
        );
        return r.data;
    },
};

export default partyCallApi;
