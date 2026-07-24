export interface AuditLogDto {
  auditLogId: number;
  actorUserId: number | null;
  action: string;
  targetType: string;
  targetId: number | null;
  beforeValue: string | null;
  afterValue: string | null;
  note: string | null;
  createdAt: string;
}

export interface GetAuditLogsQuery {
  pageNumber?: number;
  pageSize?: number;
  actorUserId?: number;
  action?: string;
}

export interface PagedAuditLogs {
  data: AuditLogDto[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
