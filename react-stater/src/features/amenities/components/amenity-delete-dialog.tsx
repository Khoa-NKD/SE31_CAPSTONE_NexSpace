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
import { useDeleteAmenityMutation } from '../api/mutations';

interface AmenityDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenity: AmenityDto | null;
}

export function AmenityDeleteDialog({
  open,
  onOpenChange,
  amenity
}: AmenityDeleteDialogProps) {
  const deleteMutation = useDeleteAmenityMutation();

  if (!amenity) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(amenity.id);
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
          <DialogTitle>Delete Amenity?</DialogTitle>
          <DialogDescription className='text-xs leading-relaxed'>
            Are you sure you want to delete{' '}
            <strong className='text-foreground font-semibold'>
              &quot;{amenity.name}&quot;
            </strong>{' '}
            (ID: #{amenity.id}) from the platform catalog? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className='gap-2 sm:gap-0 pt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className='gap-2'
          >
            {deleteMutation.isPending && (
              <Loader2 className='size-4 animate-spin' />
            )}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

