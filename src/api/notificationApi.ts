import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { NotificationDto, GetNotificationsQuery, PagedNotifications } from '../types/notification.types';

const getUserId = (): number => Number(localStorage.getItem('user_id') ?? 0);

export const notificationApi = {
  getNotifications: async (params?: Partial<GetNotificationsQuery>): Promise<PagedNotifications> => {
    const res = await axiosClient.get<PagedNotifications>('/me/notifications', {
      params: { userId: getUserId(), ...params },
    });
    return res.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<number>> => {
    const res = await axiosClient.get<ApiResponse<number>>('/me/notifications/unread-count', { params: { userId: getUserId() } });
    return res.data;
  },

  markAsRead: async (id: number): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.post<ApiResponse<boolean>>(`/me/notifications/${id}/read`, null, { params: { userId: getUserId() } });
    return res.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.post<ApiResponse<boolean>>('/me/notifications/read-all', null, { params: { userId: getUserId() } });
    return res.data;
  },

  deleteNotification: async (id: number): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.delete<ApiResponse<boolean>>(`/me/notifications/${id}`, { params: { userId: getUserId() } });
    return res.data;
  },
};

export type { NotificationDto };
