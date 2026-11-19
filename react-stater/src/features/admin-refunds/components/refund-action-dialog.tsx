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
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { RefundRecord } from '../data/mock-refunds';

interface RefundActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'approve' | 'reject';
  refund: RefundRecord | null;
  adminNote: string;
  onConfirm: () => void;
}

export function RefundActionDialog({
  open,
  onOpenChange,
  actionType,
  refund,
  adminNote,
  onConfirm
}: RefundActionDialogProps) {
  if (!refund) return null;

  const isApprove = actionType === 'approve';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-2 mb-1'>
            {isApprove ? (
              <div className='size-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center'>
                <ShieldCheck className='size-5' />
              </div>
            ) : (
              <div className='size-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center'>
                <AlertTriangle className='size-5' />
              </div>
            )}
            <DialogTitle className='text-base font-bold'>
              {isApprove ? 'Xác nhận phê duyệt & Chi tiền PayOS' : 'Xác nhận từ chối hoàn tiền'}
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            {isApprove
              ? `Hệ thống sẽ thực hiện lệnh chi ${refund.calculatedRefundVnd.toLocaleString()} đ trực tiếp qua cổng PayOS đến tài khoản ngân hàng của khách hàng ${refund.customerName}.`
              : `Bạn đang từ chối yêu cầu hoàn tiền ${refund.id} của khách hàng ${refund.customerName}. Không có khoản tiền nào được chi trả.`}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2 text-xs'>
          <div className='p-3 rounded-lg bg-muted/60 space-y-1.5 border border-border'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Mã đơn đặt chỗ:</span>
              <span className='font-mono font-semibold'>{refund.bookingRef}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Khách hàng:</span>
              <span className='font-medium'>{refund.customerName}</span>
            </div>
            {refund.bankAccountNumber && (
              <div className='flex justify-between border-t border-border/60 pt-1'>
                <span className='text-muted-foreground'>Tài khoản nhận:</span>
                <span className='font-mono font-semibold text-foreground text-right'>
                  {refund.bankName} • {refund.bankAccountNumber}
                </span>
              </div>
            )}
            <div className='flex justify-between border-t border-border pt-1 font-bold'>
              <span>{isApprove ? 'Số tiền hoàn qua PayOS:' : 'Số tiền hoàn trả:'}</span>
              <span className={isApprove ? 'text-emerald-600' : 'text-muted-foreground'}>
                {isApprove ? `${refund.calculatedRefundVnd.toLocaleString()} VND` : '0 VND'}
              </span>
            </div>
          </div>

          <div>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1'>
              Ghi chú xử lý của Quản trị viên
            </span>
            <div className='p-2.5 rounded bg-background border border-border text-foreground italic text-[11px]'>
              "{adminNote || 'Không có ghi chú thêm.'}"
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='text-xs h-9 cursor-pointer'
          >
            Hủy bỏ
          </Button>
          <Button
            type='button'
            variant={isApprove ? 'default' : 'destructive'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={`text-xs h-9 font-semibold cursor-pointer ${
              isApprove ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
            }`}
          >
            {isApprove ? 'Phê duyệt & Chi tiền ngay' : 'Xác nhận từ chối'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
