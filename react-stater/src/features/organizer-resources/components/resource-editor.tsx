import { useState, type ReactNode } from 'react';
import { LoaderCircle, Save, LockKeyhole } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  optionalPrice,
  resourceFormSchema,
  saveResource,
  createResourceFloor,
  saveResourceType
} from '../api/resources';
import type { ResourceDetail, ResourceOptions, TypeOption, FloorOption } from '../api/resources';
import { nextFloorNumber, isDuplicateFloorNumber } from '../utils/floor-number';
import { ResourcePlacementEditor } from './resource-placement-editor';
import { usePlacementValidation } from './use-placement-validation';
import { selectPlacementFields, type PlacementFields } from '../utils/placement';

const selectClass =
  'border-input bg-background h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className='block min-w-0 space-y-2 text-sm font-medium'>
      <span>{label}</span>
      {children}
      {error && (
        <span role='alert' className='text-destructive block text-xs font-normal'>
          {error}
        </span>
      )}
    </label>
  );
}
function useCopy() {
  const { language } = useLanguage();
  return (en: string, vi: string) => (language === 'vi' ? vi : en);
}

export function ResourceEditor({
  workspaceId,
  options,
  current,
  onClose,
  onSaved
}: {
  workspaceId: number;
  options: ResourceOptions;
  current?: ResourceDetail;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    floorPlanId: String(current?.floorPlanId ?? options.floors[0]?.id ?? ''),
    parentRoomId: options.rooms ? String(current?.parentRoomId ?? '') : undefined,
    resourceTypeId: String(
      current?.resourceTypeId ?? options.types.find((t) => t.active && t.currency)?.id ?? ''
    ),
    code: current?.code ?? '',
    name: current?.name ?? '',
    zoneName: current?.zoneName ?? '',
    description: current?.description ?? '',
    noiseLevel: current?.noiseLevel ?? '',
    capacityOverride: current?.capacityOverride?.toString() ?? '',
    pricePerHour: current?.pricePerHour ?? '',
    posX: current?.posX?.toString() ?? '',
    posY: current?.posY?.toString() ?? '',
    width: current?.width?.toString() ?? '',
    height: current?.height?.toString() ?? '',
    rotation: current?.rotation?.toString() ?? '0'
  });
  const [initialPosition] = useState(() => selectPlacementFields(form));
  const [undoPositions, setUndoPositions] = useState<PlacementFields[]>([]);
  const [redoPositions, setRedoPositions] = useState<PlacementFields[]>([]);
  const checkpoint = () => {
    setUndoPositions((previous) => [...previous.slice(-99), selectPlacementFields(form)]);
    setRedoPositions([]);
  };
  const changePosition = (position: PlacementFields, record = true) => {
    if (record) checkpoint();
    setForm((previous) => ({ ...previous, ...position }));
  };
  const undoPosition = () => {
    const position = undoPositions.at(-1);
    if (!position) return;
    setRedoPositions((previous) => [...previous, selectPlacementFields(form)]);
    setUndoPositions((previous) => previous.slice(0, -1));
    setForm((previous) => ({ ...previous, ...position }));
  };
  const redoPosition = () => {
    const position = redoPositions.at(-1);
    if (!position) return;
    setUndoPositions((previous) => [...previous, selectPlacementFields(form)]);
    setRedoPositions((previous) => previous.slice(0, -1));
    setForm((previous) => ({ ...previous, ...position }));
  };
  const set = (key: keyof typeof form, value: string) => {
    if (['posX', 'posY', 'width', 'height', 'rotation'].includes(key)) checkpoint();
    setForm((v) => ({ ...v, [key]: value }));
  };
  const type = options.types.find((t) => t.id === Number(form.resourceTypeId));
  const placement = usePlacementValidation(workspaceId, Number(form.floorPlanId), form, {
    resourceId: current?.id,
    parentRoomId: Number(form.parentRoomId) || undefined,
    category: type?.category
  });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || placement.blocked) return;
    setErrors({});
    setError('');
    const parsed = resourceFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (!type?.currency || !type.active) {
      setError(c('Choose a type with confirmed currency.', 'Chọn loại chỗ đã xác nhận tiền tệ.'));
      return;
    }
    if (
      type.category === 'DESK' &&
      parsed.data.capacityOverride &&
      parsed.data.capacityOverride !== '1'
    ) {
      setErrors({
        capacityOverride: c('A desk accommodates one person.', 'Một ghế dành cho một người.')
      });
      return;
    }
    setBusy(true);
    try {
      await saveResource(workspaceId, parsed.data, current);
      await onSaved();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : c('Could not save resource.', 'Không thể lưu ghế/phòng.')
      );
      if (e instanceof ApiError) setErrors(e.validationErrors ?? {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {current
              ? c('Edit resource', 'Cập nhật ghế/phòng')
              : c('Create resource', 'Tạo ghế/phòng')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Save as draft first. Activation is a separate, validated action.',
              'Tạo ở trạng thái nháp. Bật đặt chỗ là thao tác riêng có kiểm tra điều kiện.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className='space-y-5'>
          {error && (
            <p
              role='alert'
              className='border-destructive/20 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm'
            >
              {error}
            </p>
          )}
          <fieldset disabled={busy} className='grid gap-4 sm:grid-cols-2'>
            <Field label={c('Floor *', 'Tầng *')} error={errors.floorPlanId}>
              <select
                className={selectClass}
                value={form.floorPlanId}
                disabled={!!current}
                onChange={(e) =>
                  setForm((value) => ({
                    ...value,
                    floorPlanId: e.target.value,
                    parentRoomId: options.rooms ? '' : undefined
                  }))
                }
              >
                <option value=''>{c('Choose floor', 'Chọn tầng')}</option>
                {options.floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} · {f.status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={c('Resource type *', 'Loại chỗ *')} error={errors.resourceTypeId}>
              <select
                className={selectClass}
                value={form.resourceTypeId}
                onChange={(e) =>
                  setForm((value) => ({
                    ...value,
                    resourceTypeId: e.target.value,
                    parentRoomId:
                      options.types.find((t) => t.id === Number(e.target.value))?.category ===
                      'ROOM'
                        ? options.rooms
                          ? ''
                          : undefined
                        : value.parentRoomId
                  }))
                }
              >
                <option value=''>{c('Choose type', 'Chọn loại chỗ')}</option>
                {options.types.map((t) => (
                  <option key={t.id} value={t.id} disabled={!t.active || !t.currency}>
                    {t.name} · {t.category} ·{' '}
                    {t.currency ?? c('Confirm currency first', 'Cần xác nhận tiền tệ')}
                  </option>
                ))}
              </select>
            </Field>
            {type?.category === 'DESK' && options.rooms && (
              <div className='sm:col-span-2 rounded-xl border border-border bg-muted/30 p-4 space-y-2'>
                <Field label={c('Desk location', 'Vị trí ghế')} error={errors.parentRoomId}>
                  <select
                    className={selectClass}
                    value={form.parentRoomId ?? ''}
                    onChange={(e) => set('parentRoomId', e.target.value)}
                  >
                    <option value=''>
                      {c('Open area — not inside a room', 'Khu làm việc mở — không thuộc phòng')}
                    </option>
                    {options.rooms
                      .filter(
                        (room) =>
                          room.floorPlanId === Number(form.floorPlanId) && room.id !== current?.id
                      )
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} · {room.code}
                        </option>
                      ))}
                  </select>
                </Field>
                <p className='text-xs text-muted-foreground'>
                  {c(
                    'Choose a room only when this desk is physically inside it. Coordinates stay relative to the floor. Whole-room and desk sales cannot be active together.',
                    'Chỉ chọn phòng khi ghế thực sự nằm trong phòng đó. Tọa độ vẫn tính theo tầng. Không bật bán nguyên phòng đồng thời với ghế bên trong.'
                  )}
                </p>
              </div>
            )}
            {(
              [
                ['code', c('Resource code *', 'Mã ghế/phòng *'), 50],
                ['name', c('Display name *', 'Tên hiển thị *'), 150],
                ['zoneName', c('Zone name', 'Tên khu vực'), 100],
                ['capacityOverride', c('Capacity override', 'Sức chứa riêng'), 5],
                [
                  'pricePerHour',
                  c(
                    `Hourly override (${type?.currency ?? '—'})`,
                    `Giá giờ riêng (${type?.currency ?? '—'})`
                  ),
                  19
                ]
              ] as const
            ).map(([key, label, max]) => (
              <Field key={key} label={label} error={errors[key]}>
                <Input
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  maxLength={max}
                  inputMode={
                    key === 'pricePerHour'
                      ? 'decimal'
                      : key === 'capacityOverride'
                        ? 'numeric'
                        : undefined
                  }
                  placeholder={
                    key === 'pricePerHour' || key === 'capacityOverride'
                      ? c(
                          'Blank = inherit from resource type',
                          'Để trống = dùng giá trị của loại chỗ'
                        )
                      : undefined
                  }
                />
              </Field>
            ))}
            <Field label={c('Noise level', 'Mức độ tiếng ồn')}>
              <select
                className={selectClass}
                value={form.noiseLevel}
                onChange={(e) => set('noiseLevel', e.target.value)}
              >
                <option value=''>{c('Not specified', 'Chưa xác định')}</option>
                <option value='QUIET'>{c('Quiet', 'Yên tĩnh')}</option>
                <option value='MODERATE'>{c('Moderate', 'Vừa phải')}</option>
                <option value='LIVELY'>{c('Lively', 'Sôi động')}</option>
              </select>
            </Field>
          </fieldset>
          <div className='border-border bg-muted/20 rounded-xl border p-4'>
            <p className='mb-3 text-sm font-medium'>
              {c('Floor coordinates & dimensions (px)', 'Vị trí và kích thước trên sơ đồ (px)')}
            </p>
            <div className='grid gap-3 sm:grid-cols-5'>
              {(['posX', 'posY', 'width', 'height', 'rotation'] as const).map((key) => (
                <Field
                  key={key}
                  label={
                    {
                      posX: 'X',
                      posY: 'Y',
                      width: c('Width', 'Rộng'),
                      height: c('Height', 'Cao'),
                      rotation: c('Rotation', 'Góc xoay')
                    }[key]
                  }
                  error={errors[key]}
                >
                  <Input
                    value={form[key]}
                    disabled={busy}
                    inputMode='decimal'
                    onChange={(e) => set(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <ResourcePlacementEditor
              key={form.floorPlanId}
              workspaceId={workspaceId}
              floorId={Number(form.floorPlanId)}
              resourceId={current?.id}
              parentRoomId={form.parentRoomId ? Number(form.parentRoomId) : undefined}
              category={type?.category}
              value={form}
              disabled={busy}
              onBegin={checkpoint}
              onChange={changePosition}
              onUndo={undoPosition}
              onRedo={redoPosition}
              onReset={() => changePosition(initialPosition)}
              canUndo={undoPositions.length > 0}
              canRedo={redoPositions.length > 0}
            />
          </div>
          <Field label={c('Notes', 'Ghi chú')} error={errors.description}>
            <textarea
              className={`${selectClass} min-h-24 py-2`}
              value={form.description}
              maxLength={1000}
              disabled={busy}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <p className='text-muted-foreground flex items-start gap-2 text-xs'>
            <LockKeyhole className='size-4 shrink-0' />
            {c(
              'Prices keep the selected currency. Historical booking amounts are never recalculated. Changing type, capacity or geometry may be blocked by live bookings.',
              'Giá giữ đúng tiền tệ đã chọn, không tính lại booking cũ. Thay loại chỗ, sức chứa hoặc vị trí có thể bị chặn khi còn booking hiệu lực.'
            )}
          </p>
          {placement.result && !placement.result.valid && (
            <p
              role='alert'
              className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive'
            >
              {c(
                'Cannot save: objects overlap or extend outside their floor/room. Adjust the layout.',
                'Không thể lưu: các đối tượng chồng lấn hoặc vượt khỏi tầng/phòng. Vui lòng chỉnh lại vị trí.'
              )}
            </p>
          )}
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={busy || placement.blocked}>
              {busy ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <Save className='size-4' />
              )}
              {c('Save resource', 'Lưu ghế/phòng')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResourceSetupDialog({
  workspaceId,
  kind,
  current,
  onClose,
  onSaved,
  floors = []
}: {
  workspaceId: number;
  kind: 'floor' | 'type';
  current?: TypeOption;
  floors?: FloorOption[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(current?.name ?? '');
  const [floorNumber, setFloorNumber] = useState(() => nextFloorNumber(floors)?.toString() ?? '');
  const duplicateFloor = kind === 'floor' && isDuplicateFloorNumber(floors, floorNumber);
  const [category, setCategory] = useState(current?.category ?? 'DESK');
  const [currency, setCurrency] = useState(current?.currency ?? 'VND');
  const [legacyCurrencyConfirmed, setLegacyCurrencyConfirmed] = useState(false);
  const [capacity, setCapacity] = useState(String(current?.capacity ?? 1));
  const [hour, setHour] = useState(current?.pricePerHour ?? '');
  const [day, setDay] = useState(current?.pricePerDay ?? '');
  const [month, setMonth] = useState(current?.pricePerMonth ?? '');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!name.trim() || name.trim().length > 100) {
      setError(c('Enter a name up to 100 characters.', 'Nhập tên tối đa 100 ký tự.'));
      return;
    }
    if (duplicateFloor) {
      setError(
        c(
          'This floor number already exists in the workspace. Choose another number.',
          'Số tầng đã tồn tại trong không gian này. Vui lòng chọn số khác.'
        )
      );
      return;
    }
    if (
      kind === 'floor' &&
      (!/^-?\d+$/.test(floorNumber) || Number(floorNumber) < -20 || Number(floorNumber) > 500)
    ) {
      setError(c('Floor number must be between -20 and 500.', 'Số tầng phải từ -20 đến 500.'));
      return;
    }
    if (
      kind === 'type' &&
      (!/^[1-9]\d*$/.test(capacity) ||
        Number(capacity) > 10000 ||
        (category === 'DESK' && capacity !== '1') ||
        ![hour, day, month].some(Boolean) ||
        ![hour, day, month].every((value) => optionalPrice.safeParse(value).success))
    ) {
      setError(
        c(
          'Check capacity and provide at least one positive price (max 2 decimals). Desks have capacity 1.',
          'Kiểm tra sức chứa và nhập ít nhất một mức giá dương, tối đa 2 số thập phân. Ghế có sức chứa 1.'
        )
      );
      return;
    }
    if (kind === 'type' && current && !current.currency && !legacyCurrencyConfirmed) {
      setError(
        c(
          'Confirm the currency of existing prices before saving.',
          'Xác nhận tiền tệ của các giá đang lưu trước khi tiếp tục.'
        )
      );
      return;
    }
    setBusy(true);
    try {
      if (kind === 'floor')
        await createResourceFloor(workspaceId, {
          name: name.trim(),
          floorNumber: Number(floorNumber)
        });
      else
        await saveResourceType(
          workspaceId,
          {
            name: name.trim(),
            category,
            currency,
            capacity: Number(capacity),
            pricePerHour: hour || null,
            pricePerDay: day || null,
            pricePerMonth: month || null,
            legacyCurrencyConfirmed
          },
          current
        );
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {kind === 'floor'
              ? c('Add a floor', 'Thêm tầng')
              : current
                ? c('Update resource type', 'Cập nhật loại chỗ')
                : c('Create resource type', 'Tạo loại chỗ')}
          </DialogTitle>
          <DialogDescription>
            {kind === 'floor'
              ? c(
                  'A real draft floor is created. Publish its layout in Floor Plan before activating resources.',
                  'Tầng được tạo là bản nháp thật. Publish sơ đồ tại Floor Plan trước khi bật ghế/phòng.'
                )
              : c(
                  'Resources inherit these prices and currency. Changing currency requires a separate type.',
                  'Ghế/phòng kế thừa giá và tiền tệ của loại chỗ. Muốn dùng tiền tệ khác, tạo một loại riêng.'
                )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          {error && (
            <p role='alert' className='text-destructive text-sm'>
              {error}
            </p>
          )}
          <fieldset disabled={busy} className='space-y-4'>
            <Field label={c('Name *', 'Tên *')}>
              <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </Field>
            {kind === 'floor' ? (
              <Field label={c('Floor number *', 'Số tầng *')}>
                <Input
                  inputMode='numeric'
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                />
                <p
                  className={
                    duplicateFloor ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
                  }
                  role={duplicateFloor ? 'alert' : undefined}
                >
                  {duplicateFloor
                    ? c('This floor number is already in use.', 'Số tầng này đã tồn tại.')
                    : c(
                        'Suggested from the highest existing floor. Ground floor is 0; basements use negative numbers.',
                        'Gợi ý theo số tầng lớn nhất hiện có. Tầng trệt là 0; tầng hầm dùng số âm.'
                      )}
                </p>
              </Field>
            ) : (
              <>
                <div className='grid grid-cols-2 gap-4'>
                  <Field label={c('Bookable category', 'Nhóm đặt chỗ')}>
                    <select
                      className={selectClass}
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value as 'DESK' | 'ROOM');
                        if (e.target.value === 'DESK') setCapacity('1');
                      }}
                    >
                      <option value='DESK'>{c('Desk', 'Ghế')}</option>
                      <option value='ROOM'>{c('Room', 'Phòng')}</option>
                    </select>
                    <span className='block text-xs font-normal text-muted-foreground'>
                      {c(
                        'Tables, plants and partitions belong in Floor Setup → Layout objects, not pricing.',
                        'Bàn, cây xanh, vách ngăn: thêm tại Bố trí tầng → Đồ bố trí, không tạo giá riêng.'
                      )}
                    </span>
                  </Field>
                  <Field label={c('Currency', 'Tiền tệ')}>
                    <select
                      className={selectClass}
                      value={currency}
                      disabled={!!current?.currency}
                      onChange={(e) => setCurrency(e.target.value as 'VND' | 'USD')}
                    >
                      <option value='VND'>VND</option>
                      <option value='USD'>USD</option>
                    </select>
                  </Field>
                </div>
                {current && !current.currency && (
                  <label className='border-primary/20 bg-primary/5 flex items-start gap-2 rounded-lg border p-3 text-sm'>
                    <input
                      type='checkbox'
                      className='mt-0.5 size-4 accent-primary'
                      checked={legacyCurrencyConfirmed}
                      onChange={(e) => setLegacyCurrencyConfirmed(e.target.checked)}
                    />
                    <span>
                      {c(
                        'I confirm that the existing amounts are denominated in ',
                        'Tôi xác nhận các giá đang lưu là '
                      )}
                      <strong>{currency}</strong>
                      {c(
                        '. No conversion will be performed.',
                        ', không thực hiện quy đổi số tiền.'
                      )}
                    </span>
                  </label>
                )}
                <Field label={c('Capacity', 'Sức chứa')}>
                  <Input
                    value={capacity}
                    inputMode='numeric'
                    disabled={category === 'DESK'}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </Field>
                <div className='grid gap-3 sm:grid-cols-3'>
                  {[
                    [c('Per hour', 'Theo giờ'), hour, setHour],
                    [c('Per day', 'Theo ngày'), day, setDay],
                    [c('Per month', 'Theo tháng'), month, setMonth]
                  ].map(([label, value, setValue]) => (
                    <Field key={String(label)} label={`${label} (${currency})`}>
                      <Input
                        value={String(value)}
                        inputMode='decimal'
                        onChange={(e) => (setValue as (v: string) => void)(e.target.value)}
                      />
                    </Field>
                  ))}
                </div>
                <p className='text-muted-foreground text-xs'>
                  {c(
                    'Updating type prices affects resources inheriting those prices, never past booking totals. Existing currencies are not converted.',
                    'Đổi giá loại chỗ ảnh hưởng các ghế/phòng đang kế thừa giá, không sửa tổng tiền booking cũ. Không quy đổi các giá trị đang lưu.'
                  )}
                </p>
              </>
            )}
          </fieldset>
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={busy || duplicateFloor}>
              {busy && <LoaderCircle className='size-4 animate-spin' />}
              {c('Save', 'Lưu')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
