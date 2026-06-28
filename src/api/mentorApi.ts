import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    SubscriptionPackageDto, ActiveSubscriptionDto,
    PurchaseSubscriptionRequest, PurchaseSubscriptionResultDto, MentorSubscriptionDto,
    MentorWalletDto, TopUpGemsRequest, TopUpGemsResultDto, GemTransactionDto,
    QuestDto, QuestDetailDto, MentorQuestRangeDto,
    CreateMentorQuestRequest, CreatePartyQuestRequest, CreatePartyQuestResultDto,
    ProofDto,
    BossTemplateDto, RegisterWeeklyBossRequest, WeeklyBossRegisterResultDto,
    WeeklyBossStatusDto, RaidActivityDto, SharedHpDto, WeeklyChestDto,
} from '../types/mentor.types';

const mid = (): number => {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : 0;
};

const mentorApi = {
    // ── SUBSCRIPTIONS ────────────────────────────────────────────────────────
    getSubscriptionPackages: async (): Promise<ApiResponse<SubscriptionPackageDto[]>> => {
        const r = await axiosClient.get<ApiResponse<SubscriptionPackageDto[]>>('/packages');
        return r.data;
    },

    getActiveSubscription: async (): Promise<ApiResponse<ActiveSubscriptionDto>> => {
        const r = await axiosClient.get<ApiResponse<ActiveSubscriptionDto>>(
            '/mentor/subscriptions/active', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    purchaseSubscription: async (
        payload: PurchaseSubscriptionRequest
    ): Promise<ApiResponse<PurchaseSubscriptionResultDto>> => {
        const r = await axiosClient.post<ApiResponse<PurchaseSubscriptionResultDto>>(
            '/mentor/subscriptions/purchase', payload
        );
        return r.data;
    },

    cancelSubscription: async (
        subscriptionId: number
    ): Promise<ApiResponse<MentorSubscriptionDto>> => {
        const r = await axiosClient.post<ApiResponse<MentorSubscriptionDto>>(
            `/mentor/subscriptions/${subscriptionId}/cancel`,
            null,
            { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    // ── WALLET ───────────────────────────────────────────────────────────────
    getWallet: async (): Promise<ApiResponse<MentorWalletDto>> => {
        const r = await axiosClient.get<ApiResponse<MentorWalletDto>>(
            '/mentor/wallet', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    topUpGems: async (payload: TopUpGemsRequest): Promise<ApiResponse<TopUpGemsResultDto>> => {
        const r = await axiosClient.post<ApiResponse<TopUpGemsResultDto>>(
            '/mentor/wallet/topup', payload
        );
        return r.data;
    },

    getWalletTransactions: async (): Promise<ApiResponse<GemTransactionDto[]>> => {
        const r = await axiosClient.get<ApiResponse<GemTransactionDto[]>>(
            '/mentor/wallet/transactions', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    // ── QUESTS ───────────────────────────────────────────────────────────────
    getMentorQuests: async (partyId?: number): Promise<ApiResponse<QuestDto[]>> => {
        const params: Record<string, unknown> = { mentorUserId: mid() };
        if (partyId) params.partyId = partyId;
        const r = await axiosClient.get<ApiResponse<QuestDto[]>>('/mentorquest/mentor', { params });
        return r.data;
    },

    getQuestDetail: async (questId: number): Promise<ApiResponse<QuestDetailDto>> => {
        const r = await axiosClient.get<ApiResponse<QuestDetailDto>>(
            `/mentorquest/${questId}/detail`
        );
        return r.data;
    },

    getRewardRanges: async (): Promise<ApiResponse<MentorQuestRangeDto[]>> => {
        const r = await axiosClient.get<ApiResponse<MentorQuestRangeDto[]>>(
            '/mentorquest/reward-ranges'
        );
        return r.data;
    },

    createMentorQuest: async (
        payload: CreateMentorQuestRequest
    ): Promise<ApiResponse<QuestDto>> => {
        const r = await axiosClient.post<ApiResponse<QuestDto>>('/mentorquest/mentor', payload);
        return r.data;
    },

    createPartyQuest: async (
        payload: CreatePartyQuestRequest
    ): Promise<ApiResponse<CreatePartyQuestResultDto>> => {
        const r = await axiosClient.post<ApiResponse<CreatePartyQuestResultDto>>(
            '/mentorquest/party', payload
        );
        return r.data;
    },

    getPartyQuests: async (partyId: number): Promise<ApiResponse<QuestDto[]>> => {
        const r = await axiosClient.get<ApiResponse<QuestDto[]>>(
            `/mentorquest/party/${partyId}`
        );
        return r.data;
    },

    deleteMentorQuest: async (questId: number): Promise<ApiResponse<boolean>> => {
        const r = await axiosClient.delete<ApiResponse<boolean>>(
            `/mentorquest/${questId}/mentor`, { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    patchQuestMandatory: async (
        questId: number, isMandatory: boolean
    ): Promise<ApiResponse<QuestDto>> => {
        const r = await axiosClient.patch<ApiResponse<QuestDto>>(
            `/mentorquest/${questId}/mandatory`,
            { mentorUserId: mid(), isMandatory }
        );
        return r.data;
    },

    approveQuest: async (questId: number): Promise<ApiResponse<QuestDto>> => {
        const r = await axiosClient.post<ApiResponse<QuestDto>>(
            `/mentorquest/${questId}/approve`,
            null,
            { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    rejectQuest: async (questId: number, reason?: string): Promise<ApiResponse<QuestDto>> => {
        const r = await axiosClient.post<ApiResponse<QuestDto>>(
            `/mentorquest/${questId}/reject`, { reason }
        );
        return r.data;
    },

    // ── PROOF QUEUE ──────────────────────────────────────────────────────────
    getProofQueue: async (): Promise<ApiResponse<ProofDto[]>> => {
        const r = await axiosClient.get<ApiResponse<ProofDto[]>>(
            '/mentor/proofs/queue', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    getAiProofQueue: async (): Promise<ApiResponse<ProofDto[]>> => {
        const r = await axiosClient.get<ApiResponse<ProofDto[]>>(
            '/mentor/proofs/ai-queue', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    approveProof: async (proofId: number): Promise<ApiResponse<ProofDto>> => {
        const r = await axiosClient.post<ApiResponse<ProofDto>>(
            `/mentor/proofs/${proofId}/approve`,
            null,
            { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    rejectProof: async (
        proofId: number, reason?: string
    ): Promise<ApiResponse<ProofDto>> => {
        const r = await axiosClient.post<ApiResponse<ProofDto>>(
            `/mentor/proofs/${proofId}/reject`, { reason }
        );
        return r.data;
    },

    simulateAiVerdict: async (
        proofId: number, verdict: 'approve' | 'reject' | 'suspicious'
    ): Promise<ApiResponse<ProofDto>> => {
        const r = await axiosClient.post<ApiResponse<ProofDto>>(
            `/proofs/${proofId}/ai-verdict`, { verdict }
        );
        return r.data;
    },

    // ── BOSS RAID ────────────────────────────────────────────────────────────
    getCurrentBoss: async (): Promise<ApiResponse<BossTemplateDto>> => {
        const r = await axiosClient.get<ApiResponse<BossTemplateDto>>('/weekly-boss/current');
        return r.data;
    },

    registerBossRaid: async (
        payload: RegisterWeeklyBossRequest
    ): Promise<ApiResponse<WeeklyBossRegisterResultDto>> => {
        const r = await axiosClient.post<ApiResponse<WeeklyBossRegisterResultDto>>(
            '/weekly-boss/register', payload
        );
        return r.data;
    },

    getPartyBossStatus: async (partyId: number): Promise<ApiResponse<WeeklyBossStatusDto>> => {
        const r = await axiosClient.get<ApiResponse<WeeklyBossStatusDto>>(
            `/weekly-boss/party/${partyId}/status`
        );
        return r.data;
    },

    getPartyActivity: async (
        partyId: number, limit = 20
    ): Promise<ApiResponse<RaidActivityDto[]>> => {
        const r = await axiosClient.get<ApiResponse<RaidActivityDto[]>>(
            `/weekly-boss/party/${partyId}/activity`, { params: { limit } }
        );
        return r.data;
    },

    // ── SHARED HP ────────────────────────────────────────────────────────────
    getSharedHp: async (raidId: number): Promise<ApiResponse<SharedHpDto>> => {
        const r = await axiosClient.get<ApiResponse<SharedHpDto>>(
            `/raids/${raidId}/shared-hp`
        );
        return r.data;
    },

    // ── WEEKLY CHEST ─────────────────────────────────────────────────────────
    getWeeklyChest: async (partyId: number): Promise<ApiResponse<WeeklyChestDto>> => {
        const r = await axiosClient.get<ApiResponse<WeeklyChestDto>>(
            `/weekly-boss/party/${partyId}/weekly-chest`,
            { params: { userId: mid() } }
        );
        return r.data;
    },

    claimWeeklyChest: async (partyId: number): Promise<ApiResponse<WeeklyChestDto>> => {
        const r = await axiosClient.post<ApiResponse<WeeklyChestDto>>(
            `/weekly-boss/party/${partyId}/weekly-chest/claim`,
            { userId: mid() }
        );
        return r.data;
    },
};

export default mentorApi;
