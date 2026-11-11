import React from 'react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { ConfirmationBreadcrumb } from './confirmation-breadcrumb';
import { CelebratoryBanner } from './celebratory-banner';
import { DigitalPassCard } from './digital-pass-card';
import { ConfirmationActions } from './confirmation-actions';
import { ConciergeSupportCard } from './concierge-support-card';
import { useBookingDetail, useCustomerBookings } from '@/features/payments/api/queries';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Loader2 } from 'lucide-react';

interface BookingConfirmationPageProps {
  bookingId?: number;
}

export function BookingConfirmationPage({ bookingId }: BookingConfirmationPageProps) {
  const user = useAuthStore((state) => state.user);

  // If specific bookingId provided, query it
  const { data: specificBooking, isLoading: isLoadingSpecific } = useBookingDetail(bookingId ?? 0);

  // Fallback: If no bookingId provided, fetch latest confirmed booking for this user
  const { data: latestBookingsPage, isLoading: isLoadingLatest } = useCustomerBookings(
    bookingId ? undefined : { status: 'CONFIRMED', page: 0, size: 1, sort: 'createdAt,desc' }
  );

  const fallbackBooking = (latestBookingsPage?.content ?? latestBookingsPage?.listObjects ?? [])[0];
  const booking = specificBooking ?? fallbackBooking;
  const isLoading = bookingId ? isLoadingSpecific : isLoadingLatest;

  // Formatting helpers
  const orderRef = booking ? `#${booking.bookingCode}` : '#NX-8821';
  const email = user?.email || 'customer@nexspace.vn';

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

        {isLoading ? (
          <div className='mx-auto flex w-full max-w-[560px] flex-col items-center justify-center py-24'>
            <Loader2 className='h-8 w-8 animate-spin text-primary mb-3' />
            <p className='text-sm text-muted-foreground'>Đang tải thông tin vé điện tử...</p>
          </div>
        ) : (
          /* Centered Boarding Pass Column */
          <div className='mx-auto flex w-full max-w-[560px] flex-col items-center py-4'>
            {/* Celebratory Success Badge & Header */}
            <CelebratoryBanner
              orderRef={orderRef}
              email={email}
              paymentMethod='Paid via PayOS (VietQR)'
              dateStr={dateStr}
            />

            {/* Centered Digital Boarding Pass Ticket Container */}
            <DigitalPassCard
              seatCode={booking?.seatCode || 'Desk A-12'}
              zone={booking?.resourceName || 'Zone A'}
              hubName={booking?.workspaceName || 'Saigon Prime Hub'}
              address={booking?.workspaceAddress || '72 Le Thanh Ton, District 1, HCMC'}
              pinCode={booking?.pinCode || '8492'}
              wifiSsid='NexSpace-5G'
              wifiPass='sprint2026'
              dateStr={dateStr}
              timeSlot={timeSlot}
              qrTokenHash={booking?.qrTokenHash}
            />

            {/* Action Buttons Grid */}
            <ConfirmationActions orderRef={orderRef} bookingId={booking?.bookingId} />

            {/* Reassurance & Support Card */}
            <ConciergeSupportCard />

            {/* Footprint Identity String */}
            <div className='text-muted-foreground mt-8 text-center text-[11px] pb-4'>
              © 2026 NexSpace Technologies Inc. All rights reserved. Commercial Real Estate Cloud &amp; Marketplace.
            </div>
          </div>
        )}
      </main>

      {/* Global Shared Footer */}
      <Footer />
    </div>
  );
}
