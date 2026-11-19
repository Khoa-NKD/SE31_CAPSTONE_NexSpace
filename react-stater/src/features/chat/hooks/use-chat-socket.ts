import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '../api/queries';
import type { BookingChatMessageDto, BookingConversationDto } from '../api/types';

export function useChatSocket(conversationId?: number) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const [isConnected, setIsConnected] = useState(false);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!accessToken || typeof window === 'undefined') return;

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws-chat`;

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`
      },
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000
    });

    client.onConnect = () => {
      setIsConnected(true);

      if (conversationId) {
        client.subscribe(`/topic/conversations/${conversationId}`, (msg) => {
          try {
            const newMsg: BookingChatMessageDto = JSON.parse(msg.body);
            queryClient.setQueryData(
              chatKeys.messages(conversationId),
              (old: { content?: BookingChatMessageDto[]; listObjects?: BookingChatMessageDto[] } | undefined) => {
                if (!old) return old;
                const prevList = old.content ?? old.listObjects ?? [];
                if (prevList.some((m) => m.id === newMsg.id)) return old;
                return {
                  ...old,
                  content: [newMsg, ...prevList],
                  listObjects: [newMsg, ...prevList]
                };
              }
            );
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
          } catch (e) {
            console.error('Failed to parse incoming chat message', e);
          }
        });

        client.subscribe(`/topic/conversations/${conversationId}/read`, () => {
          queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
        });
      }

      if (currentUser?.id) {
        client.subscribe(`/topic/users/${currentUser.id}/conversations`, (msg) => {
          try {
            const updatedConv: BookingConversationDto = JSON.parse(msg.body);
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
            queryClient.setQueryData(chatKeys.conversation(updatedConv.id), updatedConv);
          } catch (e) {
            console.error('Failed to parse updated conversation notification', e);
          }
        });
      }
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.warn('STOMP broker error:', frame.headers['message']);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [accessToken, conversationId, currentUser?.id, queryClient]);

  return { isConnected };
}
