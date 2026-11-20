import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { useRequestCancelAutoPayoutMutation } from '../api/mutations';

interface RequestCancelAutoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestCancelAutoDialog: React.FC<RequestCancelAutoDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [note, setNote] = useState<string>('');
  const cancelMutation = useRequestCancelAutoPayoutMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cancelMutation.mutate(
      {
        requestNote: note.trim() || undefined
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNote('');
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Yêu cầu hủy Auto Payout
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Quay về chế độ Rút tiền thủ công (Manual)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Sau khi Admin phê duyệt, hệ thống sẽ dừng lịch rút tiền tự động hàng ngày. Bạn sẽ chủ động rút tiền thủ công bất cứ khi nào có số dư khả dụng.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-note" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Lý do muốn dừng Auto Payout (tùy chọn)
            </Label>
            <Textarea
              id="cancel-note"
              rows={3}
              placeholder="Ví dụ: Muốn tích lũy số dư lớn hơn trước khi rút hoặc thay đổi chu kỳ tài chính..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={cancelMutation.isPending}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              disabled={cancelMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {cancelMutation.isPending ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu hủy lên Admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
