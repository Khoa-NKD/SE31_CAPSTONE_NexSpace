import { useState } from 'react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { SeatDetailHeader } from './seat-detail-header';
import { SeatPhotoGallery } from './seat-photo-gallery';
import { SeatMetaStrip } from './seat-meta-strip';
import { SeatSpecsGrid } from './seat-specs-grid';
import { SeatProximityMap } from './seat-proximity-map';
import { SeatReviewsBento } from './seat-reviews-bento';
import { SeatReservationWidget } from './seat-reservation-widget';

export function SeatDetailPage() {
  const [monitorAddonSelected, setMonitorAddonSelected] = useState(false);

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
      {/* Top Application Bar */}
      <WorkspaceHeader />

      {/* Breadcrumbs & Actions Utility Bar */}
      <SeatDetailHeader />

      {/* Main 2-Column Workspace Details View (1200px container discipline) */}
      <main className='mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 lg:px-8'>
        <div className='grid grid-cols-1 items-start gap-8 lg:grid-cols-12'>
          {/* Left Column: 65% (8 cols) */}
          <section className='flex flex-col gap-8 lg:col-span-8'>
            <SeatPhotoGallery />
            <SeatMetaStrip />
            <SeatSpecsGrid
              monitorAddonSelected={monitorAddonSelected}
              onToggleMonitorAddon={() => setMonitorAddonSelected(!monitorAddonSelected)}
            />
            <SeatProximityMap />
            <SeatReviewsBento />
          </section>

          {/* Right Column: 35% (4 cols) - Sticky Reservation Widget */}
          <div className='lg:col-span-4'>
            <SeatReservationWidget monitorAddonSelected={monitorAddonSelected} />
          </div>
        </div>
      </main>

      {/* Directory Footer */}
      <Footer />
    </div>
  );
}

