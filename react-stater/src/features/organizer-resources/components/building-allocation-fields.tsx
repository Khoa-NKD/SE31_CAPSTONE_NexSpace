import { AreaPlacementEditor } from './area-placement-editor';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Layers3, MapPin, LoaderCircle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildingsOptions, allocationError, type AllocationInput } from '../api/buildings';

const selectClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm';
export function BuildingAllocationFields({
  workspaceId,
  value,
  onChange,
  fixedSize,
  disabled = false,
  currentLayoutId,
  buildingId: fixedBuilding
}: {
  workspaceId: number;
  value: AllocationInput | null;
  onChange: (value: AllocationInput | null) => void;
  fixedSize?: { width: number; height: number };
  disabled?: boolean;
  currentLayoutId?: number;
  buildingId?: number;
}) {
  const actor = useAuthStore((s) => s.user?.id ?? 0);
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const query = useQuery({ ...buildingsOptions(actor), enabled: actor > 0 });
  const [buildingId, setBuildingId] = useState(fixedBuilding ?? 0);
  const building = query.data?.find((b) => b.id === buildingId);
  const physical = building?.floors.find((f) => f.id === value?.buildingFloorId);
  const problem =
    value && physical ? allocationError(value, physical, workspaceId, currentLayoutId) : null;
  const update = (key: 'x' | 'y' | 'width' | 'height', text: string) => {
    if (value) onChange({ ...value, [key]: text === '' ? NaN : Number(text) });
  };
  const choose = (id: number) => {
    const f = building?.floors.find((item) => item.id === id);
    onChange(
      f
        ? {
            buildingFloorId: f.id,
            x: 0,
            y: 0,
            width: fixedSize?.width ?? f.width,
            height: fixedSize?.height ?? f.height,
            name: value?.name || f.name
          }
        : null
    );
  };
  return (
    <div className='space-y-4'>
      <div className='flex items-start justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4'>
        <div className='flex gap-3'>
          <Building2 className='mt-1 size-5 shrink-0 text-primary' />
          <div>
            <p className='text-sm font-semibold'>
              {c(
                'One physical floor, separate workspace areas',
                'Một tầng vật lý, các khu vực workspace riêng'
              )}
            </p>
            <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
              {c(
                'Choose an existing building and floor. Seats, rooms and bookings remain assigned to this workspace.',
                'Chọn tòa nhà và tầng đã có. Ghế, phòng và booking vẫn được phân biệt theo workspace; Organizer quản lý tất cả.'
              )}
            </p>
          </div>
        </div>
      </div>
      {query.isPending ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <LoaderCircle className='size-4 animate-spin' />
          {c('Loading buildings…', 'Đang tải tòa nhà…')}
        </p>
      ) : query.isError ? (
        <div role='alert' className='text-sm text-destructive'>
          {query.error.message}
          <Button type='button' variant='ghost' onClick={() => void query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      ) : (
        <>
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='space-y-2 text-sm font-medium'>
              <span className='flex items-center gap-2'>
                <Building2 className='size-4' />
                {c('Building', 'Tòa nhà')}
              </span>
              <select
                className={selectClass}
                value={buildingId}
                disabled={!!fixedBuilding}
                onChange={(e) => {
                  setBuildingId(Number(e.target.value));
                  onChange(null);
                }}
              >
                <option value={0}>{c('Choose a building', 'Chọn tòa nhà')}</option>
                {query.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className='space-y-2 text-sm font-medium'>
              <span className='flex items-center gap-2'>
                <Layers3 className='size-4' />
                {c('Physical floor', 'Tầng vật lý')}
              </span>
              <select
                className={selectClass}
                value={value?.buildingFloorId ?? 0}
                disabled={!building}
                onChange={(e) => choose(Number(e.target.value))}
              >
                <option value={0}>{c('Choose an existing floor', 'Chọn tầng đã có')}</option>
                {building?.floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.floorNumber} · {f.name} · {f.occupants.length} workspace
                  </option>
                ))}
              </select>
            </label>
          </div>
          {building && (
            <p className='flex gap-2 text-xs text-muted-foreground'>
              <MapPin className='size-4 shrink-0' />
              {building.address}
            </p>
          )}
          {!query.data?.length && (
            <p className='text-sm text-muted-foreground'>
              {c(
                'No buildings are available. Add them through building management first.',
                'Chưa có tòa nhà để chọn. Cần thêm dữ liệu tòa nhà trước.'
              )}
            </p>
          )}
          {physical && value && (
            <>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {(['x', 'y', 'width', 'height'] as const).map((k) => (
                  <label key={k} className='space-y-1.5 text-xs text-muted-foreground'>
                    {
                      {
                        x: 'X (px)',
                        y: 'Y (px)',
                        width: c('Area width (px)', 'Rộng khu vực (px)'),
                        height: c('Area height (px)', 'Cao khu vực (px)')
                      }[k]
                    }
                    <Input
                      type='number'
                      min={k === 'x' || k === 'y' ? 0 : 1}
                      step='.01'
                      disabled={!!fixedSize && (k === 'width' || k === 'height')}
                      value={Number.isFinite(value[k]) ? value[k] : ''}
                      onChange={(e) => update(k, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <AreaPlacementEditor
                key={physical.id}
                floor={physical}
                value={value}
                invalid={!!problem}
                fixedSize={!!fixedSize}
                disabled={disabled}
                currentLayoutId={currentLayoutId}
                onChange={(next) => onChange({ ...value, ...next })}
              />
              <p className='text-xs text-muted-foreground'>
                {c(
                  'Resource coordinates stay local to this workspace area. X/Y above position the area on the shared floor. Touching boundaries are allowed.',
                  'Tọa độ ghế/phòng vẫn tính trong khu vực workspace. X/Y ở đây đặt khu vực lên tầng chung. Hai khu vực được phép tiếp giáp.'
                )}
              </p>
              {problem && (
                <p
                  role='alert'
                  className='rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
                >
                  {problem === 'overlap'
                    ? c(
                        'This area overlaps another workspace.',
                        'Khu vực đang chồng lên workspace khác.'
                      )
                    : problem === 'duplicate'
                      ? c(
                          'This workspace already has a layout on this physical floor. Map or open that layout.',
                          'Workspace đã có sơ đồ trên tầng này. Hãy mở hoặc liên kết sơ đồ hiện có.'
                        )
                      : c(
                          'The area must fit inside the physical floor.',
                          'Khu vực phải nằm hoàn toàn trong tầng vật lý.'
                        )}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
