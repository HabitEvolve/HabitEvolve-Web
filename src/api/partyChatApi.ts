import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { ChatMessage, SendMessagePayload } from '../types/partyChat.types';

// BE endpoint: /api/party/{id}/chat/messages
// GET requires ?userId=  |  POST body: { userId, content }
const CHAT_BASE = (partyId: number) => `/party/${partyId}/chat/messages`;

const getUserId = (): number => Number(localStorage.getItem('user_id') ?? 0);

const partyChatApi = {
  // GET /api/party/{id}/chat/messages?userId={userId}
  getMessages: async (partyId: number): Promise<ApiResponse<ChatMessage[]>> => {
    const res = await axiosClient.get<ApiResponse<ChatMessage[]>>(CHAT_BASE(partyId), {
      params: { userId: getUserId() },
    });
    return res.data;
  },

  // POST /api/party/{id}/chat/messages  — body: { userId, content }
  sendMessage: async (partyId: number, content: string): Promise<ApiResponse<ChatMessage>> => {
    const payload: SendMessagePayload = { userId: getUserId(), content };
    const res = await axiosClient.post<ApiResponse<ChatMessage>>(CHAT_BASE(partyId), payload);
    return res.data;
  },
};

export default partyChatApi;
