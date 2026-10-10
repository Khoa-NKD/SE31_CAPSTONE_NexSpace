import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { ConfirmationBreadcrumb } from './confirmation-breadcrumb';
import { CelebratoryBanner } from './celebratory-banner';
import { DigitalPassCard } from './digital-pass-card';
import { ConfirmationActions } from './confirmation-actions';
import { ConciergeSupportCard } from './concierge-support-card';

export function BookingConfirmationPage() {
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
        <ConfirmationBreadcrumb orderRef='#NX-8821' />

        {/* Centered Boarding Pass Column */}
        <div className='mx-auto flex w-full max-w-[560px] flex-col items-center py-4'>
          {/* Celebratory Success Badge & Header */}
          <CelebratoryBanner
            orderRef='#NX-8821'
            email='minh.nguyen@enterprise.tech'
            paymentMethod='Paid via PayOS (VietQR)'
            dateStr='Jan 25, 2026'
          />

          {/* Centered Digital Boarding Pass Ticket Container */}
          <DigitalPassCard
            seatCode='Desk A-12'
            zone='Zone A'
            hubName='Saigon Prime Hub'
            address='72 Le Thanh Ton, District 1, HCMC'
            pinCode='8492'
            wifiSsid='NexSpace-5G'
            wifiPass='sprint2026'
          />

          {/* Action Buttons Grid */}
          <ConfirmationActions orderRef='#NX-8821' />

          {/* Reassurance & Support Card */}
          <ConciergeSupportCard />

          {/* Footprint Identity String */}
          <div className='text-muted-foreground mt-8 text-center text-[11px] pb-4'>
            © 2026 NexSpace Technologies Inc. All rights reserved. Commercial Real Estate Cloud &amp; Marketplace.
          </div>
        </div>
      </main>

      {/* Global Shared Footer */}
      <Footer />
    </div>
  );
}

