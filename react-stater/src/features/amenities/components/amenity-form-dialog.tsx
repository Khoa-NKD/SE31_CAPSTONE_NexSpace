import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Wifi,
  PhoneCall,
  Cast,
  Monitor,
  Printer,
  Armchair,
  MoveVertical,
  Lock,
  ShowerHead,
  Bike,
  Presentation,
  Coffee,
  Droplets,
  Utensils,
  Heart,
  Sparkles,
  Zap,
  Loader2
} from 'lucide-react';
import type { AmenityDto, AmenityCategory } from '../api/types';
import {
  useCreateAmenityMutation,
  useUpdateAmenityMutation,
  useCreateOrganizerAmenityMutation,
  useUpdateOrganizerAmenityMutation
} from '../api/mutations';

interface AmenityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenity?: AmenityDto | null; // null = Create mode, not null = Edit mode
  isOrganizer?: boolean;
}

const AVAILABLE_ICONS = [
  { name: 'Wifi', label: 'Wi-Fi / Internet', icon: Wifi },
  { name: 'PhoneCall', label: 'Phone Booth', icon: PhoneCall },
  { name: 'Cast', label: 'Screen Cast', icon: Cast },
  { name: 'Monitor', label: 'Dual Monitors', icon: Monitor },
  { name: 'Printer', label: 'Printer / Scanner', icon: Printer },
  { name: 'Armchair', label: 'Ergonomic Chair', icon: Armchair },
  { name: 'MoveVertical', label: 'Standing Desk', icon: MoveVertical },
  { name: 'Lock', label: 'Personal Locker', icon: Lock },
  { name: 'ShowerHead', label: 'Shower Suite', icon: ShowerHead },
  { name: 'Bike', label: 'Bicycle Rack', icon: Bike },
  { name: 'Presentation', label: 'Meeting / Boardroom', icon: Presentation },
  { name: 'Coffee', label: 'Espresso Bar', icon: Coffee },
  { name: 'Droplets', label: 'Filtered Water (RO)', icon: Droplets },
  { name: 'Utensils', label: 'Pantry & Kitchen', icon: Utensils },
  { name: 'Heart', label: 'Wellness & Nap Pod', icon: Heart },
  { name: 'Zap', label: 'EV / Power Station', icon: Zap },
  { name: 'Sparkles', label: 'Other Amenity', icon: Sparkles }
];

interface AmenityFormContentProps {
  amenity?: AmenityDto | null;
  onClose: () => void;
  isOrganizer?: boolean;
}

function AmenityFormContent({ amenity, onClose, isOrganizer }: AmenityFormContentProps) {
  const isEditing = !!amenity;
  const adminCreateMutation = useCreateAmenityMutation();
  const adminUpdateMutation = useUpdateAmenityMutation();
  const orgCreateMutation = useCreateOrganizerAmenityMutation();
  const orgUpdateMutation = useUpdateOrganizerAmenityMutation();

  const [name, setName] = useState(amenity?.name ?? '');
  const [category, setCategory] = useState<AmenityCategory>(amenity?.category ?? 'TECH');
  const [icon, setIcon] = useState(amenity?.icon || 'Sparkles');
  const [description, setDescription] = useState(amenity?.description || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Tên tiện ích không được để trống.');
      return;
    }

    try {
      if (isEditing && amenity) {
        if (isOrganizer) {
          await orgUpdateMutation.mutateAsync({
            id: amenity.id,
            payload: {
              name: trimmedName,
              category,
              icon,
              description: description.trim()
            }
          });
        } else {
          await adminUpdateMutation.mutateAsync({
            id: amenity.id,
            payload: {
              name: trimmedName,
              category,
              icon,
              description: description.trim()
            }
          });
        }
      } else {
        if (isOrganizer) {
          await orgCreateMutation.mutateAsync({
            name: trimmedName,
            category,
            icon,
            description: description.trim()
          });
        } else {
          await adminCreateMutation.mutateAsync({
            name: trimmedName,
            category,
            icon,
            description: description.trim()
          });
        }
      }
      onClose();
    } catch {
      // Error handled by mutation toast
    }
  };

  const isSubmitting = isOrganizer
    ? orgCreateMutation.isPending || orgUpdateMutation.isPending
    : adminCreateMutation.isPending || adminUpdateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className='space-y-4 py-2'>
      {error && (
        <div className='p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs'>
          {error}
        </div>
      )}

      {/* Amenity Name */}
      <div className='space-y-1.5'>
        <Label htmlFor='amenity-name' className='text-xs font-semibold'>
          Amenity Name <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='amenity-name'
          placeholder='e.g. High-speed Wi-Fi (1 Gbps)'
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={100}
          required
        />
      </div>

      {/* Category & Icon */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>Category</Label>
          <Select
            value={category}
            onValueChange={(val: AmenityCategory) => setCategory(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder='Select category' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='TECH'>Technology (TECH)</SelectItem>
              <SelectItem value='SPACE'>Space & Facility (SPACE)</SelectItem>
              <SelectItem value='COMFORT'>Hospitality (COMFORT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>Icon</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger>
              <SelectValue placeholder='Select an icon' />
            </SelectTrigger>
            <SelectContent className='max-h-56'>
              {AVAILABLE_ICONS.map((ic) => {
                const IconComp = ic.icon;
                return (
                  <SelectItem key={ic.name} value={ic.name}>
                    <div className='flex items-center gap-2'>
                      <IconComp className='size-4 text-muted-foreground' />
                      <span>{ic.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Detailed Description */}
      <div className='space-y-1.5'>
        <Label htmlFor='amenity-desc' className='text-xs font-semibold'>
          Description
        </Label>
        <Textarea
          id='amenity-desc'
          rows={3}
          placeholder='Provide equipment standards, technical specs, or features included...'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </div>

      <DialogFooter className='pt-2'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type='submit' disabled={isSubmitting} className='gap-2'>
          {isSubmitting && <Loader2 className='size-4 animate-spin' />}
          {isEditing ? 'Save Changes' : 'Create Amenity'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AmenityFormDialog({
  open,
  onOpenChange,
  amenity,
  isOrganizer
}: AmenityFormDialogProps) {
  const isEditing = !!amenity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>
            {isOrganizer
              ? isEditing
                ? 'Chỉnh sửa tiện ích riêng'
                : 'Thêm tiện ích riêng'
              : isEditing
                ? 'Edit Amenity'
                : 'Add New Amenity'}
          </DialogTitle>
          <DialogDescription>
            {isOrganizer
              ? isEditing
                ? 'Cập nhật thông tin tiện ích riêng của tổ chức bạn.'
                : 'Tạo tiện ích mới dành riêng cho các không gian làm việc của tổ chức bạn.'
              : isEditing
                ? 'Update amenity information in the global platform catalog.'
                : 'Create a new amenity available across all NexSpace workspaces.'}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <AmenityFormContent
            key={amenity ? `edit-${amenity.id}` : 'create'}
            amenity={amenity}
            isOrganizer={isOrganizer}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
