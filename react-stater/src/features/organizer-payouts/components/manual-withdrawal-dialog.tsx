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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpRight, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { OrganizerPayoutBalance } from '../api/types';
import { useManualWithdrawalMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';

interface ManualWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: OrganizerPayoutBalance;
}

export const ManualWithdrawalDialog: React.FC<ManualWithdrawalDialogProps> = ({
  open,
  onOpenChange,
  balance
}) => {
  const { language } = useLanguage();
  const [amount, setAmount] = useState<string>('');
  const [withdrawAll, setWithdrawAll] = useState<boolean>(false);
  const withdrawalMutation = useManualWithdrawalMutation();

  const numAmount = withdrawAll ? balance.withdrawableBalance : Number(amount) || 0;
  const isValidAmount =
    numAmount >= 1000 && numAmount <= balance.withdrawableBalance;

  const handleWithdrawAll = () => {
    setWithdrawAll(true);
    setAmount(balance.withdrawableBalance.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawAll(false);
    setAmount(e.target.value.replace(/[^0-9]/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount) return;

    withdrawalMutation.mutate(
      {
        amount: withdrawAll ? balance.withdrawableBalance : numAmount,
        withdrawAll
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount('');
          setWithdrawAll(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <ArrowUpRight className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {language === 'vi' ? 'Rút tiền thủ công' : 'Manual Withdrawal'}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'vi' ? 'Rút tiền về tài khoản ngân hàng' : 'Withdraw to Bank Account'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {language === 'vi'
              ? 'Số tiền sẽ được chuyển trực tiếp qua cổng thanh toán PayOS về tài khoản đã đăng ký của bạn.'
              : 'Funds will be transferred directly via PayOS payment gateway to your verified bank account.'}
          </DialogDescription>
        </DialogHeader>

        {/* Thông tin tài khoản thụ hưởng */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {language === 'vi' ? 'Tài khoản thụ hưởng:' : 'Beneficiary Account:'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> {language === 'vi' ? 'Đã xác thực' : 'Verified'}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {balance.bankName || (language === 'vi' ? 'Chưa liên kết ngân hàng' : 'No bank account linked')}
            </div>
            <div className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
              {balance.bankAccountNumberMasked || '••••'}
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium uppercase">
            {balance.bankAccountHolder || (language === 'vi' ? 'CHỦ TÀI KHOẢN' : 'ACCOUNT HOLDER')}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="amount" className="font-medium text-slate-700 dark:text-slate-300">
                {language === 'vi' ? 'Số tiền muốn rút (VNĐ)' : 'Withdrawal Amount (VND)'}
              </Label>
              <button
                type="button"
                onClick={handleWithdrawAll}
                className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold hover:underline"
              >
                {language === 'vi' ? 'Rút toàn bộ số dư' : 'Withdraw all balance'}
              </button>
            </div>

            <div className="relative">
              <Input
                id="amount"
                type="text"
                placeholder={language === 'vi' ? 'Ví dụ: 1,000' : 'E.g.: 1,000'}
                value={
                  withdrawAll
                    ? balance.withdrawableBalance.toLocaleString('vi-VN')
                    : amount
                      ? Number(amount).toLocaleString('vi-VN')
                      : ''
                }
                onChange={handleAmountChange}
                className="text-base font-semibold pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                VNĐ
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
              <span>{language === 'vi' ? 'Hạn mức tối thiểu: 1.000 VNĐ' : 'Minimum: 1,000 VND'}</span>
              <span>
                {language === 'vi' ? 'Khả dụng:' : 'Available:'}{' '}
                <strong className="text-emerald-600">
                  {balance.withdrawableBalance.toLocaleString('vi-VN')} đ
                </strong>
              </span>
            </div>
          </div>

          {numAmount > balance.withdrawableBalance && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-md">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {language === 'vi'
                  ? 'Số tiền yêu cầu vượt quá số dư khả dụng có thể rút!'
                  : 'Requested amount exceeds withdrawable balance!'}
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={withdrawalMutation.isPending}
            >
              {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={!isValidAmount || withdrawalMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {withdrawalMutation.isPending
                ? (language === 'vi' ? 'Đang chuyển khoản...' : 'Processing...')
                : (language === 'vi' ? 'Xác nhận rút tiền' : 'Confirm Withdrawal')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
