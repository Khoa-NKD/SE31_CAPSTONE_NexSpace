import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { ResourceTypePhoto } from '../api/resource-type-photos';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxBytes = 5 * 1024 * 1024;

function PhotoPreview({ photo, alt }: { photo: ResourceTypePhoto; alt: string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (typeof photo === 'string' || !image.current) return;
    const url = URL.createObjectURL(photo);
    image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  return (
    <img
      ref={image}
      src={typeof photo === 'string' ? photo : undefined}
      alt={alt}
      className='aspect-[4/3] w-full object-cover'
    />
  );
}

export function ResourceTypePhotoField<T extends ResourceTypePhoto>({
  photos,
  onChange,
  disabled
}: {
  photos: readonly T[];
  onChange: (photos: Array<T | File>) => void;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [error, setError] = useState('');
  const add = (files: File[]) => {
    if (photos.length + files.length > 3) {
      setError(c('Choose up to 3 photos.', 'Chọn tối đa 3 ảnh.'));
      return;
    }
    if (
      files.some((file) => !imageTypes.includes(file.type) || !file.size || file.size > maxBytes)
    ) {
      setError(
        c(
          'Use JPG, PNG or WebP, up to 5 MB per photo.',
          'Dùng ảnh JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.'
        )
      );
      return;
    }
    setError('');
    onChange([...photos, ...files]);
  };
  return (
    <fieldset disabled={disabled} className='space-y-2 rounded-xl border border-border p-3'>
      <legend className='px-1 text-xs font-semibold'>{c('Type photos', 'Ảnh loại chỗ')}</legend>
      <p className='text-xs text-muted-foreground'>
        {c(
          'Optional. Up to 3 photos shared by seats and rooms of this type.',
          'Tùy chọn. Tối đa 3 ảnh dùng chung cho ghế/phòng thuộc loại này.'
        )}
      </p>
      {photos.length > 0 && (
        <div className='grid grid-cols-3 gap-2'>
          {photos.map((photo, index) => (
            <div
              key={index}
              className='overflow-hidden rounded-lg border border-border bg-background'
            >
              <PhotoPreview photo={photo} alt={`${c('Photo', 'Ảnh')} ${index + 1}`} />
              <div className='flex items-center justify-between gap-1 px-1 py-1'>
                {index === 0 ? (
                  <span className='px-1 text-[10px] font-medium'>{c('Main', 'Ảnh chính')}</span>
                ) : (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    aria-label={c('Set as main photo', 'Đặt làm ảnh chính')}
                    onClick={() => onChange([photo, ...photos.filter((_, i) => i !== index)])}
                  >
                    <Star className='size-3.5' />
                  </Button>
                )}
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  aria-label={`${c('Remove photo', 'Xóa ảnh')} ${index + 1}`}
                  onClick={() => {
                    setError('');
                    onChange(photos.filter((_, i) => i !== index));
                  }}
                >
                  <X className='size-3.5' />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {photos.length < 3 && (
        <label className='inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-ring'>
          <ImagePlus className='size-4' />
          {c('Add photos', 'Thêm ảnh')}
          <input
            type='file'
            multiple
            accept={imageTypes.join(',')}
            className='sr-only'
            onChange={(event) => {
              add(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = '';
            }}
          />
        </label>
      )}
      {error && (
        <p role='alert' className='text-xs text-destructive'>
          {error}
        </p>
      )}
    </fieldset>
  );
}
