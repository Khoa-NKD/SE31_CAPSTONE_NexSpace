import { WORKSPACE_HOLIDAYS } from '@/features/workspaces/utils/workspace-holidays';
import { useState } from 'react';
import { useRouter, useLocation } from '@tanstack/react-router';
import { Clock, Copy, Save, ArrowRight, CheckCircle2 } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { parseTimeToMinutes } from '../schemas/wizard-schemas';
import { time12To24 } from '../utils/wizard-api-mapper';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { WizardStepIntro } from './wizard-step-intro';
const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export function StepOperatingHoursView() {
  const router = useRouter(),
    editing = (useLocation().search as Record<string, unknown>).mode === 'edit';
  const state = useWizardStore(),
    hours = state.operatingHours;
  const { saveDraftToServer, isSaving } = useWizardDraftSync();
  const [error, setError] = useState('');
  function changeDay(index: number, values: Partial<(typeof hours.schedule)[number]>) {
    state.setOperatingHours({
      schedule: hours.schedule.map((day, i) => (i === index ? { ...day, ...values } : day))
    });
    setError('');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!hours.is247 && !hours.schedule.some((d) => d.isOpen)) {
      setError('Chọn ít nhất một ngày mở cửa.');
      return;
    }
    if (
      !hours.is247 &&
      hours.schedule.some(
        (d) =>
          d.isOpen &&
          (!d.openTime ||
            !d.closeTime ||
            parseTimeToMinutes(d.openTime) === parseTimeToMinutes(d.closeTime))
      )
    ) {
      setError(
        'Nhập đủ giờ mở, đóng cửa và để hai giờ khác nhau. Dùng chế độ 24/7 nếu mở cả ngày.'
      );
      return;
    }
    setError('');
    const saved = await saveDraftToServer({ silent: !editing, commitEdit: editing });
    if (saved && !editing)
      void router.navigate({
        to: '/dashboard/organizer/workspaces/create/amenities',
        search: (prev) => ({ ...prev, id: String(saved.id) })
      });
  }
  return (
    <div className='wizard-shell'>
      <WizardHeader currentStep={4} />
      <WizardStepper currentStep={4} />
      <WizardStepIntro
        icon={Clock}
        title='Giờ hoạt động'
        description='Đặt lịch mở cửa rõ ràng để khách chọn đúng khoảng thời gian phù hợp.'
      />
      <form onSubmit={submit} className='space-y-5'>
        <section className='wizard-panel'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <span className='flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Clock className='size-5' />
              </span>
              <div>
                <h2 className='text-sm font-semibold'>Mở cửa 24/7</h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Liên tục cả tuần, bao gồm qua đêm.
                </p>
              </div>
            </div>
            <Switch
              checked={hours.is247}
              onCheckedChange={(is247) => state.setOperatingHours({ is247 })}
              aria-label='Mở cửa 24/7'
            />
          </div>
          {hours.is247 && (
            <div className='mt-5 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-primary'>
              <CheckCircle2 className='size-4 shrink-0' />
              24 giờ mỗi ngày · 7 ngày trong tuần
            </div>
          )}
          {!hours.is247 && (
            <div className='mt-5 border-t'>
              <div className='flex flex-wrap items-center justify-between gap-2 py-3'>
                <p className='text-xs font-medium text-muted-foreground'>Lịch mở cửa trong tuần</p>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='gap-1.5 text-xs'
                  onClick={() => {
                    const monday = hours.schedule[0];
                    state.setOperatingHours({
                      schedule: hours.schedule.map((d) => ({
                        ...d,
                        isOpen: monday.isOpen,
                        openTime: monday.openTime,
                        closeTime: monday.closeTime
                      }))
                    });
                  }}
                >
                  <Copy className='size-3.5' />
                  Dùng giờ thứ Hai cho cả tuần
                </Button>
              </div>
              <div className='divide-y'>
                {hours.schedule.map((day, index) => {
                  const overnight =
                    parseTimeToMinutes(day.closeTime) < parseTimeToMinutes(day.openTime);
                  return (
                    <div className='wizard-hours-day' key={day.day}>
                      <div className='flex items-center gap-3'>
                        <Switch
                          checked={day.isOpen}
                          aria-label={days[index]}
                          onCheckedChange={(isOpen) => changeDay(index, { isOpen })}
                        />
                        <span
                          className={
                            'text-sm font-medium ' + (!day.isOpen ? 'text-muted-foreground' : '')
                          }
                        >
                          {days[index]}
                        </span>
                      </div>
                      <div className='flex items-center gap-3'>
                        {day.isOpen ? (
                          <>
                            <Input
                              type='time'
                              required
                              className='w-32'
                              aria-label={'Giờ mở ' + days[index]}
                              value={time12To24(day.openTime)}
                              onChange={(e) => changeDay(index, { openTime: e.target.value })}
                            />
                            <span className='text-xs text-muted-foreground'>đến</span>
                            <Input
                              type='time'
                              required
                              className='w-32'
                              aria-label={'Giờ đóng ' + days[index]}
                              value={time12To24(day.closeTime)}
                              onChange={(e) => changeDay(index, { closeTime: e.target.value })}
                            />
                          </>
                        ) : (
                          <span className='text-sm text-muted-foreground'>Không nhận đặt chỗ</span>
                        )}
                      </div>
                      <span className='text-xs text-muted-foreground'>
                        {day.isOpen
                          ? overnight
                            ? 'Ngày hôm sau'
                            : time12To24(day.openTime) + '–' + time12To24(day.closeTime)
                          : 'Đóng cửa'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        <section className='wizard-panel'>
          <h2 className='text-sm font-semibold'>Ngày nghỉ lễ</h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            Chọn các dịp không nhận đặt chỗ. Hệ thống tự áp dụng ngày nghỉ theo lịch Việt Nam, kể cả
            khi mở 24/7.
          </p>
          <div className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
            {WORKSPACE_HOLIDAYS.map((holiday) => {
              const checked = hours.holidayCodes?.includes(holiday.code) ?? false;
              return (
                <label
                  key={holiday.code}
                  className={
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-colors ' +
                    (checked ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/40')
                  }
                >
                  <input
                    type='checkbox'
                    checked={checked}
                    className='size-4 accent-primary'
                    onChange={() =>
                      state.setOperatingHours({
                        holidayCodes: checked
                          ? (hours.holidayCodes ?? []).filter((code) => code !== holiday.code)
                          : [...(hours.holidayCodes ?? []), holiday.code]
                      })
                    }
                  />
                  <span>{holiday.name}</span>
                </label>
              );
            })}
          </div>
        </section>
        <div className='grid items-start gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(250px,1fr)]'>
          <section className='wizard-panel space-y-3'>
            <label htmlFor='entry-instructions' className='text-sm font-medium'>
              Hướng dẫn đến và nhận chỗ{' '}
              <span className='font-normal text-muted-foreground'>(tùy chọn)</span>
            </label>
            <Textarea
              id='entry-instructions'
              rows={3}
              maxLength={1000}
              value={state.location.entryNotes}
              onChange={(e) => state.setLocation({ entryNotes: e.target.value })}
              placeholder='Lối vào, tầng, hướng dẫn gặp lễ tân…'
            />
            <p className='text-xs text-muted-foreground'>
              Giúp khách tìm đến và nhận chỗ thuận tiện.
            </p>
          </section>
          <div className='wizard-hint'>
            <p className='mb-2 font-medium text-foreground'>Đặt theo ngày = 24 giờ liên tục</p>
            <p>
              Cả khoảng đặt phải nằm trong lịch mở cửa. Bật 24/7 nếu không gian nhận đặt liên tục
              qua ngày.
            </p>
          </div>
        </div>
        {error && (
          <p role='alert' className='rounded-lg bg-destructive/5 p-3 text-sm text-destructive'>
            {error}
          </p>
        )}
        <div className='wizard-actions'>
          {!editing && (
            <Button
              type='button'
              variant='outline'
              disabled={isSaving}
              onClick={() => void saveDraftToServer()}
            >
              Lưu bản nháp
            </Button>
          )}
          <Button type='submit' disabled={isSaving}>
            {editing ? <Save className='size-4' /> : <ArrowRight className='size-4' />}
            {isSaving ? 'Đang lưu…' : editing ? 'Xem lại thay đổi' : 'Tiếp tục'}
          </Button>
        </div>
      </form>
    </div>
  );
}
