import axiosClient from './axiosClient';
import type { AuditLogDto, GetAuditLogsQuery, PagedAuditLogs } from '../types/adminAudit.types';

const BASE = '/admin/audit-logs';

export const adminAuditApi = {
  getAuditLogs: async (params?: GetAuditLogsQuery): Promise<PagedAuditLogs> => {
    const res = await axiosClient.get<PagedAuditLogs>(BASE, { params });
    return res.data;
  },
};

export type { AuditLogDto };
