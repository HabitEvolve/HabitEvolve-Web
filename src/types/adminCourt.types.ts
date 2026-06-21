// ==========================================
// MODULE 11: COMMUNITY COURT (ADMIN)
// ==========================================

// Matches BE CourtCaseStatus enum exactly: Pending, Approved, Rejected, AdminResolved
export type CourtCaseStatus = "Pending" | "Approved" | "Rejected" | "AdminResolved";

// Matches BE CourtVoteDto
export interface VoteDto {
    voteId: number;
    reviewerUserId: number;
    vote: string;
    reasonCode: string | null;
    votedAt: string;
    wasCorrect: boolean | null;
    karmaEarned: number;
}

// Matches BE CourtCaseDto
export interface CourtCaseDto {
    caseId: number;
    proofId: number;
    questId: number | null;
    dailyTaskId: number | null;
    partyId: number | null;
    proofOwnerUserId: number;
    questTitleMasked: string;
    proofType: "PHOTO" | "VIDEO" | "GPS" | "SCREENSHOT" | string;
    mediaUrls: string[];
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

// POST /admin/court/{caseId}/resolve
// Matches BE AdminResolveRequest: Verdict (string), AdminNote (string?)
export interface ResolveVerdictPayload {
    verdict: "Approved" | "Rejected";
    adminNote?: string;
}

// Matches BE KarmaLeaderboardEntryDto
export interface KarmaLeaderboardDto {
    userId: number;
    totalKarma: number;
    rank: number;
}
