import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  Clock,
  Sparkles,
  Copy,
  ArrowLeft,
  ArrowRight,
  Save,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Info,
  CalendarCheck2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import {
  operatingHoursSchema,
  parseTimeToMinutes,
  isOperatingTimeRangeValid
} from '../schemas/wizard-schemas';
import type { DayOfWeek, DaySchedule } from '../types/wizard';

export const TIME_SLOTS = [
  '06:00 AM',
  '06:30 AM',
  '07:00 AM',
  '07:30 AM',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM',
  '10:30 PM',
  '11:00 PM',
  '11:30 PM',
  '12:00 AM'
];

export interface StatutoryHolidayItem {
  id: string;
  nameVi: string;
  nameEn: string;
  dateSolar: string;
  dateLunar?: string;
  duration: string;
  description: string;
  badge: string;
}

export const VIETNAM_STATUTORY_HOLIDAYS: StatutoryHolidayItem[] = [
  {
    id: 'tet-duong-lich',
    nameVi: 'Tết Dương Lịch',
    nameEn: "New Year's Day",
    dateSolar: '01/01 hàng năm',
    duration: '1 ngày',
    description: 'Nghỉ ngày 01 tháng 01 Dương lịch.',
    badge: '01/01'
  },
  {
    id: 'tet-nguyen-dan',
    nameVi: 'Tết Nguyên Đán (Tết Âm Lịch)',
    nameEn: 'Lunar New Year (Tet Holiday)',
    dateSolar: 'Thường rơi vào Tháng 1 hoặc Tháng 2 Dương lịch',
    dateLunar: '29 Tháng Chạp đến hết Mùng 5 Tháng Giêng',
    duration: '5 - 9 ngày (theo lịch Chính phủ công bố)',
    description: 'Nghỉ liền kề 5 ngày theo Luật Lao động (thực tế 7-9 ngày bao gồm hoán đổi ngày làm việc & nghỉ bù).',
    badge: 'Âm lịch (Tết)'
  },
  {
    id: 'gio-to-hung-vuong',
    nameVi: 'Giỗ Tổ Hùng Vương',
    nameEn: "Hung Kings' Commemoration Day",
    dateSolar: 'Thường rơi vào Tháng 4 Dương lịch',
    dateLunar: '10 Tháng 3 Âm lịch',
    duration: '1 ngày',
    description: 'Ngày 10/03 Âm lịch hàng năm (Lễ hội Đền Hùng).',
    badge: '10/03 ÂL'
  },
  {
    id: 'giai-phong-mien-nam',
    nameVi: 'Ngày Chiến thắng & Quốc tế Lao động',
    nameEn: 'Reunification & International Workers\' Day',
    dateSolar: '30/04 - 01/05 hàng năm',
    duration: '2 ngày liên tiếp',
    description: 'Nghỉ 2 ngày chính thức ngày 30/04 và 01/05.',
    badge: '30/04 - 01/05'
  },
  {
    id: 'quoc-khanh',
    nameVi: 'Quốc khánh nước CHXHCN Việt Nam',
    nameEn: 'National Day of Vietnam',
    dateSolar: '02/09 & 1 ngày liền kề (01/09 hoặc 03/09)',
    duration: '2 ngày',
    description: 'Nghỉ 2 ngày: ngày 02/09 và 1 ngày liền kề trước hoặc sau theo thông báo hàng năm của Bộ LĐ-TB&XH.',
    badge: '01 - 03/09'
  }
];

function calculateDurationHours(openTime: string, closeTime: string): number {
  const start = parseTimeToMinutes(openTime);
  const end = parseTimeToMinutes(closeTime);
  if (end <= start) {
    return 0;
  }
  return Math.round(((end - start) / 60) * 10) / 10;
}

