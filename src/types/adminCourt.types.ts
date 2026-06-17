
// MODULE 23: COMMUNITY COURT (ADMIN)
export type CourtCaseStatus = "Pending" | "ValidApprove" | "FraudReject" | "AdminOverride" | "Expired" | "Approved" | "Rejected";

export interface VoteDto {
    voteId: number;
    reviewerUserId: number;
    vote: string;
    reasonCode: string | null;
    votedAt: string;
    wasCorrect: boolean | null;
    karmaEarned: number;
}

export interface CourtCaseDto {
    caseId: number;
    proofId: number;
    questId: number;
    dailyTaskId: number | null;
    partyId: number | null;
    proofOwnerUserId: number;
    questTitleMasked: string;
    proofType: "PHOTO" | "VIDEO" | "GPS" | "SCREENSHOT" | string;
    mediaUrls: string[]; // Mảng chứa ảnh/video
    textNote: string | null;
    status: CourtCaseStatus;
    validVotes: number;
    fraudVotes: number;
    expiresAt: string;
    createdAt: string;
    resolvedAt: string | null;
    adminNote: string | null;
    hasVoted: boolean | null;
    votes: VoteDto[];
}

export interface ResolveVerdictPayload {
    verdict: "Approved" | "Rejected";
    adminNote: string;
}

export interface KarmaLeaderboardDto {
    userId: number;
    totalKarma: number;
    rank: number;
}