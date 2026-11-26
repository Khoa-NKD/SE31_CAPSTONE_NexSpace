import { useState } from 'react';
import { Sun, RotateCcw } from '@/components/ui/hugeicons';
import { SeatTourModal } from './seat-tour-modal';

interface SeatPhotoGalleryProps {
  photos?: string[];
  resource?: {
    code?: string;
    name?: string;
    category?: string;
    zoneName?: string;
    typeName?: string;
  } | null;
  floor?: {
    name?: string;
    floorNumber?: number;
  } | null;
  workspaceCover?: string;
}

const FALLBACK_PHOTO = '/placeholder.svg';

export function SeatPhotoGallery({ photos, resource, floor, workspaceCover }: SeatPhotoGalleryProps) {
  const [tourOpen, setTourOpen] = useState(false);

  const displayPhotos =
    photos && photos.length > 0
      ? photos
      : workspaceCover
        ? [workspaceCover]
        : [FALLBACK_PHOTO];

  const primaryShot = displayPhotos[0];
  const sideShot1 = displayPhotos[1] || displayPhotos[0];
  const sideShot2 = displayPhotos[2] || displayPhotos[1] || displayPhotos[0];
  const extraCount = Math.max(0, displayPhotos.length - 3);

  const categoryLabel = resource?.category === 'ROOM' ? 'Phòng họp' : 'Chỗ ngồi';
  const locationParts = [floor?.name, resource?.zoneName || resource?.typeName].filter(Boolean);
  const locationLabel = locationParts.length > 0 ? locationParts.join(' • ') : 'Khu vực làm việc';

  const resourceTitle = resource?.name
    ? resource.code
      ? `${resource.name} (${resource.code})`
      : resource.name
    : resource?.code || 'Vị trí làm việc';

  return (
    <>
      <div className='bg-card border-border shadow-xs relative overflow-hidden rounded-xl border p-3'>
        <div className='grid h-[380px] grid-cols-1 gap-3 sm:h-[420px] md:grid-cols-3'>
          {/* Primary Main Shot */}
          <div className='group relative overflow-hidden rounded-lg md:col-span-2 bg-muted/30'>
            <img
              alt={resourceTitle}
              className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
              src={primaryShot}
            />
            {/* Overlay Badges */}
            <div className='absolute top-4 left-4 flex flex-wrap gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
                <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                {resource?.code ? `${resource.code} • ` : ''}{categoryLabel} Sẵn sàng
              </span>
              <span className='bg-background/85 text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md border border-border/50'>
                <Sun className='text-amber-500 h-3 w-3' />
                {locationLabel}
              </span>
            </div>

            {/* 360 Virtual Tour Button */}
            <button
              type='button'
              onClick={() => setTourOpen(true)}
              className='bg-background/90 border-border text-foreground hover:bg-muted active:scale-95 absolute bottom-4 left-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-md backdrop-blur-md transition-all'
            >
              <RotateCcw className='text-primary h-3.5 w-3.5' />
              <span>Xem ảnh chi tiết &amp; Không gian</span>
            </button>
          </div>

          {/* Side Secondary Shots Stack */}
          <div className='hidden grid-rows-2 gap-3 md:grid'>
            {/* Side 1 */}
            <div className='group relative overflow-hidden rounded-lg bg-muted/30'>
              <img
                alt={resourceTitle}
                className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                src={sideShot1}
              />
              <span className='bg-background/80 text-foreground border-border/60 absolute bottom-2 left-2 rounded border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs'>
                {resource?.typeName || 'Không gian tiêu chuẩn'}
              </span>
            </div>

            {/* Side 2 */}
            <div className='group relative overflow-hidden rounded-lg bg-muted/30'>
              <img
                alt={resourceTitle}
                className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                src={sideShot2}
              />
              <span className='bg-background/80 text-foreground border-border/60 absolute bottom-2 left-2 rounded border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs'>
                {resource?.zoneName || 'Khu vực làm việc'}
              </span>
              {extraCount > 0 && (
                <button
                  type='button'
                  onClick={() => setTourOpen(true)}
                  className='bg-background/90 text-foreground border-border/70 hover:bg-muted absolute right-2 bottom-2 cursor-pointer rounded border px-2.5 py-1 text-[10px] font-semibold'
                >
                  +{extraCount} Hình ảnh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <SeatTourModal
        open={tourOpen}
        onOpenChange={setTourOpen}
        photos={displayPhotos}
        title={resourceTitle}
      />
    </>
  );
}
