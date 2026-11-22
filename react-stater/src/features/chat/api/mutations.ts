import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingChatService } from './service';
import { chatKeys } from './queries';
import type { AiToneAdjustmentPayload, SendChatMessagePayload } from './types';
import { toast } from 'sonner';

export function useGetOrCreateBookingConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: number) => bookingChatService.getOrCreateConversation(bookingId),
    onSuccess: (data) => {
      queryClient.setQueryData(chatKeys.conversation(data.id), data);
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể tạo cuộc trò chuyện hỗ trợ');
    }
  });
}

export function useSendMessageMutation(conversationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendChatMessagePayload) =>
      bookingChatService.sendMessage(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể gửi tin nhắn');
    }
  });
}

export function useMarkAsReadMutation(conversationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => bookingChatService.markAsRead(conversationId),
    onSuccess: () => {
      // Optimistically update conversation unreadCount to 0
      queryClient.setQueriesData(
        { queryKey: chatKeys.conversations() },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object' || !('content' in oldData)) return oldData;
          const page = oldData as { content: Array<{ id: number; unreadCount: number }> };
          return {
            ...page,
            content: page.content.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c
            )
          };
        }
      );
      queryClient.setQueryData(
        chatKeys.conversation(conversationId),
        (oldData: unknown) =>
          oldData && typeof oldData === 'object' && 'unreadCount' in oldData
            ? { ...oldData, unreadCount: 0 }
            : oldData
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    }
  });
}

export function useAdjustToneMutation(conversationId: number) {
  return useMutation({
    mutationFn: (payload: AiToneAdjustmentPayload) =>
      bookingChatService.adjustTone(conversationId, payload),
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể hiệu chỉnh văn phong bằng AI');
    }
  });
}

export function useSummarizeConversationMutation(conversationId: number) {
  return useMutation({
    mutationFn: () => bookingChatService.summarizeConversation(conversationId),
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể tổng hợp cuộc trò chuyện bằng AI');
    }
  });
}
