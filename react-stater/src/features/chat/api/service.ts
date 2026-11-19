import { apiClient } from '@/lib/api-client';
import type { PageResponse } from '@/types/api';
import type {
  BookingChatMessageDto,
  BookingConversationDto,
  ConversationFilterParams,
  MessageFilterParams,
  SendChatMessagePayload
} from './types';

export const bookingChatService = {
  getOrCreateConversation: async (bookingId: number): Promise<BookingConversationDto> => {
    return apiClient.post<BookingConversationDto>(`/chat/conversations/booking/${bookingId}`);
  },

  getConversationById: async (conversationId: number): Promise<BookingConversationDto> => {
    return apiClient.get<BookingConversationDto>(`/chat/conversations/${conversationId}`);
  },

  getConversations: async (
    params?: ConversationFilterParams
  ): Promise<PageResponse<BookingConversationDto>> => {
    return apiClient.get<PageResponse<BookingConversationDto>>('/chat/conversations', {
      params: {
        role: params?.role,
        page: params?.page ?? 1,
        size: params?.size ?? 20,
        search: params?.search
      }
    });
  },

  getMessages: async (
    conversationId: number,
    params?: MessageFilterParams
  ): Promise<PageResponse<BookingChatMessageDto>> => {
    return apiClient.get<PageResponse<BookingChatMessageDto>>(
      `/chat/conversations/${conversationId}/messages`,
      {
        params: {
          page: params?.page ?? 1,
          size: params?.size ?? 50
        }
      }
    );
  },

  sendMessage: async (
    conversationId: number,
    payload: SendChatMessagePayload
  ): Promise<BookingChatMessageDto> => {
    return apiClient.post<BookingChatMessageDto>(
      `/chat/conversations/${conversationId}/messages`,
      payload
    );
  },

  markAsRead: async (conversationId: number): Promise<void> => {
    return apiClient.post<void>(`/chat/conversations/${conversationId}/read`);
  }
};
