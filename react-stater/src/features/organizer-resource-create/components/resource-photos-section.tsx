import React, { useRef } from 'react';
import {
  UploadCloud,
  Star,
  Trash2,
  ImagePlus
} from 'lucide-react';
import { toast } from 'sonner';
import { ResourcePhoto } from '../types';
import { cn } from '@/lib/utils';

interface ResourcePhotosSectionProps {
  photos: ResourcePhoto[];
  onSetPrimary: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onAddPhoto: (newPhoto: ResourcePhoto) => void;
}

export function ResourcePhotosSection({
  photos,
  onSetPrimary,
  onDeletePhoto,
  onAddPhoto
}: ResourcePhotosSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    const newPhoto: ResourcePhoto = {
      id: `photo-${Date.now()}`,
      url: objectUrl,
      label: file.name.replace(/\.[^/.]+$/, '').slice(0, 20),
      isPrimary: photos.length === 0
    };

    onAddPhoto(newPhoto);
    toast.success('Photo uploaded successfully', {
      description: `Added "${file.name}" to gallery.`
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleTriggerBrowse() {
    fileInputRef.current?.click();
  }

  return (
    <section className='border-t border-border pt-6 space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-foreground'>
          Seat &amp; Room Photography
        </h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Upload real photos of this specific desk or room to build customer trust and drive bookings.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png, image/jpeg, image/webp'
        className='hidden'
        onChange={handleFileSelect}
      />

      {/* Drag & Drop Upload Zone */}
      <div
        role='button'
        tabIndex={0}
        onClick={handleTriggerBrowse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerBrowse();
          }
        }}
        className='border-2 border-dashed border-border hover:border-primary/60 bg-muted/30 hover:bg-muted/50 rounded-xl p-6 text-center transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      >
        <div className='size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform'>
          <UploadCloud className='size-6' aria-hidden='true' />
        </div>
        <div className='text-sm font-semibold text-foreground'>
          Drop high-res photos here or <span className='text-primary underline font-bold'>Browse</span>
        </div>
        <p className='text-xs text-muted-foreground mt-1'>
          Supports PNG, JPG, WEBP up to 10MB each
        </p>
        <p className='text-[11px] text-muted-foreground/80 mt-2'>
          Recommended: 1 wide desk shot, 1 view from seat, 1 detail shot of monitor/power outlet.
        </p>
      </div>

      {/* Photo Gallery Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        {photos.map((photo) => (
          <div
            key={photo.id}
            className='relative rounded-xl overflow-hidden group aspect-[4/3] border border-border bg-card shadow-2xs'
          >
            <img
              src={photo.url}
              alt={photo.label}
              className='size-full object-cover transition-transform duration-300 group-hover:scale-105'
              loading='lazy'
            />

            {/* Badges */}
            {photo.isPrimary ? (
              <span className='absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1'>
                <Star className='size-2.5 fill-current' aria-hidden='true' />
                PRIMARY PHOTO
              </span>
            ) : (
              <span className='absolute bottom-2 left-2 bg-background/90 text-foreground text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-xs border border-border/60 shadow-xs'>
                {photo.label}
              </span>
            )}

            {/* Hover Action Overlay */}
            <div className='absolute inset-0 bg-background/60 dark:bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs'>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPrimary(photo.id);
                  toast.success('Primary photo updated', {
                    description: `"${photo.label}" is now set as the primary cover photo.`
                  });
                }}
                className={cn(
                  'size-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 cursor-pointer',
                  photo.isPrimary
                    ? 'bg-amber-500 text-white'
                    : 'bg-card text-muted-foreground hover:text-amber-500 border border-border'
                )}
                title='Set as primary cover'
                aria-label={`Set ${photo.label} as primary cover`}
              >
                <Star className={cn('size-4', photo.isPrimary && 'fill-current')} />
              </button>

              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePhoto(photo.id);
                  toast.info('Photo removed', {
                    description: `Removed "${photo.label}".`
                  });
                }}
                className='size-8 rounded-full bg-card hover:bg-destructive hover:text-destructive-foreground text-destructive border border-border flex items-center justify-center shadow-sm transition-all hover:scale-110 cursor-pointer'
                title='Delete photo'
                aria-label={`Delete ${photo.label}`}
              >
                <Trash2 className='size-4' />
              </button>
            </div>
          </div>
        ))}

        {/* Add Photo Card Placeholder */}
        <button
          type='button'
          onClick={handleTriggerBrowse}
          className='border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 rounded-xl flex flex-col items-center justify-center aspect-[4/3] cursor-pointer transition-all group'
          aria-label='Add photo to gallery'
        >
          <div className='size-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all'>
            <ImagePlus className='size-5' />
          </div>
          <span className='text-xs font-semibold text-muted-foreground group-hover:text-foreground mt-2'>
            + Add Photo
          </span>
        </button>
      </div>
    </section>
  );
}

