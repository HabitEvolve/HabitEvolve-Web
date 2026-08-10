import { PartyStatus } from './api.types';

// ==========================================
// ADMIN — PARTY MANAGEMENT
// Matches BE HabitEvolve.Application/Common/DTOs/UserDto.cs (RaidDto) and
// AdminPartyController.cs query params. PartyItem/JoinRequestItem/PartyMember/
// CreatePartyPayload/UpdatePartyPayload are reused as-is from api.types.ts.
// ==========================================

// GET /admin/parties/{partyId}/raids — matches BE RaidDto
export interface PartyRaidDto {
    raidId: number;
    partyId: number;
    bossName: string;
    maxHp: number;
    currentHp: number;
    status: string; // Upcoming | Active | Defeated | Failed | Expired | WipeOut
    healthPercentage: number;
    weekStartDate: string;
    weekEndDate: string;
}

/**
 * GET /weekly-boss/party/{partyId}/weekly-chests — rương tuần của party (mới → cũ).
 * Chưa có endpoint admin riêng nên dùng chung endpoint của Weekly Boss; gọi KHÔNG kèm userId nên
 * `eligible`/`alreadyClaimed` không có ý nghĩa ở màn admin và bị lược khỏi interface này.
 *
 * Rương chỉ sinh khi Boss bị hạ (`status === "Defeated"`); WipeOut là thua nên không có rương.
 * `eligibleMemberCount` là số người được CHỐT ngay lúc hạ Boss, không đổi theo membership sau đó.
 */
export interface PartyWeeklyChestDto {
    weeklyChestId: number;
    raidId: number;
    partyId: number;
    bossName: string;
    rewardTier: string;
    /** Gold MỖI thành viên nhận (không phải tổng). */
    goldReward: number;
    mgoldReward: number;
    badge: string;
    eligibleMemberCount: number;
    claimedCount: number;
    createdAt: string;
}

// GET /admin/parties query params
export interface AdminGetPartiesQueryParams {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    status?: PartyStatus;
    mentorUserId?: number;
}

// POST /admin/parties/{partyId}/transfer-mentor
export interface AdminTransferMentorPayload {
    newMentorUserId: number;
}
