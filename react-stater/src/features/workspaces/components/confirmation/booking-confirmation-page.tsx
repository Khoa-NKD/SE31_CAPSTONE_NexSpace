import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { ConfirmationBreadcrumb } from './confirmation-breadcrumb';
import { CelebratoryBanner } from './celebratory-banner';
import { DigitalPassCard } from './digital-pass-card';
import { ConfirmationActions } from './confirmation-actions';
import { ConciergeSupportCard } from './concierge-support-card';
import { useBookingByCodeQuery, useBookingByIdQuery } from '../../api/booking-queries';
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
  orderRef,
  bookingId
}: BookingConfirmationPageProps) {
  const code = (bookingCode || orderRef?.replace('#', '') || '').trim();

  const { data: bookingByCode, isLoading: loadingByCode, error: errorByCode } = useBookingByCodeQuery(code || null);
  const { data: bookingById, isLoading: loadingById, error: errorById } = useBookingByIdQuery(bookingId || null);

  const booking = bookingById || bookingByCode;
  const isLoading = (Boolean(bookingId) && loadingById) || (Boolean(code) && loadingByCode);
  const error = bookingId ? errorById : errorByCode;

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
        <ConfirmationBreadcrumb orderRef={code ? `#${code}` : '#NX-PASS'} />

        {/* Loading State */}
        {isLoading && (
          <div className='flex min-h-[400px] flex-col items-center justify-center gap-3 text-center'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-sm text-muted-foreground'>
              Retrieving verified booking pass and security token...
            </p>
          </div>
        )}

        {/* Not Found / Error State (if code was provided but invalid) */}
        {!isLoading && (error || (!booking && code)) && (
          <div className='mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xs'>
            <TicketX className='mx-auto size-12 text-muted-foreground mb-4' />
            <h2 className='text-lg font-bold'>Booking Not Found</h2>
            <p className='mt-2 text-xs text-muted-foreground'>
              We could not find a booking matching code <span className='font-mono font-bold'>{code}</span>.
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
              orderRef={booking.bookingCode}
              email={booking.customerEmail || 'Customer Email'}
              paymentMethod={
                booking.status === 'CONFIRMED'
                  ? 'Paid via PayOS (VietQR)'
                  : `Status: ${booking.status} (15m Hold)`
              }
              dateStr={formatDate(booking.startTime)}
              status={booking.status}
            />

            {/* Centered Digital Boarding Pass Ticket Container */}
            <DigitalPassCard
              seatCode={booking.resourceCode || 'Station'}
              zone={`${booking.floorName || 'Level 14'} • ${booking.zoneName || 'Quiet Zone'}`}
              hubName={booking.workspaceName || 'NexSpace Prime Hub'}
              address={
                booking.workspaceAddress ||
                [booking.workspaceDistrict, booking.workspaceCity].filter(Boolean).join(', ') ||
                'Ho Chi Minh City'
              }
              pinCode={booking.bookingCode.replace(/\D/g, '').slice(-4) || '8492'}
              wifiSsid='NexSpace-5G'
              wifiPass='sprint2026'
              startTime={booking.startTime}
              endTime={booking.endTime}
              holdExpiresAt={booking.holdExpiresAt}
              status={booking.status}
              qrTokenHash={booking.qrTokenHash}
              bookingCode={booking.bookingCode}
            />

            {/* Action Buttons Grid */}
            <ConfirmationActions orderRef={`#${booking.bookingCode}`} />

            {/* Reassurance & Support Card */}
            <ConciergeSupportCard />

            {/* Footprint Identity String */}
            <div className='text-muted-foreground mt-8 text-center text-[11px] pb-4'>
              © 2026 NexSpace Technologies Inc. All rights reserved. Commercial Real Estate Cloud &amp; Marketplace.
            </div>
          </div>
        )}

        {/* Fallback Demo State when no booking code was supplied */}
        {!isLoading && !booking && !code && (
          <div className='mx-auto flex w-full max-w-[560px] flex-col items-center py-4'>
            <CelebratoryBanner
              orderRef='NX-DEMO-PASS'
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

function formatDate(isoStr?: string) {
  if (!isoStr) return 'Today';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'Today';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
