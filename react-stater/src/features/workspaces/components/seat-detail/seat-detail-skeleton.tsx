import { Skeleton } from '@/components/ui/skeleton';

export function SeatDetailSkeleton() {
  return (
    <div className='w-full animate-pulse'>
      {/* Header / Breadcrumb strip skeleton */}
      <div className='w-full border-b border-border/60 bg-card py-3.5'>
        <div className='mx-auto flex max-w-[1200px] items-center justify-between px-6 lg:px-8'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-4 w-20' />
            <span className='text-muted-foreground/40'>/</span>
            <Skeleton className='h-4 w-16' />
            <span className='text-muted-foreground/40'>/</span>
            <Skeleton className='h-4 w-32' />
            <span className='text-muted-foreground/40'>/</span>
            <Skeleton className='h-4 w-24' />
          </div>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-20 rounded-lg' />
            <Skeleton className='h-8 w-16 rounded-lg' />
          </div>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className='mx-auto w-full max-w-[1200px] px-6 py-8 lg:px-8'>
        <div className='grid grid-cols-1 items-start gap-8 lg:grid-cols-12'>
          {/* Left Column (8 cols) */}
          <div className='flex flex-col gap-8 lg:col-span-8'>
            {/* Gallery Skeleton */}
            <div className='rounded-xl border border-border bg-card p-3 shadow-xs'>
              <div className='grid h-[380px] grid-cols-1 gap-3 sm:h-[420px] md:grid-cols-3'>
                <Skeleton className='h-full w-full rounded-lg md:col-span-2' />
                <div className='hidden grid-rows-2 gap-3 md:grid'>
                  <Skeleton className='h-full w-full rounded-lg' />
                  <Skeleton className='h-full w-full rounded-lg' />
                </div>
              </div>
            </div>

            {/* Meta Strip Skeleton */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-xs space-y-5'>
              <div className='flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-5 w-24 rounded-full' />
                    <Skeleton className='h-4 w-20' />
                  </div>
                  <Skeleton className='h-7 w-64 sm:w-80' />
                  <Skeleton className='h-4 w-48' />
                </div>
                <Skeleton className='h-12 w-28 rounded-lg' />
              </div>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <Skeleton className='h-16 rounded-lg' />
                <Skeleton className='h-16 rounded-lg' />
                <Skeleton className='h-16 rounded-lg' />
                <Skeleton className='h-16 rounded-lg' />
              </div>
            </div>

            {/* Specs Grid Skeleton */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-xs space-y-5'>
              <div className='flex items-center justify-between border-b border-border/60 pb-4'>
                <div className='space-y-1.5'>
                  <Skeleton className='h-5 w-48' />
                  <Skeleton className='h-3.5 w-72' />
                </div>
                <Skeleton className='h-6 w-32 rounded' />
              </div>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <Skeleton className='h-20 rounded-xl' />
                <Skeleton className='h-20 rounded-xl' />
                <Skeleton className='h-20 rounded-xl' />
                <Skeleton className='h-20 rounded-xl' />
              </div>
            </div>

            {/* Proximity Map Skeleton */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-xs space-y-5'>
              <div className='space-y-1.5'>
                <Skeleton className='h-5 w-56' />
                <Skeleton className='h-3.5 w-64' />
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <Skeleton className='h-16 rounded-lg' />
                <Skeleton className='h-16 rounded-lg' />
                <Skeleton className='h-16 rounded-lg' />
              </div>
              <Skeleton className='h-48 w-full rounded-xl' />
            </div>

            {/* Reviews Bento Skeleton */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-xs space-y-6'>
              <div className='flex items-center justify-between border-b border-border/60 pb-5'>
                <div className='space-y-1.5'>
                  <Skeleton className='h-5 w-48' />
                  <Skeleton className='h-3.5 w-64' />
                </div>
                <Skeleton className='h-9 w-28 rounded-lg' />
              </div>
              <Skeleton className='h-28 w-full rounded-xl' />
              <div className='space-y-4 pt-2'>
                <Skeleton className='h-24 w-full rounded-lg' />
                <Skeleton className='h-24 w-full rounded-lg' />
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) - Sticky Reservation Widget Skeleton */}
          <div className='lg:col-span-4'>
            <div className='rounded-xl border border-border bg-card p-6 shadow-md space-y-5'>
              <div className='flex items-baseline justify-between border-b border-border/60 pb-4'>
                <Skeleton className='h-8 w-32' />
                <Skeleton className='h-4 w-12' />
              </div>
              <Skeleton className='h-10 w-full rounded-lg' />
              <Skeleton className='h-16 w-full rounded-xl' />
              <Skeleton className='h-12 w-full rounded-lg' />
              <div className='space-y-2 border-b border-border/60 pb-4'>
                <div className='flex justify-between'>
                  <Skeleton className='h-4 w-28' />
                  <Skeleton className='h-4 w-20' />
                </div>
                <div className='flex justify-between'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-4 w-16' />
                </div>
                <div className='flex justify-between pt-2'>
                  <Skeleton className='h-6 w-32' />
                  <Skeleton className='h-6 w-28' />
                </div>
              </div>
              <Skeleton className='h-11 w-full rounded-lg' />
              <div className='space-y-2 pt-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
