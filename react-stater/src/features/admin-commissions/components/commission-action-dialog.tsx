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
import { KeyRound, ShieldAlert } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { useLanguage } from '@/features/landing/context/language-context';

interface CommissionActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleCode: string;
  ruleTitle: string;
  ratePercentage: number;
  onConfirmSuccess: () => void;
}

export function CommissionActionDialog({
  open,
  onOpenChange,
  ruleCode,
  ruleTitle,
  ratePercentage,
  onConfirmSuccess
}: CommissionActionDialogProps) {
  const { language } = useLanguage();
  const [securityPin, setSecurityPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      onOpenChange(false);
      onConfirmSuccess();
      toast.success(
        language === 'vi'
          ? 'Đã kích hoạt quy tắc phí trên sổ cái chính thức'
          : 'Fee Rule Activated on Production Ledger',
        {
          description:
            language === 'vi'
              ? `Quy tắc ${ruleCode} đã cập nhật mức phí ${ratePercentage}%. Áp dụng ngay cho các ý định thanh toán mới (T+0).`
              : `Rule ${ruleCode} updated to ${ratePercentage}%. Enacted for checkout intents starting immediately (T+0).`
        }
      );
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[460px] bg-card text-card-foreground border-border/80'>
        <DialogHeader>
          <div className='size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2'>
            <KeyRound className='size-5' />
          </div>
          <DialogTitle className='text-base font-bold text-foreground font-heading'>
            {language === 'vi'
              ? 'Xác thực Mật mã Quản trị Viên (SecOps HSM)'
              : 'SecOps HSM 2FA Authorization'}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {language === 'vi'
              ? 'Sửa đổi quy tắc kiếm tiền trên hệ thống sẽ tự động tăng phiên bản chính sách và ký bảo mật bằng khóa phần cứng HSM.'
              : 'Modifying a production monetization rule increments the platform policy version and signs the new rate with your HSM hardware key.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          {/* Summary Box */}
          <div className='p-3 rounded-lg bg-muted/60 border border-border/70 text-xs space-y-1.5'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>
                {language === 'vi' ? 'Mã quy tắc:' : 'Target Rule:'}
              </span>
              <span className='font-mono font-bold text-foreground'>{ruleCode}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>
                {language === 'vi' ? 'Tên quy tắc:' : 'Rule Title:'}
              </span>
              <span className='font-medium text-foreground truncate max-w-[240px]'>
                {ruleTitle}
              </span>
            </div>
            <div className='flex justify-between border-t border-border/60 pt-1.5'>
              <span className='text-muted-foreground'>
                {language === 'vi' ? 'Tỷ lệ phí mới:' : 'New Take-Rate:'}
              </span>
              <span className='font-mono font-bold text-primary text-sm'>
                {ratePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* HSM Fingerprint notice */}
          <div className='p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2'>
            <ShieldAlert className='size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
            <span>
              {language === 'vi' ? (
                <>
                  Khóa phần cứng: <strong className='font-mono'>YubiKey-HSM-5C (Slot 0x02)</strong>. Chỉ áp dụng cho giao dịch tương lai, không tính lại lịch sử.
                </>
              ) : (
                <>
                  Hardware Key: <strong className='font-mono'>YubiKey-HSM-5C (Slot 0x02)</strong>. Future transactions only; zero historical recalculation.
                </>
              )}
            </span>
          </div>

          {/* PIN Input */}
          <div className='space-y-1.5'>
            <label
              htmlFor='hsm-security-pin'
              className='text-xs font-semibold text-foreground block'
            >
              {language === 'vi'
                ? 'Nhập mã PIN Token Bảo mật Super Admin'
                : 'Enter Super Admin Security Token'}
            </label>
            <input
              id='hsm-security-pin'
              type='password'
              autoComplete='one-time-code'
              value={securityPin}
              onChange={(e) => setSecurityPin(e.target.value)}
              placeholder='••••••'
              className='w-full text-center tracking-[0.5em] font-mono text-base font-bold border border-input rounded-lg p-2.5 text-foreground bg-background focus:ring-1 focus:ring-primary focus:outline-none'
            />
          </div>

          <DialogFooter className='pt-2 gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='text-xs'
            >
              {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting}
              className='text-xs font-bold gap-2'
            >
              {isSubmitting
                ? language === 'vi'
                  ? 'Đang ký mật mã...'
                  : 'Signing HSM Token...'
                : language === 'vi'
                  ? 'Ký duyệt & Kích hoạt'
                  : 'Authorize & Enact Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
