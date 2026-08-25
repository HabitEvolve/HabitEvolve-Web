export type AppealStatus = "Pending" | "Accepted" | "Rejected" | string;

export interface AppealDto {
  appealId: number;
  proofId: number;
  userId: number;
  reason: string;
  status: AppealStatus;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * A row of the admin appeal queue (`GET /api/admin/appeals/queue`).
 *
 * Extends the bare appeal with the context needed to actually rule on it — who appealed, which quest,
 * why the proof was rejected and the evidence itself. Every context field is optional because a
 * dangling proof/quest reference must still leave the appeal visible and resolvable.
 */
export interface AppealQueueItemDto extends AppealDto {
  username?: string | null;

  questId?: number | null;
  questTitle?: string | null;
  questType?: string | null;

  /** Reason recorded on the proof — the mentor's words, or "Community Court: invalid proof". */
  rejectReason?: string | null;
  /** AUTO | AI | MENTOR | COURT — who turned it down. */
  reviewRoute?: string | null;
  reviewedAt?: string | null;

  proofType?: string | null;
  /** Unblurred originals — the admin is the final arbiter, unlike Community Court reviewers. */
  mediaUrls?: string[];
  textNote?: string | null;
  submittedAt?: string | null;

  aiConfidence?: number | null;
  aiReasoning?: string | null;
}

export type AppealDecision = "accept" | "reject";

export interface ResolveAppealPayload {
  decision: AppealDecision;
  adminNote?: string;
}
