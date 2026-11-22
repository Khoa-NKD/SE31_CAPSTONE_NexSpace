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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRequestAutoPayoutMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';

interface RequestAutoPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHour?: number;
  isAutoDaily?: boolean;
}

const PRESET_HOURS_VI = [
  { hour: 9, label: '09:00', desc: 'Đầu giờ sáng' },
  { hour: 12, label: '12:00', desc: 'Nghỉ trưa' },
  { hour: 15, label: '15:00', desc: 'Đầu giờ chiều' },
  { hour: 18, label: '18:00', desc: 'Hết giờ hành chính' },
  { hour: 21, label: '21:00', desc: 'Đóng cửa / Tối' }
];

const PRESET_HOURS_EN = [
  { hour: 9, label: '09:00', desc: 'Morning' },
  { hour: 12, label: '12:00', desc: 'Noon' },
  { hour: 15, label: '15:00', desc: 'Afternoon' },
  { hour: 18, label: '18:00', desc: 'End of day' },
  { hour: 21, label: '21:00', desc: 'Night' }
];

const formatHourString = (h: number) => `${h < 10 ? `0${h}` : h}:00`;

export const RequestAutoPayoutDialog: React.FC<RequestAutoPayoutDialogProps> = ({
  open,
  onOpenChange,
  currentHour = 9,
  isAutoDaily = false
}) => {
  const { language } = useLanguage();
  const [hour, setHour] = useState<number>(currentHour);
  const [note, setNote] = useState<string>('');
  const requestMutation = useRequestAutoPayoutMutation();
  const presetHours = language === 'vi' ? PRESET_HOURS_VI : PRESET_HOURS_EN;

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setHour(currentHour);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestMutation.mutate(
      {
        autoPayoutHour: hour,
        requestNote: note.trim() || undefined
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNote('');
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isAutoDaily
                ? (language === 'vi' ? 'Điều chỉnh khung giờ' : 'Adjust Schedule')
                : (language === 'vi' ? 'Đăng ký chế độ tự động' : 'Register Auto Mode')}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {isAutoDaily
              ? (language === 'vi'
                  ? 'Thay đổi khung giờ Rút tiền tự động (Auto Payout)'
                  : 'Change Daily Auto Payout Hour')
              : (language === 'vi'
                  ? 'Yêu cầu kích hoạt Rút tiền tự động hàng ngày'
                  : 'Request Daily Auto Payout Activation')}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isAutoDaily
              ? (language === 'vi'
                  ? `Hiện tại hệ thống đang quét vào ${formatHourString(currentHour)} mỗi ngày. Bạn có thể chọn bất kỳ khung giờ nào (từ 00:00 đến 23:00) theo nhu cầu dòng tiền của mình.`
                  : `Currently scheduled at ${formatHourString(currentHour)} daily. You can choose any time slot (00:00 to 23:00) to fit your cash flow.`)
              : (language === 'vi'
                  ? 'Hệ thống sẽ tự động quét toàn bộ số dư khả dụng (RELEASED) và chi tiền qua PayOS vào đúng giờ bạn chọn mỗi ngày (00:00 - 23:00). Yêu cầu cần được Admin xem xét và phê duyệt.'
                  : 'The system will automatically transfer all available balance (RELEASED) via PayOS at your chosen daily hour (00:00 - 23:00). Subject to Admin review and approval.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Quick presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {language === 'vi' ? 'Gợi ý các khung giờ phổ biến' : 'Popular time slots'}
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              {presetHours.map((preset) => {
                const isSelected = hour === preset.hour;
                return (
                  <button
                    key={preset.hour}
                    type="button"
                    onClick={() => setHour(preset.hour)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal truncate max-w-full">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full 24h custom dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="hour" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{language === 'vi' ? 'Tùy chỉnh giờ rút tiền chính xác (0h - 23h)' : 'Custom exact payout hour (0h - 23h)'}</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {formatHourString(hour)} {language === 'vi' ? 'hàng ngày' : 'daily'}
              </span>
            </Label>
            <div className="relative">
              <select
                id="hour"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {Array.from({ length: 24 }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    {idx < 10 ? `0${idx}` : idx}:00 ({language === 'vi' ? (idx < 6 ? 'Đêm' : idx < 12 ? 'Sáng' : idx < 14 ? 'Trưa' : idx < 18 ? 'Chiều' : 'Tối') : (idx < 12 ? 'AM' : 'PM')})
                  </option>
                ))}
              </select>
              <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2 rounded border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {language === 'vi' ? (
                  <>Hệ thống tự động kích hoạt tiến trình chuyển tiền vào đúng <strong>{formatHourString(hour)}:00 (GMT+7)</strong> mỗi ngày.</>
                ) : (
                  <>The system automatically executes payout transfers at <strong>{formatHourString(hour)}:00 (GMT+7)</strong> daily.</>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {language === 'vi' ? 'Ghi chú gửi Admin (tùy chọn)' : 'Note to Admin (optional)'}
            </Label>
            <Textarea
              id="note"
              rows={3}
              placeholder={
                language === 'vi'
                  ? 'Lý do điều chỉnh giờ hoặc yêu cầu riêng về dòng tiền...'
                  : 'Reason for schedule change or cash flow requirements...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={requestMutation.isPending}
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={requestMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {requestMutation.isPending
                ? (language === 'vi' ? 'Đang gửi yêu cầu...' : 'Submitting...')
                : isAutoDaily
                  ? (language === 'vi' ? 'Gửi yêu cầu đổi giờ lên Admin' : 'Submit Hour Change Request')
                  : (language === 'vi' ? 'Gửi yêu cầu kích hoạt lên Admin' : 'Submit Activation Request')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
