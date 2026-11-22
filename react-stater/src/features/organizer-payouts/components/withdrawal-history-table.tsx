import { Spinner } from '@/components/ui/spinner';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  ArrowDownLeft,
  Building2,
  Sparkles,
  Inbox
} from '@/components/ui/hugeicons';
import type { OrganizerWithdrawalBatch, PageResponse } from '../api/types';

interface WithdrawalHistoryTableProps {
  history?: PageResponse<OrganizerWithdrawalBatch>;
  isLoading: boolean;
}

export const WithdrawalHistoryTable: React.FC<WithdrawalHistoryTableProps> = ({
  history,
  isLoading
}) => {
  const items = history?.listObjects || history?.content || [];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Lịch sử Rút tiền
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Danh sách các đợt rút tiền thủ công và tự động đã thực hiện về tài khoản ngân hàng.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-semibold">
            {history?.totalRecords || items.length} giao dịch
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Đang tải lịch sử rút tiền...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Chưa có giao dịch rút tiền nào
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Khi bạn thực hiện rút tiền thủ công hoặc hệ thống chạy Auto Payout hàng ngày, các bản ghi sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs font-semibold text-slate-500 bg-slate-50/30 dark:bg-slate-900/20">
                  <TableHead className="w-[160px]">Mã giao dịch</TableHead>
                  <TableHead className="w-[140px]">Loại hình</TableHead>
                  <TableHead className="text-right">Số tiền rút</TableHead>
                  <TableHead>Tài khoản nhận</TableHead>
                  <TableHead>Mã PayOS Ref</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thời gian</TableHead>
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
                        {isAuto ? (
                          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Auto Daily
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 text-[10px] font-semibold gap-1">
                            <ArrowDownLeft className="h-2.5 w-2.5 text-slate-400" /> Rút tay (Manual)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {batch.amount.toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {batch.bankName} ••••{' '}
                            {batch.bankAccountNumber
                              ? batch.bankAccountNumber.slice(-4)
                              : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500">
                        {batch.payosReference || '—'}
                      </TableCell>
                      <TableCell>
                        {isPaid && (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Thành công
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1">
                            <Spinner className="h-2.5 w-2.5" /> Đang chuyển
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Thất bại
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
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
