// ==========================================
// PARTY CHAT — Types
// Matches BE ChatMessageDto exactly
// ==========================================

// Matches BE ChatMessageDto.Type: "USER" | "SYSTEM"
export type ChatMessageType = 'USER' | 'SYSTEM';

// Matches BE ChatMessageDto
export interface ChatMessage {
  msgId: number;                // BE: MsgId
  partyId: number;              // BE: PartyId
  senderId: number | null;      // BE: SenderId (null for SYSTEM messages)
  senderUsername: string | null; // BE: SenderUsername (null for SYSTEM messages)
  content: string;              // BE: Content
  type: ChatMessageType;        // BE: Type — "USER" | "SYSTEM"
  isDeleted: boolean;           // BE: IsDeleted
  sentAt: string;               // BE: SentAt (ISO-8601)
}

// Matches BE ChatUnreadCountDto
export interface ChatUnreadCountDto {
  partyId: number;
  unreadCount: number;
  latestMessageId: number;
}

// Payload for POST /api/party/{id}/chat/messages
export interface SendMessagePayload {
  userId: number;
  content: string;
}
