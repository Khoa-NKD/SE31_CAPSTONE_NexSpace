import React from 'react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { WorkspaceGallery } from './workspace-gallery';
import { WorkspaceInfo } from './workspace-info';
import { WorkspaceBookingCard } from './workspace-booking-card';

export function WorkspaceDetailPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <WorkspaceHeader />
      
      {/* Main Viewport Container (1200px container discipline) */}
      <main className="max-w-[1200px] w-full mx-auto px-6 lg:px-8 pt-6 pb-20 flex-1">
        <WorkspaceGallery />
        
        {/* Main Content Area (2-Column Layout, 65% Left details, 35% Right sticky booking card, gap-8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <WorkspaceInfo />
          <WorkspaceBookingCard />
        </div>
      </main>

      <Footer />
    </div>
  );
}

