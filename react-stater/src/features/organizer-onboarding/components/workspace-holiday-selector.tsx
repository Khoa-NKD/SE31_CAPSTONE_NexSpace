import {
  CalendarDays,
  Fireworks,
  Lantern,
  IconCrown,
  Star,
  Briefcase,
  Flag
} from '@/components/ui/hugeicons';
import { Input } from '@/components/ui/input';
import { WORKSPACE_HOLIDAYS } from '@/features/workspaces/utils/workspace-holidays';
import { formatHolidayDates } from '@/features/workspaces/utils/workspace-holiday-schedules';
import type { OperatingHoursValues } from '../types/wizard';

const visuals = {
  NEW_YEAR: { icon: Fireworks, tone: 'violet' },
  LUNAR_NEW_YEAR: { icon: Lantern, tone: 'rose' },
  HUNG_KINGS: { icon: IconCrown, tone: 'amber' },
  REUNIFICATION: { icon: Star, tone: 'rose' },
  LABOUR_DAY: { icon: Briefcase, tone: 'blue' },
  NATIONAL_DAY: { icon: Flag, tone: 'amber' }
} as const;
type Schedule = NonNullable<OperatingHoursValues['holidaySchedules']>[number];

export function WorkspaceHolidaySelector({
  value,
  onChange
}: {
  value: OperatingHoursValues;
  onChange: (values: Partial<OperatingHoursValues>) => void;
}) {
  const schedules = (value.holidayCodes ?? []).map(
    (code) =>
      value.holidaySchedules?.find((item) => item.code === code) ?? {
        code,
        startDate: '',
        endDate: ''
      }
  );
  const update = (items: Schedule[]) =>
    onChange({ holidayCodes: items.map((item) => item.code), holidaySchedules: items });
  const change = (code: string, patch: Partial<Schedule>) =>
    update(schedules.map((item) => (item.code === code ? { ...item, ...patch } : item)));
  return (
    <section className='wizard-panel'>
      <h2 className='flex items-center gap-2 text-sm font-semibold'>
        <CalendarDays className='size-4 text-primary' />
        Ngày nghỉ lễ
      </h2>
      <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
        Chọn dịp lễ và ngày nghỉ thực tế của không gian. Hệ thống ngừng nhận đặt chỗ trong đúng
        những ngày bạn nhập, kể cả khi mở 24/7.
      </p>
      <div className='wizard-holiday-options mt-4'>
        {WORKSPACE_HOLIDAYS.map((holiday) => {
          const item = schedules.find((entry) => entry.code === holiday.code);
          const { icon: Icon, tone } = visuals[holiday.code];
          const range =
            item?.mode === 'DATE_RANGE' ||
            (!item?.mode && !!item?.endDate && item.startDate !== item.endDate);
          const prefix = 'holiday-' + holiday.code;
          return (
            <div key={holiday.code} className='wizard-holiday-card' data-selected={!!item}>
              <label className='wizard-holiday-option' data-selected={!!item}>
                <span className='wizard-holiday-icon' data-tone={tone}>
                  <Icon className='size-5' aria-hidden='true' />
                </span>
                <span className='min-w-0 flex-1 font-medium'>{holiday.name}</span>
                <input
                  type='checkbox'
                  className='size-4 accent-primary'
                  checked={!!item}
                  aria-controls={prefix + '-dates'}
                  aria-expanded={!!item}
                  onChange={() =>
                    update(
                      item
                        ? schedules.filter((entry) => entry.code !== holiday.code)
                        : [
                            ...schedules,
                            { code: holiday.code, startDate: '', endDate: '', mode: 'SINGLE_DAY' }
                          ]
                    )
                  }
                />
              </label>
              {item && (
                <fieldset id={prefix + '-dates'} className='wizard-holiday-dates'>
                  <legend className='sr-only'>Lịch nghỉ {holiday.name}</legend>
                  <div className='wizard-holiday-modes'>
                    {(['SINGLE_DAY', 'DATE_RANGE'] as const).map((mode) => (
                      <label key={mode} data-active={range === (mode === 'DATE_RANGE')}>
                        <input
                          type='radio'
                          name={prefix + '-mode'}
                          checked={range === (mode === 'DATE_RANGE')}
                          onChange={() =>
                            change(holiday.code, {
                              mode,
                              endDate: mode === 'SINGLE_DAY' ? item.startDate : item.endDate
                            })
                          }
                        />
                        {mode === 'SINGLE_DAY' ? 'Nghỉ 1 ngày' : 'Khoảng nghỉ lễ'}
                      </label>
                    ))}
                  </div>
                  <div className='mt-3 grid gap-3'>
                    <label
                      htmlFor={prefix + '-start'}
                      className='space-y-1.5 text-xs text-muted-foreground'
                    >
                      <span>{range ? 'Từ ngày' : 'Ngày nghỉ'}</span>
                      <Input
                        id={prefix + '-start'}
                        type='date'
                        required
                        min='1000-01-01'
                        max='9999-12-31'
                        value={item.startDate}
                        aria-label={(range ? 'Bắt đầu nghỉ ' : 'Ngày nghỉ ') + holiday.name}
                        onChange={(event) =>
                          change(holiday.code, {
                            startDate: event.target.value,
                            ...(!range ? { endDate: event.target.value } : {})
                          })
                        }
                      />
                    </label>
                    {range && (
                      <label
                        htmlFor={prefix + '-end'}
                        className='space-y-1.5 text-xs text-muted-foreground'
                      >
                        <span>Đến hết ngày</span>
                        <Input
                          id={prefix + '-end'}
                          type='date'
                          required
                          min={item.startDate || '1000-01-01'}
                          max='9999-12-31'
                          value={item.endDate}
                          aria-label={'Kết thúc nghỉ ' + holiday.name}
                          aria-invalid={!!item.endDate && item.endDate < item.startDate}
                          onChange={(event) =>
                            change(holiday.code, { endDate: event.target.value })
                          }
                        />
                      </label>
                    )}
                  </div>
                  {item.endDate && item.endDate < item.startDate ? (
                    <p className='mt-2 text-xs text-destructive' role='alert'>
                      Ngày kết thúc phải từ ngày bắt đầu trở đi.
                    </p>
                  ) : (
                    <p className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>
                      {formatHolidayDates(item)}
                    </p>
                  )}
                </fieldset>
              )}
            </div>
          );
        })}
      </div>
      <p className='mt-3 text-[11px] leading-relaxed text-muted-foreground'>
        Tính cả ngày bắt đầu và ngày kết thúc, theo giờ Việt Nam. Lịch được áp dụng cho ngày và năm
        đã chọn.
      </p>
    </section>
  );
}
