import { ArrowLeft, Building2, Phone, Info } from '@/components/ui/hugeicons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BookingConversationDto } from '../api/types';

interface ChatHeaderProps {
  conversation: BookingConversationDto;
  isConnected: boolean;
  isCustomer: boolean;
  onBack?: () => void;
  onToggleInfo?: () => void;
}

export function ChatHeader({
  conversation,
  isConnected,
  isCustomer,
  onBack,
  onToggleInfo
}: ChatHeaderProps) {
  const displayName = isCustomer
    ? conversation.organizerName || 'Ban Quản Lý Không Gian'
    : conversation.customerName || 'Khách Hàng';
  const avatarUrl = isCustomer ? conversation.organizerAvatarUrl : conversation.customerAvatarUrl;
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleTitle = isCustomer ? 'Chủ không gian' : 'Khách đặt chỗ';

  return (
    <header className='flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-border/50 shrink-0'>
      <div className='flex items-center gap-2.5 sm:gap-3 min-w-0'>
        {onBack && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onBack}
            className='lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-xl shrink-0 -ml-1'
            aria-label='Quay lại danh sách'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
        )}

        <div className='relative shrink-0'>
          <Avatar className='border-border/40 bg-card/80 text-foreground h-10 w-10 rounded-2xl border sm:h-11 sm:w-11 sm:rounded-3xl'>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className='bg-primary/20 text-primary rounded-2xl text-xs font-bold sm:rounded-3xl sm:text-sm'>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'border-background absolute right-0 bottom-0 inline-flex h-2.5 w-2.5 rounded-full border-2 sm:h-3 sm:w-3',
              isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/60'
            )}
            aria-label={isConnected ? 'Trực tuyến' : 'Ngoại tuyến'}
          />
        </div>

        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <p className='text-foreground text-xs sm:text-sm font-semibold truncate'>
              {displayName}
            </p>
            <Badge
              variant='outline'
              className='text-[10px] px-1.5 py-0 font-normal border-border/80 shrink-0'
            >
              {roleTitle}
            </Badge>
          </div>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate'>
            <Building2 className='h-3 w-3 text-primary/70 shrink-0' />
            <span className='font-medium text-foreground truncate max-w-[140px] sm:max-w-[240px]'>
              {conversation.workspaceName}
            </span>
            <span>•</span>
            <span className='font-mono font-semibold text-primary shrink-0'>
              #{conversation.bookingCode}
            </span>
          </div>
        </div>
      </div>

      <div className='flex items-center gap-1.5 sm:gap-2 shrink-0'>
        <Badge
          variant='secondary'
          className='hidden sm:inline-flex text-[11px] font-medium bg-primary/10 text-primary border-primary/20'
        >
          {conversation.bookingStatus || 'Đơn xác nhận'}
        </Badge>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='border-border/40 bg-background/60 text-muted-foreground hover:bg-muted/60 size-8 rounded-full border transition sm:size-9 cursor-pointer'
          title='Hỗ trợ gọi thoại'
          aria-label='Gọi thoại'
        >
          <Phone className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
        </Button>

        {onToggleInfo && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onToggleInfo}
            className='border-border/40 bg-background/60 text-muted-foreground hover:bg-muted/60 size-8 rounded-full border transition sm:size-9 cursor-pointer'
            title='Thông tin đặt chỗ'
            aria-label='Xem thông tin đặt chỗ'
          >
            <Info className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
          </Button>
        )}
      </div>
    </header>
  );
}
