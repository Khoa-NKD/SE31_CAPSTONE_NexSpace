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
} from 'lucide-react';
import type { OrganizerWithdrawalBatch, PageResponse } from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface WithdrawalHistoryTableProps {
  history?: PageResponse<OrganizerWithdrawalBatch>;
  isLoading: boolean;
}

export const WithdrawalHistoryTable: React.FC<WithdrawalHistoryTableProps> = ({
  history,
  isLoading
}) => {
  const { language } = useLanguage();
  const items = history?.listObjects || history?.content || [];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'vi' ? 'Lịch sử Rút tiền' : 'Withdrawal History'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              {language === 'vi'
                ? 'Danh sách các đợt rút tiền thủ công và tự động đã thực hiện về tài khoản ngân hàng.'
                : 'List of manual and automatic payouts transferred to your bank account.'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-semibold">
            {history?.totalRecords || items.length} {language === 'vi' ? 'giao dịch' : 'transactions'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {language === 'vi' ? 'Đang tải lịch sử rút tiền...' : 'Loading withdrawal history...'}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {language === 'vi' ? 'Chưa có giao dịch rút tiền nào' : 'No withdrawal transactions yet'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'vi'
                ? 'Khi bạn thực hiện rút tiền thủ công hoặc hệ thống chạy Auto Payout hàng ngày, các bản ghi sẽ xuất hiện tại đây.'
                : 'Records will appear here when you perform manual withdrawals or daily auto payouts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs font-semibold text-slate-500 bg-slate-50/30 dark:bg-slate-900/20">
                  <TableHead className="w-[160px]">{language === 'vi' ? 'Mã giao dịch' : 'Transaction Code'}</TableHead>
                  <TableHead className="w-[140px]">{language === 'vi' ? 'Loại hình' : 'Type'}</TableHead>
                  <TableHead className="text-right">{language === 'vi' ? 'Số tiền rút' : 'Amount'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Tài khoản nhận' : 'Receiving Bank'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Mã PayOS Ref' : 'PayOS Ref'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Trạng thái' : 'Status'}</TableHead>
                  <TableHead className="text-right">{language === 'vi' ? 'Thời gian' : 'Timestamp'}</TableHead>
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
                            <ArrowDownLeft className="h-2.5 w-2.5 text-slate-400" />{' '}
                            {language === 'vi' ? 'Rút tay (Manual)' : 'Manual'}
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
                            <CheckCircle2 className="h-2.5 w-2.5" /> {language === 'vi' ? 'Thành công' : 'Success'}
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1">
                            <Clock className="h-2.5 w-2.5 animate-spin" /> {language === 'vi' ? 'Đang chuyển' : 'Processing'}
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> {language === 'vi' ? 'Thất bại' : 'Failed'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
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
