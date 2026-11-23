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
      <Card className="border-border shadow-xs overflow-hidden bg-card">
        <CardHeader className="bg-muted/40 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {language === 'vi' ? 'Yêu cầu Thay đổi Chế độ Payout' : 'Payout Configuration Requests'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {language === 'vi'
                  ? 'Các yêu cầu bật rút tiền tự động hàng ngày (Auto Daily) hoặc hủy quay về rút tay đang chờ Admin xét duyệt.'
                  : 'Requests to enable Auto Daily payout or revert to manual withdrawals awaiting Admin review.'}
              </CardDescription>
            </div>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold text-xs">
              {requests?.totalRecords || items.length} {language === 'vi' ? 'yêu cầu chờ duyệt' : 'pending requests'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {language === 'vi' ? 'Đang tải danh sách yêu cầu...' : 'Loading pending requests...'}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <div className="text-sm font-medium text-foreground">
                {language === 'vi' ? 'Không có yêu cầu nào đang chờ duyệt' : 'No pending requests found'}
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'vi'
                  ? 'Khi Organizer gửi yêu cầu kích hoạt hoặc hủy Auto Payout, thông tin sẽ xuất hiện tại đây.'
                  : 'When organizers submit Auto Payout activation or cancellation requests, they will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs font-semibold text-muted-foreground bg-muted/30 border-border">
                    <TableHead className="w-[180px]">{language === 'vi' ? 'Đối tác (Organizer)' : 'Organizer'}</TableHead>
                    <TableHead className="w-[160px]">{language === 'vi' ? 'Loại yêu cầu' : 'Request Type'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Khung giờ đề xuất' : 'Scheduled Hour'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Tài khoản nhận' : 'Bank Account'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Ghi chú' : 'Notes'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Thời gian gửi' : 'Requested At'}</TableHead>
                    <TableHead className="text-right">{language === 'vi' ? 'Hành động' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((req) => {
                    const isEnable = req.approvalStatus === 'PENDING_ENABLE';
                    const isChangeHour = isEnable && req.payoutMode === 'AUTO_DAILY';

                    return (
                      <TableRow key={req.id} className="text-xs border-border hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-foreground">
                            {req.organizerName || req.organizerEmail || `ID #${req.organizerId}`}
                          </div>
                          {req.organizerEmail && (
                            <div className="text-[11px] text-muted-foreground">{req.organizerEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isChangeHour ? (
                            <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[10px] font-semibold gap-1">
                              <Clock className="h-2.5 w-2.5" /> {language === 'vi' ? 'Đổi giờ Auto' : 'Update Auto Hour'}
                            </Badge>
                          ) : isEnable ? (
                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1">
                              <Sparkles className="h-2.5 w-2.5" /> {language === 'vi' ? 'Bật Auto Daily' : 'Enable Auto Daily'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1">
                              <CalendarCheck className="h-2.5 w-2.5 text-amber-500" /> {language === 'vi' ? 'Hủy Auto về Manual' : 'Revert to Manual'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isChangeHour ? (
                            <div className="font-semibold text-sky-600 dark:text-sky-400">
                              {req.autoPayoutHour}:00 → {req.pendingAutoPayoutHour}:00 {language === 'vi' ? 'hàng ngày' : 'daily'}
                            </div>
                          ) : isEnable ? (
                            <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {req.pendingAutoPayoutHour}:00 {language === 'vi' ? 'hàng ngày' : 'daily'}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">{language === 'vi' ? 'Quay về rút tay' : 'Manual withdrawal'}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-foreground">
                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>
                              {req.bankName} {req.bankAccountNumberMasked || ''}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{req.bankAccountHolder}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {req.requestNote || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {req.requestedAt
                            ? new Date(req.requestedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
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
                              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800 h-7 px-2 text-xs gap-1"
                            >
                              <X className="h-3 w-3" /> {language === 'vi' ? 'Từ chối' : 'Reject'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(req, 'APPROVE')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs gap-1"
                            >
                              <Check className="h-3 w-3" /> {language === 'vi' ? 'Phê duyệt' : 'Approve'}
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
