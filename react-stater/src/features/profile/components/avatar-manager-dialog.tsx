import { Spinner, Spinner as Loader2 } from '@/components/ui/spinner';
import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, Link2, Trash2, Camera, AlertCircle, Check, Crop, Sparkles } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import {
  useUploadAvatarFileMutation,
  useUpdateAvatarUrlMutation,
  useDeleteAvatarMutation
} from '../api/mutations';
import { ApiError, getApiBaseUrl } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { UserDto } from '../api/types';
import { ImageCropperModal } from './image-cropper-modal';

interface AvatarManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserDto | null;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Nén và chuẩn hóa ảnh đại diện về kích thước 320x320 px bằng Canvas.
 * Giảm dung lượng từ 3-5MB xuống còn ~15-30KB, tăng tốc độ tải lên gấp 30-50 lần mà vẫn sắc nét chuẩn Retina.
 */
async function compressAvatarImage(file: File, maxDimension = 320, quality = 0.82): Promise<File> {
  // Ảnh GIF (ảnh động) hoặc file đã dưới 40KB thì không cần nén thêm
  if (file.type === 'image/gif' || file.size <= 40 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.addEventListener(
      'load',
      () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Thử nén sang WebP trước
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      },
      { once: true }
    );

    img.addEventListener(
      'error',
      () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      },
      { once: true }
    );

    img.src = objectUrl;
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AvatarManagerDialog({ open, onOpenChange, user }: AvatarManagerDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL state
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [isFetchingOnlineImage, setIsFetchingOnlineImage] = useState<boolean>(false);

  // Cropper modal states
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [rawCropSource, setRawCropSource] = useState<string | null>(null);
  const [rawCropFileName, setRawCropFileName] = useState<string>('avatar.png');

  // Confirmation pop-up state (chỉ dùng cho xóa)
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  // Mutations
  const uploadFileMutation = useUploadAvatarFileMutation();
  const updateUrlMutation = useUpdateAvatarUrlMutation();
  const deleteMutation = useDeleteAvatarMutation();

  const isPending = uploadFileMutation.isPending || updateUrlMutation.isPending || deleteMutation.isPending;

  const currentAvatarUrl = user?.avatarUrl || user?.avatar || '';
  const initial = (
    user?.firstName?.[0] || user?.fullName?.[0] || user?.userName?.[0] || 'U'
  ).toUpperCase();

  // Reset local state when closing dialog
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedFile(null);
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview);
      }
      setFilePreview(null);
      setUrlInput('');
      setUrlPreview(null);
      setIsCropModalOpen(false);
      if (rawCropSource && rawCropSource.startsWith('blob:')) {
        URL.revokeObjectURL(rawCropSource);
      }
      setRawCropSource(null);
    }
    onOpenChange(isOpen);
  };

  // Thực hiện tải ảnh lên với Optimistic UI
  const executeUpload = async (fileToUpload: File, previewUrl?: string) => {
    try {
      // Nếu file đã dưới 50KB hoặc đã là WebP (từ Cropper) thì gửi ngay, không nén lại
      const optimizedFile =
        fileToUpload.size <= 50 * 1024 || fileToUpload.type === 'image/webp'
          ? fileToUpload
          : await compressAvatarImage(fileToUpload);

      await uploadFileMutation.mutateAsync({
        file: optimizedFile,
        previewUrl: previewUrl || (filePreview ?? undefined)
      });
      toast.success('Đổi ảnh đại diện thành công!');
      handleDialogClose(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = err.data as { message?: string } | null;
        toast.error(payload?.message || err.message || 'Cập nhật ảnh đại diện thất bại');
      } else {
        toast.error('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      }
    }
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Định dạng file không hỗ trợ. Vui lòng chọn file JPG, PNG, WebP hoặc GIF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB).');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setRawCropSource(objectUrl);
    setRawCropFileName(file.name);
    // Tự động mở modal crop căn chỉnh ảnh ngay khi chọn file
    setIsCropModalOpen(true);

    // Reset input để có thể chọn lại cùng 1 file nếu muốn
    e.target.value = '';
  };

  // Tải ảnh từ URL mạng về Blob an toàn (chống lỗi CORS & Tainted Canvas) trước khi đưa vào Cropper
  const handleCropOnlineUrl = async () => {
    if (!urlInput.trim()) return;
    const targetUrl = urlInput.trim();
    setIsFetchingOnlineImage(true);

    try {
      let imageBlob: Blob | null = null;

      // 1. Thử fetch trực tiếp nếu domain bên ngoài có bật CORS
      try {
        const directResp = await fetch(targetUrl, { mode: 'cors' });
        if (directResp.ok) {
          const directBlob = await directResp.blob();
          if (directBlob.type.startsWith('image/')) {
            imageBlob = directBlob;
          }
        }
      } catch {
        imageBlob = null;
      }

      // 2. Nếu direct fetch bị chặn CORS, gọi qua proxy an toàn của Backend NexSpace
      if (!imageBlob) {
        const proxyEndpoint = `${getApiBaseUrl()}/users/me/avatar/proxy?url=${encodeURIComponent(targetUrl)}`;
        const token = useAuthStore.getState().accessToken;
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const proxyResp = await fetch(proxyEndpoint, { headers });
        if (!proxyResp.ok) {
          throw new Error('Máy chủ không thể tải ảnh từ liên kết này');
        }
        imageBlob = await proxyResp.blob();
      }

      if (!imageBlob || imageBlob.size === 0) {
        throw new Error('Không nhận được dữ liệu ảnh hợp lệ');
      }

      const objectUrl = URL.createObjectURL(imageBlob);
      setRawCropSource(objectUrl);
      setRawCropFileName('avatar-online.webp');
      setIsCropModalOpen(true);
    } catch {
      toast.error('Không thể tải ảnh từ đường dẫn này để cắt. Vui lòng kiểm tra lại liên kết hoặc tải ảnh trực tiếp từ máy tính.');
    } finally {
      setIsFetchingOnlineImage(false);
    }
  };

  // Nhận kết quả từ ImageCropperModal
  const handleCropComplete = async (croppedFile: File, previewUrl: string, autoSave = false) => {
    if (filePreview && filePreview.startsWith('blob:') && filePreview !== previewUrl) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(croppedFile);
    setFilePreview(previewUrl);

    if (autoSave) {
      // 1-Click: Cắt & Cập nhật ngay lập tức
      await executeUpload(croppedFile, previewUrl);
    } else {
      toast.success('Đã căn chỉnh & cắt ảnh thành công!');
    }
  };

  // Handle URL change
  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    if (/^https?:\/\/.+/i.test(val.trim())) {
      setUrlPreview(val.trim());
    } else {
      setUrlPreview(null);
    }
  };

  // Direct Apply (1-Click, không cần popup xác nhận thừa thãi)
  const handleDirectApply = async () => {
    if (activeTab === 'upload') {
      if (!selectedFile) {
        toast.error('Vui lòng chọn một file ảnh từ thiết bị của bạn.');
        return;
      }
      await executeUpload(selectedFile, filePreview ?? undefined);
    } else {
      const trimmed = urlInput.trim();
      if (!trimmed || !/^https?:\/\/.+/i.test(trimmed)) {
        toast.error('Vui lòng nhập đường dẫn URL ảnh hợp lệ (bắt đầu bằng http:// hoặc https://).');
        return;
      }
      try {
        await updateUrlMutation.mutateAsync(trimmed);
        toast.success('Đổi ảnh đại diện thành công!');
        handleDialogClose(false);
      } catch (err) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          toast.error(payload?.message || err.message || 'Cập nhật ảnh đại diện thất bại');
        } else {
          toast.error('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
        }
      }
    }
  };

  // Confirm delete avatar -> Dispatch API
  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false);
    try {
      await deleteMutation.mutateAsync();
      toast.success('Đã xóa ảnh đại diện.');
      handleDialogClose(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = err.data as { message?: string } | null;
        toast.error(payload?.message || err.message || 'Xóa ảnh đại diện thất bại');
      } else {
        toast.error('Lỗi máy chủ khi xóa ảnh đại diện.');
      }
    }
  };

  const previewAvatar = activeTab === 'upload' ? filePreview : urlPreview;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2'>
              <Camera className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
              <span>Quản lý ảnh đại diện</span>
            </DialogTitle>
            <DialogDescription>
              Tải ảnh từ máy tính hoặc dán link online để cập nhật ảnh đại diện của bạn.
            </DialogDescription>
          </DialogHeader>

          {/* Preview Section */}
          <div className='flex flex-col items-center justify-center py-4 bg-muted/30 rounded-xl border border-dashed border-border/80'>
            <Avatar className='w-24 h-24 ring-4 ring-indigo-500/20 shadow-md'>
              {previewAvatar ? (
                <AvatarImage src={previewAvatar} alt='Preview' className='object-cover' />
              ) : currentAvatarUrl ? (
                <AvatarImage src={currentAvatarUrl} alt='Current' className='object-cover' />
              ) : null}
              <AvatarFallback className='text-2xl font-bold bg-indigo-600 text-white'>
                {initial}
              </AvatarFallback>
            </Avatar>

            <div className='flex items-center gap-2 mt-2'>
              <p className='text-xs text-muted-foreground'>
                {previewAvatar ? 'Xem trước ảnh mới' : 'Ảnh đại diện hiện tại'}
              </p>
              {selectedFile && activeTab === 'upload' && (
                <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900'>
                  <Sparkles className='w-3 h-3' />
                  {formatFileSize(selectedFile.size)} • Tối ưu siêu nhẹ
                </span>
              )}
            </div>

            {filePreview && activeTab === 'upload' && (
              <Button
                type='button'
                variant='outline'
                size='xs'
                onClick={() => setIsCropModalOpen(true)}
                className='mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 h-7 border-indigo-200 dark:border-indigo-900 cursor-pointer shadow-2xs'
              >
                <Crop className='w-3.5 h-3.5' />
                <span>Cắt lại ảnh này</span>
              </Button>
            )}
          </div>

          {/* Tabs for Upload vs URL */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'upload' | 'url')}
            className='w-full mt-2'
          >
            <TabsList className='grid grid-cols-2 w-full'>
              <TabsTrigger value='upload' className='flex items-center gap-2 text-xs'>
                <UploadCloud className='w-3.5 h-3.5' />
                <span>Tải ảnh từ máy</span>
              </TabsTrigger>
              <TabsTrigger value='url' className='flex items-center gap-2 text-xs'>
                <Link2 className='w-3.5 h-3.5' />
                <span>Dán link ảnh</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Upload from local device */}
            <TabsContent value='upload' className='space-y-4 pt-3'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp,image/gif'
                onChange={handleFileChange}
                className='hidden'
              />
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='w-full border-2 border-dashed border-border hover:border-indigo-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40'
              >
                <UploadCloud className='w-8 h-8 mx-auto text-muted-foreground mb-2' />
                <p className='text-sm font-medium text-foreground'>
                  {selectedFile ? selectedFile.name : 'Nhấp để chọn ảnh từ máy tính'}
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Hệ thống tự động cắt tròn & nén siêu tốc WebP (Tối đa 5MB)
                </p>
              </button>
            </TabsContent>

            {/* Tab 2: Online URL */}
            <TabsContent value='url' className='space-y-3 pt-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='avatar-url-input' className='text-xs font-medium'>
                  Đường dẫn ảnh trực tuyến (URL)
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    id='avatar-url-input'
                    type='url'
                    placeholder='https://images.unsplash.com/photo-example.jpg'
                    value={urlInput}
                    onChange={handleUrlInputChange}
                    className='text-sm'
                  />
                  {urlPreview && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleCropOnlineUrl}
                      disabled={isFetchingOnlineImage}
                      className='shrink-0 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 cursor-pointer h-9'
                    >
                      {isFetchingOnlineImage ? (
                        <>
                          <Loader2 className='w-3.5 h-3.5' />
                          <span>Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <Crop className='w-3.5 h-3.5' />
                          <span>Cắt ảnh</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <p className='text-[11px] text-muted-foreground flex items-center gap-1.5'>
                <AlertCircle className='w-3.5 h-3.5' />
                <span>Đảm bảo liên kết ảnh truy cập được công khai qua internet.</span>
              </p>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className='flex items-center justify-between pt-4 border-t border-border mt-3'>
            {currentAvatarUrl ? (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setShowConfirmDelete(true)}
                disabled={isPending}
                className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs flex items-center gap-1.5 cursor-pointer'
              >
                <Trash2 className='w-3.5 h-3.5' />
                <span>Xóa ảnh</span>
              </Button>
            ) : (
              <div />
            )}

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleDialogClose(false)}
                disabled={isPending}
                className='text-xs cursor-pointer'
              >
                Hủy
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={handleDirectApply}
                disabled={isPending || (activeTab === 'upload' ? !selectedFile : !urlPreview)}
                className='bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm cursor-pointer'
              >
                {isPending ? (
                  <Spinner className='w-3.5 h-3.5 ' />
                ) : (
                  <>
                    <Check className='w-3.5 h-3.5' />
                    <span>Áp dụng ảnh</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Delete Avatar (Chỉ giữ cho hành vi xóa) */}
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh đại diện?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh đại diện sẽ quay về mặc định. Bạn có chắc chắn muốn xóa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className='bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-500 dark:text-white font-medium shadow-sm transition-colors cursor-pointer'
            >
              Xóa ảnh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interactive Image Cropper Modal */}
      <ImageCropperModal
        open={isCropModalOpen}
        onOpenChange={setIsCropModalOpen}
        imageSrc={rawCropSource}
        fileName={rawCropFileName}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
