import React from 'react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { ConfirmationBreadcrumb } from './confirmation-breadcrumb';
import { CelebratoryBanner } from './celebratory-banner';
import { DigitalPassCard } from './digital-pass-card';
import { ConfirmationActions } from './confirmation-actions';
import { ConciergeSupportCard } from './concierge-support-card';
import { useBookingByCodeQuery, useBookingByIdQuery } from '../../api/booking-queries';
import { useCustomerBookings } from '@/features/payments/api/queries';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Loader2, TicketX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export interface BookingConfirmationPageProps {
  bookingCode?: string;
  orderRef?: string;
  bookingId?: number;
}

export function BookingConfirmationPage({
  bookingCode,
  orderRef: propOrderRef,
  bookingId
}: BookingConfirmationPageProps) {
  const user = useAuthStore((state) => state.user);
  const code = (bookingCode || propOrderRef?.replace('#', '') || '').trim();

  const { data: bookingByCode, isLoading: loadingByCode, error: errorByCode } = useBookingByCodeQuery(code || null);
  const { data: bookingById, isLoading: loadingById, error: errorById } = useBookingByIdQuery(bookingId || null);

  const { data: latestBookingsPage, isLoading: isLoadingLatest } = useCustomerBookings(
    bookingId || code ? undefined : { status: 'CONFIRMED', page: 0, size: 1, sort: 'createdAt,desc' }
  );
  const fallbackBooking = (latestBookingsPage?.content ?? latestBookingsPage?.listObjects ?? [])[0];

  const booking = bookingById || bookingByCode || (fallbackBooking as any);
  const isLoading = (Boolean(bookingId) && loadingById) || (Boolean(code) && loadingByCode) || (!bookingId && !code && isLoadingLatest);
  const error = bookingId ? errorById : code ? errorByCode : null;

  const orderRef = booking ? `#${booking.bookingCode}` : propOrderRef || (code ? `#${code}` : '#NX-PASS');
  const email = booking?.customerEmail || user?.email || 'customer@nexspace.vn';

  let dateStr = 'Jan 25, 2026';
  let timeSlot = '09:00 AM – 05:00 PM';

  if (booking?.startTime && booking?.endTime) {
    try {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      dateStr = start.toLocaleDateString('vi-VN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      timeSlot = `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      // Fallback
    }
  }

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20 relative'>
      {/* Subtle Architectural Dot Canvas Background */}
      <div
        className='pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-20'
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Shared Global Workspace Navigation Bar */}
      <WorkspaceHeader />

      {/* Main Confirmation Content Canvas */}
      <main className='relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:px-8'>
        {/* Breadcrumb Hierarchy */}
        <ConfirmationBreadcrumb orderRef={orderRef} />

        {/* Loading State */}
        {isLoading && (
          <div className='flex min-h-[400px] flex-col items-center justify-center gap-3 text-center'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-sm text-muted-foreground'>
              Đang tải thông tin vé điện tử và xác thực mã đặt chỗ...
            </p>
          </div>
        )}

        {/* Not Found / Error State (if code/id was provided but invalid) */}
        {!isLoading && (error || (!booking && (code || bookingId))) && (
          <div className='mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xs'>
            <TicketX className='mx-auto size-12 text-muted-foreground mb-4' />
            <h2 className='text-lg font-bold'>Booking Not Found</h2>
            <p className='mt-2 text-xs text-muted-foreground'>
              We could not find a booking matching {code ? `code ${code}` : `ID ${bookingId}`}.
            </p>
            <Button asChild className='mt-6 w-full'>
              <Link to='/workspaces'>Explore Available Workspaces</Link>
            </Button>
          </div>
        )}

        {/* Successful Booking Pass Content */}
        {!isLoading && booking && (
          <div className='mx-auto flex w-full max-w-[560px] flex-col items-center py-4'>
            {/* Celebratory Success Badge & Header */}
            <CelebratoryBanner
              orderRef={orderRef}
              email={email}
              paymentMethod={
                booking.status === 'CONFIRMED'
                  ? 'Paid via PayOS (VietQR)'
                  : `Status: ${booking.status} (15m Hold)`
              }
              dateStr={dateStr}
              status={booking.status}
            />

            {/* Centered Digital Boarding Pass Ticket Container */}
            <DigitalPassCard
              seatCode={booking?.resourceCode || booking?.seatCode || 'Station'}
              zone={`${booking?.floorName || 'Floor'} • ${booking?.zoneName || booking?.resourceName || 'Reserved Zone'}`}
              hubName={booking?.workspaceName || 'NexSpace Prime Hub'}
              address={
                booking?.workspaceAddress ||
                [booking?.workspaceDistrict, booking?.workspaceCity].filter(Boolean).join(', ') ||
                'Ho Chi Minh City'
              }
              pinCode={booking?.pinCode || booking?.bookingCode?.replace(/\D/g, '').slice(-4) || '8492'}
              wifiSsid='NexSpace-5G'
              wifiPass='sprint2026'
              startTime={booking?.startTime}
              endTime={booking?.endTime}
              dateStr={dateStr}
              timeSlot={timeSlot}
              holdExpiresAt={booking?.holdExpiresAt}
              status={booking?.status}
              qrTokenHash={booking?.qrTokenHash}
              bookingCode={booking?.bookingCode}
            />

            {/* Action Buttons Grid */}
            <ConfirmationActions orderRef={orderRef} bookingId={booking?.id || booking?.bookingId} />

            {/* Reassurance & Support Card */}
            <ConciergeSupportCard />

            {/* Footprint Identity String */}
            <div className='text-muted-foreground mt-8 text-center text-[11px] pb-4'>
              © 2026 NexSpace Technologies Inc. All rights reserved. Commercial Real Estate Cloud &amp; Marketplace.
            </div>
          </div>
        )}

        {/* Fallback Demo State when no booking parameter was supplied and no history found */}
        {!isLoading && !booking && !code && !bookingId && (
          <div className='mx-auto flex w-full max-w-[560px] flex-col items-center py-4'>
            <CelebratoryBanner
              orderRef='#NX-DEMO-PASS'
              email='guest@nexspace.io'
              paymentMethod='Ready for Check-in'
              dateStr='Today'
            />
            <DigitalPassCard
              seatCode='Desk A-12'
              zone='Zone A • West Quiet Area'
              hubName='NexSpace Central Tower'
              address='72 Le Thanh Ton, Ben Nghe, District 1, Ho Chi Minh City'
              pinCode='8492'
              wifiSsid='NexSpace-5G'
              wifiPass='sprint2026'
              dateStr='Today'
              timeSlot='09:00 AM – 05:00 PM'
            />
            <ConfirmationActions orderRef='#NX-DEMO-PASS' />
            <ConciergeSupportCard />
          </div>
        )}
      </main>

      {/* Global Shared Footer */}
      <Footer />
    </div>
  );
}
