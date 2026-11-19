import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingChatService } from './service';
import { chatKeys } from './queries';
import type { SendChatMessagePayload } from './types';
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
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    }
  });
}
