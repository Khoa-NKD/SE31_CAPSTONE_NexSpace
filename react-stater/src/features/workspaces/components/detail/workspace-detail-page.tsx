import React from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { WorkspaceGallery } from './workspace-gallery';
import { WorkspaceInfo } from './workspace-info';
import { WorkspaceBookingCard } from './workspace-booking-card';
import { usePublicWorkspaceDetailQuery } from '../../api/queries';

export function WorkspaceDetailPage() {
  const params = useParams({ strict: false }) as { workspaceId?: string };
  const workspaceId = params.workspaceId;

  const { data: workspace, isLoading, isError, refetch } = usePublicWorkspaceDetailQuery(workspaceId || null);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
        <WorkspaceHeader />
        <main className="max-w-[1200px] w-full mx-auto px-6 lg:px-8 pt-8 pb-20 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Loading workspace details from NexSpace network...</span>
          </div>
          {/* Skeleton Hero */}
          <div className="w-full h-[400px] bg-muted rounded-2xl animate-pulse mb-8" />
          {/* Skeleton Details & Booking Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-8 bg-muted rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              <div className="h-32 bg-muted rounded-xl animate-pulse mt-6" />
            </div>
            <div className="lg:col-span-4 h-96 bg-muted rounded-2xl animate-pulse" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Unavailable / 404 / Error State
  if (isError || !workspace) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
        <WorkspaceHeader />
        <main className="max-w-[1200px] w-full mx-auto px-6 lg:px-8 py-24 flex-1 flex flex-col items-center justify-center text-center">
          <div className="size-16 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5 shadow-sm">
            <AlertTriangle className="size-8" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-2">
            Workspace Listing Unavailable
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            The workspace identifier <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground font-semibold">{workspaceId}</code> is currently unpublished, suspended, or does not exist on the NexSpace public marketplace.
          </p>
          <div className="flex items-center gap-3">
            <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-sm">
              <Link to="/workspaces">Browse Available Workspaces</Link>
            </Button>
            <Button variant="outline" onClick={() => refetch()} className="shadow-sm">
              Retry Connection
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Verified Active Workspace Presentation
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <WorkspaceHeader />
      
      {/* Main Viewport Container (1200px container discipline) */}
      <main className="max-w-[1200px] w-full mx-auto px-6 lg:px-8 pt-6 pb-20 flex-1">
        <WorkspaceGallery workspace={workspace} />
        
        {/* Main Content Area (2-Column Layout, 65% Left details, 35% Right sticky booking card, gap-8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <WorkspaceInfo workspace={workspace} />
          <WorkspaceBookingCard workspace={workspace} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

