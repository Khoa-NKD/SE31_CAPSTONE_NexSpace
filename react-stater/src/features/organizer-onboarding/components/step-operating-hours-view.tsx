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
  Loader2
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
import { operatingHoursSchema } from '../schemas/wizard-schemas';
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

function parseTimeToMinutes(timeStr: string): number {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function calculateDurationHours(openTime: string, closeTime: string): number {
  const start = parseTimeToMinutes(openTime);
  let end = parseTimeToMinutes(closeTime);
  if (end <= start) {
    end += 24 * 60; // Overnight
  }
  return Math.round(((end - start) / 60) * 10) / 10;
}

export function StepOperatingHoursView() {
  const router = useRouter();
  const {
    operatingHours,
    setOperatingHours,
    updateDaySchedule,
    applyMondayToWeekdays,
    saveDraft
  } = useWizardStore();
  const { saveDraftToServer, isSaving } = useWizardDraftSync();

  const [validationError, setValidationError] = useState<string | null>(null);

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
    router.navigate({ to: '/dashboard/organizer/workspaces/create/location' });
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

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

    router.navigate({ to: '/dashboard/organizer/workspaces/create/amenities' });
  };

  return (
    <div className='w-full max-w-5xl mx-auto py-2 sm:py-4 flex flex-col justify-between'>
      <div>
        {/* Wizard Header Bar */}
        <WizardHeader currentStep={3} />

        {/* Wizard Stepper */}
        <WizardStepper currentStep={3} />

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
                const duration = calculateDurationHours(
                  dayItem.openTime,
                  dayItem.closeTime
                );

                return (
                  <div
                    key={dayItem.day}
                    className={`py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                      !dayItem.isOpen && !operatingHours.is247 ? 'opacity-65' : ''
                    }`}
                  >
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
                              className='h-9 text-xs'
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
                              className='h-9 text-xs'
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

                        <Badge
                          variant='secondary'
                          className='bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold'
                        >
                          {operatingHours.is247
                            ? 'Open (24 hrs)'
                            : `Open (${duration} hrs)`}
                        </Badge>
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
              <div className='flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/50 transition-colors'>
                <Checkbox
                  id='checkbox-block-holidays'
                  checked={operatingHours.blockHolidays}
                  onCheckedChange={(checked) =>
                    setOperatingHours({ blockHolidays: !!checked })
                  }
                  className='mt-0.5'
                />
                <div className='grid gap-0.5 leading-none'>
                  <label
                    htmlFor='checkbox-block-holidays'
                    className='text-xs sm:text-sm font-semibold text-foreground cursor-pointer'
                  >
                    Automatically block bookings on National Public Holidays
                  </label>
                  <p className='text-xs text-muted-foreground leading-relaxed mt-0.5'>
                    Synchronizes with Vietnam statutory holidays (Lunar New Year, Reunification Day, National Day).
                  </p>
                </div>
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

      {/* Sticky Action Footer Bar */}
      <footer className='mt-8 bg-card/95 backdrop-blur border border-border px-6 py-4 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3'>
        {/* Left: Back to Location */}
        <Button
          type='button'
          variant='ghost'
          onClick={handleBack}
          className='gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          <span>Back to Location</span>
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
