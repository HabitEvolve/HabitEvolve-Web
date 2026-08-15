// Shape of the `data` field in login / google-login API responses
export interface AuthUser {
    userId: number;
    username: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    role?: string;    // raw BE field (singular string) — normalized to roles[] in authApi.ts
    roles: string[];  // normalized FE field — always populated after authApi normalization
}

// Payload for POST /api/auth/google-login
export interface GoogleLoginPayload {
    email: string;
    fullName: string;
    avatarUrl: string | null;
    emailVerified: boolean;
    /** Platform-fixed role for auto-registration — BE only applies this to brand-new accounts. */
    role: "MENTOR" | "PLAYER";
}

// Dành cho form Đăng ký
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
}

// Dành cho form Đăng nhập
export interface LoginPayload {
    email: string;
    password: string;
}

// POST /api/user/change-password — the caller is identified by the JWT, so the
// body carries only the two passwords. BE rules (ChangePasswordCommandValidator):
// both required, newPassword >= 6 chars and different from oldPassword.
export interface ChangePasswordPayload {
    oldPassword: string;
    newPassword: string;
}


// BASE RESPONSES

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: any;
    statusCode?: number | null;
    timestamp: string;
}

export interface PaginatedApiResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    timestamp: string;
}

// USER MANAGEMENT TYPES
// Matches BE UserStatus enum: Active, Inactive, Banned, Deleted
export type UserRole = "ADMIN" | "MENTOR" | "PLAYER" | string;
export type UserStatus = "Active" | "Inactive" | "Banned" | "Deleted" | string;

// BE UserDto (HabitEvolve.Application/Common/DTOs/UserDto.cs) has NO AvatarUrl field —
// admin/users list responses never include it. (Player-facing avatar lives on
// PlayerProfileDetailDto, surfaced separately via PlayerProfile below.)
// PortraitUrl/HasVerifiedPortrait ARE included, but only on the single-user detail
// response (GET /admin/users/{id}) — GetUserByIdQueryHandler joins PlayerProfile;
// the list endpoint does not.
export interface UserItem {
    userId: number;
    username: string;
    email: string;
    emailVerified: boolean;
    status: UserStatus;
    createdAt: string;
    updatedAt: string | null;
    role?: UserRole;    // raw BE field (singular) — normalized to roles[] in adminUserApi.ts
    roles: UserRole[];  // normalized FE field
    portraitUrl?: string | null;
    hasVerifiedPortrait?: boolean;
    portraitVerifiedAt?: string | null;
}

// Query params for GET /admin/users
// BE param: roleCode (not role)
export interface GetUsersQueryParams {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    status?: UserStatus;
    roleCode?: UserRole;
}

// Payload for PATCH /admin/users/{userId}/status
// BE ChangeStatusRequest: Status (required), Reason (nullable)
export interface UpdateUserStatusPayload {
    status: string;
    reason?: string;
}

// Payload for POST /admin/users/{userId}/roles
export interface AssignRolePayload {
    roleCode: string;
}

// PLAYER PROFILE TYPES
// Matches BE PlayerProfileDetailDto (HabitEvolve.Application/Common/DTOs/PlayerProfileDto.cs)
export interface PlayerProfile {
    userId: number;
    username: string;
    email: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    dailyScheduleTime: string | null;
    reminderPreference: string | null;
    // Portrait verification (CV service "chính chủ" check) — added alongside ProfileController.VerifyPortrait.
    portraitUrl: string | null;
    hasVerifiedPortrait: boolean;

    isProfileCreated: boolean;
    hasAvatar: boolean;
    hasDailySchedule: boolean;
    hasReminderPreference: boolean;

    createdAt: string;
    updatedAt: string | null;
}

export interface UpdatePlayerProfilePayload {
    userId: number;
    avatarUrl?: string;
    dailyScheduleTime?: string;
    reminderPreference?: string;
}

// PARTY MANAGEMENT TYPES (MENTOR)
export type JoinPolicy = "PUBLIC" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | string;
export type PartyStatus = "Active" | "Disbanded" | "Archived" | string;
export type JoinRequestStatus = "Pending" | "Approved" | "Rejected" | string;

export interface UpdatePartyPayload {
    name?: string;
    description?: string;
    joinPolicy?: JoinPolicy;
    mentorUserId?: number;
}

export interface CreatePartyPayload {
    mentorUserId: number;
    name: string;
    description: string;
    joinPolicy: JoinPolicy;
}

export interface PartyItem {
    partyId: number;
    mentorUserId: number;
    mentorUsername: string | null;
    name: string;
    description: string;
    joinPolicy: JoinPolicy;
    inviteCode: string;
    status: PartyStatus;
    memberCount: number;
    maxMembers: number;
    createdAt: string;
    updatedAt: string | null;
}

export interface JoinRequestItem {
    requestId: number;
    partyId: number;
    partyName: string;
    userId: number;
    username: string;
    status: JoinRequestStatus;
    message: string;
    requestedAt: string;
    processedAt: string | null;
}

export interface PartyMember {
    partyMemberId: number;
    userId: number;
    username: string;
    role?: string;
    status?: string;
    joinedAt?: string;
}
