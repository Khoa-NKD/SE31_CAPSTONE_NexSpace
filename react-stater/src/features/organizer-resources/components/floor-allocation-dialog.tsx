import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onClose
}: {
  workspaceId: number;
  current?: FloorOption;
  floors: FloorOption[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const actor = useAuthStore((s) => s.user?.id ?? 0);
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [area, setArea] = useState<AllocationInput | null>(null);
  const [name, setName] = useState(current?.name ?? '');
  const fixedBuilding = floors.find((f) => f.location)?.location?.buildingId;
  const [selection, setSelection] = useState(() => initialFloorSelection(fixedBuilding));
  const [busy, setBusy] = useState(false);
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
    area && physical ? allocationError(area, physical, workspaceId, current?.id) : null;
  const batch = floorBatchSelection(
    selection,
    locations.data?.find((b) => b.id === selection.buildingId)?.floors ?? [],
    floors,
    workspaceId,
    name
  );
  async function save() {
    if (busy || (current ? !area || !physical || !!problem : !batch.valid)) return;
    if (!name.trim()) {
      setError(c('Enter the workspace layout name.', 'Nhập tên sơ đồ của workspace.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (current)
        await attachWorkspaceFloor(workspaceId, { ...area!, name: name.trim() }, current);
      else
        await attachWorkspaceFloors(
          workspaceId,
          batch.rows.map((row) => row.allocation)
        );
      await onSaved();
      onClose();
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
              ? c('Map existing layout', 'Liên kết sơ đồ hiện có')
              : c('Link workspace to floors', 'Liên kết workspace với các tầng')}
          </DialogTitle>
          <DialogDescription>
            {current
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
            <label className='block space-y-2 text-sm font-medium'>
              {current
                ? c('Workspace layout name', 'Tên sơ đồ workspace')
                : c('Layout base name', 'Tên chung cho các sơ đồ')}
              <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </label>
            {!current ? (
              locations.isPending ? (
                <LoaderCircle className='size-5 animate-spin' />
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
                />
              )
            ) : previous.isPending ? (
              <LoaderCircle className='size-5 animate-spin' />
            ) : current && previous.isError ? (
              <p role='alert' className='text-sm text-destructive'>
                {previous.error.message}
              </p>
            ) : (
              <BuildingAllocationFields
                workspaceId={workspaceId}
                disabled={busy}
                currentLayoutId={current?.id}
                buildingId={buildingId}
                value={area}
                onChange={setArea}
                fixedSize={
                  current && previous.data?.width && previous.data.height
                    ? { width: previous.data.width, height: previous.data.height }
                    : undefined
                }
              />
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
                !name.trim() ||
                (current ? !area || !physical || !!problem || !previous.data : !batch.valid)
              }
            >
              {busy && <LoaderCircle className='size-4 animate-spin' />}
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
