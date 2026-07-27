// "Đấu Trường Trực Tiếp" (Live Challenge Arena) — video call WebRTC PvP, Mentor làm trọng tài.

export type ChallengeMode = 'SELF_SCORE' | 'ATTACK';
export type ChallengeStatus = 'Pending' | 'Responded' | 'Approved' | 'Rejected';

export interface LiveChallengeBankItemDto {
    bankItemId: number;
    mentorUserId: number;
    promptText: string;
    mode: ChallengeMode;
    points: number;
    createdAt: string;
}

export interface ImportBankResultDto {
    imported: number;
    skipped: number;
    errors: string[];
}

export interface LiveSessionParticipantDto {
    userId: number;
    username: string;
    score: number;
    finalRank: number | null;
    mGoldAwarded: number;
}

export interface LiveChallengeDto {
    challengeId: number;
    sessionId: number;
    bankItemId: number | null;
    mode: ChallengeMode;
    promptText: string;
    points: number;
    assignedToUserId: number | null;
    rivalUserId: number | null;
    status: ChallengeStatus;
    respondedByUserId: number | null;
    createdAt: string;
    respondedAt: string | null;
    judgedAt: string | null;
}

export interface LiveChallengeSessionDto {
    sessionId: number;
    partyId: number;
    mentorUserId: number;
    status: 'Active' | 'Ended';
    startedAt: string;
    endedAt: string | null;
    participants: LiveSessionParticipantDto[];
    challenges: LiveChallengeDto[];
}

export interface CreateChallengeRequest {
    bankItemId?: number | null;
    mode?: ChallengeMode | null;
    promptText?: string | null;
    points?: number | null;
    assignedToUserId?: number | null;
    rivalUserId?: number | null;
}
