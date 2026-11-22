import { DecorationIcon } from '@/features/organizer-resources/components/decoration-visual';
import { matchFurnishingIcon } from '@/features/organizer-resources/utils/furnishing-icon-catalog';
import { useState } from 'react';
import {
  Chair,
  Sofa,
  Box,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Layers,
  Monitor,
  Presentation,
  Search,
  Table,
  Trees
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { MaintenanceTarget } from '../api';

function TargetIcon({ target }: { target: MaintenanceTarget }) {
  const name = target.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
  if (target.kind === 'ROOM') return <DoorOpen className='size-4' />;
  if (target.kind === 'DESK') {
    const Icon = /\b(sofa|couch)\b/.test(name) ? Sofa : Chair;
    return <Icon className='size-4' />;
  }
  const furnishing = matchFurnishingIcon(target.name);
  if (furnishing) return <DecorationIcon kind='OTHER' icon={furnishing} className='size-4' />;
  let Icon = Box;
  if (/\b(cay|plant|tree)\b/.test(name)) Icon = Trees;
  else if (/\b(bang|board|scrum)\b/.test(name)) Icon = Presentation;
  else if (/\b(ban|table|desk)\b/.test(name)) Icon = Table;
  else if (/\b(tivi|tv|screen|monitor)\b|man hinh/.test(name)) Icon = Monitor;
  else if (/\b(ghe|chair)\b/.test(name)) Icon = Chair;
  return <Icon className='size-4' />;
}

export function MaintenanceTargetPicker({
  targets,
  selected,
  onChange,
  busy,
  loading,
  error
}: {
  targets: MaintenanceTarget[];
  selected: string[];
  onChange: (keys: string[]) => void;
  busy: boolean;
  loading: boolean;
  error?: string;
}) {
  const c = useOrganizerCopy();
  const [floor, setFloor] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const labels = {
    ROOM: c('Room', 'Phòng'),
    DESK: c('Seat', 'Ghế'),
    ASSET: c('Equipment', 'Thiết bị'),
    DECORATION: c('Furniture', 'Đồ bố trí')
  };
  const floorKey = (t: MaintenanceTarget) =>
    t.floorNumber == null ? 'unplaced' : String(t.floorNumber);
  const floors = [...new Set(targets.map(floorKey))].sort((a, b) =>
    a === 'unplaced' ? 1 : b === 'unplaced' ? -1 : Number(a) - Number(b)
  );
  const roomIds = new Set(targets.filter((t) => t.kind === 'ROOM').map((t) => t.resourceId));
  const query = search.trim().toLocaleLowerCase();
  const matches = (t: MaintenanceTarget) => !query || t.name.toLocaleLowerCase().includes(query);
  const inherited = (t: MaintenanceTarget) =>
    t.kind !== 'ROOM' && t.parentRoomId != null && selected.includes('RESOURCE:' + t.parentRoomId);
  const checked = (t: MaintenanceTarget) => selected.includes(t.key) || inherited(t);
  const children = new Map<number, MaintenanceTarget[]>();
  for (const t of targets)
    if (t.kind !== 'ROOM' && t.parentRoomId != null) {
      const group = children.get(t.parentRoomId) ?? [];
      group.push(t);
      children.set(t.parentRoomId, group);
    }
  const visibleFloors = floors
    .filter((key) => floor === 'all' || floor === key)
    .map((key) => {
      const items = targets.filter((t) => floorKey(t) === key);
      const rooms = items.filter(
        (t) =>
          t.kind === 'ROOM' && (matches(t) || (children.get(t.resourceId!) ?? []).some(matches))
      );
      const loose = items.filter(
        (t) =>
          t.kind !== 'ROOM' &&
          (t.parentRoomId == null || !roomIds.has(t.parentRoomId)) &&
          matches(t)
      );
      return { key, rooms, loose };
    })
    .filter((group) => group.rooms.length || group.loose.length);

  function toggle(key: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function row(target: MaintenanceTarget, details?: string) {
    return (
      <label
        className={
          'flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ' +
          (checked(target) ? 'bg-primary/10' : 'hover:bg-muted/50')
        }
      >
        <input
          type='checkbox'
          className='size-4 shrink-0 accent-primary'
          checked={checked(target)}
          disabled={busy || inherited(target)}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? [...selected, target.key]
                : selected.filter((key) => key !== target.key)
            )
          }
        />
        <span
          className={
            'flex size-8 shrink-0 items-center justify-center rounded-lg ' +
            (target.kind === 'ROOM'
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground')
          }
        >
          <TargetIcon target={target} />
        </span>
        <span className='min-w-0 flex-1'>
          <span
            className={
              'block break-words text-sm ' +
              (target.kind === 'ROOM' ? 'font-semibold' : 'font-medium')
            }
          >
            {target.name}
          </span>
          <span className='mt-0.5 block text-xs text-muted-foreground'>
            {details ?? labels[target.kind]}
            {inherited(target) && ' · ' + c('Included with room', 'Theo phòng')}
          </span>
        </span>
      </label>
    );
  }
  return (
    <div className='min-w-0 space-y-3'>
      <div className='flex flex-col gap-2 sm:flex-row'>
        <div className='relative min-w-0 flex-1'>
          <Search className='pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground' />
          <Input
            className='pl-9'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c('Find rooms, seats, furniture…', 'Tìm phòng, ghế, đồ bố trí…')}
          />
        </div>
        <select
          aria-label={c('Filter by floor', 'Lọc theo tầng')}
          className='organizer-control w-full sm:w-40'
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        >
          <option value='all'>{c('All floors', 'Tất cả tầng')}</option>
          {floors.map((key) => (
            <option key={key} value={key}>
              {key === 'unplaced' ? c('Unplaced', 'Chưa gán tầng') : c('Floor ', 'Tầng ') + key}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <div className='overflow-hidden rounded-xl border'>
        <div className='flex flex-wrap items-center justify-between gap-1 border-b bg-primary/5 px-3 py-1.5'>
          <span className='text-xs font-medium'>
            {c('Selected', 'Đã chọn')}:{' '}
            <span className='text-primary'>{targets.filter(checked).length}</span> /{' '}
            {targets.length}
          </span>
          <div className='flex flex-wrap items-center gap-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() =>
                setExpanded(new Set(targets.filter((t) => t.kind === 'ROOM').map((t) => t.key)))
              }
            >
              {c('Expand all', 'Mở tất cả')}
            </Button>
            <Button type='button' variant='ghost' size='sm' onClick={() => setExpanded(new Set())}>
              {c('Collapse', 'Thu gọn')}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              disabled={busy || !selected.length}
              onClick={() => onChange([])}
            >
              {c('Clear', 'Bỏ chọn')}
            </Button>
          </div>
        </div>
        <div className='max-h-[min(62vh,600px)] min-h-72 space-y-4 overflow-auto bg-background/20 p-3'>
          {loading && (
            <p role='status' className='p-3 text-sm text-muted-foreground'>
              {c('Loading targets…', 'Đang tải đối tượng…')}
            </p>
          )}
          {visibleFloors.map((group) => (
            <section key={group.key}>
              <h3 className='mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground'>
                <Layers className='size-4 text-primary' />
                {group.key === 'unplaced'
                  ? c('Unplaced', 'Chưa gán tầng')
                  : c('Floor ', 'Tầng ') + group.key}
                <span className='font-normal'>
                  · {group.rooms.length} {c('rooms', 'phòng')}
                </span>
              </h3>
              <ul className='space-y-2'>
                {group.rooms.map((room) => {
                  const allChildren = children.get(room.resourceId!) ?? [];
                  const shownChildren = matches(room) ? allChildren : allChildren.filter(matches);
                  const open = expanded.has(room.key) || Boolean(query);
                  return (
                    <li
                      key={room.key}
                      className='overflow-hidden rounded-xl border border-primary/15 bg-muted/10'
                    >
                      <div className='flex items-center gap-1 pr-2'>
                        <button
                          type='button'
                          className='ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30'
                          disabled={!allChildren.length}
                          aria-expanded={open}
                          aria-label={
                            (open ? c('Collapse ', 'Thu gọn ') : c('Expand ', 'Mở ')) + room.name
                          }
                          onClick={() => toggle(room.key)}
                        >
                          {open ? (
                            <ChevronDown className='size-4' />
                          ) : (
                            <ChevronRight className='size-4' />
                          )}
                        </button>
                        {row(
                          room,
                          allChildren.length +
                            ' ' +
                            c('items inside', 'đối tượng bên trong') +
                            (allChildren.some(checked)
                              ? ' · ' +
                                allChildren.filter(checked).length +
                                ' ' +
                                c('selected', 'đã chọn')
                              : '')
                        )}
                      </div>
                      {open && shownChildren.length > 0 && (
                        <ul className='ml-5 mr-3 mb-3 space-y-0.5 border-l-2 border-primary/20 pl-3'>
                          {shownChildren.map((child) => (
                            <li
                              key={child.key}
                              className='relative before:absolute before:-left-3 before:top-7 before:w-3 before:border-t before:border-primary/20'
                            >
                              {row(child)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {group.loose.length > 0 && (
                  <li className='rounded-xl border bg-muted/10 p-1'>
                    <p className='px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground'>
                      {c('Common area / standalone items', 'Khu vực chung / ngoài phòng')}
                    </p>
                    <ul>
                      {group.loose.map((item) => (
                        <li key={item.key}>{row(item)}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </section>
          ))}
          {!loading && !visibleFloors.length && (
            <p className='p-5 text-center text-sm text-muted-foreground'>
              {c('No matching targets.', 'Không tìm thấy đối tượng phù hợp.')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
