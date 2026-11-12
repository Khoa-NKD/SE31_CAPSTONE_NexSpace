import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backendRequest } from '@/features/auth/api/session';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { ReviewHeader } from './review-header';
import { HoldUrgencyBanner } from './hold-urgency-banner';
import { BookingSummaryCard } from './booking-summary-card';
import { BookerInfoCard } from './booker-info-card';
import { CancellationPolicyCard } from './cancellation-policy-card';
import { PriceBreakdownCard } from './price-breakdown-card';
import { usePublicWorkspaceDetailQuery } from '../../api/queries';
import type { CustomerFloor } from '../detail/public-floor-map';
import type { BookingDto } from '../../api/booking-types';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export interface BookingReviewPageProps {
  workspaceId?: number;
  resourceId?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
}

export function BookingReviewPage({
  workspaceId,
  resourceId,
  startTime,
  endTime,
  date,
  priceType = 'HOURLY'
}: BookingReviewPageProps) {
  const [customerNotes, setCustomerNotes] = useState('');
  const [activeBooking, setActiveBooking] = useState<BookingDto | null>(null);

  // Fetch workspace details
  const { data: workspace, isLoading: isLoadingWorkspace } = usePublicWorkspaceDetailQuery(
    workspaceId ? String(workspaceId) : null
  );

  // Fetch floor maps to look up the assigned resource & floor name
  const { data: floors, isLoading: isLoadingFloors } = useQuery<CustomerFloor[]>({
    queryKey: ['public-floor-maps', workspaceId],
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

  const selectedFloor = floors?.find((f) => f.resources.some((r) => r.id === resourceId));
  const selectedResource = floors?.flatMap((f) => f.resources).find((r) => r.id === resourceId);

  const seatCode = selectedResource?.code || (resourceId ? `Seat #${resourceId}` : 'Desk A-01');

  if (!workspaceId || !resourceId) {
    return (
      <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
        <WorkspaceHeader />
        <main className='mx-auto w-full max-w-[1200px] flex-1 px-6 py-16 lg:px-8 text-center'>
          <div className='max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-xs'>
            <Building2 className='mx-auto size-12 text-primary mb-4' />
            <h2 className='text-xl font-bold tracking-tight'>No Workspace or Seat Selected</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Please select a workspace and your preferred seat on the interactive floor map before proceeding to review.
            </p>
            <Button asChild className='mt-6 w-full'>
              <Link to='/workspaces'>Explore Workspaces</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
      {/* Shared Global Workspace Navigation Bar */}
      <WorkspaceHeader />

      {/* Main Workspace Canvas (Strict 1200px container discipline) */}
      <main className='mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 lg:px-8'>
        {/* Breadcrumb Hierarchy */}
        <ReviewHeader
          workspaceId={workspaceId}
          workspaceName={workspace?.name}
          resourceCode={selectedResource?.code}
        />

        {/* 15-Minute Hold Urgency Top Banner */}
        <HoldUrgencyBanner
          seatCode={seatCode}
          holdExpiresAt={activeBooking?.holdExpiresAt}
        />

        {/* 2-Column Checkout Layout (60% Left Review details / 40% Right Sticky Price Card) */}
        <div className='grid grid-cols-1 items-start gap-8 lg:grid-cols-12'>
          {/* Left Column (7 cols ~ 60%) */}
          <div className='space-y-6 lg:col-span-7'>
            <BookingSummaryCard
              workspace={workspace}
              resource={selectedResource}
              floorName={selectedFloor?.name}
              startTime={startTime}
              endTime={endTime}
              date={date}
              isLoading={isLoadingWorkspace || isLoadingFloors}
            />
            <BookerInfoCard
              notes={customerNotes}
              onNotesChange={setCustomerNotes}
            />
            <CancellationPolicyCard />
          </div>

          {/* Right Column (5 cols ~ 40% - Sticky Card) */}
          <div className='lg:col-span-5'>
            <PriceBreakdownCard
              workspaceId={workspaceId}
              resourceId={resourceId}
              startTime={startTime}
              endTime={endTime}
              date={date}
              priceType={priceType}
              customerNotes={customerNotes}
              seatCode={seatCode}
              workspaceName={workspace?.name}
              activeBooking={activeBooking}
              onBookingCreated={setActiveBooking}
            />
          </div>
        </div>
      </main>

      {/* Shared Global Directory Footer */}
      <Footer />
    </div>
  );
}
