import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCreateWorkspaceAssetMutation, useUpdateWorkspaceAssetMutation } from '@/features/workspaces/api/mutations';
import type { AssetStatus, WorkspaceAssetDto } from '@/features/workspaces/api/types';
import { Loader2 } from 'lucide-react';

interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number | string;
  assetToEdit?: WorkspaceAssetDto | null;
}

interface AssetFormProps {
  workspaceId: number | string;
  assetToEdit?: WorkspaceAssetDto | null;
  onClose: () => void;
}

function AssetForm({ workspaceId, assetToEdit, onClose }: AssetFormProps) {
  const isEdit = Boolean(assetToEdit);

  const [assetCode, setAssetCode] = useState(assetToEdit?.assetCode || '');
  const [name, setName] = useState(assetToEdit?.name || '');
  const [quantity, setQuantity] = useState(assetToEdit?.quantity || 1);
  const [status, setStatus] = useState<AssetStatus>(assetToEdit?.status || 'IN_USE');
  const [purchasePrice, setPurchasePrice] = useState<string>(
    assetToEdit?.purchasePrice ? String(assetToEdit.purchasePrice) : ''
  );
  const [purchaseDate, setPurchaseDate] = useState(
    assetToEdit?.purchaseDate ? assetToEdit.purchaseDate.split('T')[0] : ''
  );
  const [warrantyUntil, setWarrantyUntil] = useState(
    assetToEdit?.warrantyUntil ? assetToEdit.warrantyUntil.split('T')[0] : ''
  );
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(
    assetToEdit?.nextMaintenanceDate ? assetToEdit.nextMaintenanceDate.split('T')[0] : ''
  );
  const [note, setNote] = useState(assetToEdit?.note || '');

  const createMutation = useCreateWorkspaceAssetMutation();
  const updateMutation = useUpdateWorkspaceAssetMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode.trim() || !name.trim()) return;

    const parsedPrice = purchasePrice ? Number(purchasePrice) : null;

    if (isEdit && assetToEdit) {
      updateMutation.mutate(
        {
          workspaceId,
          assetId: assetToEdit.id,
          payload: {
            assetCode: assetCode.trim(),
            name: name.trim(),
            quantity: Number(quantity) > 0 ? Number(quantity) : 1,
            status,
            purchasePrice: parsedPrice,
            purchaseDate: purchaseDate || null,
            warrantyUntil: warrantyUntil || null,
            nextMaintenanceDate: nextMaintenanceDate || null,
            note: note.trim() || null
          }
        },
        {
          onSuccess: () => onClose()
        }
      );
    } else {
      createMutation.mutate(
        {
          workspaceId,
          payload: {
            assetCode: assetCode.trim(),
            name: name.trim(),
            quantity: Number(quantity) > 0 ? Number(quantity) : 1,
            status,
            purchasePrice: parsedPrice,
            purchaseDate: purchaseDate || null,
            warrantyUntil: warrantyUntil || null,
            nextMaintenanceDate: nextMaintenanceDate || null,
            note: note.trim() || null
          }
        },
        {
          onSuccess: () => onClose()
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='assetCode' className='text-xs font-semibold'>
            Mã tài sản <span className='text-rose-500'>*</span>
          </Label>
          <Input
            id='assetCode'
            placeholder='VD: PRJ-001, AIR-002...'
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            required
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='assetName' className='text-xs font-semibold'>
            Tên tài sản <span className='text-rose-500'>*</span>
          </Label>
          <Input
            id='assetName'
            placeholder='VD: Máy chiếu Epson EB-X06...'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0'>
        <div className='space-y-1.5 min-w-0'>
          <Label htmlFor='quantity' className='text-xs font-semibold'>
            Số lượng
          </Label>
          <Input
            id='quantity'
            type='number'
            min={1}
            className='w-full min-w-0'
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </div>

        <div className='space-y-1.5 min-w-0'>
          <Label htmlFor='status' className='text-xs font-semibold'>
            Trạng thái hoạt động
          </Label>
          <Select value={status} onValueChange={(val: AssetStatus) => setStatus(val)}>
            <SelectTrigger id='status' className='w-full min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block'>
              <SelectValue placeholder='Chọn trạng thái' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='IN_USE'>Đang sử dụng (In Use)</SelectItem>
              <SelectItem value='UNDER_MAINTENANCE'>Đang bảo trì (Under Maintenance)</SelectItem>
              <SelectItem value='BROKEN'>Báo hỏng (Broken)</SelectItem>
              <SelectItem value='RETIRED'>Ngừng sử dụng (Retired)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='purchasePrice' className='text-xs font-semibold'>
            Giá mua (VNĐ)
          </Label>
          <Input
            id='purchasePrice'
            type='number'
            min={0}
            placeholder='VD: 12000000'
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='purchaseDate' className='text-xs font-semibold'>
            Ngày mua
          </Label>
          <Input
            id='purchaseDate'
            type='date'
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='warrantyUntil' className='text-xs font-semibold'>
            Thời hạn bảo hành
          </Label>
          <Input
            id='warrantyUntil'
            type='date'
            value={warrantyUntil}
            onChange={(e) => setWarrantyUntil(e.target.value)}
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='nextMaintenanceDate' className='text-xs font-semibold'>
            Lịch bảo trì tiếp theo
          </Label>
          <Input
            id='nextMaintenanceDate'
            type='date'
            value={nextMaintenanceDate}
            onChange={(e) => setNextMaintenanceDate(e.target.value)}
          />
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='note' className='text-xs font-semibold'>
          Ghi chú vị trí / mô tả bổ sung
        </Label>
        <Textarea
          id='note'
          rows={3}
          placeholder='VD: Đặt cố định tại phòng họp Sapphire tầng 2...'
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <DialogFooter className='pt-2'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          disabled={isSubmitting}
        >
          Hủy
        </Button>
        <Button
          type='submit'
          disabled={isSubmitting || !assetCode.trim() || !name.trim()}
          className='bg-indigo-600 hover:bg-indigo-700 text-white'
        >
          {isSubmitting && <Loader2 className='w-4 h-4 animate-spin mr-2' />}
          {isEdit ? 'Lưu thay đổi' : 'Thêm tài sản'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssetDialog({
  open,
  onOpenChange,
  workspaceId,
  assetToEdit
}: AssetDialogProps) {
  const isEdit = Boolean(assetToEdit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden'>
        <DialogHeader className='min-w-0 overflow-hidden pr-6'>
          <DialogTitle className='truncate'>
            {isEdit ? `Chỉnh sửa tài sản #${assetToEdit?.assetCode}` : 'Thêm tài sản / thiết bị mới'}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <AssetForm
            key={assetToEdit?.id ? String(assetToEdit.id) : 'new-asset'}
            workspaceId={workspaceId}
            assetToEdit={assetToEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
