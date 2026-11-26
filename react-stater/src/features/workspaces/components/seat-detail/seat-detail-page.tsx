import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { SeatDetailHeader } from './seat-detail-header';
import { SeatPhotoGallery } from './seat-photo-gallery';
import { SeatMetaStrip } from './seat-meta-strip';
import { SeatSpecsGrid } from './seat-specs-grid';
import { SeatProximityMap } from './seat-proximity-map';
import { SeatReviewsBento } from './seat-reviews-bento';
import { SeatReservationWidget } from './seat-reservation-widget';
import { SeatDetailSkeleton } from './seat-detail-skeleton';
import {
  usePublicWorkspaceDetailQuery,
  usePublicResourceDetailQuery,
  useWorkspaceAmenitiesQuery
} from '../../api/queries';
import { backendRequest } from '@/features/auth/api/session';
import type { CustomerFloor } from '../detail/public-floor-map';
import type { ScheduleSelection } from '../detail/date-time-picker-modal';

export interface SeatDetailPageProps {
  workspaceId?: number;
  resourceId?: number;
  floorId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  bookingId?: number;
  bookingCode?: string;
}

function getDefaultSchedule() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;
  return {
    defaultDate: today,
    defaultStartIso: `${today}T09:00:00`,
    defaultEndIso: `${today}T11:00:00`
  };
}

export function SeatDetailPage({
  workspaceId = 1,
  resourceId,
  floorId,
  date,
  startTime,
  endTime,
  bookingId,
  bookingCode
}: SeatDetailPageProps) {
  const [scheduleOverride, setScheduleOverride] = useState<ScheduleSelection | null>(null);
  const [defaultSchedule] = useState(getDefaultSchedule);

  const currentDate = scheduleOverride?.date || date || defaultSchedule.defaultDate;
  const currentStartTime = scheduleOverride?.isoStartTime || startTime || defaultSchedule.defaultStartIso;
  const currentEndTime = scheduleOverride?.isoEndTime || endTime || defaultSchedule.defaultEndIso;

  const handleScheduleChange = (schedule: ScheduleSelection) => {
    if (schedule.isoStartTime && schedule.isoEndTime) {
      setScheduleOverride(schedule);
    }
  };

  // 1. Fetch Workspace Details
  const { data: workspace, isLoading: loadingWorkspace } = usePublicWorkspaceDetailQuery(
    workspaceId ? String(workspaceId) : '1'
  );

  // 2. Fetch Public Resource Details & Photos
  const { data: resourceDetail, isLoading: loadingResource } = usePublicResourceDetailQuery(
    workspaceId,
    resourceId
  );

  // 3. Fetch Workspace Amenities
  const { data: amenities } = useWorkspaceAmenitiesQuery(workspaceId);

  // 4. Fetch Floor Maps & Resources
  const { data: floors, isLoading: loadingFloors } = useQuery<CustomerFloor[]>({
    queryKey: ['public-floor-maps', workspaceId],
    refetchInterval: 3000,
    enabled: Number.isSafeInteger(workspaceId) && Number(workspaceId) > 0,
    queryFn: ({ signal }) =>
      backendRequest<CustomerFloor[]>(
        `/public/workspaces/${workspaceId}/floor-maps`,
        'GET',
        undefined,
        false,
        signal
      )
  });

  const effectiveFloor = useMemo(() => {
    if (!floors || floors.length === 0) return null;
    if (floorId) {
      const match = floors.find((f) => f.id === floorId);
      if (match) return match;
    }
    return (
      floors.find((f) => f.resources?.some((r) => r.id === resourceId)) ||
      floors[0] ||
      null
    );
  }, [floors, floorId, resourceId]);

  const effectiveResource = useMemo(() => {
    if (!floors || floors.length === 0) return null;
    return (
      floors.flatMap((f) => f.resources || []).find((r) => r.id === resourceId) || null
    );
  }, [floors, resourceId]);

  const isLoading =
    loadingWorkspace || loadingFloors || (Boolean(resourceId) && loadingResource);

  if (isLoading) {
    return (
      <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
        <WorkspaceHeader />
        <SeatDetailSkeleton />
        <Footer />
      </div>
    );
  }

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
      {/* Top Application Bar */}
      <WorkspaceHeader />

      {/* Breadcrumbs & Actions Utility Bar */}
      <SeatDetailHeader
        resource={effectiveResource}
        workspace={workspace}
        floor={effectiveFloor}
      />

      {/* Main 2-Column Workspace Details View (1200px container discipline) */}
      <main className='mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 lg:px-8'>
        <div className='grid grid-cols-1 items-start gap-8 lg:grid-cols-12'>
          {/* Left Column: 65% (8 cols) */}
          <section className='flex flex-col gap-8 lg:col-span-8'>
            <SeatPhotoGallery
              photos={resourceDetail?.photos}
              resource={resourceDetail || effectiveResource}
              floor={effectiveFloor}
              workspaceCover={workspace?.coverImageUrl}
            />
            <SeatMetaStrip
              resource={effectiveResource}
              workspace={workspace}
              floor={effectiveFloor}
            />
            <SeatSpecsGrid
              amenities={amenities}
              resource={resourceDetail}
            />
            <SeatProximityMap
              resource={resourceDetail || effectiveResource}
              floor={effectiveFloor}
            />
            <SeatReviewsBento
              workspaceId={workspaceId}
              resourceId={resourceId}
              resourceName={resourceDetail?.name || effectiveResource?.name}
              resourceCode={resourceDetail?.code || effectiveResource?.code}
            />
          </section>

          {/* Right Column: 35% (4 cols) - Sticky Reservation Widget that stays in view on scroll */}
          <div className='lg:col-span-4 lg:sticky lg:top-[88px] z-20 self-start max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar'>
            <SeatReservationWidget
              workspaceId={workspaceId}
              floorId={floorId}
              bookingId={bookingId}
              bookingCode={bookingCode}
              resource={effectiveResource}
              workspace={workspace}
              floor={effectiveFloor}
              date={currentDate}
              startTime={currentStartTime}
              endTime={currentEndTime}
              onScheduleChange={handleScheduleChange}
            />
          </div>
        </div>
      </main>

      {/* Directory Footer */}
      <Footer />
    </div>
  );
}
