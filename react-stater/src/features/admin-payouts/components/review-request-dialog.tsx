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
import { CheckCircle2, XCircle } from 'lucide-react';
import type { OrganizerPayoutSetting } from '../api/types';
import { useReviewPayoutRequestMutation } from '../api/mutations';

interface ReviewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting: OrganizerPayoutSetting | null;
  mode: 'APPROVE' | 'REJECT';
}

export const ReviewRequestDialog: React.FC<ReviewRequestDialogProps> = ({
  open,
  onOpenChange,
  setting,
  mode
}) => {
  const [feedback, setFeedback] = useState('');
  const reviewMutation = useReviewPayoutRequestMutation();

  if (!setting) return null;

  const isApprove = mode === 'APPROVE';
  const isEnableRequest = setting.approvalStatus === 'PENDING_ENABLE';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reviewMutation.mutate(
      {
        id: setting.id,
        data: {
          approved: isApprove,
          adminFeedback: feedback.trim() || undefined
        }
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setFeedback('');
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div
            className={`flex items-center gap-2 mb-1 ${
              isApprove ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isApprove ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {isApprove
              ? isEnableRequest
                ? 'Duyệt kích hoạt Auto Daily Payout'
                : 'Duyệt hủy Auto Payout quay về Manual'
              : 'Từ chối yêu cầu thay đổi chế độ Payout'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Organizer:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {setting.organizerName || setting.organizerEmail || `ID #${setting.organizerId}`}
            </strong>
            {isEnableRequest && setting.pendingAutoPayoutHour !== null && (
              <span> — Đăng ký giờ rút tự động: {setting.pendingAutoPayoutHour}:00 hàng ngày</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Ghi chú của Organizer nếu có */}
        {setting.requestNote && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 text-xs">
            <span className="text-slate-500 font-medium">Ghi chú từ Organizer: </span>
            <span className="text-slate-800 dark:text-slate-200 italic">"{setting.requestNote}"</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="admin-feedback" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isApprove ? 'Ghi chú phê duyệt (tùy chọn)' : 'Lý do từ chối (bắt buộc thông báo cho Organizer)'}
            </Label>
            <Textarea
              id="admin-feedback"
              rows={3}
              required={!isApprove}
              placeholder={
                isApprove
                  ? 'Ghi chú lưu nội bộ hoặc hướng dẫn thêm cho Organizer...'
                  : 'Nêu rõ lý do từ chối (ví dụ: hồ sơ ngân hàng chưa đồng nhất, tài khoản đang trong diện rà soát...)'
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reviewMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={reviewMutation.isPending || (!isApprove && !feedback.trim())}
              className={
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }
            >
              {reviewMutation.isPending
                ? 'Đang xử lý...'
                : isApprove
                  ? 'Xác nhận Phê duyệt'
                  : 'Xác nhận Từ chối'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
