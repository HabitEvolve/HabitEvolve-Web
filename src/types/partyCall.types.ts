// "Đấu Trường Trực Tiếp" (Live Challenge Arena) — video call WebRTC PvP, Mentor làm trọng tài.

export type ChallengeMode = 'SELF_SCORE' | 'ATTACK';
export type ChallengeStatus = 'Pending' | 'Started' | 'Responded' | 'Approved' | 'Rejected';

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

/** NotRequired | Pending | Captured | Missing | Failed */
export type EvidenceStatus = 'NotRequired' | 'Pending' | 'Captured' | 'Missing' | 'Failed';

/** NotUsed | AiChecking | Approved | Suspicious | Rejected — AI gợi ý, KHÔNG BAO GIỜ tự duyệt/từ chối. */
export type AiEvidenceStatus = 'NotUsed' | 'AiChecking' | 'Approved' | 'Suspicious' | 'Rejected';

/** Bằng chứng ghi hình cho 1 challenge — mentor client tự record, gắn qua POST /challenges/{id}/evidence. */
export interface LiveChallengeEvidenceDto {
    evidenceId: number;
    challengeId: number;
    subjectUserId: number;
    subjectUsername: string;
    kind: 'CLIP' | 'SNAPSHOT';
    mediaUrl: string;
    snapshotUrls: string[];
    durationSeconds: number;
    subjectCameraOn: boolean;
    aiStatus: AiEvidenceStatus;
    aiConfidence: number | null;
    aiReasoning: string | null;
    capturedFromUtc: string;
    capturedToUtc: string;
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
    requiresEvidence: boolean;
    evidenceStatus: EvidenceStatus;
    responseSeconds: number | null;
    judgeOverrideReason: string | null;
    evidence: LiveChallengeEvidenceDto | null;
    startedByUserId: number | null;
    startedAt: string | null;
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

/** 1 dòng trong lịch sử "mọi buổi Đấu Trường đã diễn ra của 1 party" — GET /parties/{partyId}/sessions. */
export interface LiveChallengeSessionSummaryDto {
    sessionId: number;
    partyId: number;
    status: 'Active' | 'Ended';
    startedAt: string;
    endedAt: string | null;
    participantCount: number;
    challengeCount: number;
    approvedChallengeCount: number;
    evidenceCapturedCount: number;
    overrideCount: number;
    topParticipants: LiveSessionParticipantDto[];
}

export interface CreateChallengeRequest {
    bankItemId?: number | null;
    mode?: ChallengeMode | null;
    promptText?: string | null;
    points?: number | null;
    assignedToUserId?: number | null;
    rivalUserId?: number | null;
    requiresEvidence?: boolean | null;
}
