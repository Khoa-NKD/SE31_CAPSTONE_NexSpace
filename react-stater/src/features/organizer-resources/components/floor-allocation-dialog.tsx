import { Spinner as LoaderCircle } from '@/components/ui/spinner';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Plus } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  attachWorkspaceFloor,
  attachWorkspaceFloors,
  allocationError,
  buildingsOptions,
  savePhysicalFloor,
  type AllocationInput
} from '../api/buildings';
import { floorLayoutOptions, type FloorOption } from '../api/resources';
import { BuildingAllocationFields } from './building-allocation-fields';
import { FloorBatchSelector } from './floor-batch-selector';
import { floorBatchSelection, initialFloorSelection } from '../utils/floor-batch-selection';

export function FloorAllocationDialog({
  workspaceId,
  current,
  floors,
  onSaved,
  onLinked,
  onClose
}: {
  workspaceId: number;
  current?: FloorOption;
  floors: FloorOption[];
  defaultName?: string;
  onSaved: () => Promise<void>;
  onLinked?: (floor: FloorOption) => void;
  onClose: () => void;
}) {
  const actor = useAuthStore((s) => s.user?.id ?? 0);
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [area, setArea] = useState<AllocationInput | null>(() =>
    current?.location
      ? {
          buildingFloorId: current.location.buildingFloorId,
          x: current.location.x,
          y: current.location.y,
          width: current.location.width,
          height: current.location.height,
          name: current.name
        }
      : null
  );
  const fixedBuilding = floors.find((f) => f.location)?.location?.buildingId;
  const [selection, setSelection] = useState(() => initialFloorSelection(fixedBuilding));
  const [busy, setBusy] = useState(false);
  const [measurementEditors, setMeasurementEditors] = useState(0);
  const measuring = measurementEditors > 0;
  const setMeasuring = useCallback((editing: boolean) => {
    setMeasurementEditors((count) => Math.max(0, count + (editing ? 1 : -1)));
  }, []);
  const [error, setError] = useState('');
  const locations = useQuery(buildingsOptions(actor));
  const previous = useQuery({
    ...floorLayoutOptions(actor, workspaceId, current?.id ?? 0),
    enabled: !!current
  });
  const buildingId = floors.find((f) => f.location)?.location?.buildingId;
  const physical = locations.data
    ?.flatMap((b) => b.floors)
    .find((f) => f.id === area?.buildingFloorId);
  const problem =
    area && physical
      ? physical.realWidthM == null || physical.realLengthM == null
        ? 'measurements'
        : allocationError(area, physical, workspaceId, current?.id)
      : null;
  const selectedBuilding = locations.data?.find((b) => b.id === selection.buildingId);
  const batch = floorBatchSelection(
    selection,
    selectedBuilding?.floors ?? [],
    floors,
    workspaceId,
    c('Floor', 'Tầng')
  );
  async function createFirstPhysicalFloor() {
    if (!selectedBuilding || selectedBuilding.floors.length || busy) return;
    setBusy(true);
    setError('');
    try {
      const floorId = await savePhysicalFloor(selectedBuilding.id, {
        name: c('Floor 1', 'Tầng 1'),
        floorNumber: 1,
        width: 1200,
        height: 900,
        widthM: 20,
        lengthM: 15
      });
      await locations.refetch();
      if (typeof floorId === 'number') {
        setSelection({ ...initialFloorSelection(selectedBuilding.id), single: floorId });
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Could not create floor.', 'Không thể tạo tầng.')
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (busy || measuring || (current ? !area || !physical || !!problem : !batch.valid)) return;
    setBusy(true);
    setError('');
    try {
      const linked = current
        ? [
            await attachWorkspaceFloor(
              workspaceId,
              { ...area!, name: `${c('Floor', 'Tầng')} ${physical!.floorNumber}` },
              previous.data?.floor ?? current
            )
          ]
        : await attachWorkspaceFloors(
            workspaceId,
            batch.rows.map((row) => row.allocation)
          );
      await onSaved();
      if (linked[0] && onLinked) onLinked(linked[0]);
      else onClose();
      toast.success(
        current
          ? c('Workspace linked to the physical floor.', 'Đã liên kết workspace với tầng vật lý.')
          : c(`Linked ${batch.rows.length} floors.`, `Đã liên kết ${batch.rows.length} tầng.`)
      );
    } catch (e) {
      void locations.refetch();
      setError(
        e instanceof Error ? e.message : c('Unable to link floor.', 'Không thể liên kết tầng.')
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${current ? 'sm:max-w-3xl' : 'sm:max-w-5xl'}`}
      >
        <DialogHeader>
          <DialogTitle className='flex gap-2'>
            <Link2 className='size-5 text-primary' />
            {current
              ? current.location
                ? c('Edit workspace area', 'Chỉnh vùng workspace')
                : c('Map existing layout', 'Liên kết sơ đồ hiện có')
              : c('Link workspace to floors', 'Liên kết workspace với các tầng')}
          </DialogTitle>
          <DialogDescription>
            {current?.location
              ? c(
                  'Move or resize the area on its current floor. Resource sizes stay unchanged; the customer map changes after publish.',
                  'Di chuyển hoặc đổi kích thước vùng trên tầng hiện tại. Giữ nguyên kích thước ghế/phòng; sơ đồ khách hàng đổi sau khi publish.'
                )
              : current
                ? c(
                    'Keep all layout, resource and booking IDs. Only add the verified physical location.',
                    'Giữ nguyên ID sơ đồ, ghế/phòng và booking. Chỉ bổ sung liên kết vị trí vật lý.'
                  )
                : c(
                    'Select one floor, a floor range or individual floors. All selected layouts are saved together; no seats or rooms are copied.',
                    'Chọn một tầng, khoảng tầng hoặc nhiều tầng riêng. Tất cả sơ đồ được lưu cùng lúc; không sao chép ghế/phòng.'
                  )}
          </DialogDescription>
        </DialogHeader>
        <form
          className='space-y-5'
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy} className='space-y-4'>
            {!current ? (
              locations.isPending ? (
                <LoaderCircle className='size-5' />
              ) : locations.isError ? (
                <div role='alert' className='text-sm text-destructive'>
                  {locations.error.message}
                  <Button type='button' variant='ghost' onClick={() => void locations.refetch()}>
                    {c('Retry', 'Thử lại')}
                  </Button>
                </div>
              ) : (
                <FloorBatchSelector
                  buildings={locations.data ?? []}
                  value={selection}
                  onChange={setSelection}
                  result={batch}
                  fixedBuilding={fixedBuilding}
                  disabled={busy}
                  onMeasurementEditingChange={setMeasuring}
                />
              )
            ) : previous.isPending ? (
              <LoaderCircle className='size-5' />
            ) : current && previous.isError ? (
              <p role='alert' className='text-sm text-destructive'>
                {previous.error.message}
              </p>
            ) : (
              <BuildingAllocationFields
                workspaceId={workspaceId}
                onMeasurementEditingChange={setMeasuring}
                disabled={busy}
                currentLayoutId={current?.id}
                buildingId={buildingId}
                fixedFloorId={current?.location?.buildingFloorId}
                value={area}
                onChange={setArea}
                fixedSize={
                  current && !current.location && previous.data?.width && previous.data.height
                    ? { width: previous.data.width, height: previous.data.height }
                    : undefined
                }
              />
            )}
            {!current && selectedBuilding?.floors.length === 0 && (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => void createFirstPhysicalFloor()}
              >
                <Plus className='size-4' />
                {c('Create physical floor 1', 'Tạo tầng vật lý số 1')}
              </Button>
            )}
          </fieldset>
          {error && (
            <p role='alert' className='rounded-xl bg-destructive/10 p-3 text-sm text-destructive'>
              {error}
            </p>
          )}
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button
              type='submit'
              disabled={
                busy ||
                measuring ||
                (current ? !area || !physical || !!problem || !previous.data : !batch.valid)
              }
            >
              {busy && <LoaderCircle className='size-4' />}
              {current
                ? c('Link floor', 'Liên kết tầng')
                : c(
                    `Link ${batch.rows.length || ''} floors`,
                    `Liên kết ${batch.rows.length || ''} tầng`
                  )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
