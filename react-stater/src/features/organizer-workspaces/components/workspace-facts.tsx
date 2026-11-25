import { Building2, Users, DoorOpen, CalendarCheck } from '@/components/ui/hugeicons';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { OrganizerWorkspace } from '../types';

export function WorkspaceFacts({
  workspace,
  compact = false
}: {
  workspace: OrganizerWorkspace;
  compact?: boolean;
}) {
  const c = useOrganizerCopy();
  const chipClass = compact
    ? 'inline-flex items-center gap-1 text-[11px] text-muted-foreground'
    : 'inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5';
  return (
    <div
      className={
        compact
          ? 'flex flex-wrap items-center gap-x-3 gap-y-1'
          : 'flex flex-wrap items-center justify-between gap-3'
      }
    >
      <div
        className={
          compact
            ? 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'
            : 'flex flex-wrap items-center gap-2 text-xs'
        }
      >
        {workspace.bookingCount != null && Number.isFinite(workspace.bookingCount) && (
          <span className={chipClass}>
            <CalendarCheck className='size-3.5 text-muted-foreground' />
            <span className='font-medium tabular-nums'>
              {workspace.bookingCount.toLocaleString('vi-VN')}
            </span>{' '}
            {c('bookings', 'lượt đặt')}
          </span>
        )}
        {workspace.areaSqm != null && workspace.areaSqm > 0 && (
          <span className={chipClass} title={c('Usable area', 'Diện tích sử dụng')}>
            <Building2 className='size-3.5 text-muted-foreground' />
            {workspace.areaSqm.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} m²
          </span>
        )}
        {workspace.desksCount != null && workspace.desksCount > 0 && (
          <span className={chipClass}>
            <Users className='size-3.5 text-muted-foreground' />
            {workspace.desksCount} {c('seats', 'ghế')}
          </span>
        )}
        {workspace.meetingRoomsCount != null && workspace.meetingRoomsCount > 0 && (
          <span className={chipClass}>
            <DoorOpen className='size-3.5 text-muted-foreground' />
            {workspace.meetingRoomsCount} {c('meeting rooms', 'phòng họp')}
          </span>
        )}
      </div>
      {workspace.startingPricePerHour != null && workspace.startingPricePerHour > 0 && (
        <p className='text-xs text-muted-foreground'>
          {c('From ', 'Từ ')}
          <span
            className={
              compact
                ? 'text-xs font-semibold tabular-nums text-primary'
                : 'text-sm font-semibold tabular-nums text-primary'
            }
          >
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
              maximumFractionDigits: 0
            }).format(workspace.startingPricePerHour)}
          </span>{' '}
          /{c('hour', 'giờ')}
        </p>
      )}
    </div>
  );
}
