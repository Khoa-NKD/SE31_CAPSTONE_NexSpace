import { useState, useEffect, useCallback } from 'react';
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
import { useBookingByIdQuery, useBookingByCodeQuery } from '../../api/booking-queries';
import type { CustomerFloor } from '../detail/public-floor-map';
import type { BookingDto } from '../../api/booking-types';
import { useCurrentPendingBooking } from '@/features/payments/api';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from '@tanstack/react-router';
import { useLanguage } from '@/features/landing/context/language-context';
import { toast } from 'sonner';

export interface BookingReviewPageProps {
  workspaceId?: number;
  resourceId?: number;
  bookingId?: number;
  bookingCode?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
  autoOpen?: boolean;
}

function extractSeconds(source: unknown): number | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const record = source as Record<string, unknown>;
  if (typeof record.remainingSeconds === 'number' && record.remainingSeconds > 0) {
    return record.remainingSeconds;
  }
  if (typeof record.ttlSeconds === 'number' && record.ttlSeconds > 0) {
    return record.ttlSeconds;
  }
  return undefined;
}

export function BookingReviewPage({
  workspaceId: propWorkspaceId,
  resourceId: propResourceId,
  bookingId,
  bookingCode,
  startTime: propStartTime,
  endTime: propEndTime,
  date: propDate,
  priceType = 'HOURLY',
  autoOpen
}: BookingReviewPageProps) {
  const [customerNotes, setCustomerNotes] = useState('');
  const [activeBooking, setActiveBooking] = useState<BookingDto | null>(null);
  const { data: holdData } = useCurrentPendingBooking();

  // Load existing held booking if bookingId or bookingCode is provided from seats page or resume link
  const { data: heldBookingById, isLoading: isLoadingBookingById } = useBookingByIdQuery(bookingId);
  const { data: heldBookingByCode, isLoading: isLoadingBookingByCode } = useBookingByCodeQuery(bookingCode);
  const initialBooking = heldBookingById || heldBookingByCode || null;

  const effectiveBooking = activeBooking || initialBooking || null;

  // Resolve effective parameters with fallback to loaded booking
  const workspaceId = propWorkspaceId ?? effectiveBooking?.workspaceId;
  const resourceId = propResourceId ?? effectiveBooking?.resourceId;
  const startTime = propStartTime ?? (effectiveBooking?.startTime ? String(effectiveBooking.startTime) : undefined);
  const endTime = propEndTime ?? (effectiveBooking?.endTime ? String(effectiveBooking.endTime) : undefined);
  const date = propDate ?? (startTime ? startTime.split('T')[0] : undefined);

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

  // Validate if holdData belongs to this workspace and resource
  const isMatchingHold =
    holdData &&
    (!workspaceId || !holdData.workspaceId || holdData.workspaceId === workspaceId) &&
    (!resourceId || !holdData.resourceId || holdData.resourceId === resourceId) &&
    (holdData.remainingSeconds ? Number(holdData.remainingSeconds) > 0 : true);

  const effectiveHoldData = isMatchingHold ? holdData : null;
  const seatCode =
    selectedResource?.code ||
    effectiveBooking?.resourceName ||
    (resourceId ? `Seat #${resourceId}` : effectiveHoldData?.seatCode || 'Desk A-01');

  const effectiveExpiresAt = effectiveBooking?.holdExpiresAt || effectiveHoldData?.holdExpiresAt;
  const effectiveServerTime = effectiveBooking?.serverTime || effectiveHoldData?.serverTime;
  const effectiveInitialSeconds =
    extractSeconds(effectiveBooking) ??
    extractSeconds(effectiveHoldData) ??
    undefined;

  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleHoldExpired = useCallback(() => {
    toast.error(
      language === 'vi'
        ? 'Phiên giữ chỗ của bạn đã hết hạn. Đang chuyển về trang thông tin không gian...'
        : 'Your seat hold has expired. Redirecting to workspace details...'
    );
    setTimeout(() => {
      if (workspaceId) {
        navigate({
          to: '/workspaces/$workspaceId',
          params: { workspaceId: String(workspaceId) }
        });
      } else {
        navigate({ to: '/workspaces' });
      }
    }, 1500);
  }, [language, workspaceId, navigate]);

  // Tự động out khi đơn booking bị phát hiện đã EXPIRED từ server
  useEffect(() => {
    if (effectiveBooking?.status === 'EXPIRED') {
      handleHoldExpired();
    }
  }, [effectiveBooking?.status, handleHoldExpired]);

  // Single Source of Truth cho bộ đếm thời gian giữ chỗ - duy trì liên tục bất kể đóng/mở popup QR
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (effectiveExpiresAt) {
      try {
        const exp = new Date(effectiveExpiresAt).getTime();
        const srv = effectiveServerTime ? new Date(effectiveServerTime).getTime() : Date.now();
        if (!isNaN(exp) && !isNaN(srv)) {
          return Math.max(0, Math.floor((exp - srv) / 1000));
        }
      } catch {
        // Fallback
      }
    }
    return effectiveInitialSeconds ?? 900;
  });

  useEffect(() => {
    let targetClientExpiry: number;
    const clientNow = Date.now();
    if (effectiveExpiresAt) {
      try {
        const exp = new Date(effectiveExpiresAt).getTime();
        if (!isNaN(exp)) {
          if (effectiveServerTime) {
            const srv = new Date(effectiveServerTime).getTime();
            if (!isNaN(srv)) {
              const diffMs = Math.max(0, exp - srv);
              targetClientExpiry = clientNow + diffMs;
            } else {
              targetClientExpiry = exp;
            }
          } else {
            targetClientExpiry = exp;
          }
        } else {
          targetClientExpiry = clientNow + (effectiveInitialSeconds ?? 900) * 1000;
        }
      } catch {
        targetClientExpiry = clientNow + (effectiveInitialSeconds ?? 900) * 1000;
      }
    } else {
      targetClientExpiry = clientNow + (effectiveInitialSeconds ?? 900) * 1000;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((targetClientExpiry - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      return remaining;
    };

    updateRemaining();

    const interval = setInterval(() => {
      const remaining = updateRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [effectiveExpiresAt, effectiveServerTime, effectiveInitialSeconds]);

  // If a booking ID or Code was specified but still resolving, show clean loading view
  const isResolvingBooking = Boolean(bookingId || bookingCode) && !initialBooking && (isLoadingBookingById || isLoadingBookingByCode);

  if (isResolvingBooking) {
    return (
      <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
        <WorkspaceHeader />
        <main className='mx-auto w-full max-w-[1200px] flex-1 px-6 py-16 lg:px-8 text-center'>
          <div className='max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-xs flex flex-col items-center justify-center'>
            <Loader2 className='size-10 animate-spin text-primary mb-4' />
            <h2 className='text-lg font-bold tracking-tight'>Đang tải thông tin đơn đặt chỗ...</h2>
            <p className='mt-2 text-xs text-muted-foreground'>
              Hệ thống đang truy xuất dữ liệu giữ chỗ để bạn tiếp tục hoàn tất thanh toán.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

        {/* Hold Urgency Top Banner */}
        <HoldUrgencyBanner
          bookingId={effectiveBooking?.id ? Number(effectiveBooking.id) : undefined}
          seatCode={seatCode || 'Desk A-12'}
          holdExpiresAt={effectiveExpiresAt}
          initialSeconds={effectiveInitialSeconds}
          serverTime={effectiveBooking?.serverTime || effectiveHoldData?.serverTime}
          holdDurationMinutes={effectiveBooking?.holdDurationMinutes ?? effectiveHoldData?.holdDurationMinutes ?? 15}
          remainingHoldAttempts={effectiveBooking?.remainingHoldAttempts ?? effectiveHoldData?.remainingHoldAttempts ?? 3}
          maxHoldAttempts={effectiveBooking?.maxHoldAttempts ?? effectiveHoldData?.maxHoldAttempts ?? 3}
          penaltyBlockMinutes={effectiveBooking?.penaltyBlockMinutes ?? effectiveHoldData?.penaltyBlockMinutes ?? 20}
          secondsRemaining={secondsRemaining}
          onExpired={handleHoldExpired}
          onReleaseSuccess={() => {
            if (workspaceId) {
              navigate({
                to: '/workspaces/$workspaceId',
                params: { workspaceId: String(workspaceId) }
              });
            } else {
              navigate({ to: '/workspaces' });
            }
          }}
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
            <CancellationPolicyCard snapshot={effectiveBooking?.cancellationPolicySnapshot} rules={workspace?.cancellationRules} />
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
              activeBooking={effectiveBooking}
              onBookingCreated={setActiveBooking}
              autoOpen={autoOpen}
              secondsRemaining={secondsRemaining}
              onExpired={handleHoldExpired}
            />
          </div>
        </div>
      </main>

      {/* Shared Global Directory Footer */}
      <Footer />
    </div>
  );
}
