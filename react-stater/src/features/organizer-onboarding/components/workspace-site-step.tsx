import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Check, Layers3, LoaderCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { workspaceQueryKeys } from '@/features/workspaces/api';
import { BuildingAddressFields } from '@/features/organizer-resources/components/building-address-fields';
import { invalidateResources } from '@/features/organizer-resources/api/resources';
import {
  saveWorkspaceSite,
  workspaceSiteOptions,
  type Building,
  type WorkspaceSiteInput
} from '@/features/organizer-resources/api/buildings';
import type { MapPoint } from '@/features/organizer-resources/api/building-location';
import {
  floorArea,
  validFloorShape,
  type FloorShapeDraft
} from '@/features/organizer-resources/utils/floor-outline';
import { FloorShapeEditor } from './floor-shape-editor';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';

const LocationMap = lazy(() =>
  import('./real-interactive-map').then(({ RealInteractiveMap }) => ({
    default: RealInteractiveMap
  }))
);
const area = (floor: FloorShapeDraft) =>
  validFloorShape(floor)
    ? floorArea(Number(floor.widthM), Number(floor.lengthM), Number(floor.cornerRadiusM))
    : 0;

const format = (number: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number);

const newFloor = (floorNumber: number): FloorShapeDraft => ({
  floorNumber,
  widthM: '20',
  lengthM: '15',
  outline: 'RECTANGULAR',
  cornerRadiusM: '0'
});
function readFloors(site: Building | null): FloorShapeDraft[] {
  if (!site?.floors.length) return [newFloor(1)];
  return site.floors.map((floor) => ({
    floorNumber: floor.floorNumber,
    widthM: String(floor.realWidthM ?? floor.width / 60),
    lengthM: String(floor.realLengthM ?? floor.height / 60),
    outline: floor.outline ?? 'RECTANGULAR',
    cornerRadiusM: String(
      floor.cornerRadiusM ??
        (floor.outline === 'ROUNDED'
          ? Number(
              (
                Math.min(
                  floor.realWidthM ?? floor.width / 60,
                  floor.realLengthM ?? floor.height / 60
                ) * 0.12
              ).toFixed(2)
            )
          : 0)
    )
  }));
}

export function WorkspaceSiteStep({
  workspaceId,
  studio,
  stage
}: {
  workspaceId: number;
  studio: boolean;
  stage?: 'floors';
}) {
  const c = useOrganizerCopy();
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const query = useQuery({ ...workspaceSiteOptions(actorId, workspaceId), enabled: actorId > 0 });
  if (query.isPending)
    return (
      <p role='status' className='p-8 text-center'>
        {c('Loading location…', 'Đang tải địa điểm…')}
      </p>
    );
  if (query.isError)
    return (
      <div className='space-y-3 p-8 text-center'>
        <p role='alert'>{query.error.message}</p>
        <Button variant='outline' onClick={() => void query.refetch()}>
          {c('Retry', 'Thử lại')}
        </Button>
      </div>
    );
  return (
    <SiteForm
      key={workspaceId}
      actorId={actorId}
      workspaceId={workspaceId}
      studio={studio}
      stage={stage}
      site={query.data}
    />
  );
}

