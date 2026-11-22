import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Star, Upload, X } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [returnToFullscreen, setReturnToFullscreen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickerFullscreen = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    let frame = 0;
    const finishPicking = () => {
      if (input.dataset.filePickerOpen !== 'true') return;
      cancelAnimationFrame(frame);
      // Let the picker consume its Escape event before the studio handles keyboard shortcuts.
      frame = requestAnimationFrame(() => {
        delete input.dataset.filePickerOpen;
      });
    };
    input.addEventListener('cancel', finishPicking);
    window.addEventListener('focus', finishPicking);
    return () => {
      cancelAnimationFrame(frame);
      input.removeEventListener('cancel', finishPicking);
      window.removeEventListener('focus', finishPicking);
    };
  }, [photos.length]);
  const validate = (files: File[]) => {
    if (photos.length + files.length > 3) {
      setError(c('Choose up to 3 photos.', 'Chọn tối đa 3 ảnh.'));
      return false;
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
      return false;
    }
    setError('');
    return true;
  };
  const stage = (files: File[]) => {
    if (disabled || !files.length) return;
    const next = [...selectedFiles, ...files];
    if (validate(next)) setSelectedFiles(next);
  };
  const closePicker = () => {
    setPickerOpen(false);
    setSelectedFiles([]);
    setError('');
  };
  const openPicker = () => {
    // Open an in-page chooser first. Chrome deliberately exits fullscreen for
    // native file dialogs; drag/drop and paste do not require that dialog.
    const fullscreen = document.fullscreenElement;
    pickerFullscreen.current =
      fullscreen instanceof HTMLElement
        ? fullscreen
        : document.querySelector('[data-canvas-expanded="true"]')
          ? document.documentElement
          : null;
    setReturnToFullscreen(!!pickerFullscreen.current);
    setSelectedFiles([]);
    setError('');
    setPickerOpen(true);
  };
  const restoreFromClick = () => {
    const root = pickerFullscreen.current;
    // This request runs synchronously from an explicit confirmation click,
    // rather than relying on user activation after a native change/focus event.
    if (root?.isConnected && !document.fullscreenElement) {
      void root.requestFullscreen().catch(() => {
        toast.info(
          c(
            'Use the fullscreen button if your browser blocks restoration.',
            'Bấm mở lại toàn màn hình nếu trình duyệt chặn khôi phục.'
          )
        );
      });
    }
  };
  const confirmPhotos = () => {
    if (disabled || !selectedFiles.length || !validate(selectedFiles)) return;
    restoreFromClick();
    onChange([...photos, ...selectedFiles]);
    closePicker();
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
        <div className='inline-flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
          >
            <ImagePlus className='size-4' />
            {c('Add photos', 'Thêm ảnh')}
          </Button>
          <input
            ref={fileInput}
            type='file'
            multiple
            accept={imageTypes.join(',')}
            className='sr-only'
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation();
              const input = event.currentTarget;
              const files = Array.from(input.files ?? []);
              delete input.dataset.filePickerOpen;
              input.value = '';
              stage(files);
            }}
          />
        </div>
      )}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) closePicker();
        }}
      >
        <DialogContent
          className='max-h-[90dvh] overflow-y-auto sm:max-w-xl'
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            stage(Array.from(event.dataTransfer.files));
          }}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files);
            if (!files.length) return;
            event.preventDefault();
            event.stopPropagation();
            stage(files);
          }}
        >
          <DialogHeader>
            <DialogTitle>{c('Add type photos', 'Thêm ảnh loại chỗ')}</DialogTitle>
            <DialogDescription>
              {c(
                'Choose up to 3 JPG, PNG or WebP photos, up to 5 MB each.',
                'Tối đa 3 ảnh JPG, PNG hoặc WebP, mỗi ảnh không quá 5 MB.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 px-5 py-6 text-center'>
            <Upload className='mx-auto size-8 text-primary' />
            <p className='text-sm font-medium'>
              {c(
                'Drop photos here or paste with Ctrl / Cmd + V',
                'Kéo thả ảnh vào đây hoặc dán bằng Ctrl / Cmd + V'
              )}
            </p>
            <Button
              type='button'
              variant='outline'
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                const input = fileInput.current;
                if (!input) return;
                input.dataset.filePickerOpen = 'true';
                try {
                  input.click();
                } catch {
                  delete input.dataset.filePickerOpen;
                  setError(
                    c(
                      'Could not open the photo picker. Try again.',
                      'Không mở được cửa sổ chọn ảnh. Vui lòng thử lại.'
                    )
                  );
                }
              }}
            >
              {c('Choose from computer', 'Chọn ảnh từ máy')}
            </Button>
            {returnToFullscreen && (
              <p className='text-xs leading-5 text-muted-foreground'>
                {c(
                  'Drop or paste to stay fullscreen. After choosing files from your computer, confirm below to return to fullscreen.',
                  'Kéo thả hoặc dán ảnh để giữ toàn màn hình. Nếu chọn ảnh từ máy, bấm Dùng ảnh bên dưới để trở lại toàn màn hình.'
                )}
              </p>
            )}
          </div>
          {selectedFiles.length > 0 && (
            <div className='grid grid-cols-3 gap-3'>
              {selectedFiles.map((photo, index) => (
                <div key={index} className='overflow-hidden rounded-xl border bg-muted/10'>
                  <PhotoPreview
                    photo={photo}
                    alt={`${c('Selected photo', 'Ảnh đã chọn')} ${index + 1}`}
                  />
                  <div className='flex items-center justify-between gap-1 p-2'>
                    <span className='truncate text-xs' title={photo.name}>
                      {photo.name}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-7 shrink-0'
                      disabled={disabled}
                      aria-label={`${c('Remove selected photo', 'Bỏ ảnh đã chọn')} ${index + 1}`}
                      onClick={() => {
                        setSelectedFiles(selectedFiles.filter((_, current) => current !== index));
                        setError('');
                      }}
                    >
                      <X className='size-3.5' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
            <span className='text-xs text-muted-foreground'>
              {c('Selected', 'Đã chọn')}: {selectedFiles.length} / {Math.max(0, 3 - photos.length)}
            </span>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  restoreFromClick();
                  closePicker();
                }}
              >
                {c('Cancel', 'Hủy')}
              </Button>
              <Button
                type='button'
                disabled={disabled || !selectedFiles.length}
                onClick={confirmPhotos}
              >
                {returnToFullscreen
                  ? c('Use photos and return to fullscreen', 'Dùng ảnh và trở lại toàn màn hình')
                  : c('Use photos', 'Dùng ảnh')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {error && !pickerOpen && (
        <p role='alert' className='text-xs text-destructive'>
          {error}
        </p>
      )}
    </fieldset>
  );
}
