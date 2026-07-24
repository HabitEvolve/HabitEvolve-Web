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

export type AppealDecision = "accept" | "reject";

export interface ResolveAppealPayload {
  decision: AppealDecision;
  adminNote?: string;
}
