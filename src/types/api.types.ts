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

export interface UserItem {
    userId: number;
    username: string;
    email: string;
    emailVerified: boolean;
    avatarUrl?: string | null;
    status: UserStatus;
    createdAt: string;
    updatedAt: string | null;
    roles: UserRole[];
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
export interface PlayerProfile {
    userId: number;
    username: string;
    email: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    dailyScheduleTime: string | null;
    reminderPreference: string | null;

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
