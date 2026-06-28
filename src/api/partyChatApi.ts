import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { ChatMessage, ChatUnreadCountDto, SendMessagePayload } from '../types/partyChat.types';

const CHAT_BASE = (partyId: number) => `/party/${partyId}/chat/messages`;

const getUserId = (): number => Number(localStorage.getItem('user_id') ?? 0);

const partyChatApi = {
  // GET /api/party/{id}/chat/messages?userId=&limit=
  // BE requires limit query param — default 50
  getMessages: async (partyId: number, limit = 50, beforeMessageId?: number): Promise<ApiResponse<ChatMessage[]>> => {
    const res = await axiosClient.get<ApiResponse<ChatMessage[]>>(CHAT_BASE(partyId), {
      params: { userId: getUserId(), limit, beforeMessageId },
    });
    return res.data;
  },

  // POST /api/party/{id}/chat/messages — body: { userId, content }
  sendMessage: async (partyId: number, content: string): Promise<ApiResponse<ChatMessage>> => {
    const payload: SendMessagePayload = { userId: getUserId(), content };
    const res = await axiosClient.post<ApiResponse<ChatMessage>>(CHAT_BASE(partyId), payload);
    return res.data;
  },

  // POST /api/party/{id}/chat/read — body: { userId, upToMessageId? }
  markRead: async (partyId: number, upToMessageId?: number): Promise<ApiResponse<ChatUnreadCountDto>> => {
    const res = await axiosClient.post<ApiResponse<ChatUnreadCountDto>>(
      `/party/${partyId}/chat/read`,
      { userId: getUserId(), upToMessageId },
    );
    return res.data;
  },

  // GET /api/party/{id}/chat/unread-count?userId=
  getUnreadCount: async (partyId: number): Promise<ApiResponse<ChatUnreadCountDto>> => {
    const res = await axiosClient.get<ApiResponse<ChatUnreadCountDto>>(
      `/party/${partyId}/chat/unread-count`,
      { params: { userId: getUserId() } },
    );
    return res.data;
  },

  // DELETE /api/party/{id}/chat/messages/{msgId}?userId=
  deleteMessage: async (partyId: number, msgId: number): Promise<ApiResponse<boolean>> => {
    const res = await axiosClient.delete<ApiResponse<boolean>>(
      `${CHAT_BASE(partyId)}/${msgId}`,
      { params: { userId: getUserId() } },
    );
    return res.data;
  },
};

export default partyChatApi;
