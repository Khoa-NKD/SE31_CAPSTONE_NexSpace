import { Spinner as Loader2 } from '@/components/ui/spinner';
import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { MessageSquare } from '@/components/ui/hugeicons';
import { BookingChatPanel } from './booking-chat-panel';
import { useGetOrCreateBookingConversationMutation } from '../api/mutations';

interface BookingChatDialogProps {
  bookingId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingChatDialog({
  bookingId,
  open,
  onOpenChange
}: BookingChatDialogProps) {
  const { mutate: getOrCreateConversation, data: conversationData, isPending } =
    useGetOrCreateBookingConversationMutation();

  useEffect(() => {
    if (open && bookingId) {
      getOrCreateConversation(bookingId);
    }
  }, [open, bookingId, getOrCreateConversation]);

  const conversation = open ? (conversationData ?? null) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-w-2xl w-full h-[88vh] sm:h-[82vh] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col bg-background'
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>Tin nhắn hỗ trợ đơn đặt chỗ</DialogTitle>
          <DialogDescription>
            Trao đổi trực tiếp với ban quản lý không gian về đơn đặt chỗ của bạn
          </DialogDescription>
        </DialogHeader>

        {isPending || !conversation ? (
          <div className='flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground gap-3'>
            <div className='h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center'>
              <MessageSquare className='h-6 w-6' />
            </div>
            <div className='flex items-center gap-2 text-sm font-medium text-foreground'>
              <Loader2 className='h-4 w-4 text-primary' />
              <span>Đang kết nối với ban quản lý không gian...</span>
            </div>
            <p className='text-xs text-muted-foreground max-w-xs'>
              Thiết lập kênh trò chuyện riêng tư theo thời gian thực cho đơn đặt chỗ của bạn.
            </p>
          </div>
        ) : (
          <BookingChatPanel
            conversationId={conversation.id}
            conversation={conversation}
            onClose={() => onOpenChange(false)}
            className='border-0 rounded-none h-full'
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
