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
import { CheckCircle2, XCircle } from '@/components/ui/hugeicons';
import type { OrganizerPayoutSetting } from '../api/types';
import { useReviewPayoutRequestMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';

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
  const { language } = useLanguage();
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
              isApprove ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isApprove
                ? language === 'vi' ? 'Phê duyệt yêu cầu' : 'Approve Request'
                : language === 'vi' ? 'Từ chối yêu cầu' : 'Reject Request'}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {isApprove
              ? isEnableRequest
                ? language === 'vi' ? 'Duyệt kích hoạt Auto Daily Payout' : 'Approve Auto Daily Payout'
                : language === 'vi' ? 'Duyệt hủy Auto Payout quay về Manual' : 'Approve Revert to Manual'
              : language === 'vi' ? 'Từ chối yêu cầu thay đổi chế độ Payout' : 'Reject Payout Mode Change Request'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Organizer:{' '}
            <strong className="text-foreground">
              {setting.organizerName || setting.organizerEmail || `ID #${setting.organizerId}`}
            </strong>
            {isEnableRequest && setting.pendingAutoPayoutHour !== null && (
              <span>
                {' '}— {language === 'vi' ? 'Đăng ký giờ rút tự động:' : 'Scheduled Scan Hour:'}{' '}
                {setting.pendingAutoPayoutHour}:00 {language === 'vi' ? 'hàng ngày' : 'daily'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Ghi chú của Organizer nếu có */}
        {setting.requestNote && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground font-medium">
              {language === 'vi' ? 'Ghi chú từ Organizer: ' : 'Organizer Note: '}
            </span>
            <span className="text-foreground italic">"{setting.requestNote}"</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="admin-feedback" className="text-xs font-medium text-foreground">
              {isApprove
                ? language === 'vi' ? 'Ghi chú phê duyệt (tùy chọn)' : 'Approval Feedback (Optional)'
                : language === 'vi' ? 'Lý do từ chối (bắt buộc thông báo cho Organizer)' : 'Rejection Reason (Required)'}
            </Label>
            <Textarea
              id="admin-feedback"
              rows={3}
              required={!isApprove}
              placeholder={
                isApprove
                  ? language === 'vi'
                    ? 'Ghi chú lưu nội bộ hoặc hướng dẫn thêm cho Organizer...'
                    : 'Internal notes or guidance for organizer...'
                  : language === 'vi'
                    ? 'Nêu rõ lý do từ chối (ví dụ: hồ sơ ngân hàng chưa đồng nhất, tài khoản đang trong diện rà soát...)'
                    : 'Specify reason for rejection (e.g. bank info mismatch, account under review...)'
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
              {language === 'vi' ? 'Hủy' : 'Cancel'}
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
                ? language === 'vi' ? 'Đang xử lý...' : 'Processing...'
                : isApprove
                  ? language === 'vi' ? 'Xác nhận Phê duyệt' : 'Confirm Approval'
                  : language === 'vi' ? 'Xác nhận Từ chối' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
