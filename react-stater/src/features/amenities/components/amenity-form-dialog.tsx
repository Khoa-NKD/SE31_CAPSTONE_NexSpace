import { Spinner as Loader2 } from '@/components/ui/spinner';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
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
  Zap
} from '@/components/ui/hugeicons';
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

const getAvailableIcons = (c: (en: string, vi: string) => string) => [
  { name: 'Wifi', label: 'Wi-Fi / Internet', icon: Wifi },
  { name: 'PhoneCall', label: c('Phone Booth', 'Buồng điện thoại'), icon: PhoneCall },
  { name: 'Cast', label: c('Screen Cast', 'Trình chiếu màn hình'), icon: Cast },
  { name: 'Monitor', label: c('Dual Monitors', 'Hai màn hình'), icon: Monitor },
  { name: 'Printer', label: c('Printer / Scanner', 'Máy in / Máy quét'), icon: Printer },
  { name: 'Armchair', label: c('Ergonomic Chair', 'Ghế công thái học'), icon: Armchair },
  { name: 'MoveVertical', label: c('Standing Desk', 'Bàn đứng'), icon: MoveVertical },
  { name: 'Lock', label: c('Personal Locker', 'Tủ đồ cá nhân'), icon: Lock },
  { name: 'ShowerHead', label: c('Shower Suite', 'Phòng tắm'), icon: ShowerHead },
  { name: 'Bike', label: c('Bicycle Rack', 'Chỗ để xe đạp'), icon: Bike },
  { name: 'Presentation', label: c('Meeting / Boardroom', 'Phòng họp'), icon: Presentation },
  { name: 'Coffee', label: c('Espresso Bar', 'Quầy cà phê'), icon: Coffee },
  { name: 'Droplets', label: c('Filtered Water (RO)', 'Nước lọc (RO)'), icon: Droplets },
  { name: 'Utensils', label: c('Pantry & Kitchen', 'Khu bếp'), icon: Utensils },
  { name: 'Heart', label: c('Wellness & Nap Pod', 'Khu nghỉ ngơi'), icon: Heart },
  { name: 'Zap', label: c('EV / Power Station', 'Trạm sạc / Nguồn điện'), icon: Zap },
  { name: 'Sparkles', label: c('Other Amenity', 'Tiện ích khác'), icon: Sparkles }
];

interface AmenityFormContentProps {
  amenity?: AmenityDto | null;
  onClose: () => void;
  isOrganizer?: boolean;
}

function AmenityFormContent({ amenity, onClose, isOrganizer }: AmenityFormContentProps) {
  const c = useOrganizerCopy();
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
      setError(c('Amenity name is required.', 'Tên tiện ích không được để trống.'));
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
        <div className='p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs'>{error}</div>
      )}

      {/* Amenity Name */}
      <div className='space-y-1.5'>
        <Label htmlFor='amenity-name' className='text-xs font-semibold'>
          {c('Amenity Name', 'Tên tiện ích')} <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='amenity-name'
          placeholder={c('e.g. High-speed Wi-Fi (1 Gbps)', 'VD: Wi-Fi tốc độ cao (1 Gbps)')}
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
          <Label className='text-xs font-semibold'>{c('Category', 'Phân loại')}</Label>
          <Select value={category} onValueChange={(val: AmenityCategory) => setCategory(val)}>
            <SelectTrigger>
              <SelectValue placeholder={c('Select category', 'Chọn phân loại')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='TECH'>{c('Technology (TECH)', 'Công nghệ (TECH)')}</SelectItem>
              <SelectItem value='SPACE'>
                {c('Space & Facility (SPACE)', 'Không gian & Tiện ích (SPACE)')}
              </SelectItem>
              <SelectItem value='COMFORT'>
                {c('Hospitality (COMFORT)', 'Dịch vụ (COMFORT)')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>{c('Icon', 'Biểu tượng')}</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger>
              <SelectValue placeholder={c('Select an icon', 'Chọn biểu tượng')} />
            </SelectTrigger>
            <SelectContent className='max-h-56'>
              {getAvailableIcons(c).map((ic) => {
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
          {c('Description', 'Mô tả')}
        </Label>
        <Textarea
          id='amenity-desc'
          rows={3}
          placeholder={c(
            'Provide equipment standards, technical specs, or features included...',
            'Nhập tiêu chuẩn thiết bị, thông số kỹ thuật hoặc tính năng đi kèm...'
          )}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </div>

      <DialogFooter className='pt-2'>
        <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
          {c('Cancel', 'Hủy')}
        </Button>
        <Button type='submit' disabled={isSubmitting} className='gap-2'>
          {isSubmitting && <Loader2 className='size-4' />}
          {isEditing ? c('Save Changes', 'Lưu thay đổi') : c('Create Amenity', 'Tạo tiện ích')}
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
  const c = useOrganizerCopy();
  const isEditing = !!amenity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>
            {isOrganizer
              ? isEditing
                ? c('Edit custom amenity', 'Chỉnh sửa tiện ích riêng')
                : c('Add custom amenity', 'Thêm tiện ích riêng')
              : isEditing
                ? 'Edit Amenity'
                : 'Add New Amenity'}
          </DialogTitle>
          <DialogDescription>
            {isOrganizer
              ? isEditing
                ? c(
                    "Update your organization's custom amenity information.",
                    'Cập nhật thông tin tiện ích riêng của tổ chức bạn.'
                  )
                : c(
                    "Create an amenity exclusively for your organization's workspaces.",
                    'Tạo tiện ích mới dành riêng cho các không gian làm việc của tổ chức bạn.'
                  )
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
