import { formatHolidayDates } from '@/features/workspaces/utils/workspace-holiday-schedules';
import { WORKSPACE_HOLIDAYS } from '../../workspaces/utils/workspace-holidays';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  MapPin,
  Layers3,
  Clock,
  Wifi,
  ImageIcon,
  Pencil,
  type AppIcon
} from '@/components/ui/hugeicons';
import { getAmenityIcon } from '@/features/amenities/components/amenity-icons';
import { editValueChanged, type WorkspaceEditSnapshot } from '../utils/workspace-edit-snapshot';
import '../styles/workspace-wizard.css';

const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const routes = [
  '/dashboard/organizer/workspaces/create',
  '/dashboard/organizer/workspaces/create/location',
  '/dashboard/organizer/workspaces/create/location',
  '/dashboard/organizer/workspaces/create/hours',
  '/dashboard/organizer/workspaces/create/amenities',
  '/dashboard/organizer/workspaces/create/media'
] as const;
export const formatOverviewNumber = (value: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
export function overviewChangedSections(
  current: WorkspaceEditSnapshot,
  original?: WorkspaceEditSnapshot
) {
  if (!original) return [];
  const groups = [
    ['name', 'description'],
    ['address', 'city', 'ward', 'latitude', 'longitude'],
    ['floors'],
    ['is247', 'schedule', 'entryNotes', 'holidayCodes', 'holidaySchedules'],
    ['amenities'],
    ['media']
  ] as const;
  return groups.map((keys) =>
    keys.some((key) =>
      editValueChanged(
        key === 'holidayCodes' || key === 'holidaySchedules'
          ? (original[key] ?? [])
          : original[key],
        current[key]
      )
    )
  );
}

function Field({
  label,
  value,
  before,
  changed = false
}: {
  label: string;
  value: string;
  before?: string;
  changed?: boolean;
}) {
  return (
    <div className='overview-field' data-changed={changed}>
      <dt>
        {label}
        {changed && <span className='overview-change-label'>Đã sửa</span>}
      </dt>
      <dd>{value || 'Chưa bổ sung'}</dd>
      {changed && before !== undefined && (
        <p className='overview-before'>Trước: {before || 'Chưa bổ sung'}</p>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  step,
  changed,
  workspaceId,
  editable,
  editing,
  children
}: {
  icon: AppIcon;
  title: string;
  step: number;
  changed?: boolean;
  workspaceId: string;
  editable: boolean;
  editing: boolean;
  children: ReactNode;
}) {
  return (
    <section id={'overview-section-' + step} className='overview-card' data-changed={changed}>
      <header>
        <span className='overview-section-icon'>
          <Icon className='size-4' />
        </span>
        <h2>{title}</h2>
        <span className='overview-section-index'>{String(step).padStart(2, '0')}</span>
        {changed && <span className='overview-change-label'>Có thay đổi</span>}
        {editable && (
          <Link
            className='overview-edit-link'
            to={routes[step - 1]}
            search={{
              id: workspaceId,
              mode: editing ? 'edit' : undefined,
              stage: step === 3 ? 'floors' : undefined
            }}
            aria-label={'Chỉnh sửa ' + title}
          >
            <Pencil className='size-3.5' />
            <span>Sửa</span>
          </Link>
        )}
      </header>
      <div className='overview-card-body'>{children}</div>
    </section>
  );
}

function describeHolidays(snapshot: WorkspaceEditSnapshot) {
  return (
    (snapshot.holidayCodes ?? [])
      .map((code) => {
        const name = WORKSPACE_HOLIDAYS.find((item) => item.code === code)?.name ?? code;
        const dates = snapshot.holidaySchedules?.find((item) => item.code === code);
        return name + (dates ? ' · ' + formatHolidayDates(dates) : ' · Theo lịch đã có');
      })
      .join('\n') || 'Không chọn ngày nghỉ lễ'
  );
}

export function WorkspaceOverviewCards({
  value,
  original,
  workspaceId,
  amenityCatalog = [],
  editable = true,
  editing = true
}: {
  value: WorkspaceEditSnapshot;
  original?: WorkspaceEditSnapshot;
  workspaceId: string;
  amenityCatalog?: { id: string | number; name: string; icon?: string }[];
  editable?: boolean;
  editing?: boolean;
}) {
  const changes = overviewChangedSections(value, original);
  const changed = (key: keyof WorkspaceEditSnapshot) =>
    !!original && editValueChanged(original[key], value[key]);
  const section = (step: number) => ({
    step,
    changed: changes[step - 1],
    workspaceId,
    editable,
    editing
  });
  const floorNumbers = [
    ...new Set([
      ...value.floors.map((f) => f.floorNumber),
      ...(original?.floors.map((f) => f.floorNumber) ?? [])
    ])
  ].sort((a, b) => a - b);
  const amenities = [
    ...new Set([
      ...value.amenities.map((a) => a.id),
      ...(original?.amenities.map((a) => a.id) ?? [])
    ])
  ];
  const hours = (snapshot: WorkspaceEditSnapshot, index: number) =>
    snapshot.is247
      ? '24 giờ'
      : !snapshot.schedule[index]?.isOpen
        ? 'Đóng cửa'
        : `${snapshot.schedule[index].openTime} – ${snapshot.schedule[index].closeTime}${snapshot.schedule[index].closeTime < snapshot.schedule[index].openTime ? ' (+1 ngày)' : ''}`;
  return (
    <div className='overview-grid'>
      <Section icon={Building2} title='Thông tin cơ bản' {...section(1)}>
        <dl className='space-y-3'>
          <Field
            label='Tên công khai'
            value={value.name}
            before={original?.name}
            changed={changed('name')}
          />
          <Field
            label='Giới thiệu ngắn'
            value={value.description}
            before={original?.description}
            changed={changed('description')}
          />
        </dl>
      </Section>
      <Section icon={MapPin} title='Địa điểm' {...section(2)}>
        <dl className='space-y-3'>
          <Field
            label='Địa chỉ'
            value={value.address}
            before={original?.address}
            changed={changed('address')}
          />
          <div className='grid grid-cols-2 gap-3'>
            <Field
              label='Tỉnh / thành phố'
              value={value.city || ''}
              before={original?.city || ''}
              changed={changed('city')}
            />
            <Field
              label='Phường / xã'
              value={value.ward || ''}
              before={original?.ward || ''}
              changed={changed('ward')}
            />
          </div>
          {value.latitude != null && value.longitude != null && (
            <Field
              label='Vị trí trên bản đồ'
              value={`${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`}
              before={
                original?.latitude != null && original?.longitude != null
                  ? `${original.latitude.toFixed(6)}, ${original.longitude.toFixed(6)}`
                  : ''
              }
              changed={changed('latitude') || changed('longitude')}
            />
          )}
        </dl>
      </Section>
      <Section icon={Layers3} title='Tầng và mặt bằng' {...section(3)}>
        {floorNumbers.length ? (
          <div className='space-y-2'>
            {floorNumbers.map((number) => {
              const floor = value.floors.find((f) => f.floorNumber === number),
                before = original?.floors.find((f) => f.floorNumber === number);
              const describe = (f: NonNullable<typeof floor>) =>
                `${formatOverviewNumber(f.widthM)} × ${formatOverviewNumber(f.lengthM)} m · ${f.outline === 'ROUNDED' ? `Bo góc ${formatOverviewNumber(f.cornerRadiusM)} m` : 'Góc vuông'}`;
              return (
                <dl key={number}>
                  <Field
                    label={`Tầng ${number}${!floor ? ' · Đã bỏ' : original && !before ? ' · Mới thêm' : ''}`}
                    value={floor ? describe(floor) : 'Loại khỏi cấu hình'}
                    before={before ? describe(before) : undefined}
                    changed={!!original && editValueChanged(before, floor)}
                  />
                </dl>
              );
            })}
          </div>
        ) : (
          <p className='overview-empty'>Chưa thiết lập tầng.</p>
        )}
      </Section>
      <Section icon={Clock} title='Giờ hoạt động' {...section(4)}>
        <div className='overview-hours'>
          {value.schedule.map((day, index) => (
            <dl key={day.day}>
              <Field
                label={days[index]}
                value={hours(value, index)}
                before={original ? hours(original, index) : undefined}
                changed={!!original && hours(value, index) !== hours(original, index)}
              />
            </dl>
          ))}
        </div>
        <dl className='mt-4 border-t pt-3'>
          <Field
            label='Ngày nghỉ lễ'
            value={describeHolidays(value)}
            before={original ? describeHolidays(original) : ''}
            changed={
              changed('holidayCodes') ||
              (!!original &&
                editValueChanged(original.holidaySchedules ?? [], value.holidaySchedules))
            }
          />
        </dl>
        <dl className='mt-4 border-t pt-3'>
          <Field
            label='Hướng dẫn đến và nhận chỗ'
            value={value.entryNotes}
            before={original?.entryNotes}
            changed={changed('entryNotes')}
          />
        </dl>
      </Section>
      <Section icon={Wifi} title='Tiện ích và dịch vụ' {...section(5)}>
        {amenities.length ? (
          <div className='space-y-2'>
            {amenities.map((id) => {
              const amenity = value.amenities.find((a) => a.id === id),
                before = original?.amenities.find((a) => a.id === id),
                meta = amenityCatalog.find((a) => String(a.id) === id),
                Icon = getAmenityIcon(meta?.icon || 'Sparkles');
              const rate = (amount: number) =>
                amount > 0 ? `${formatOverviewNumber(amount)} đ/giờ` : 'Miễn phí';
              const edited = !!original && editValueChanged(before, amenity);
              return (
                <div className='overview-amenity' data-changed={edited} key={id}>
                  <span className='overview-section-icon'>
                    <Icon className='size-4' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='break-words text-xs font-medium'>
                      {meta?.name || `Tiện ích #${id}`}
                    </p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {amenity ? rate(amenity.rate) : 'Đã bỏ tiện ích'}
                    </p>
                    {edited && before && (
                      <p className='overview-before'>Trước: {rate(before.rate)}</p>
                    )}
                  </div>
                  {edited && (
                    <span className='overview-change-label'>
                      {!amenity ? 'Đã bỏ' : !before ? 'Mới thêm' : 'Đã sửa'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className='overview-empty'>Chưa chọn tiện ích.</p>
        )}
      </Section>
      <Section icon={ImageIcon} title='Thư viện ảnh' {...section(6)}>
        {value.media.length ? (
          <div className='overview-photos'>
            {value.media.map((photo, index) => {
              const previousIndex = original?.media.findIndex((p) => p.url === photo.url),
                before =
                  previousIndex != null && previousIndex >= 0
                    ? original?.media[previousIndex]
                    : undefined;
              const edited =
                !!original && (!before || before.cover !== photo.cover || previousIndex !== index);
              return (
                <figure key={photo.url + index} data-changed={edited}>
                  <img src={photo.url} alt={`Ảnh không gian ${index + 1}`} loading='lazy' />
                  <figcaption>
                    {photo.cover ? 'Ảnh bìa' : `Ảnh ${index + 1}`}
                    {edited && <span>{!before ? 'Mới thêm' : 'Đã sửa'}</span>}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <p className='overview-empty'>Chưa có ảnh.</p>
        )}
        {original?.media.some((photo) => !value.media.some((p) => p.url === photo.url)) && (
          <div className='mt-4 border-t pt-3'>
            <p className='mb-2 text-xs text-muted-foreground'>Ảnh đã bỏ</p>
            <div className='flex flex-wrap gap-2'>
              {original.media
                .filter((photo) => !value.media.some((p) => p.url === photo.url))
                .map((photo) => (
                  <img
                    key={photo.url}
                    src={photo.url}
                    alt='Ảnh đã bỏ khỏi bản sửa'
                    className='h-14 w-20 rounded-lg object-cover opacity-40'
                    loading='lazy'
                  />
                ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
