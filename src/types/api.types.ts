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


// BASE RESPONSES (Cập nhật thêm errors & statusCode)

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
export type UserRole = "ADMIN" | "MENTOR" | "PLAYER" | string;
export type UserStatus = "Active" | "Banned" | "Deleted" | string;

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

// Các Params dùng để Lọc/Tìm kiếm (Query Parameters) cho GET /admin/users
export interface GetUsersQueryParams {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    status?: UserStatus;
    role?: UserRole;
}

// --- Các Payload (Request Body) cho Create/Update ---

// Payload cho PUT /admin/users/{userId}
export interface UpdateUserPayload {
    username?: string;
    email?: string;
}

// Payload cho PATCH /admin/users/{userId}/status (Đã khớp với dữ liệu bạn cung cấp)
export interface UpdateUserStatusPayload {
    status: string;
    reason: string;
}

// Payload cho POST /admin/users (Tùy thuộc backend yêu cầu, có thể là vầy)
export interface CreateAdminUserPayload {
    username: string;
    email: string;
    role: string;
    password?: string;
}

// Payload cho POST /admin/users/{userId}/roles
export interface AssignRolePayload {
    roleCode: string;
}

// PLAYER PROFILE TYPES
// Mô hình dữ liệu trả về từ GET /profile/me
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

// Payload (dữ liệu gửi lên) cho PUT /api/profile/update
export interface UpdatePlayerProfilePayload {
    userId: number;
    avatarUrl?: string;
    dailyScheduleTime?: string;
    reminderPreference?: string;
}

// PARTY MANAGEMENT TYPES (MENTOR)
export type JoinPolicy = "PUBLIC" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | string;
export type PartyStatus = "Active" | "Inactive" | "Deleted" | string;
export type JoinRequestStatus = "Pending" | "Approved" | "Rejected" | string;

// Payload cập nhật Party
export interface UpdatePartyPayload {
    name?: string;
    description?: string;
    joinPolicy?: JoinPolicy;
    mentorUserId?: number;
}

// Payload tạo Party mới
export interface CreatePartyPayload {
    mentorUserId: number;
    name: string;
    description: string;
    joinPolicy: JoinPolicy;
}

// Model Party hiển thị cho Mentor
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
    createdAt: string;
    updatedAt: string | null;
}

// Model Yêu cầu tham gia (Join Request)
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

// Model Thành viên trong Party (Dự đoán cấu trúc cơ bản)
export interface PartyMember {
    userId: number;
    username: string;
    role?: string;
    joinedAt?: string;
}