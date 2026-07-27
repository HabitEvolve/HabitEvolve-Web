// Types for api/me/notifications

export interface NotificationDto {
  notificationId: number;
  userId: number;
  type: string;
  title: string;
  body: string | null; // BE: Body is nullable (string?) on NotificationDto
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
