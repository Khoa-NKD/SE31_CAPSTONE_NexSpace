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
} from 'lucide-react';
import type { OrganizerPayoutSetting, PageResponse } from '../api/types';
import { ReviewRequestDialog } from './review-request-dialog';

interface PendingRequestsTableProps {
  requests?: PageResponse<OrganizerPayoutSetting>;
  isLoading: boolean;
}

export const PendingRequestsTable: React.FC<PendingRequestsTableProps> = ({
  requests,
  isLoading
}) => {
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
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Yêu cầu Thay đổi Chế độ Payout
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Các yêu cầu bật rút tiền tự động hàng ngày (Auto Daily) hoặc hủy quay về rút tay đang chờ Admin xét duyệt.
              </CardDescription>
            </div>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 font-semibold text-xs">
              {requests?.totalRecords || items.length} yêu cầu chờ duyệt
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Đang tải danh sách yêu cầu...
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Không có yêu cầu nào đang chờ duyệt
              </div>
              <p className="text-xs text-slate-500">
                Khi Organizer gửi yêu cầu kích hoạt hoặc hủy Auto Payout, thông tin sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs font-semibold text-slate-500 bg-slate-50/30 dark:bg-slate-900/20">
                    <TableHead className="w-[180px]">Organizer</TableHead>
                    <TableHead className="w-[160px]">Loại yêu cầu</TableHead>
                    <TableHead>Khung giờ đề xuất</TableHead>
                    <TableHead>Tài khoản nhận</TableHead>
                    <TableHead>Ghi chú của Organizer</TableHead>
                    <TableHead>Thời gian gửi</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((req) => {
                    const isEnable = req.approvalStatus === 'PENDING_ENABLE';
                    const isChangeHour = isEnable && req.payoutMode === 'AUTO_DAILY';

                    return (
                      <TableRow key={req.id} className="text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/50">
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {req.organizerName || req.organizerEmail || `ID #${req.organizerId}`}
                          </div>
                          {req.organizerEmail && (
                            <div className="text-[11px] text-slate-500">{req.organizerEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isChangeHour ? (
                            <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[10px] font-semibold gap-1">
                              <Clock className="h-2.5 w-2.5" /> Đổi giờ Auto
                            </Badge>
                          ) : isEnable ? (
                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1">
                              <Sparkles className="h-2.5 w-2.5" /> Bật Auto Daily
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-200 text-[10px] font-semibold gap-1">
                              <CalendarCheck className="h-2.5 w-2.5 text-amber-500" /> Hủy Auto về Manual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isChangeHour ? (
                            <div className="font-semibold text-sky-600 dark:text-sky-400">
                              {req.autoPayoutHour}:00 → {req.pendingAutoPayoutHour}:00 hàng ngày
                            </div>
                          ) : isEnable ? (
                            <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {req.pendingAutoPayoutHour}:00 hàng ngày
                            </div>
                          ) : (
                            <div className="text-slate-400">Quay về rút tay</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>
                              {req.bankName} {req.bankAccountNumberMasked || ''}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">{req.bankAccountHolder}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                          {req.requestNote || '—'}
                        </TableCell>
                        <TableCell className="text-slate-500 text-[11px]">
                          {req.requestedAt
                            ? new Date(req.requestedAt).toLocaleString('vi-VN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(req, 'REJECT')}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-7 px-2 text-xs gap-1"
                            >
                              <X className="h-3 w-3" /> Từ chối
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(req, 'APPROVE')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs gap-1"
                            >
                              <Check className="h-3 w-3" /> Phê duyệt
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
