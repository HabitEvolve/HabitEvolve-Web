// Types for api/me/notifications + api/admin/notifications/broadcast

export interface NotificationDto {
  notificationId: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  sourceType: string | null;
  sourceId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface GetNotificationsQuery {
  userId: number;
  isRead?: boolean;
  type?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface PagedNotifications {
  data: NotificationDto[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// POST /admin/notifications/broadcast
export type BroadcastTarget = "ALL" | "ROLE" | "USERS";

export interface BroadcastPayload {
  target: BroadcastTarget;
  role?: string;
  userIds?: number[];
  type: string;
  title: string;
  body: string;
  sourceType?: string;
  sourceId?: number;
}

export interface BroadcastResultDto {
  target: string;
  totalRecipients: number;
  notificationsCreated: number;
  skippedByPreference: number;
}