function SiteForm({
  actorId,
  workspaceId,
  studio,
  stage,
  site
}: {
  actorId: number;
  workspaceId: number;
  studio: boolean;
  stage?: 'floors';
  site: Building | null;
}) {
  const c = useOrganizerCopy();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [floors, setFloors] = useState(() => readFloors(site));
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [count, setCount] = useState(() => String(floors.length));
  const [address, setAddress] = useState(site?.address ?? '');
  const [admin, setAdmin] = useState({ city: site?.city ?? '', ward: site?.ward ?? '' });
  const [coordinates, setCoordinates] = useState<MapPoint | null>(() =>
    site?.latitude != null && site.longitude != null
      ? { latitude: site.latitude, longitude: site.longitude }
      : null
  );
  const [mapPoint, setMapPoint] = useState<MapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const showFloors = stage === 'floors' && !!coordinates && !!address.trim();
  const switchStage = (next?: 'floors') => {
    setMapPoint(null);
    void navigate({
      to: '/dashboard/organizer/workspaces/create/location',
      search: { id: String(workspaceId), studio: studio || undefined, stage: next }
    });
  };
  const legacy = !!site && !site.workspaceId;
  const protectedNumbers = new Set(
    site?.floors.filter((floor) => floor.occupants.length).map((floor) => floor.floorNumber)
  );
  const forward = () =>
    studio
      ? navigate({ to: '/dashboard/organizer/floorplan', search: { workspaceId } })
      : navigate({
          to: '/dashboard/organizer/workspaces/create/hours',
          search: { id: String(workspaceId) }
        });
  const back = () =>
    studio
      ? navigate({ to: '/dashboard/organizer/floorplan', search: { workspaceId } })
      : navigate({
          to: '/dashboard/organizer/workspaces/create',
          search: { id: String(workspaceId) }
        });

  function changeCount(value: string) {
    setCount(value);
    const total = Number(value);
    if (!Number.isInteger(total) || total < 1 || total > 100) return;
    if (floors.slice(total).some((floor) => protectedNumbers.has(floor.floorNumber))) {
      setError(
        c('Keep floors that already have a linked layout.', 'Giữ các tầng đã có sơ đồ liên kết.')
      );
      return;
    }
    const next = floors.slice(0, total);
    let nextNumber = Math.max(0, ...next.map((floor) => floor.floorNumber)) + 1;
    if (nextNumber + total - next.length - 1 > 500) {
      setError(c('Floor numbers cannot exceed 500.', 'Số thứ tự tầng không được vượt quá 500.'));
      return;
    }
    while (next.length < total) next.push(newFloor(nextNumber++));
    setFloors(next);
    setError('');
  }

  function updateFloor(index: number, patch: Partial<FloorShapeDraft>) {
    setFloors((current) =>
      current.map((floor, currentIndex) =>
        currentIndex === index ? { ...floor, ...patch } : floor
      )
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || locating) return;
    if (
      !coordinates ||
      !address.trim() ||
      !admin.city ||
      !admin.ward ||
      (showFloors && Number(count) !== floors.length)
    ) {
      setError(
        c(
          'Confirm the address on the map and review the floor count.',
          'Xác nhận vị trí trên bản đồ và kiểm tra số tầng.'
        )
      );
      return;
    }
    if (!showFloors && !legacy) {
      setError('');
      switchStage('floors');
      return;
    }
    if (floors.some((floor) => !validFloorShape(floor))) {
      setError(
        c(
          'Review each floor’s dimensions and corner radius.',
          'Kiểm tra kích thước và bán kính bo góc của từng tầng.'
        )
      );
      return;
    }
    const definitions = floors.map((floor) => ({
      floorNumber: floor.floorNumber,
      widthM: Number(floor.widthM),
      lengthM: Number(floor.lengthM),
      outline: floor.outline,
      cornerRadiusM: Number(floor.cornerRadiusM)
    }));
    const payload: WorkspaceSiteInput = {
      address,
      ...admin,
      latitude: Number(coordinates.latitude.toFixed(8)),
      longitude: Number(coordinates.longitude.toFixed(8)),
      expectedRevision: site?.revision,
      floors: definitions
    };
    setError('');
    setBusy(true);
    try {
      const saved = await saveWorkspaceSite(workspaceId, payload);
      client.setQueryData(workspaceSiteOptions(actorId, workspaceId).queryKey, saved);
      await Promise.all([
        invalidateResources(client, actorId),
        client.invalidateQueries({ queryKey: workspaceQueryKeys.all })
      ]);
      await forward();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : c('Could not save the location.', 'Không lưu được địa điểm.')
      );
    } finally {
      setBusy(false);
    }
  }

  const activeIndex = Math.min(selectedFloor, floors.length - 1);
  const active = floors[activeIndex];
  const totalArea = floors.reduce((sum, floor) => sum + area(floor), 0);
  return (
    <div className='mx-auto max-w-6xl space-y-5 pb-8 pt-4'>
      {!studio && (
        <>
          <WizardHeader currentStep={showFloors ? 3 : 2} />
          <WizardStepper currentStep={showFloors ? 3 : 2} />
        </>
      )}
      {studio && (
        <div className='flex gap-2 rounded-xl border bg-card p-1.5'>
          <button
            type='button'
            className={
              'flex-1 rounded-lg px-4 py-2 text-sm ' +
              (!showFloors ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground')
            }
            onClick={() => switchStage()}
          >
            {c('Location', 'Địa điểm')}
          </button>
          <button
            type='button'
            disabled={!coordinates}
            className={
              'flex-1 rounded-lg px-4 py-2 text-sm ' +
              (showFloors ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground')
            }
            onClick={() => switchStage('floors')}
          >
            {c('Floor configuration', 'Cấu hình tầng')}
          </button>
        </div>
      )}
      <form onSubmit={submit} className='space-y-5'>
        <header className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r from-primary/[.07] via-card to-card px-6 py-5'>
          <div className='flex items-center gap-3'>
            <span className='flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary'>
              {showFloors ? <Layers3 className='size-5' /> : <MapPin className='size-5' />}
            </span>
            <div>
              <h1 className='text-xl font-semibold tracking-tight'>
                {showFloors
                  ? c('Configure your floors', 'Thiết lập mặt bằng từng tầng')
                  : c('Workspace location', 'Địa điểm workspace')}
              </h1>
              <p className='mt-1 max-w-xl text-sm text-muted-foreground'>
                {showFloors
                  ? c(
                      'Enter real dimensions or drag the floor plan to adjust its shape.',
                      'Nhập số đo thực tế hoặc kéo trực tiếp trên mặt bằng để chỉnh hình dạng.'
                    )
                  : c(
                      'Choose the address and pin the entrance on the map.',
                      'Chọn địa chỉ và đánh dấu vị trí lối vào trên bản đồ.'
                    )}
              </p>
            </div>
          </div>
          {showFloors && (
            <div className='flex items-center gap-5 text-right'>
              <div>
                <p className='text-xs text-muted-foreground'>{c('Floors', 'Số tầng')}</p>
                <p className='mt-1 text-lg font-semibold'>{floors.length}</p>
              </div>
              <div className='border-l pl-5'>
                <p className='text-xs text-muted-foreground'>
                  {c('Total floor area', 'Tổng diện tích tầng')}
                </p>
                <p className='mt-1 text-lg font-semibold text-primary'>
                  {format(totalArea)} <span className='text-sm'>m²</span>
                </p>
              </div>
            </div>
          )}
        </header>
        {legacy ? (
          <div className='rounded-xl border bg-card p-6 text-sm'>
            <p className='font-medium'>{site.address}</p>
            <p className='mt-2 text-muted-foreground'>
              {c(
                'This workspace has existing shared floor links.',
                'Workspace này đã có liên kết tầng dùng chung.'
              )}
            </p>
          </div>
        ) : showFloors ? (
          <div className='grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]'>
            <aside className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
              <div className='space-y-3 border-b p-4'>
                <label className='flex items-center justify-between gap-3 text-sm font-medium'>
                  {c('Number of floors', 'Số tầng')}
                  <Input
                    className='w-20'
                    type='number'
                    min='1'
                    max='100'
                    required
                    value={count}
                    disabled={busy}
                    onChange={(event) => changeCount(event.target.value)}
                  />
                </label>
              </div>
              <nav
                className='max-h-[540px] space-y-1 overflow-y-auto p-2'
                aria-label={c('Choose a floor', 'Chọn tầng')}
              >
                {floors.map((floor, index) => (
                  <button
                    key={floor.floorNumber}
                    type='button'
                    onClick={() => setSelectedFloor(index)}
                    aria-current={activeIndex === index ? 'step' : undefined}
                    className={
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ' +
                      (activeIndex === index
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-transparent hover:bg-muted')
                    }
                  >
                    <span
                      className={
                        'flex size-9 shrink-0 items-center justify-center rounded-lg ' +
                        (activeIndex === index
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground')
                      }
                    >
                      <Layers3 className='size-4' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block text-sm font-medium'>
                        {c('Floor', 'Tầng')} {floor.floorNumber}
                      </span>
                      <span className='mt-1 block text-xs text-muted-foreground'>
                        {format(area(floor))} m²
                      </span>
                    </span>
                    {validFloorShape(floor) && (
                      <Check className='size-3.5 shrink-0 text-emerald-600' />
                    )}
                  </button>
                ))}
              </nav>
            </aside>
            <div className='space-y-3'>
              <FloorShapeEditor
                key={active.floorNumber}
                value={active}
                disabled={busy}
                onChange={(patch) => updateFloor(activeIndex, patch)}
              />
              <p className='px-1 text-xs leading-relaxed text-muted-foreground'>
                {c(
                  'Floor area follows the curved outline. Values are displayed to 2 decimal places.',
                  'Diện tích tính theo đường bao thực tế, đã trừ phần cắt tại các góc bo. Số hiển thị làm tròn đến 2 chữ số thập phân.'
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className='grid overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
            <section className='p-6 sm:p-8'>
              <h2 className='mb-5 text-base font-semibold'>
                {c('Address details', 'Thông tin địa chỉ')}
              </h2>
              <BuildingAddressFields
                initial={{ address, city: admin.city, ward: admin.ward }}
                mapPoint={mapPoint}
                disabled={busy}
                onChange={(nextAddress, point, pending, administration) => {
                  setAddress(nextAddress);
                  setCoordinates(point);
                  setLocating(pending);
                  setAdmin(administration);
                }}
              />
              {address && (
                <div className='mt-5 flex items-start gap-2 rounded-xl bg-primary/5 p-4 text-sm'>
                  <MapPin className='mt-0.5 size-4 shrink-0 text-primary' />
                  <p>{address}</p>
                </div>
              )}
            </section>
            <div className='relative min-h-[440px] border-t bg-muted/30 lg:border-l lg:border-t-0'>
              <Suspense
                fallback={<p className='p-6 text-sm'>{c('Loading map…', 'Đang tải bản đồ…')}</p>}
              >
                <LocationMap
                  recenterOnCoordinatesChange
                  readOnly={busy}
                  venueName={site?.name ?? ''}
                  streetAddress={address}
                  latitude={coordinates?.latitude ?? null}
                  longitude={coordinates?.longitude ?? null}
                  onCoordinatesChange={(latitude, longitude) =>
                    setMapPoint({ latitude, longitude })
                  }
                />
              </Suspense>
            </div>
          </div>
        )}
        {error && (
          <p
            role='alert'
            className='rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive'
          >
            {error}
          </p>
        )}
        <footer className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4'>
          <Button
            type='button'
            variant='outline'
            disabled={busy}
            onClick={() => (showFloors ? switchStage() : void back())}
          >
            <ArrowLeft className='size-4' />
            {c('Back', 'Quay lại')}
          </Button>
          {legacy ? (
            <Button type='button' onClick={() => void forward()}>
              {c('Continue', 'Tiếp tục')}
            </Button>
          ) : (
            <Button type='submit' disabled={busy || locating} className='min-w-44'>
              {busy && <LoaderCircle className='size-4 animate-spin' />}
              {showFloors
                ? studio
                  ? c('Save and open studio', 'Lưu và mở sơ đồ')
                  : c('Save and continue', 'Lưu và tiếp tục')
                : c('Configure floors', 'Thiết lập tầng')}
              <ArrowRight className='size-4' />
            </Button>
          )}
        </footer>
      </form>
    </div>
  );
}
