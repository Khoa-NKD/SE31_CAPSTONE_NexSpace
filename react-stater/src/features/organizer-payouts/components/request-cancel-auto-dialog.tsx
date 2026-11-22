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
import { AlertTriangle } from '@/components/ui/hugeicons';
import { useRequestCancelAutoPayoutMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';

interface RequestCancelAutoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestCancelAutoDialog: React.FC<RequestCancelAutoDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { language } = useLanguage();
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
              {language === 'vi' ? 'Yêu cầu hủy Auto Payout' : 'Cancel Auto Payout Request'}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'vi'
              ? 'Quay về chế độ Rút tiền thủ công (Manual)'
              : 'Switch back to Manual Withdrawal'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {language === 'vi'
              ? 'Sau khi Admin phê duyệt, hệ thống sẽ dừng lịch rút tiền tự động hàng ngày. Bạn sẽ chủ động rút tiền thủ công bất cứ khi nào có số dư khả dụng.'
              : 'Once approved by Admin, daily automatic payouts will stop. You can manually withdraw whenever funds are available.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-note" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {language === 'vi'
                ? 'Lý do muốn dừng Auto Payout (tùy chọn)'
                : 'Reason for cancellation (optional)'}
            </Label>
            <Textarea
              id="cancel-note"
              rows={3}
              placeholder={
                language === 'vi'
                  ? 'Ví dụ: Muốn tích lũy số dư lớn hơn trước khi rút hoặc thay đổi chu kỳ tài chính...'
                  : 'E.g.: Want to accumulate a larger balance or adjust accounting cycles...'
              }
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
              {language === 'vi' ? 'Đóng' : 'Close'}
            </Button>
            <Button
              type="submit"
              disabled={cancelMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {cancelMutation.isPending
                ? (language === 'vi' ? 'Đang gửi yêu cầu...' : 'Submitting...')
                : (language === 'vi' ? 'Gửi yêu cầu hủy lên Admin' : 'Submit Cancellation Request')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
