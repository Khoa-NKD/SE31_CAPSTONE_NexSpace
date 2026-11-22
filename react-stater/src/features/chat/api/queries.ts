import { queryOptions, useQuery } from '@tanstack/react-query';
import { bookingChatService } from './service';
import type {
  BookingChatMessageDto,
  BookingConversationDto,
  ConversationFilterParams,
  MessageFilterParams
} from './types';
import type { PageResponse } from '@/types/api';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: (params?: ConversationFilterParams) => [...chatKeys.all, 'conversations', params] as const,
  conversation: (id: number) => [...chatKeys.all, 'conversation', id] as const,
  conversationByBooking: (bookingId: number) => [...chatKeys.all, 'conversation-booking', bookingId] as const,
  messages: (conversationId: number, params?: MessageFilterParams) =>
    [...chatKeys.all, 'messages', conversationId, params] as const,
  aiSmartReplies: (conversationId: number) =>
    [...chatKeys.all, 'ai-smart-replies', conversationId] as const
};

export const conversationsQueryOptions = (params?: ConversationFilterParams) =>
  queryOptions<PageResponse<BookingConversationDto>>({
    queryKey: chatKeys.conversations(params),
    queryFn: () => bookingChatService.getConversations(params),
    staleTime: 5 * 1000
  });

export const conversationDetailQueryOptions = (conversationId: number) =>
  queryOptions<BookingConversationDto>({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () => bookingChatService.getConversationById(conversationId),
    enabled: Boolean(conversationId)
  });

export const messagesQueryOptions = (conversationId: number, params?: MessageFilterParams) =>
  queryOptions<PageResponse<BookingChatMessageDto>>({
    queryKey: chatKeys.messages(conversationId, params),
    queryFn: () => bookingChatService.getMessages(conversationId, params),
    enabled: Boolean(conversationId),
    staleTime: 3 * 1000
  });

export function useConversations(params?: ConversationFilterParams) {
  return useQuery(conversationsQueryOptions(params));
}

export function useConversationDetail(conversationId: number) {
  return useQuery(conversationDetailQueryOptions(conversationId));
}

export function useConversationMessages(conversationId: number, params?: MessageFilterParams) {
  return useQuery(messagesQueryOptions(conversationId, params));
}

export function useAiSmartReplies(conversationId?: number) {
  return useQuery({
    queryKey: chatKeys.aiSmartReplies(conversationId ?? 0),
    queryFn: () => bookingChatService.getSmartReplies(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 30 * 1000
  });
}
