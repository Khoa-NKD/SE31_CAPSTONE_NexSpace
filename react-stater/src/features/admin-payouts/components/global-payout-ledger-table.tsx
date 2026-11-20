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
} from 'lucide-react';
import type { OrganizerWithdrawalBatch, PageResponse } from '../api/types';
import { useRetryWithdrawalMutation } from '../api/mutations';

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
  const retryMutation = useRetryWithdrawalMutation();
  const items = ledger?.listObjects || ledger?.content || [];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Sổ cái Chi tiền Payout Toàn Hệ thống
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Theo dõi mọi giao dịch rút tiền thủ công và tự động qua PayOS. Cho phép thử lại nếu cổng thanh toán báo lỗi.
            </CardDescription>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PAID">Thành công (PAID)</option>
              <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => onTypeChange?.(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="MANUAL">Rút tay (Manual)</option>
              <option value="AUTO_DAILY">Tự động (Auto Daily)</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Đang tải sổ cái chi tiền...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Chưa có giao dịch chi tiền nào
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs font-semibold text-slate-500 bg-slate-50/30 dark:bg-slate-900/20">
                  <TableHead className="w-[140px]">Mã đợt rút</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Loại hình</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Tài khoản nhận</TableHead>
                  <TableHead>Mã PayOS Ref</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((batch) => {
                  const isAuto = batch.payoutType === 'AUTO_DAILY';
                  const isPaid = batch.status === 'PAID';
                  const isProcessing = batch.status === 'PROCESSING';
                  const isFailed = batch.status === 'FAILED';

                  return (
                    <TableRow key={batch.id} className="text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/50">
                      <TableCell className="font-mono font-medium text-slate-900 dark:text-white">
                        {batch.batchCode}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {batch.organizerName || batch.organizerEmail || `ID #${batch.organizerId}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAuto ? (
                          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Auto Daily
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 text-[10px] font-semibold gap-1">
                            <ArrowDownLeft className="h-2.5 w-2.5 text-slate-400" /> Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {batch.amount.toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{batch.bankName}</span>
                          <span className="font-mono">
                            •••• {batch.bankAccountNumber ? batch.bankAccountNumber.slice(-4) : ''}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">{batch.bankAccountHolder}</div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500">
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
                            <CheckCircle2 className="h-2.5 w-2.5" /> Thành công
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1">
                            <Clock className="h-2.5 w-2.5 animate-spin" /> Đang chuyển
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Thất bại
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-[11px]">
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isFailed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate(batch.id)}
                            disabled={retryMutation.isPending}
                            className="text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50 h-7 px-2 text-xs gap-1"
                          >
                            <RotateCcw className="h-3 w-3" /> Thử lại
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
