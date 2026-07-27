// ==========================================
// MODULE 11: COMMUNITY COURT (ADMIN)
// ==========================================

// Matches BE CourtCaseStatus enum exactly: Pending, Approved, Rejected, AdminResolved, ExpiredAutoApproved
export type CourtCaseStatus = "Pending" | "Approved" | "Rejected" | "AdminResolved" | "ExpiredAutoApproved";

// Matches BE CourtVoteDto
export interface VoteDto {
    voteId: number;
    reviewerUserId: number;
    /** Admin-only — real reviewer username. */
    reviewerUsername: string;
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
    partyId: number | null;
    proofOwnerUserId: number;
    /** Admin-only — real proof submitter username. */
    proofOwnerUsername: string;
    questTitleMasked: string;
    /** Admin-only — real, unmasked quest title (falls back to null if quest lookup failed). */
    questTitle: string | null;
    proofType: "PHOTO" | "VIDEO" | "GPS" | "SCREENSHOT" | string;
    mediaUrls: string[];
    /** Unblurred original media URLs — admin-only. */
    originalMediaUrls: string[];
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
    /** AI assessment that routed this proof to Court — null if AI wasn't used. */
    aiVerdict: "approve" | "reject" | "suspicious" | null;
    aiConfidence: number | null;
    aiVerdictRaw: string | null;
    aiVerdictFinal: string | null;
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
    username: string;
    totalKarma: number;
    karmaTier: string;
    rank: number;
}
