export interface BookingConversationDto {
  id: number;
  bookingId: number;
  bookingCode: string;
  bookingStatus: string;
  workspaceId: number;
  workspaceName: string;
  workspaceAddress: string;
  customerId: number;
  customerName: string;
  customerAvatarUrl?: string;
  organizerId: number;
  organizerName: string;
  organizerAvatarUrl?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: string;
}

export interface BookingChatMessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderRole?: string;
  senderAvatarUrl?: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM' | string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendChatMessagePayload {
  content: string;
  messageType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface ConversationFilterParams {
  role?: 'ORGANIZER' | 'CUSTOMER';
  page?: number;
  size?: number;
  search?: string;
}

export interface MessageFilterParams {
  page?: number;
  size?: number;
}
