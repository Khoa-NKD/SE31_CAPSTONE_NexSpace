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
import { UploadCloud, Link2, Trash2, Camera, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadAvatarFileMutation, useUpdateAvatarUrlMutation, useDeleteAvatarMutation } from '../api/mutations';
import { ApiError } from '@/lib/api-client';
import type { UserDto } from '../api/types';

interface AvatarManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserDto | null;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function AvatarManagerDialog({ open, onOpenChange, user }: AvatarManagerDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL state
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlPreview, setUrlPreview] = useState<string | null>(null);

  // Confirmation pop-up states
  const [showConfirmChange, setShowConfirmChange] = useState<boolean>(false);
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
    }
    onOpenChange(isOpen);
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

    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
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

  // Click Save button -> Open Confirmation Pop-up
  const handlePreSubmitChange = () => {
    if (activeTab === 'upload') {
      if (!selectedFile) {
        toast.error('Vui lòng chọn một file ảnh từ thiết bị của bạn.');
        return;
      }
    } else {
      if (!urlInput.trim() || !/^https?:\/\/.+/i.test(urlInput.trim())) {
        toast.error('Vui lòng nhập đường dẫn URL ảnh hợp lệ (bắt đầu bằng http:// hoặc https://).');
        return;
      }
    }
    setShowConfirmChange(true);
  };

  // Confirm applying new avatar -> Dispatch API
  const handleConfirmChange = async () => {
    setShowConfirmChange(false);
    try {
      if (activeTab === 'upload' && selectedFile) {
        await uploadFileMutation.mutateAsync(selectedFile);
      } else if (activeTab === 'url' && urlInput) {
        await updateUrlMutation.mutateAsync(urlInput.trim());
      }
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
            <p className='text-xs text-muted-foreground mt-2'>
              {previewAvatar ? 'Xem trước ảnh mới' : 'Ảnh đại diện hiện tại'}
            </p>
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
              <div
                onClick={() => fileInputRef.current?.click()}
                className='border-2 border-dashed border-border hover:border-indigo-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40'
              >
                <UploadCloud className='w-8 h-8 mx-auto text-muted-foreground mb-2' />
                <p className='text-sm font-medium text-foreground'>
                  {selectedFile ? selectedFile.name : 'Nhấp để chọn ảnh từ máy tính'}
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Hỗ trợ JPG, PNG, WebP hoặc GIF (Tối đa 5MB)
                </p>
              </div>
            </TabsContent>

            {/* Tab 2: Online URL */}
            <TabsContent value='url' className='space-y-3 pt-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='avatar-url-input' className='text-xs font-medium'>
                  Đường dẫn ảnh trực tuyến (URL)
                </Label>
                <Input
                  id='avatar-url-input'
                  type='url'
                  placeholder='https://images.unsplash.com/photo-example.jpg'
                  value={urlInput}
                  onChange={handleUrlInputChange}
                  className='text-sm'
                />
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
                className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs flex items-center gap-1.5'
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
                className='text-xs'
              >
                Hủy
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={handlePreSubmitChange}
                disabled={isPending || (activeTab === 'upload' ? !selectedFile : !urlPreview)}
                className='bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm'
              >
                {isPending ? (
                  <div className='w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
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

      {/* Confirmation Dialog: Update Avatar */}
      <AlertDialog open={showConfirmChange} onOpenChange={setShowConfirmChange}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi ảnh đại diện?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn áp dụng ảnh đại diện mới này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              disabled={isPending}
              className='bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-medium shadow-sm transition-colors cursor-pointer'
            >
              Áp dụng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Delete Avatar */}
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh đại diện?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh đại diện sẽ quay về mặc định. Bạn có chắc chắn xóa?
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
    </>
  );
}

