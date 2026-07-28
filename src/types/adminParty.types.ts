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
