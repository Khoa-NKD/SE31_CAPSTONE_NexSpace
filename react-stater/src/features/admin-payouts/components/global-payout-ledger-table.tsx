import { Spinner } from '@/components/ui/spinner';
import React from 'react';
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
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowDownLeft,
  Building2,
  Inbox
} from '@/components/ui/hugeicons';
import type { OrganizerWithdrawalBatch, PageResponse } from '../api/types';
import { useRetryWithdrawalMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';

interface GlobalPayoutLedgerTableProps {
  ledger?: PageResponse<OrganizerWithdrawalBatch>;
  isLoading: boolean;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  typeFilter?: string;
  onTypeChange?: (type: string) => void;
}

export const GlobalPayoutLedgerTable: React.FC<GlobalPayoutLedgerTableProps> = ({
  ledger,
  isLoading,
  statusFilter = 'all',
  onStatusChange,
  typeFilter = 'all',
  onTypeChange
}) => {
  const { language } = useLanguage();
  const retryMutation = useRetryWithdrawalMutation();
  const items = ledger?.listObjects || ledger?.content || [];

  return (
    <Card className="border-border shadow-xs overflow-hidden bg-card">
      <CardHeader className="bg-muted/40 border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {language === 'vi' ? 'Sổ cái Chi tiền Payout Toàn Hệ thống' : 'Platform Disbursement Ledger'}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {language === 'vi'
                ? 'Theo dõi mọi giao dịch rút tiền thủ công và tự động qua PayOS. Cho phép thử lại nếu cổng thanh toán báo lỗi.'
                : 'Track all manual and automated withdrawal transactions via PayOS. Retry failed transactions if needed.'}
            </CardDescription>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground"
            >
              <option value="all">{language === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="PAID">{language === 'vi' ? 'Thành công (PAID)' : 'Paid (Success)'}</option>
              <option value="PROCESSING">{language === 'vi' ? 'Đang xử lý (PROCESSING)' : 'Processing'}</option>
              <option value="FAILED">{language === 'vi' ? 'Thất bại (FAILED)' : 'Failed'}</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => onTypeChange?.(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground"
            >
              <option value="all">{language === 'vi' ? 'Tất cả loại hình' : 'All Types'}</option>
              <option value="MANUAL">{language === 'vi' ? 'Rút tay (Manual)' : 'Manual'}</option>
              <option value="AUTO_DAILY">{language === 'vi' ? 'Tự động (Auto Daily)' : 'Auto Daily'}</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {language === 'vi' ? 'Đang tải sổ cái chi tiền...' : 'Loading payout ledger...'}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <div className="text-sm font-medium text-foreground">
              {language === 'vi' ? 'Chưa có giao dịch chi tiền nào' : 'No payout transactions recorded'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs font-semibold text-muted-foreground bg-muted/30 border-border">
                  <TableHead className="w-[140px]">{language === 'vi' ? 'Mã đợt rút' : 'Batch Code'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Đối tác (Organizer)' : 'Organizer'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Loại hình' : 'Type'}</TableHead>
                  <TableHead className="text-right">{language === 'vi' ? 'Số tiền' : 'Amount'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Tài khoản nhận' : 'Bank Account'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Mã PayOS Ref' : 'PayOS Ref'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Trạng thái' : 'Status'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Thời gian' : 'Timestamp'}</TableHead>
                  <TableHead className="text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]">{language === 'vi' ? 'Hành động' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((batch) => {
                  const isAuto = batch.payoutType === 'AUTO_DAILY';
                  const isPaid = batch.status === 'PAID';
                  const isProcessing = batch.status === 'PROCESSING';
                  const isFailed = batch.status === 'FAILED';

                  return (
                    <TableRow key={batch.id} className="text-xs border-border hover:bg-muted/40 transition-colors group">
                      <TableCell className="font-mono font-medium text-foreground">
                        {batch.batchCode}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {batch.organizerName || batch.organizerEmail || `ID #${batch.organizerId}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAuto ? (
                          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Auto Daily
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] font-semibold gap-1 border-border">
                            <ArrowDownLeft className="h-2.5 w-2.5 text-muted-foreground" /> Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {batch.amount.toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-foreground">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{batch.bankName}</span>
                          <span className="font-mono text-muted-foreground">
                            •••• {batch.bankAccountNumber ? batch.bankAccountNumber.slice(-4) : ''}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">{batch.bankAccountHolder}</div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {batch.payosReference || (
                          batch.errorReason ? (
                            <span className="text-rose-500 truncate max-w-[120px] block" title={batch.errorReason}>
                              {batch.errorReason}
                            </span>
                          ) : '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {isPaid && (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> {language === 'vi' ? 'Thành công' : 'Paid'}
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1">
                            <Spinner className="h-2.5 w-2.5" /> {language === 'vi' ? 'Đang chuyển' : 'Processing'}
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> {language === 'vi' ? 'Thất bại' : 'Failed'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]">
                        {isFailed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate(batch.id)}
                            disabled={retryMutation.isPending}
                            className="text-amber-700 dark:text-amber-400 hover:text-amber-800 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 h-7 px-2 text-xs gap-1"
                          >
                            {retryMutation.isPending ? <Spinner className={`h-3 w-3 `} /> : <RotateCcw className={`h-3 w-3 `} />}
                            {retryMutation.isPending
                              ? language === 'vi' ? 'Đang thử lại...' : 'Retrying...'
                              : language === 'vi' ? 'Thử lại' : 'Retry'}
                          </Button>
                        )}
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
  );
};
