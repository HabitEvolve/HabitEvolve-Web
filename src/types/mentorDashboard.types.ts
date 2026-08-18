// ==========================================
// MENTOR DASHBOARD — "Guild Master Hub"
// Synced against BE: HabitEvolve.Application.Features.Party.Queries.GetMentorDashboardSummary +
// HabitEvolve.API.Controllers.MentorDashboardController (GET /api/mentor/dashboard/summary).
//
// Unlike the rest of mentorApi.ts, this endpoint is [Authorize(Roles="MENTOR")] and resolves
// mentorUserId from the JWT server-side — no mentorUserId param is sent from the client.
// ==========================================

export interface GuildStatusDto {
    totalManagedParties: number;
    totalPartyMembers: number;
}

export interface UrgentAlertsDto {
    playersLosingStreak: number;
    partiesLowSharedHp: number;
}

// Itemized version of UrgentAlertsDto.playersLosingStreak — GET /Party/mentor/urgent-alerts/losing-streak-players.
export interface LosingStreakPlayerDto {
    userId: number;
    username: string;
    partyId: number;
    partyName: string;
    currentStreak: number;
}

export interface PendingActionsDto {
    pendingProofReviews: number;
    pendingJoinRequests: number;
}

export interface ResourceStashDto {
    gemsBalance: number;
    mGoldBalance: number;
}

export interface PartyRankingDto {
    partyId: number;
    partyName: string;
    totalExp: number;
    rank: number;
    sharedHp: number;
    maxSharedHp: number;
}

export interface UpcomingBossFightDto {
    partyId: number;
    partyName: string;
    bossName: string;
    bossHp: number;
    startAt: string;
}

export type MemberActivityActionType = 'PROOF_SUBMITTED' | 'LEVEL_UP' | 'HP_DEDUCTED' | 'QUEST_COMPLETED';

export interface MemberActivityDto {
    id: string;
    playerName: string;
    partyName: string;
    actionType: MemberActivityActionType;
    description: string;
    timestamp: string;
}

export interface MentorDashboardSummaryDto {
    guildStatus: GuildStatusDto;
    urgentAlerts: UrgentAlertsDto;
    pendingActions: PendingActionsDto;
    resourceStash: ResourceStashDto;
    partyRankings: PartyRankingDto[];
    upcomingBossFights: UpcomingBossFightDto[];
    recentMemberActivities: MemberActivityDto[];
}
