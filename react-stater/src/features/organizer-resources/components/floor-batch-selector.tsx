import { AreaPlacementEditor } from './area-placement-editor';
import { Building2, Layers3, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/features/landing/context/language-context';
import type { Building } from '../api/buildings';
import {
  floorBatchSelection,
  initialFloorSelection,
  type FloorSelection,
  type AreaFields
} from '../utils/floor-batch-selection';

const selectClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm';
export function FloorBatchSelector({
  buildings,
  value,
  onChange,
  result,
  fixedBuilding,
  disabled = false
}: {
  buildings: Building[];
  value: FloorSelection;
  onChange: (value: FloorSelection) => void;
  result: ReturnType<typeof floorBatchSelection>;
  fixedBuilding?: number;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const building = buildings.find((b) => b.id === value.buildingId);
  const set = (patch: Partial<FloorSelection>) => onChange({ ...value, ...patch });
  const areaInputs = (
    area: Partial<AreaFields>,
    change: (key: keyof AreaFields, text: string) => void
  ) => (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
      {(['x', 'y', 'width', 'height'] as const).map((key) => (
        <label key={key} className='space-y-1 text-xs text-muted-foreground'>
          {
            {
              x: 'X (px)',
              y: 'Y (px)',
              width: c('Width (px)', 'Rộng (px)'),
              height: c('Height (px)', 'Cao (px)')
            }[key]
          }
          <Input
            type='number'
            min={key === 'x' || key === 'y' ? 0 : 1}
            step='.01'
            value={area[key] ?? ''}
            placeholder={key === 'width' || key === 'height' ? c('Full floor', 'Toàn tầng') : '0'}
            onChange={(e) => change(key, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
  return (
    <div className='space-y-4'>
      <label className='block space-y-2 text-sm font-medium'>
        <span className='flex gap-2'>
          <Building2 className='size-4 text-primary' />
          {c('Building', 'Tòa nhà')}
        </span>
        <select
          className={selectClass}
          value={value.buildingId}
          disabled={!!fixedBuilding}
          onChange={(e) =>
            onChange({ ...initialFloorSelection(Number(e.target.value)), mode: value.mode })
          }
        >
          <option value={0}>{c('Choose a building', 'Chọn tòa nhà')}</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {building && <p className='text-xs text-muted-foreground'>{building.address}</p>}
      <div className='grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1'>
        {(['single', 'range', 'multiple'] as const).map((mode) => (
          <Button
            key={mode}
            type='button'
            size='sm'
            variant={value.mode === mode ? 'default' : 'ghost'}
            className='rounded-lg text-xs'
            aria-pressed={value.mode === mode}
            onClick={() => set({ mode })}
          >
            {
              {
                single: c('One floor', 'Một tầng'),
                range: c('Floor range', 'Khoảng tầng'),
                multiple: c('Multiple floors', 'Nhiều tầng')
              }[mode]
            }
          </Button>
        ))}
      </div>
      {!building ? (
        <p className='rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground'>
          {c(
            'Choose a building to select its floors.',
            'Chọn tòa nhà để chọn các tầng của tòa nhà đó.'
          )}
        </p>
      ) : value.mode === 'single' ? (
        <label className='block space-y-2 text-sm'>
          {c('Physical floor', 'Tầng vật lý')}
          <select
            className={selectClass}
            value={value.single}
            onChange={(e) => set({ single: Number(e.target.value) })}
          >
            <option value={0}>{c('Choose a floor', 'Chọn tầng')}</option>
            {building.floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.floorNumber} · {f.name} · {f.occupants.length} workspace
              </option>
            ))}
          </select>
        </label>
      ) : value.mode === 'range' ? (
        <div className='grid grid-cols-2 gap-3'>
          {(['from', 'to'] as const).map((key) => (
            <label key={key} className='space-y-2 text-sm'>
              {key === 'from' ? c('From floor', 'Từ tầng') : c('To floor', 'Đến tầng')}
              <select
                className={selectClass}
                value={value[key]}
                onChange={(e) => set({ [key]: e.target.value })}
              >
                <option value=''>{c('Select', 'Chọn tầng')}</option>
                {building.floors.map((f) => (
                  <option key={f.id} value={f.floorNumber}>
                    {f.floorNumber} · {f.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : (
        <div className='grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-4'>
          {building.floors.map((f) => (
            <label
              key={f.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${value.ids.includes(f.id) ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border'}`}
            >
              <input
                type='checkbox'
                checked={value.ids.includes(f.id)}
                onChange={(e) =>
                  set({
                    ids: e.target.checked
                      ? [...value.ids, f.id]
                      : value.ids.filter((id) => id !== f.id)
                  })
                }
              />
              {f.name}
            </label>
          ))}
        </div>
      )}
      {building && building.floors.length === 0 && (
        <p className='text-sm text-muted-foreground'>
          {c('This building has no physical floors yet.', 'Tòa nhà này chưa có tầng vật lý.')}
        </p>
      )}
      {result.error && (
        <p role='alert' className='rounded-xl bg-destructive/10 p-3 text-sm text-destructive'>
          {result.error === 'missing'
            ? c(
                'Some floors in this range do not exist. Select individual floors instead.',
                'Có tầng trong khoảng chưa tồn tại. Hãy chọn riêng những tầng hiện có.'
              )
            : result.error === 'limit'
              ? c('Select no more than 100 floors per operation.', 'Mỗi lần chọn tối đa 100 tầng.')
              : c(
                  'The start floor must not be above the end floor.',
                  'Tầng bắt đầu phải nhỏ hơn hoặc bằng tầng kết thúc.'
                )}
        </p>
      )}
      {!!result.rows.length && (
        <section className='space-y-3'>
          <header className='flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-4 py-3'>
            <div>
              <h3 className='flex items-center gap-2 text-sm font-semibold'>
                <Layers3 className='size-4 text-primary' />
                {c('Arrange each selected floor', 'Bố trí từng tầng đã chọn')}
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                {c(
                  'Each floor has its own area. Gray areas are already occupied.',
                  'Mỗi tầng có khu vực riêng. Vùng xám là khu vực đã được sử dụng.'
                )}
              </p>
            </div>
            <span className='rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary'>
              {result.rows.length} {c('floors', 'tầng')}
            </span>
          </header>
          <div className='grid gap-4 lg:grid-cols-2'>
            {result.rows.map(({ floor, allocation, problem }) => {
              const custom = value.overrides[floor.id] ?? {};
              const patch = (next: typeof custom) =>
                set({ overrides: { ...value.overrides, [floor.id]: { ...custom, ...next } } });
              return (
                <article
                  key={floor.id}
                  className={
                    problem
                      ? 'min-w-0 space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4'
                      : 'min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm'
                  }
                >
                  <div className='flex items-center justify-between gap-3'>
                    <h4 className='flex items-center gap-2 text-sm font-semibold'>
                      {problem ? (
                        <AlertCircle className='size-4 text-destructive' />
                      ) : (
                        <CheckCircle2 className='size-4 text-emerald-500' />
                      )}
                      {floor.name}
                    </h4>
                    <span className='text-[11px] text-muted-foreground'>
                      {floor.width} × {floor.height} px
                    </span>
                  </div>
                  <label className='block space-y-1 text-xs text-muted-foreground'>
                    {c('Layout name', 'Tên sơ đồ')}
                    <Input
                      className='h-9 text-sm'
                      value={allocation.name}
                      maxLength={100}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </label>
                  {areaInputs(
                    {
                      x: custom.x ?? '0',
                      y: custom.y ?? '0',
                      width: custom.width ?? String(floor.width),
                      height: custom.height ?? String(floor.height)
                    },
                    (key, input) => patch({ [key]: input })
                  )}
                  <AreaPlacementEditor
                    floor={floor}
                    value={allocation}
                    invalid={!!problem}
                    disabled={disabled}
                    onChange={(next) =>
                      patch({
                        x: String(next.x),
                        y: String(next.y),
                        width: String(next.width),
                        height: String(next.height)
                      })
                    }
                  />
                  {problem && (
                    <p
                      role='alert'
                      className='rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive'
                    >
                      {problem === 'duplicate'
                        ? c(
                            'This workspace already has a layout here. Open or map that layout.',
                            'Workspace đã có sơ đồ tại tầng này. Hãy mở hoặc liên kết sơ đồ cũ.'
                          )
                        : problem === 'overlap'
                          ? c(
                              'This area overlaps another workspace.',
                              'Khu vực chồng lên workspace khác.'
                            )
                          : problem === 'name'
                            ? c('Enter a layout name.', 'Nhập tên sơ đồ.')
                            : c(
                                'Area exceeds the physical floor.',
                                'Khu vực vượt khỏi tầng vật lý.'
                              )}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
