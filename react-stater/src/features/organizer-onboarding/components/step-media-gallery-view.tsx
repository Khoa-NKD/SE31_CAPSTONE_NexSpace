import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  CloudUpload,
  FolderOpen,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Check,
  Loader2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { mediaGallerySchema } from '../schemas/wizard-schemas';
import type { MediaItem } from '../types/wizard';
import { useUploadMediaMutation, workspaceService, workspaceQueryKeys } from '@/features/workspaces/api';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { isDurableMediaUrl } from '../utils/wizard-api-mapper';

export interface StepMediaGalleryViewProps {
  routeWorkspaceId?: string;
  routeMode?: 'create' | 'edit';
}

export function StepMediaGalleryView({ routeWorkspaceId, routeMode }: StepMediaGalleryViewProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMediaMutation = useUploadMediaMutation();
  const fileRefMap = useRef<Map<string, File>>(new Map());

  const {
    canonicalWorkspaceId,
    basicInfo,
    location,
    operatingHours,
    amenities,
    media,
    setMediaGallery,
    addMediaItem,
    updateMediaItem,
    removeMediaItem,
    setCoverPhoto,
    reorderMediaItems,
    saveDraft
  } = useWizardStore();
  const { saveDraftToServer, isSaving } = useWizardDraftSync();

  // Mode resolution:
  // If routeMode === 'create', strictly create mode (empty gallery, no server fetch).
  // If routeWorkspaceId exists, or if routeMode === 'edit' (with canonicalWorkspaceId), it is edit mode.
  const isExplicitCreate = routeMode === 'create';
  const hasRouteWsId = Boolean(routeWorkspaceId);
  const isEditMode = !isExplicitCreate && (hasRouteWsId || (routeMode === 'edit' && Boolean(canonicalWorkspaceId)));
  const activeWorkspaceId = isExplicitCreate ? undefined : (routeWorkspaceId || (routeMode === 'edit' ? canonicalWorkspaceId : undefined));
  const numericWsId = activeWorkspaceId ? Number(activeWorkspaceId.replace(/\D/g, '')) : undefined;

  // Fetch existing media from backend if in edit mode
  const {
    data: backendMediaList,
    isLoading: isLoadingBackendMedia
  } = useQuery({
    queryKey: workspaceQueryKeys.media(numericWsId || 0),
    queryFn: () => workspaceService.getWorkspaceMedia(numericWsId!),
    enabled: isEditMode && Boolean(numericWsId),
    staleTime: 10 * 1000
  });

  const hasHydratedBackendRef = useRef(false);

  useEffect(() => {
    if (!isEditMode || !backendMediaList || hasHydratedBackendRef.current) return;
    hasHydratedBackendRef.current = true;

    const mappedItems: MediaItem[] = backendMediaList.map((m) => ({
      id: String(m.id),
      url: m.url,
      name: `Photo #${m.id}`,
      caption: '',
      dimension: 'Standard High-Res',
      isCover: Boolean(m.cover ?? m.isCover),
      uploadStatus: 'uploaded' as const
    }));

    const coverItem = mappedItems.find((i) => i.isCover) || mappedItems[0];

    setMediaGallery({
      items: mappedItems,
      coverPhotoId: coverItem?.id || ''
    });
  }, [isEditMode, backendMediaList, setMediaGallery]);

  // In create mode: clear any legacy mock photos so the gallery starts completely empty
  useEffect(() => {
    if (!isEditMode) {
      const hasMockPhotos = media.items.some(
        (item) => item.id.startsWith('media-') && item.url.includes('unsplash.com')
      );
      if (hasMockPhotos) {
        setMediaGallery({ items: [], coverPhotoId: '' });
      }
    }
  }, [isEditMode, media.items, setMediaGallery]);

  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Derived progress
  const uploadedCount = media.items.length;
  const recommendedMin = 5;
  const maxPhotos = 20;
  const progressPercent = Math.min(100, Math.round((uploadedCount / recommendedMin) * 100));

  const uploadFileItem = async (id: string, file: File) => {
    try {
      updateMediaItem(id, { uploadStatus: 'uploading', uploadError: undefined });
      const res = await uploadMediaMutation.mutateAsync({
        file,
        filename: file.name
      });
      updateMediaItem(id, {
        url: res.url,
        uploadStatus: 'uploaded',
        uploadError: undefined
      });
      toast.success('Photo Uploaded', {
        description: `${file.name} successfully uploaded to media storage.`
      });
      // In edit mode: Synchronize newly durable media to server
      if (activeWorkspaceId) {
        await syncMediaToBackend(activeWorkspaceId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Media upload failed';
      updateMediaItem(id, {
        uploadStatus: 'error',
        uploadError: msg
      });
      toast.error('Upload Failed', {
        description: `Could not upload ${file.name}: ${msg}`
      });
    }
  };

  const handleRetryUpload = (id: string) => {
    const file = fileRefMap.current.get(id);
    if (!file) {
      toast.error('Cannot Retry', {
        description: 'File reference is not in memory. Please select the file again.'
      });
      return;
    }
    void uploadFileItem(id, file);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (uploadedCount + files.length > maxPhotos) {
      toast.error('Upload Limit Exceeded', {
        description: `You can upload up to ${maxPhotos} photos total. Please select fewer images.`
      });
      return;
    }

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit (BR-37)

    const filesToUpload: { id: string; file: File }[] = [];
    let addedCount = 0;
    Array.from(files).forEach((file) => {
      if (!acceptedTypes.includes(file.type)) {
        toast.error('Invalid File Type', {
          description: `${file.name} is not a supported format (PNG, JPG, WebP).`
        });
        return;
      }

      if (file.size > maxSizeBytes) {
        toast.error('File Too Large', {
          description: `${file.name} exceeds 5MB limit (BR-37). Please select an image under 5MB.`
        });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const isFirst = media.items.length === 0 && addedCount === 0;
      const itemId = `media-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      fileRefMap.current.set(itemId, file);

      const newItem: MediaItem = {
        id: itemId,
        url: objectUrl,
        name: file.name,
        dimension: 'High-Res Image',
        caption: file.name.replace(/\.[^/.]+$/, ''),
        size: file.size,
        isCover: isFirst,
        uploadStatus: 'uploading'
      };

      addMediaItem(newItem);
      filesToUpload.push({ id: itemId, file });
      addedCount++;
    });

    if (addedCount > 0) {
      setValidationError(null);
      for (const item of filesToUpload) {
        void uploadFileItem(item.id, item.file);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDeletePhoto = (id: string, name: string) => {
    fileRefMap.current.delete(id);
    removeMediaItem(id);
    toast.info('Photo Removed', {
      description: `${name} has been removed from the gallery.`
    });
    if (activeWorkspaceId) {
      setTimeout(() => {
        void syncMediaToBackend(activeWorkspaceId);
      }, 50);
    }
  };

  const handleSetCover = (id: string, name: string) => {
    setCoverPhoto(id);
    toast.success('Cover Photo Updated', {
      description: `${name} designated as primary cover photo.`
    });
    if (activeWorkspaceId) {
      setTimeout(() => {
        void syncMediaToBackend(activeWorkspaceId);
      }, 50);
    }
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? index - 1 : index + 1;
    reorderMediaItems(index, toIndex);
    if (activeWorkspaceId) {
      setTimeout(() => {
        void syncMediaToBackend(activeWorkspaceId);
      }, 50);
    }
  };

  // -----------------------------------------------------------------------------------------------
  // Synchronizes media gallery photos to backend
  // In edit mode: syncs directly to the workspace being edited.
  // In create mode: syncs once draft record is initialized.
  // -----------------------------------------------------------------------------------------------
  const syncMediaToBackend = async (workspaceIdStr?: string) => {
    const rawId = workspaceIdStr || activeWorkspaceId;
    if (!rawId) return;
    const numericMatch = rawId.match(/\d+/);
    const wsId = numericMatch ? Number(numericMatch[0]) : undefined;
    if (!wsId || Number.isNaN(wsId)) return;

    try {
      const currentMedia = useWizardStore.getState().media;
      const durableItems = currentMedia.items.filter((item) => isDurableMediaUrl(item.url));

      const items = durableItems.map((item, index) => ({
        url: item.url,
        isCover: item.id === currentMedia.coverPhotoId || item.isCover || (index === 0 && !currentMedia.coverPhotoId),
        displayOrder: index,
        mediaType: 'IMAGE' as const
      }));

      await workspaceService.syncWorkspaceMedia(wsId, { items });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.media(wsId)
      });
      toast.success('Gallery Photos Synced', {
        description: `Successfully synchronized ${items.length} photos to workspace #${wsId}.`
      });
    } catch (err: unknown) {
      console.warn('Could not sync workspace gallery photos to backend:', err);
    }
  };

  const handleSaveDraft = async () => {
    saveDraft();
    if (activeWorkspaceId) {
      await syncMediaToBackend(activeWorkspaceId);
    } else {
      const updated = await saveDraftToServer();
      const targetId = updated?.id || canonicalWorkspaceId;
      if (targetId) {
        await syncMediaToBackend(targetId);
      }
    }
  };

  const handleBack = () => {
    saveDraft();
    router.navigate({
      to: '/dashboard/organizer/workspaces/create/amenities',
      search: (prev) => prev
    });
  };

  const handleCompleteReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (media.items.some((i) => i.uploadStatus === 'uploading')) {
      toast.error('Upload in Progress', {
        description: 'Please wait for all photo uploads to finish before completing.'
      });
      return;
    }

    if (media.items.some((i) => i.uploadStatus === 'error')) {
      toast.error('Upload Incomplete', {
        description: 'One or more photos failed to upload. Please retry or remove them.'
      });
      return;
    }

    const hasDurable = media.items.some((i) => isDurableMediaUrl(i.url));
    if (!hasDurable && media.items.length > 0) {
      const err = 'Uploaded photos are still in local preview mode. Please wait for upload to complete.';
      setValidationError(err);
      toast.error('Media Validation Required', { description: err });
      return;
    }

    const result = mediaGallerySchema.safeParse(media);
    if (!result.success) {
      const err =
        result.error.issues[0]?.message ||
        'Please add at least 1 photo for your workspace gallery.';
      setValidationError(err);
      toast.error('Media Validation Required', {
        description: err
      });
      return;
    }

    setValidationError(null);
    saveDraft();
    if (activeWorkspaceId) {
      await syncMediaToBackend(activeWorkspaceId);
    } else {
      const updated = await saveDraftToServer({ silent: true });
      const targetId = updated?.id || canonicalWorkspaceId;
      if (targetId) {
        await syncMediaToBackend(targetId);
      }
    }
    setIsCompletionModalOpen(true);
  };

  return (
    <div className='w-full max-w-6xl mx-auto py-2 sm:py-4 flex flex-col justify-between'>
      <div>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/png,image/jpeg,image/webp'
          multiple
          className='hidden'
          onChange={(e) => handleFileSelect(e.target.files)}
          aria-label='Upload workspace photos'
        />

        {/* Wizard Header Bar */}
        <WizardHeader currentStep={5} />

        {/* Wizard Stepper */}
        <WizardStepper currentStep={5} />

        {/* Page Title & Subtitle Banner */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Workspace Media Gallery &amp; Cover Photo
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              High-quality photography directly correlates with customer booking confidence and search placement.
            </p>
          </div>
          <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium self-start sm:self-center shrink-0'>
            <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span>Draft automatically synced</span>
          </div>
        </div>

        {/* Local Development Media Upload Status Banner */}
        <div className='mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 flex items-start gap-3 text-xs sm:text-sm'>
          <CheckCircle2 className='size-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5' />
          <div>
            <p className='font-semibold text-indigo-900 dark:text-indigo-200'>
              Development Media Service Active (Local Storage)
            </p>
            <p className='mt-1 text-xs text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed'>
              Local JPEG, PNG, and WebP photo uploads are securely persisted to the Mock REST Server runtime (/uploads/). Uploaded media receives a durable development URL (/api/v1/media/:mediaId), persists across browser reloads and server restarts, and fully satisfies the workspace submission requirement.
            </p>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className='mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-xs sm:text-sm'>
            <AlertCircle className='size-5 shrink-0 mt-0.5' />
            <div>
              <p className='font-semibold'>Gallery Incomplete</p>
              <p className='mt-0.5 text-xs opacity-90'>{validationError}</p>
            </div>
          </div>
        )}

        <div className='space-y-6'>
          {/* CARD 1: Upload Dropzone Container */}
          <div className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs'>
            <div
              role='button'
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center group ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.005]'
                  : 'border-border hover:border-indigo-500 hover:bg-muted/40 bg-muted/20'
              }`}
            >
              {/* Upload Icon */}
              <div className='size-14 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5 group-hover:scale-105 transition-transform'>
                <CloudUpload className='size-7' />
              </div>

              {/* Main & Subtext */}
              <h3 className='text-sm sm:text-base font-semibold text-foreground mb-1'>
                Click to upload or drag and drop high-resolution photos
              </h3>
              <p className='text-xs text-muted-foreground max-w-lg mb-5'>
                PNG, JPG or WebP up to 5MB each (BR-37). Minimum 1920×1080px recommended. High-quality photos increase booking conversion.
              </p>

              {/* Requirement Tracker Bar */}
              <div className='w-full max-w-sm mb-5 p-3 rounded-lg bg-card border border-border shadow-2xs'>
                <div className='flex items-center justify-between mb-2'>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      uploadedCount >= recommendedMin
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {uploadedCount >= recommendedMin
                      ? `${uploadedCount} photos uploaded (Goal reached)`
                      : `${uploadedCount} of ${recommendedMin} minimum recommended photos`}
                  </span>
                  <span className='text-xs font-bold text-foreground'>
                    {progressPercent}%
                  </span>
                </div>
                <div className='w-full h-1.5 bg-muted rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      uploadedCount >= recommendedMin ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='border-border bg-card hover:bg-muted text-foreground text-xs gap-2 shadow-2xs pointer-events-none'
              >
                <FolderOpen className='size-4 text-muted-foreground' />
                <span>Browse Files</span>
              </Button>
            </div>
          </div>

          {/* CARD 2: Photo Gallery Manager */}
          <div className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs'>
            {/* Section Header */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border mb-6 gap-2'>
              <div>
                <div className='flex items-center gap-2'>
                  <h2 className='text-sm sm:text-base font-bold text-foreground'>
                    Uploaded Media ({uploadedCount})
                  </h2>
                  <span className='px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold'>
                    {uploadedCount} / {maxPhotos}
                  </span>
                  {isEditMode && numericWsId ? (
                    <Badge variant='outline' className='border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 text-[11px]'>
                      Chỉnh sửa không gian #{numericWsId}
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='border-border bg-muted/40 text-muted-foreground text-[11px]'>
                      Tạo mới không gian
                    </Badge>
                  )}
                </div>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  The first photo or starred photo serves as the primary marketplace cover.
                </p>
              </div>

              <div className='text-xs text-muted-foreground flex items-center gap-1.5'>
                <Star className='size-3.5 fill-amber-400 text-amber-500' />
                <span>1 designated cover photo</span>
              </div>
            </div>

            {/* Content: Loading State vs Empty State vs Grid */}
            {isLoadingBackendMedia ? (
              <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl'>
                <Loader2 className='size-8 animate-spin text-indigo-600 mb-3' />
                <p className='text-sm font-medium'>Đang tải ảnh không gian hiện có...</p>
                <p className='text-xs text-muted-foreground mt-1'>Đang kết nối backend cho không gian #{numericWsId}</p>
              </div>
            ) : media.items.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-xl p-6 bg-muted/10'>
                <div className='size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3'>
                  <FolderOpen className='size-6' />
                </div>
                <h4 className='text-sm sm:text-base font-semibold text-foreground mb-1'>Chưa có ảnh nào trong thư viện</h4>
                <p className='text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed'>
                  {isEditMode
                    ? 'Không gian này hiện chưa có ảnh tải lên. Bạn có thể kéo thả vào khung ở trên hoặc bấm nút dưới đây để thêm ảnh.'
                    : 'Không gian tạo mới chưa có ảnh nào. Hãy thêm ảnh chất lượng cao để hiển thị trên marketplace.'}
                </p>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  className='bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-2xs font-medium'
                >
                  <Plus className='size-4' />
                  <span>Thêm ảnh ngay</span>
                </Button>
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                {media.items.map((item, index) => {
                  const isCover = item.id === media.coverPhotoId || item.isCover;

                  return (
                    <div
                      key={item.id}
                      className={`relative group rounded-xl overflow-hidden aspect-[16/10] bg-slate-900 shadow-2xs flex flex-col justify-between transition-all ${
                        isCover
                          ? 'border-2 border-indigo-600 ring-2 ring-indigo-600/30 shadow-md'
                          : 'border border-border hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Image Preview */}
                      <img
                        src={item.url}
                        alt={item.caption || item.name}
                        className='absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                        loading='lazy'
                      />

                      {/* Gradient Overlay */}
                      <div className='absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/50 pointer-events-none' />

                      {/* Top Badges (visible when not hovered) */}
                      <div className='relative z-10 p-3 flex items-start justify-between pointer-events-none'>
                        <div className='flex flex-col gap-1 items-start'>
                          {isCover && (
                            <span className='inline-flex items-center gap-1 bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-sm tracking-wide'>
                              <Star className='size-3 fill-white' />
                              <span>COVER PHOTO</span>
                            </span>
                          )}
                          {item.uploadStatus === 'uploading' && (
                            <span className='inline-flex items-center gap-1 bg-sky-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm tracking-wide'>
                              <Loader2 className='size-3 animate-spin' />
                              <span>Uploading...</span>
                            </span>
                          )}
                          {item.uploadStatus === 'error' && (
                            <span
                              className='inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm tracking-wide'
                              title={item.uploadError}
                            >
                              <AlertCircle className='size-3' />
                              <span>Upload Failed</span>
                            </span>
                          )}
                          {item.url.startsWith('/api/v1/media/') && (
                            <span className='inline-flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm tracking-wide'>
                              <Check className='size-3' />
                              <span>Local Media Persisted</span>
                            </span>
                          )}
                          {item.url.startsWith('blob:') && item.uploadStatus !== 'uploading' && item.uploadStatus !== 'error' && (
                            <span className='inline-flex items-center gap-1 bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm tracking-wide'>
                              <AlertCircle className='size-3' />
                              <span>Local Preview (Unsynced)</span>
                            </span>
                          )}
                        </div>

                        <span className='size-6 rounded-full bg-slate-900/75 backdrop-blur-md text-white flex items-center justify-center text-xs font-bold border border-white/20'>
                          {index + 1}
                        </span>
                      </div>

                      {/* Action Overlay: Hover / Focus action toolbar */}
                      <div className='absolute inset-0 bg-slate-950/65 opacity-0 group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity flex flex-col justify-between p-3 z-20 pointer-events-auto'>
                        {/* Top Row: Left has Cover badge or Set Cover button, Right has Delete + Index */}
                        <div className='flex items-start justify-between gap-2'>
                          <div>
                            {isCover ? (
                              <span className='inline-flex items-center gap-1.5 bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-sm tracking-wide'>
                                <Star className='size-3.5 fill-white text-white' />
                                <span>COVER PHOTO</span>
                              </span>
                            ) : (
                              <Button
                                type='button'
                                size='sm'
                                variant='secondary'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCover(item.id, item.name);
                                }}
                                className='h-7 px-2.5 bg-slate-900/80 hover:bg-indigo-600 text-white hover:text-white border border-white/20 text-xs font-semibold shadow transition-colors'
                                title='Set as primary cover photo'
                              >
                                <Star className='size-3 mr-1 text-amber-400' />
                                <span>Set Cover</span>
                              </Button>
                            )}
                          </div>

                          <div className='flex items-center gap-1.5'>
                            <Button
                              type='button'
                              size='icon'
                              variant='destructive'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(item.id, item.name);
                              }}
                              className='size-7 rounded-md bg-red-600 hover:bg-red-700 text-white shadow'
                              title='Delete photo'
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                            <span className='size-6 rounded-full bg-slate-900/85 backdrop-blur-md text-white flex items-center justify-center text-xs font-bold border border-white/20'>
                              {index + 1}
                            </span>
                          </div>
                        </div>

                        {/* Middle Area: Click opens preview modal without affecting cover status */}
                        <div className='flex items-center justify-center'>
                          <Button
                            type='button'
                            size='sm'
                            variant='secondary'
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            className='h-8 px-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 text-xs font-medium backdrop-blur-sm shadow hover:scale-105 transition-all'
                            title='View full size photo'
                          >
                            <Eye className='size-3.5 mr-1.5' />
                            <span>Preview</span>
                          </Button>
                        </div>

                        {/* Bottom Row: Metadata Tag & Reordering / Retry */}
                        <div className='flex items-center justify-between gap-2'>
                          <span className='inline-block px-2.5 py-1 rounded bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium border border-white/10 truncate max-w-[130px] sm:max-w-[170px]'>
                            {item.dimension ? `${item.dimension} • ` : ''}
                            {item.caption || item.name}
                          </span>

                          <div className='flex items-center gap-1'>
                            {item.uploadStatus === 'error' && (
                              <Button
                                type='button'
                                size='sm'
                                variant='secondary'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryUpload(item.id);
                                }}
                                className='h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow'
                                title='Retry uploading this image'
                              >
                                <span>Retry</span>
                              </Button>
                            )}

                            {index > 0 && (
                              <Button
                                type='button'
                                size='icon'
                                variant='secondary'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMove(index, 'left');
                                }}
                                className='size-7 rounded-md bg-white/90 hover:bg-white text-slate-900 shadow'
                                title='Move Earlier'
                              >
                                <ChevronLeft className='size-4' />
                              </Button>
                            )}

                            {index < media.items.length - 1 && (
                              <Button
                                type='button'
                                size='icon'
                                variant='secondary'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMove(index, 'right');
                                }}
                                className='size-7 rounded-md bg-white/90 hover:bg-white text-slate-900 shadow'
                                title='Move Later'
                              >
                                <ChevronRight className='size-4' />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Metadata Tag (visible when not hovered) */}
                      <div className='relative z-10 p-3 pointer-events-none'>
                        <span className='inline-block px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-medium border border-white/10 truncate max-w-full'>
                          {item.dimension ? `${item.dimension} • ` : ''}
                          {item.caption || item.name}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add More Slot */}
                {uploadedCount < maxPhotos && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className='border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer aspect-[16/10] group'
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label='Add more photos'
                  >
                    <div className='size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 transition-colors mb-2'>
                      <Plus className='size-5' />
                    </div>
                    <span className='text-xs sm:text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'>
                      + Add more photos
                    </span>
                    <span className='text-[11px] text-muted-foreground mt-0.5'>
                      Up to {maxPhotos} photos total
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARD 3: Photography Tips Callout */}
          <div className='bg-card border border-border rounded-xl p-4 flex items-start gap-3.5 shadow-2xs'>
            <div className='size-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0'>
              <Lightbulb className='size-4' />
            </div>
            <div className='flex-1'>
              <h4 className='text-xs sm:text-sm font-bold text-foreground mb-0.5'>
                NexSpace Photography Standard
              </h4>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                <strong className='text-foreground font-semibold'>Pro Tip:</strong> List at least one wide-angle shot of the main floor, one meeting room, and one close-up of amenities (coffee bar, phone booths) to pass NexSpace Quality Review on the first submission.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer Bar */}
      <footer className='mt-8 bg-card/95 backdrop-blur border border-border px-6 py-4 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3'>
        {/* Left: Back to Amenities */}
        <Button
          type='button'
          variant='ghost'
          onClick={handleBack}
          className='gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          <span>Back to Amenities</span>
        </Button>

        {/* Right: Save Draft & Complete */}
        <div className='flex items-center gap-3'>
          <Button
            type='button'
            variant='outline'
            disabled={isSaving}
            onClick={handleSaveDraft}
            className='gap-1.5 text-xs sm:text-sm border-border hover:bg-muted'
          >
            {isSaving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            type='button'
            disabled={isSaving}
            onClick={handleCompleteReview}
            className='h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm gap-2 shadow-2xs'
          >
            <span>Complete &amp; Review Workspace</span>
            {isSaving ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
          </Button>
        </div>
      </footer>

      {/* Preview Lightbox Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className='max-w-3xl p-4 sm:p-6 overflow-hidden'>
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base font-semibold truncate'>
              {previewItem?.name || 'Photo Preview'}
            </DialogTitle>
            {previewItem?.dimension && (
              <DialogDescription className='text-xs text-muted-foreground'>
                Resolution: {previewItem.dimension}
              </DialogDescription>
            )}
          </DialogHeader>

          {previewItem && (
            <div className='relative my-3 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center max-h-[65vh]'>
              <img
                src={previewItem.url}
                alt={previewItem.caption || previewItem.name}
                className='w-full h-auto max-h-[65vh] object-contain'
              />
            </div>
          )}

          <DialogFooter className='flex flex-row justify-between items-center sm:justify-between pt-2 border-t border-border'>
            <div>
              {previewItem && (
                previewItem.id === media.coverPhotoId || previewItem.isCover ? (
                  <Badge className='h-8 px-2.5 bg-indigo-600 text-white text-xs font-semibold gap-1.5'>
                    <Star className='size-3.5 fill-white' />
                    <span>Cover Photo Active</span>
                  </Badge>
                ) : (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      if (previewItem) {
                        handleSetCover(previewItem.id, previewItem.name);
                      }
                    }}
                    className='h-8 text-xs font-medium border-border hover:bg-muted'
                  >
                    <Star className='size-3.5 mr-1 text-amber-500' />
                    <span>Set as Cover Photo</span>
                  </Button>
                )
              )}
            </div>

            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={() => setPreviewItem(null)}
              className='h-8 text-xs px-4'
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Continuation Dialog: Batch 2 Complete -> Batch 3 Handoff */}
      <Dialog open={isCompletionModalOpen} onOpenChange={setIsCompletionModalOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <div className='size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2'>
              <CheckCircle2 className='size-6' />
            </div>
            <DialogTitle className='text-base sm:text-lg'>
              Batch 2 Onboarding Draft Verified!
            </DialogTitle>
            <DialogDescription className='text-xs sm:text-sm text-muted-foreground'>
              You have completed all 5 steps of the Workspace Onboarding Wizard.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs sm:text-sm'>
            <div className='rounded-lg border border-border bg-muted/30 p-3 space-y-2'>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Workspace:</span>
                <span className='font-semibold text-foreground'>{basicInfo.name}</span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Location:</span>
                <span className='font-semibold text-foreground'>{location.city}</span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Schedule:</span>
                <span className='font-semibold text-foreground'>
                  {operatingHours.is247 ? '24/7 Access' : 'Custom Weekly Hours'}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Amenities:</span>
                <span className='font-semibold text-foreground'>{amenities.length} selected</span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Gallery:</span>
                <span className='font-semibold text-foreground'>{media.items.length} photos</span>
              </div>
            </div>

            <div className='p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs leading-relaxed'>
              <p className='font-semibold mb-1'>Next Stage: Floor Plan &amp; Zones Setup (O10)</p>
              <p className='opacity-90'>
                All draft configuration is securely stored in local persistence. Proceed to define your workspace architectural floor layout and functional zones.
              </p>
            </div>
          </div>

          <DialogFooter className='flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsCompletionModalOpen(false)}
              className='h-10 px-4 text-xs sm:text-sm font-medium border-border hover:bg-muted'
            >
              Keep Editing
            </Button>
            <Button
              type='button'
              onClick={() => {
                setIsCompletionModalOpen(false);
                router.navigate({ to: '/dashboard/organizer/workspaces/create/floor-plan', search: (prev) => prev });
              }}
              className='h-10 px-5 text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5'
            >
              <span>Continue to Floor Plan &amp; Zones (O10)</span>
              <ArrowRight className='size-4' />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
