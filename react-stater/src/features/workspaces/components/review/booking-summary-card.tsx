import {
  BadgeCheck,
  MapPin,
  Layers,
  Lock,
  Zap,
  Armchair,
  Wifi,
  VolumeX,
  Calendar,
  QrCode,
  Loader2
} from 'lucide-react';
import type { PublicWorkspaceDetail } from '../../api/types';

interface BookingSummaryCardProps {
  workspace?: PublicWorkspaceDetail | null;
  resource?: {
    id: number;
    code: string;
    name: string;
    category?: string;
  } | null;
  floorName?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  isLoading?: boolean;
}

export function BookingSummaryCard({
  workspace,
  resource,
  floorName,
  startTime,
  endTime,
  date,
  isLoading = false
}: BookingSummaryCardProps) {
  const amenities = [
    { icon: Zap, label: '65W USB-C PD' },
    { icon: Armchair, label: 'Aeron Ergonomic' },
    { icon: Wifi, label: '1 Gbps Ultra-Speed' },
    { icon: VolumeX, label: 'Acoustic Barrier' }
  ];

  const schedule = formatSchedule(startTime, endTime, date);

  if (isLoading) {
    return (
      <section className='bg-card border-border shadow-xs flex min-h-[300px] items-center justify-center rounded-2xl border p-6'>
        <div className='flex items-center gap-3 text-sm text-muted-foreground'>
          <Loader2 className='size-5 animate-spin text-primary' />
          <span>Loading workspace &amp; station specifications...</span>
        </div>
      </section>
    );
  }

  const workspaceName = workspace?.name || 'NexSpace Workspace';
  const workspaceAddress =
    workspace?.streetAddress ||
    [workspace?.buildingName, workspace?.district, workspace?.city].filter(Boolean).join(', ') ||
    'District 1, Ho Chi Minh City';
  const seatCode = resource?.code || 'Desk A-01';
  const seatName = resource?.name || 'Selected Station';
  const categoryLabel = resource?.category || 'Hot Desk Pass';

  const workspaceImage =
    workspace?.coverImageUrl ||
    workspace?.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';

  return (
    <section className='bg-card border-border shadow-xs space-y-5 rounded-2xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div className='flex items-center gap-2.5'>
          <BadgeCheck className='text-primary h-5 w-5' />
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Booking Summary &amp; Space Information
          </h2>
        </div>
        <span className='bg-primary/10 border-primary/20 text-primary rounded-full border px-2.5 py-0.5 text-xs font-semibold'>
          {categoryLabel}
        </span>
      </div>

      {/* Space Info Row */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='bg-muted border-border/80 relative h-32 w-full shrink-0 overflow-hidden rounded-xl border sm:h-28 sm:w-36'>
          <img
            alt={workspaceName}
            className='h-full w-full object-cover'
            src={workspaceImage}
          />
          <span className='bg-background/90 text-foreground border-border/60 absolute top-2 left-2 rounded border px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-xs'>
            {floorName || 'VERIFIED'}
          </span>
        </div>

        <div className='flex-grow space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='text-foreground font-sans text-base font-bold'>
              {workspaceName}
            </h3>
            <span className='inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
              Instant Access
            </span>
          </div>

          <div className='text-muted-foreground flex items-start gap-1.5 text-xs'>
            <MapPin className='text-primary mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span>{workspaceAddress}</span>
          </div>

          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Layers className='text-primary h-3.5 w-3.5 shrink-0' />
            <span>{floorName || 'Main Level'} • Dedicated Quiet &amp; Focus Area</span>
          </div>
        </div>
      </div>

      {/* Highlighted Resource Pill / Badge */}
      <div className='bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono'>
            {seatCode}
          </div>
          <div>
            <div className='text-primary text-xs font-semibold sm:text-sm'>
              {seatName} ({seatCode})
            </div>
            <p className='text-muted-foreground text-xs'>
              Ergonomic workspace station with high-bandwidth power &amp; data connection
            </p>
          </div>
        </div>
        <div className='text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs font-bold uppercase tracking-wider'>
          <Lock className='h-3.5 w-3.5' />
          <span>Locked for Hold</span>
        </div>
      </div>

      {/* Included Station Amenities Row */}
      <div className='border-border/60 border-t pt-4'>
        <span className='text-foreground mb-3 block text-xs font-semibold'>
          Included Station Amenities
        </span>
        <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
          {amenities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className='bg-muted/50 border-border/70 flex items-center gap-2 rounded-lg border p-2 text-xs'
              >
                <Icon className='text-primary h-4 w-4 shrink-0' />
                <span className='text-foreground text-xs font-medium'>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Time & Slot */}
      <div className='bg-muted/40 border-border/60 rounded-xl border p-4'>
        <div className='flex items-start gap-3'>
          <div className='bg-card border-border text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-xs'>
            <Calendar className='h-4 w-4 text-primary' />
          </div>
          <div className='space-y-1 text-xs'>
            <div className='text-foreground font-semibold sm:text-sm'>
              {schedule.dateStr} • {schedule.timeStr}
            </div>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <QrCode className='text-primary h-3.5 w-3.5 shrink-0' />
              <span>
                Contactless Digital Pass generated upon booking. Check-in opens 15 minutes before reserved slot.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatSchedule(startTime?: string, endTime?: string, dateFallback?: string) {
  if (!startTime || !endTime) {
    return {
      dateStr: dateFallback || 'Selected Date',
      timeStr: '09:00 AM - 01:00 PM (4 hours)',
      durationHours: 4
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10 || 1;

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const dateStr = !isNaN(start.getTime())
    ? start.toLocaleDateString('en-US', dateOptions)
    : dateFallback || 'Selected Date';

  const timeStr =
    !isNaN(start.getTime()) && !isNaN(end.getTime())
      ? `${start.toLocaleTimeString('en-US', timeOptions)} – ${end.toLocaleTimeString('en-US', timeOptions)} (${hours} hr${hours > 1 ? 's' : ''})`
      : 'Selected Slot';

  return { dateStr, timeStr, durationHours: hours };
}
