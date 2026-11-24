import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Clock,
  Sparkles,
  CalendarCheck,
  Building2,
  Check,
  X,
  Inbox
} from '@/components/ui/hugeicons';
import type { OrganizerPayoutSetting, PageResponse } from '../api/types';
import { ReviewRequestDialog } from './review-request-dialog';
import { useLanguage } from '@/features/landing/context/language-context';

interface PendingRequestsTableProps {
  requests?: PageResponse<OrganizerPayoutSetting>;
  isLoading: boolean;
}

export const PendingRequestsTable: React.FC<PendingRequestsTableProps> = ({
  requests,
  isLoading
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [selectedSetting, setSelectedSetting] = useState<OrganizerPayoutSetting | null>(null);
  const [reviewMode, setReviewMode] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [dialogOpen, setDialogOpen] = useState(false);

  const items = requests?.listObjects || requests?.content || [];

  const handleAction = (setting: OrganizerPayoutSetting, mode: 'APPROVE' | 'REJECT') => {
    setSelectedSetting(setting);
    setReviewMode(mode);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className='border-border shadow-2xs overflow-hidden bg-card rounded-xl'>
        <CardHeader className='bg-muted/30 border-b border-border/70 p-4 sm:p-5'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <CardTitle className='text-base font-bold text-foreground'>
                {isVi ? 'Yêu cầu Thay đổi Chế độ Payout' : 'Payout Configuration Requests'}
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground mt-0.5'>
                {isVi
                  ? 'Các yêu cầu bật rút tiền tự động hàng ngày (Auto Daily) hoặc hủy quay về rút tay đang chờ Admin xét duyệt.'
                  : 'Requests to enable Auto Daily payout or revert to manual withdrawals awaiting Admin review.'}
              </CardDescription>
            </div>
            <Badge className='bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold text-xs whitespace-nowrap'>
              {requests?.totalRecords || items.length} {isVi ? 'yêu cầu chờ duyệt' : 'pending requests'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-10 text-center text-xs text-muted-foreground'>
              {isVi ? 'Đang tải danh sách yêu cầu...' : 'Loading pending requests...'}
            </div>
          ) : items.length === 0 ? (
            <div className='p-12 text-center space-y-2'>
              <div className='grid size-12 place-items-center rounded-2xl bg-muted/50 text-muted-foreground mx-auto'>
                <Inbox className='size-6 text-muted-foreground/60' />
              </div>
              <div className='text-sm font-semibold text-foreground'>
                {isVi ? 'Không có yêu cầu nào đang chờ duyệt' : 'No pending requests found'}
              </div>
              <p className='text-xs text-muted-foreground max-w-sm mx-auto'>
                {isVi
                  ? 'Khi Organizer gửi yêu cầu kích hoạt hoặc hủy Auto Payout, hồ sơ thẩm định sẽ xuất hiện tại đây.'
                  : 'When organizers submit Auto Payout activation or cancellation requests, they will appear here.'}
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table className='text-xs min-w-[950px]'>
                <TableHeader>
                  <TableRow className='text-xs font-semibold text-muted-foreground bg-muted/40 border-border'>
                    <TableHead className='w-[190px] px-3.5 py-3'>{isVi ? 'Đối tác (Organizer)' : 'Organizer'}</TableHead>
                    <TableHead className='w-[160px] px-3.5 py-3'>{isVi ? 'Loại yêu cầu' : 'Request Type'}</TableHead>
                    <TableHead className='w-[160px] px-3.5 py-3'>{isVi ? 'Khung giờ đề xuất' : 'Scheduled Hour'}</TableHead>
                    <TableHead className='min-w-[180px] px-3.5 py-3'>{isVi ? 'Tài khoản nhận' : 'Bank Account'}</TableHead>
                    <TableHead className='min-w-[150px] px-3.5 py-3'>{isVi ? 'Ghi chú' : 'Notes'}</TableHead>
                    <TableHead className='w-[130px] px-3.5 py-3'>{isVi ? 'Thời gian gửi' : 'Requested At'}</TableHead>
                    <TableHead className='w-[140px] min-w-[140px] px-3.5 py-3 text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                      {isVi ? 'Thao tác' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='divide-y divide-border'>
                  {items.map((req) => {
                    const isEnable = req.approvalStatus === 'PENDING_ENABLE';
                    const isChangeHour = isEnable && req.payoutMode === 'AUTO_DAILY';

                    return (
                      <TableRow key={req.id} className='border-border hover:bg-muted/40 transition-colors group'>
                        <TableCell className='px-3.5 py-2.5'>
                          <div className='font-semibold text-foreground truncate max-w-[200px]'>
                            {req.organizerName || req.organizerEmail || `ID #${req.organizerId}`}
                          </div>
                          {req.organizerEmail && (
                            <div className='text-[11px] text-muted-foreground truncate max-w-[180px]'>{req.organizerEmail}</div>
                          )}
                        </TableCell>
                        <TableCell className='px-3.5 py-2.5'>
                          {isChangeHour ? (
                            <Badge className='bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                              <Clock className='size-2.5' /> {isVi ? 'Đổi giờ Auto' : 'Update Auto Hour'}
                            </Badge>
                          ) : isEnable ? (
                            <Badge className='bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                              <Sparkles className='size-2.5' /> {isVi ? 'Bật Auto Daily' : 'Enable Auto Daily'}
                            </Badge>
                          ) : (
                            <Badge variant='outline' className='text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                              <CalendarCheck className='size-2.5 text-amber-500' /> {isVi ? 'Hủy Auto về Manual' : 'Revert to Manual'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='px-3.5 py-2.5'>
                          {isChangeHour ? (
                            <div className='font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap'>
                              {req.autoPayoutHour}:00 → {req.pendingAutoPayoutHour}:00 {isVi ? 'hàng ngày' : 'daily'}
                            </div>
                          ) : isEnable ? (
                            <div className='font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap'>
                              {req.pendingAutoPayoutHour}:00 {isVi ? 'hàng ngày' : 'daily'}
                            </div>
                          ) : (
                            <div className='text-muted-foreground whitespace-nowrap'>{isVi ? 'Quay về rút tay' : 'Manual withdrawal'}</div>
                          )}
                        </TableCell>
                        <TableCell className='px-3.5 py-2.5'>
                          <div className='flex items-center gap-1.5 text-foreground whitespace-nowrap'>
                            <Building2 className='size-3 text-muted-foreground shrink-0' />
                            <span className='font-medium'>{req.bankName}</span>
                            <span className='font-mono text-muted-foreground text-[11px]'>{req.bankAccountNumberMasked || ''}</span>
                          </div>
                          <div className='text-[10px] text-muted-foreground uppercase truncate max-w-[180px]'>{req.bankAccountHolder}</div>
                        </TableCell>
                        <TableCell className='px-3.5 py-2.5 max-w-[180px] truncate text-muted-foreground'>
                          {req.requestNote || '—'}
                        </TableCell>
                        <TableCell className='px-3.5 py-2.5 text-muted-foreground text-[11px] whitespace-nowrap'>
                          {req.requestedAt
                            ? new Date(req.requestedAt).toLocaleString(isVi ? 'vi-VN' : 'en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className='px-3.5 py-2.5 text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => handleAction(req, 'REJECT')}
                              className='text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800 h-7 px-2 text-xs gap-1 font-medium'
                            >
                              <X className='size-3' /> {isVi ? 'Từ chối' : 'Reject'}
                            </Button>
                            <Button
                              size='sm'
                              onClick={() => handleAction(req, 'APPROVE')}
                              className='bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs gap-1 font-medium'
                            >
                              <Check className='size-3' /> {isVi ? 'Duyệt' : 'Approve'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        setting={selectedSetting}
        mode={reviewMode}
      />
    </>
  );
};
