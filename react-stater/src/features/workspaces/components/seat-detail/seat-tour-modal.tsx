import { useState } from 'react';
import { X, View } from '@/components/ui/hugeicons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';

interface SeatTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos?: string[];
  title?: string;
}

export function SeatTourModal({ open, onOpenChange, photos = [], title }: SeatTourModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const displayPhotos = photos.length > 0 ? photos : ['/placeholder.svg'];
  const activePhoto = displayPhotos[selectedIndex] || displayPhotos[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-card border-border sm:max-w-[750px] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden'>
        <div className='border-border/60 flex items-center justify-between border-b p-4'>
          <DialogHeader className='p-0 text-left'>
            <DialogTitle className='text-foreground flex items-center gap-2 text-base font-bold'>
              <View className='h-4 w-4 text-primary' />
              Hình ảnh chi tiết không gian — {title || 'Vị trí làm việc'}
            </DialogTitle>
            <DialogDescription className='text-muted-foreground text-xs'>
              Xem cận cảnh không gian thực tế, thiết kế và góc nhìn làm việc.
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <button
              type='button'
              aria-label='Close tour'
              className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors active:scale-95'
            >
              <X className='h-4 w-4' />
            </button>
          </DialogClose>
        </div>

        <div className='p-4 space-y-4'>
          {/* Main Visualizer Canvas */}
          <div className='relative h-[380px] w-full overflow-hidden rounded-xl border border-border bg-black/90 flex items-center justify-center'>
            <img
              src={activePhoto}
              alt={title || 'Hình ảnh vị trí'}
              className='h-full w-full object-contain transition-opacity duration-300'
            />
            {/* Counter badge */}
            <div className='absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-background/85 px-3 py-1.5 text-xs font-semibold backdrop-blur-md'>
              <span>
                Ảnh {selectedIndex + 1} / {displayPhotos.length}
              </span>
            </div>
          </div>

          {/* Thumbnail switcher buttons if multiple */}
          {displayPhotos.length > 1 && (
            <div className='flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar'>
              {displayPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  type='button'
                  onClick={() => setSelectedIndex(idx)}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                    selectedIndex === idx
                      ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'border-border/60 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${idx + 1}`}
                    className='h-full w-full object-cover'
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
