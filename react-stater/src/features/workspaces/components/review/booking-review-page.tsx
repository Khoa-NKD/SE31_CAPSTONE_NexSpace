import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { ReviewHeader } from './review-header';
import { HoldUrgencyBanner } from './hold-urgency-banner';
import { BookingSummaryCard } from './booking-summary-card';
import { BookerInfoCard } from './booker-info-card';
import { CancellationPolicyCard } from './cancellation-policy-card';
import { PriceBreakdownCard } from './price-breakdown-card';

export function BookingReviewPage() {
  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
      {/* Shared Global Workspace Navigation Bar */}
      <WorkspaceHeader />

      {/* Main Workspace Canvas (Strict 1200px container discipline) */}
      <main className='mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 lg:px-8'>
        {/* Breadcrumb Hierarchy */}
        <ReviewHeader />

        {/* 10-Minute Hold Urgency Top Banner */}
        <HoldUrgencyBanner seatCode='Desk A-12' />

        {/* 2-Column Checkout Layout (60% Left Review details / 40% Right Sticky Price Card) */}
        <div className='grid grid-cols-1 items-start gap-8 lg:grid-cols-12'>
          {/* Left Column (7 cols ~ 60%) */}
          <div className='space-y-6 lg:col-span-7'>
            <BookingSummaryCard />
            <BookerInfoCard />
            <CancellationPolicyCard />
          </div>

          {/* Right Column (5 cols ~ 40% - Sticky Card) */}
          <div className='lg:col-span-5'>
            <PriceBreakdownCard />
          </div>
        </div>
      </main>

      {/* Shared Global Directory Footer */}
      <Footer />
    </div>
  );
}

