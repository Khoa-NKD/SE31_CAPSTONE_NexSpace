import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { AmenityDto } from '../api/types';
import { useDeleteAmenityMutation, useDeleteOrganizerAmenityMutation } from '../api/mutations';

interface AmenityDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenity: AmenityDto | null;
  isOrganizer?: boolean;
}

export function AmenityDeleteDialog({
  open,
  onOpenChange,
  amenity,
  isOrganizer
}: AmenityDeleteDialogProps) {
  const adminDeleteMutation = useDeleteAmenityMutation();
  const orgDeleteMutation = useDeleteOrganizerAmenityMutation();

  if (!amenity) return null;

  const isPending = isOrganizer
    ? orgDeleteMutation.isPending
    : adminDeleteMutation.isPending;

  const handleDelete = async () => {
    try {
      if (isOrganizer) {
        await orgDeleteMutation.mutateAsync(amenity.id);
      } else {
        await adminDeleteMutation.mutateAsync(amenity.id);
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[420px]'>
        <DialogHeader>
          <div className='size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2'>
            <AlertTriangle className='size-5' />
          </div>
          <DialogTitle>
            {isOrganizer ? 'Xóa tiện ích riêng?' : 'Delete Amenity?'}
          </DialogTitle>
          <DialogDescription className='text-xs leading-relaxed'>
            {isOrganizer ? (
              <>
                Bạn có chắc chắn muốn xóa tiện ích riêng{' '}
                <strong className='text-foreground font-semibold'>
                  &quot;{amenity.name}&quot;
                </strong>{' '}
                (ID: #{amenity.id}) khỏi danh sách của tổ chức không? Hành động này không thể hoàn tác.
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong className='text-foreground font-semibold'>
                  &quot;{amenity.name}&quot;
                </strong>{' '}
                (ID: #{amenity.id}) from the platform catalog? This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className='gap-2 sm:gap-0 pt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {isOrganizer ? 'Hủy bỏ' : 'Cancel'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={isPending}
            className='gap-2'
          >
            {isPending && <Loader2 className='size-4 animate-spin' />}
            {isOrganizer ? 'Xác nhận xóa' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