export function StepOperatingHoursView() {
  const router = useRouter();
  const {
    operatingHours,
    location,
    setLocation,
    setOperatingHours,
    updateDaySchedule,
    applyMondayToWeekdays,
    saveDraft
  } = useWizardStore();
  const { saveDraftToServer, isSaving } = useWizardDraftSync();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHolidayDetails, setShowHolidayDetails] = useState<boolean>(true);

  const handleToggle247 = (checked: boolean) => {
    setOperatingHours({ is247: checked });
    setValidationError(null);
  };

  const handleDayToggle = (day: DayOfWeek, isOpen: boolean) => {
    updateDaySchedule(day, { isOpen });
    setValidationError(null);
  };

  const handleTimeChange = (
    day: DayOfWeek,
    field: 'openTime' | 'closeTime',
    val: string
  ) => {
    updateDaySchedule(day, { [field]: val });
    setValidationError(null);
  };

  const handleApplyMonday = () => {
    applyMondayToWeekdays();
    toast.success('Hours Replicated', {
      description: "Monday's operating hours applied to Tuesday through Friday."
    });
  };

  const handleCopyDayToAll = (sourceDay: DaySchedule) => {
    const weekdays: DayOfWeek[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];
    weekdays.forEach((d) => {
      if (d !== sourceDay.day) {
        updateDaySchedule(d, {
          isOpen: sourceDay.isOpen,
          openTime: sourceDay.openTime,
          closeTime: sourceDay.closeTime
        });
      }
    });
    toast.success('Schedule Replicated', {
      description: `${sourceDay.label}'s hours copied to all 7 days.`
    });
  };

  const handleSaveDraft = async () => {
    saveDraft();
    await saveDraftToServer();
  };

  const handleBack = () => {
    saveDraft();
    router.navigate({ to: '/dashboard/organizer/workspaces/create', search: (prev) => prev });
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operatingHours.is247) {
      const invalidDays = operatingHours.schedule.filter(
        (d) => d.isOpen && !isOperatingTimeRangeValid(d.openTime, d.closeTime)
      );
      if (invalidDays.length > 0) {
        const dayNames = invalidDays.map((d) => d.label).join(', ');
        const err = `Giờ hoạt động không hợp lệ: Giờ đóng cửa phải sau giờ mở cửa đối với các ngày (${dayNames}).`;
        setValidationError(err);
        toast.error('Lỗi cấu hình giờ hoạt động', {
          description: err
        });
        return;
      }
    }

    const result = operatingHoursSchema.safeParse(operatingHours);
    if (!result.success) {
      const err =
        result.error.issues[0]?.message ||
        'Please configure at least one open day or enable 24/7 Access.';
      setValidationError(err);
      toast.error('Schedule Validation Error', {
        description: err
      });
      return;
    }

    setValidationError(null);
    saveDraft();
    await saveDraftToServer({ silent: true });

    toast.success('Operating Hours Saved', {
      description: 'Proceeding to Amenities configuration.'
    });

    router.navigate({ to: '/dashboard/organizer/workspaces/create/amenities', search: (prev) => prev });
  };

  return (
    <div className='w-full max-w-5xl mx-auto py-2 sm:py-4 flex flex-col justify-between'>
      <div>
        {/* Wizard Header Bar */}
        <WizardHeader currentStep={2} />

        {/* Wizard Stepper */}
        <WizardStepper currentStep={2} />

        {/* Page Title & Subtitle Banner */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Create Workspace Wizard: Operating Hours
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Configure open access schedules for public reservations and dedicated member access.
            </p>
          </div>
          <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium self-start sm:self-center shrink-0'>
            <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span>Draft automatically synced</span>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className='mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-xs sm:text-sm'>
            <AlertCircle className='size-5 shrink-0 mt-0.5' />
            <div>
              <p className='font-semibold'>Operating Hours Incomplete</p>
              <p className='mt-0.5 text-xs opacity-90'>{validationError}</p>
            </div>
          </div>
        )}

        <div className='space-y-6'>
          {/* CARD 1: Master 24/7 Access Toggle */}
          <div className='rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs transition-all'>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-start sm:items-center gap-3.5'>
                <div className='size-10 sm:size-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0'>
                  <Sparkles className='size-5' />
                </div>
                <div>
                  <h3 className='text-sm sm:text-base font-semibold text-foreground flex items-center gap-2'>
                    <span>Open 24/7 Access</span>
                    {operatingHours.is247 && (
                      <Badge className='bg-indigo-600 hover:bg-indigo-600 text-white text-[10px] font-bold'>
                        Active
                      </Badge>
                    )}
                  </h3>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Allow round-the-clock booking for all 7 days with no closed intervals. Ideal for smart lock venues.
                  </p>
                </div>
              </div>

              <Switch
                id='switch-24-7'
                checked={operatingHours.is247}
                onCheckedChange={handleToggle247}
                aria-label='Toggle 24/7 Access'
              />
            </div>
          </div>

          {/* CARD 2: Weekly Schedule */}
          <div className='rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs'>
            {/* Header + Fast Action Button */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-5'>
              <div>
                <h3 className='text-sm sm:text-base font-bold text-foreground flex items-center gap-2'>
                  <Clock className='size-4 text-indigo-600 dark:text-indigo-400' />
                  <span>Weekly Schedule Configuration</span>
                </h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {operatingHours.is247
                    ? '24/7 Mode is active. Individual day hours will apply as default staffed hours.'
                    : 'Specify operating windows per day. Unchecked days are marked as closed.'}
                </p>
              </div>

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleApplyMonday}
                disabled={operatingHours.is247}
                className='text-xs gap-1.5 border-border hover:bg-muted self-start sm:self-center'
              >
                <Copy className='size-3.5 text-muted-foreground' />
                <span>Apply Monday to Weekdays (Tue-Fri)</span>
              </Button>
            </div>

            {/* Days Table List */}
            <div className='divide-y divide-border/60'>
              {operatingHours.schedule.map((dayItem) => {
                const isTimeInvalid =
                  dayItem.isOpen &&
                  !operatingHours.is247 &&
                  !isOperatingTimeRangeValid(dayItem.openTime, dayItem.closeTime);
                const duration = calculateDurationHours(
                  dayItem.openTime,
                  dayItem.closeTime
                );

                return (
                  <div
                    key={dayItem.day}
                    className={`py-3.5 sm:py-4 flex flex-col justify-between gap-3 sm:gap-4 transition-colors ${
                      !dayItem.isOpen && !operatingHours.is247 ? 'opacity-65' : ''
                    } ${isTimeInvalid ? 'bg-destructive/5 -mx-3 px-3 rounded-lg border border-destructive/20 my-1' : ''}`}
                  >
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4'>
                      {/* Day Toggle + Label */}
                      <div className='flex items-center gap-3 w-36 shrink-0'>
                        <Switch
                          id={`switch-day-${dayItem.day}`}
                          checked={operatingHours.is247 || dayItem.isOpen}
                          disabled={operatingHours.is247}
                          onCheckedChange={(checked) =>
                            handleDayToggle(dayItem.day, checked)
                          }
                          aria-label={`Toggle ${dayItem.label}`}
                        />
                        <label
                          htmlFor={`switch-day-${dayItem.day}`}
                          className='text-xs sm:text-sm font-semibold text-foreground cursor-pointer select-none'
                        >
                          {dayItem.label}
                        </label>
                      </div>

                      {/* Time Selectors or Closed Label */}
                      {operatingHours.is247 || dayItem.isOpen ? (
                        <div className='flex flex-wrap items-center gap-2 sm:gap-3 flex-1'>
                          <div className='w-32 sm:w-36'>
                            <Select
                              value={dayItem.openTime}
                              onValueChange={(val) =>
                                handleTimeChange(dayItem.day, 'openTime', val)
                              }
                              disabled={operatingHours.is247}
                            >
                              <SelectTrigger
                                className={`h-9 text-xs ${
                                  isTimeInvalid ? 'border-destructive text-destructive focus:ring-destructive' : ''
                                }`}
                                aria-label={`${dayItem.label} opening time`}
                              >
                                <SelectValue placeholder='Open Time' />
                              </SelectTrigger>
                              <SelectContent className='max-h-56'>
                                {TIME_SLOTS.slice(0, -1).map((slot) => (
                                  <SelectItem key={slot} value={slot} className='text-xs'>
                                    {slot}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <span className='text-xs text-muted-foreground font-medium'>
                            to
                          </span>

                          <div className='w-32 sm:w-36'>
                            <Select
                              value={dayItem.closeTime}
                              onValueChange={(val) =>
                                handleTimeChange(dayItem.day, 'closeTime', val)
                              }
                              disabled={operatingHours.is247}
                            >
                              <SelectTrigger
                                className={`h-9 text-xs ${
                                  isTimeInvalid ? 'border-destructive text-destructive focus:ring-destructive' : ''
                                }`}
                                aria-label={`${dayItem.label} closing time`}
                              >
                                <SelectValue placeholder='Close Time' />
                              </SelectTrigger>
                              <SelectContent className='max-h-56'>
                                {TIME_SLOTS.map((slot) => (
                                  <SelectItem key={slot} value={slot} className='text-xs'>
                                    {slot}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {isTimeInvalid ? (
                            <Badge
                              variant='destructive'
                              className='bg-destructive/15 text-destructive border border-destructive/30 text-[11px] font-semibold flex items-center gap-1 shrink-0'
                            >
                              <AlertCircle className='size-3 shrink-0' />
                              <span>Giờ đóng cửa phải sau giờ mở cửa</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant='secondary'
                              className='bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold'
                            >
                              {operatingHours.is247
                                ? 'Open (24 hrs)'
                                : `Open (${duration} hrs)`}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className='flex items-center gap-2 flex-1'>
                          <Badge
                            variant='outline'
                            className='bg-muted text-muted-foreground border-border text-[11px] font-medium'
                          >
                            Closed
                          </Badge>
                          <span className='text-xs text-muted-foreground italic'>
                            No public reservations scheduled
                          </span>
                        </div>
                      )}

                      {/* Duplicate button */}
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleCopyDayToAll(dayItem)}
                        disabled={operatingHours.is247}
                        className='text-[11px] text-muted-foreground hover:text-foreground h-8 px-2 self-start sm:self-center shrink-0'
                        title={`Copy ${dayItem.label}'s hours to all other days`}
                      >
                        <Copy className='size-3 mr-1' />
                        <span>Copy to all</span>
                      </Button>
                    </div>

                    {/* Inline Warning for Invalid Time Interval */}
                    {isTimeInvalid && (
                      <div className='flex items-center gap-1.5 text-[11px] text-destructive font-medium pl-1'>
                        <AlertCircle className='size-3.5 shrink-0' />
                        <span>
                          Khung giờ không hợp lệ: Giờ đóng cửa ({dayItem.closeTime}) phải muộn hơn giờ mở cửa ({dayItem.openTime}).
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 3: Operating Policies & Exceptions */}
          <div className='rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs'>
            <h3 className='text-sm sm:text-base font-bold text-foreground flex items-center gap-2 mb-4'>
              <ShieldCheck className='size-4 text-indigo-600 dark:text-indigo-400' />
              <span>Operating Policies &amp; Exceptions</span>
            </h3>

            <div className='space-y-4'>
              {/* Policy 1: Holidays */}
              <div className='p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-all'>
                <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3'>
                  <div className='flex items-start gap-3'>
                    <Checkbox
                      id='checkbox-block-holidays'
                      checked={operatingHours.blockHolidays}
                      onCheckedChange={(checked) =>
                        setOperatingHours({ blockHolidays: !!checked })
                      }
                      className='mt-1'
                    />
                    <div className='grid gap-1'>
                      <label
                        htmlFor='checkbox-block-holidays'
                        className='text-xs sm:text-sm font-semibold text-foreground cursor-pointer flex flex-wrap items-center gap-2'
                      >
                        <span>Tự động khóa đặt chỗ vào các ngày nghỉ Lễ Quốc gia (National Public Holidays)</span>
                        {operatingHours.blockHolidays ? (
                          <Badge className='bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-5 px-1.5'>
                            Đang kích hoạt
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='text-[10px] h-5 px-1.5 text-muted-foreground'>
                            Tắt
                          </Badge>
                        )}
                      </label>
                      <p className='text-xs text-muted-foreground leading-relaxed'>
                        Hệ thống tự động đồng bộ lịch nghỉ lễ chính thức theo <strong>Điều 112 Bộ luật Lao động Việt Nam</strong> (Tết Dương lịch, Tết Nguyên Đán, Giỗ Tổ Hùng Vương, 30/04 - 01/05, Quốc khánh 02/09) và tự động tính ngày nghỉ bù nếu trùng cuối tuần.
                      </p>
                    </div>
                  </div>

                  {/* Toggle show/hide detailed schedule */}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowHolidayDetails(!showHolidayDetails)}
                    className='text-xs shrink-0 h-8 gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 self-start sm:self-auto'
                  >
                    <CalendarDays className='size-3.5' />
                    <span>{showHolidayDetails ? 'Thu gọn lịch lễ' : 'Xem lịch nghỉ lễ cụ thể'}</span>
                    {showHolidayDetails ? <ChevronUp className='size-3.5' /> : <ChevronDown className='size-3.5' />}
                  </Button>
                </div>

                {/* Detailed Holiday Schedule Section */}
                {showHolidayDetails && (
                  <div className='mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 duration-200'>
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3'>
                      <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                        <CalendarCheck2 className='size-4 text-indigo-500' />
                        <span>Danh mục chi tiết 5 kỳ nghỉ lễ Quốc gia trong năm:</span>
                      </div>
                      <span className='text-[11px] text-muted-foreground italic'>
                        Tổng cộng 11 ngày nghỉ chính thức + ngày nghỉ bù theo luật
                      </span>
                    </div>

                    <div className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3'>
                      {VIETNAM_STATUTORY_HOLIDAYS.map((holiday) => (
                        <div
                          key={holiday.id}
                          className='p-3 rounded-lg border border-border/70 bg-card flex flex-col justify-between shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors'
                        >
                          <div>
                            <div className='flex items-start justify-between gap-1 mb-1.5'>
                              <h4 className='text-xs font-bold text-foreground leading-tight'>
                                {holiday.nameVi}
                              </h4>
                              <Badge variant='outline' className='bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] shrink-0 font-medium'>
                                {holiday.badge}
                              </Badge>
                            </div>
                            <p className='text-[11px] text-muted-foreground font-medium mb-1'>
                              {holiday.nameEn}
                            </p>
                            <div className='space-y-0.5 text-[11px] text-foreground/80'>
                              <div>
                                <span className='text-muted-foreground'>Thời gian: </span>
                                <span className='font-semibold text-foreground'>{holiday.dateSolar}</span>
                              </div>
                              {holiday.dateLunar && (
                                <div>
                                  <span className='text-muted-foreground'>Âm lịch: </span>
                                  <span className='font-medium text-amber-600 dark:text-amber-400'>{holiday.dateLunar}</span>
                                </div>
                              )}
                              <div>
                                <span className='text-muted-foreground'>Thời lượng: </span>
                                <span className='font-medium text-emerald-600 dark:text-emerald-400'>{holiday.duration}</span>
                              </div>
                            </div>
                          </div>

                          <p className='mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground line-clamp-2'>
                            {holiday.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Policy Notes / Compensation info */}
                    <div className='mt-3 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 text-[11px] text-indigo-900 dark:text-indigo-200'>
                      <Info className='size-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400' />
                      <div className='space-y-0.5 leading-relaxed'>
                        <p className='font-semibold'>Chính sách khóa lịch tự động (Booking Suspension Rules):</p>
                        <ul className='list-disc list-inside space-y-0.5 text-indigo-800/90 dark:text-indigo-300'>
                          <li>Tất cả các khung giờ công khai trên cổng đặt phòng/bàn sẽ chuyển sang trạng thái <strong>Đóng cửa (Closed)</strong> trong toàn bộ các ngày lễ nêu trên.</li>
                          <li>Nếu ngày nghỉ lễ rơi vào thứ Bảy hoặc Chủ Nhật, hệ thống sẽ tự động khóa thêm ngày thứ Hai (hoặc ngày làm việc kế tiếp) để nghỉ bù theo luật.</li>
                          <li>Thành viên có gói Dedicated Desk / Văn phòng riêng vẫn có thể vào không gian bằng khóa thông minh (nếu bật chế độ Smart Lock 24/7).</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Policy 2: Grace period */}
              <div className='flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/50 transition-colors'>
                <Checkbox
                  id='checkbox-grace-period'
                  checked={operatingHours.allowGracePeriod}
                  onCheckedChange={(checked) =>
                    setOperatingHours({ allowGracePeriod: !!checked })
                  }
                  className='mt-0.5'
                />
                <div className='grid gap-0.5 leading-none'>
                  <label
                    htmlFor='checkbox-grace-period'
                    className='text-xs sm:text-sm font-semibold text-foreground cursor-pointer'
                  >
                    Allow 15-minute grace period before official opening time
                  </label>
                  <p className='text-xs text-muted-foreground leading-relaxed mt-0.5'>
                    Permits registered check-in up to 15 minutes prior to scheduled booking start for workstation prep.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className='mt-6 rounded-xl border bg-card p-6'>
        <label htmlFor='workspace-entry-notes' className='mb-2 block text-sm font-semibold'>Entry instructions</label>
        <p className='text-muted-foreground mb-3 text-xs'>Optional directions for entering the building or reaching your workspace. The address is inherited when you link its floor.</p>
        <textarea id='workspace-entry-notes' className='border-input bg-background w-full rounded-lg border p-3 text-sm' maxLength={1000} rows={3} value={location.entryNotes} onChange={event => setLocation({ entryNotes: event.target.value })} />
      </section>
      {/* Sticky Action Footer Bar */}
      <footer className='mt-8 bg-card/95 backdrop-blur border border-border px-6 py-4 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3'>
        {/* Left: Back to Basic Info */}
        <Button
          type='button'
          variant='ghost'
          onClick={handleBack}
          className='gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          <span>Back to Basic Info</span>
        </Button>

        {/* Right: Save Draft & Continue */}
        <div className='flex items-center gap-3'>
          <Button
            type='button'
            variant='outline'
            disabled={isSaving}
            onClick={handleSaveDraft}
            className='gap-1.5 text-xs sm:text-sm border-border hover:bg-muted'
          >
            {isSaving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            type='button'
            disabled={isSaving}
            onClick={handleContinue}
            className='h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm gap-2 shadow-2xs'
          >
            <span>Continue to Amenities</span>
            {isSaving ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
