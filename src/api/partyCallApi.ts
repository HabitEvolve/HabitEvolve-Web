import axiosClient from './axiosClient';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';
import type {
    LiveChallengeBankItemDto, ImportBankResultDto,
    LiveChallengeSessionDto, LiveChallengeDto, CreateChallengeRequest,
    LiveChallengeEvidenceDto, LiveChallengeSessionSummaryDto,
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

    judgeChallenge: async (challengeId: number, approve: boolean, overrideReason?: string | null): Promise<ApiResponse<LiveChallengeDto>> => {
        const r = await axiosClient.post<ApiResponse<LiveChallengeDto>>(
            `/party-call/challenges/${challengeId}/judge`, { mentorUserId: mid(), approve, overrideReason: overrideReason ?? null }
        );
        return r.data;
    },

    // ── Bằng chứng (Evidence) ────────────────────────────────────────────────

    /** Mentor client gắn clip + snapshot vừa record cho 1 challenge — server upload lên Supabase rồi gọi AI chấm gợi ý. */
    uploadEvidence: async (
        challengeId: number,
        params: { subjectUserId: number; clip: Blob; snapshots: Blob[]; subjectCameraOn: boolean; capturedFromUtc: string; capturedToUtc: string }
    ): Promise<ApiResponse<LiveChallengeEvidenceDto>> => {
        const form = new FormData();
        form.append('MentorUserId', String(mid()));
        form.append('SubjectUserId', String(params.subjectUserId));
        form.append('Clip', params.clip, 'evidence.webm');
        params.snapshots.forEach((s, i) => form.append('Snapshots', s, `snapshot-${i}.jpg`));
        form.append('SubjectCameraOn', String(params.subjectCameraOn));
        form.append('CapturedFromUtc', params.capturedFromUtc);
        form.append('CapturedToUtc', params.capturedToUtc);

        const r = await axiosClient.post<ApiResponse<LiveChallengeEvidenceDto>>(
            `/party-call/challenges/${challengeId}/evidence`, form,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return r.data;
    },

    getChallengeEvidence: async (challengeId: number): Promise<ApiResponse<LiveChallengeEvidenceDto | null>> => {
        const r = await axiosClient.get<ApiResponse<LiveChallengeEvidenceDto | null>>(
            `/party-call/challenges/${challengeId}/evidence`
        );
        return r.data;
    },

    /** Audit 1 buổi — mọi challenge kèm bằng chứng, verdict AI, verdict mentor, lý do override. */
    getSessionEvidence: async (sessionId: number): Promise<ApiResponse<LiveChallengeDto[]>> => {
        const r = await axiosClient.get<ApiResponse<LiveChallengeDto[]>>(
            `/party-call/sessions/${sessionId}/evidence`
        );
        return r.data;
    },

    /** Lịch sử mọi buổi Đấu Trường đã diễn ra của 1 party (Active lẫn Ended), mới → cũ. */
    getPartySessionHistory: async (
        partyId: number, pageNumber = 1, pageSize = 10
    ): Promise<PaginatedApiResponse<LiveChallengeSessionSummaryDto>> => {
        const r = await axiosClient.get<PaginatedApiResponse<LiveChallengeSessionSummaryDto>>(
            `/party-call/parties/${partyId}/sessions`, { params: { mentorUserId: mid(), pageNumber, pageSize } }
        );
        return r.data;
    },
};

export default partyCallApi;
