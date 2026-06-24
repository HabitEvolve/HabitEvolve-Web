// ==========================================
// PARTY CHAT — Types
// SignalR integration pending; REST shape defined here.
// ==========================================

// role mirrors BE enum: MENTOR | PLAYER | SYSTEM
export type ChatRole = 'MENTOR' | 'PLAYER' | 'SYSTEM';

// Matches the expected BE ChatMessageDto
export interface ChatMessage {
  messageId: number;
  senderId: number;
  senderName: string;
  role: ChatRole;
  content: string;
  createdAt: string;     // ISO-8601
  isSystemMessage: boolean;
}

// Payload for POST /api/party/{id}/chat/messages
export interface SendMessagePayload {
  userId: number;
  content: string;
}
