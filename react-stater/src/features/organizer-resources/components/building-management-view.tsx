import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { lazy, Suspense, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  Layers3,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { buildingsOptions, saveBuilding, type Building } from '../api/buildings';
import { BuildingAddressFields } from './building-address-fields';
import { buildingCity, type MapPoint } from '../api/building-location';

const LocationMap = lazy(() =>
  import('@/features/organizer-onboarding/components/real-interactive-map').then((module) => ({
    default: module.RealInteractiveMap
  }))
);
const OverviewMap = lazy(() =>
  import('./building-overview-map').then((module) => ({ default: module.BuildingOverviewMap }))
);

export function BuildingManagementView({
  onCreated,
  onCancel
}: {
  onCreated?: (buildingId: number) => void;
  onCancel?: () => void;
} = {}) {
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const query = useQuery({ ...buildingsOptions(actorId), enabled: actorId > 0 && !onCreated });
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [creating, setCreating] = useState(!!onCreated);
  const [selected, setSelected] = useState<Building | null>(null);
  const [editTarget, setEditTarget] = useState<Building | null>(null);
  const [administration, setAdministration] = useState({ city: '', ward: '' });
  const [name, setName] = useState('');
  const [floorCount, setFloorCount] = useState('0');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [mapPoint, setMapPoint] = useState<MapPoint | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const all = query.data ?? [];
  const cities = new Map<string, string>();
  for (const building of all) {
    const { key, label } = buildingCity(building);
    if (key) cities.set(key, label);
  }
  const activeCity = cities.has(cityFilter) ? cityFilter : '';
  const cityBuildings = activeCity
    ? all.filter((item) => buildingCity(item).key === activeCity)
    : all;
  const filtered = cityBuildings.filter((item) =>
    `${item.name} ${item.address}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  const totalFloors = all.reduce((sum, building) => sum + building.floors.length, 0);
  const workspaceIds = new Set(
    all.flatMap((building) =>
      building.floors.flatMap((floor) => floor.occupants.map((item) => item.workspaceId))
    )
  );

  function beginCreate() {
    setEditTarget(null);
    setAdministration({ city: '', ward: '' });
    setName('');
    setFloorCount('0');
    setAddress('');
    setCoordinates(null);
    setMapPoint(null);
    setLocationBusy(false);
    setError('');
    setSelected(null);
    setCreating(true);
  }

  function beginEdit(building: Building) {
    setEditTarget(building);
    setName(building.name);
    setAddress(building.address);
    setAdministration({ city: building.city || '', ward: building.ward || '' });
    setCoordinates(
      building.latitude != null && building.longitude != null
        ? { latitude: building.latitude, longitude: building.longitude }
        : null
    );
    setMapPoint(null);
    setLocationBusy(false);
    setFloorCount('0');
    setError('');
    setCreating(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || locationBusy) return;
    if (!/^\d+$/.test(floorCount) || Number(floorCount) > 100) {
      setError(c('Enter a floor count from 0 to 100.', 'Nhập số lượng tầng từ 0 đến 100.'));
      return;
    }
    if (
      !name.trim() ||
      !address.trim() ||
      !coordinates ||
      !administration.city ||
      !administration.ward
    ) {
      setError(
        c(
          'Enter the building name, address and select its location on the map.',
          'Nhập tên, địa chỉ và chọn vị trí tòa nhà trên bản đồ.'
        )
      );
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const buildingId = await saveBuilding(
        {
          name: name.trim(),
          address: address.trim(),
          ...coordinates,
          ...administration,
          ...(editTarget ? {} : { floorCount: Number(floorCount) })
        },
        editTarget ?? undefined
      );
      // A successful write stays successful even if refreshing the catalog fails.
      setCreating(false);
      setSelected(null);
      toast.success(
        editTarget
          ? c('Building updated.', 'Đã cập nhật tòa nhà.')
          : c('Building created.', 'Đã tạo tòa nhà.')
      );
      await client.invalidateQueries({ queryKey: ['organizer-resources', actorId] });
      await client.invalidateQueries({ queryKey: ['workspaces'] });
      if (!editTarget && typeof buildingId === 'number') onCreated?.(buildingId);
    } catch (failure) {
      if (failure instanceof Error && failure.message === 'A building with this address already exists') {
        setError(c(
          'You already have a building at this address. Select the existing building to link a workspace.',
          'Bạn đã có tòa nhà tại địa chỉ này. Hãy chọn tòa nhà hiện có để liên kết workspace.'
        ));
        return;
      }
      setError(
        failure instanceof Error
          ? failure.message
          : c(
              'Unable to create building. Please retry.',
              'Không thể tạo tòa nhà. Vui lòng thử lại.'
            )
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (creating || selected) {
    const displayName = creating ? name : selected!.name;
    const displayAddress = creating ? address : selected!.address;
    const lat = creating ? coordinates?.latitude : selected!.latitude;
    const lng = creating ? coordinates?.longitude : selected!.longitude;
    return (
      <div className='mx-auto w-full max-w-[1600px] space-y-6 pb-8'>
        <OrganizerPageHeader
          title={
            creating
              ? editTarget
                ? c('Update building', 'Cập nhật tòa nhà')
                : c('Create a building', 'Tạo tòa nhà')
              : selected!.name
          }
          leading={
            <Button
              variant='outline'
              size='icon'
              disabled={busy}
              onClick={() => {
                if (onCancel) {
                  onCancel();
                  return;
                }
                setCreating(false);
                setSelected(null);
              }}
              aria-label={c('Back to buildings', 'Về danh sách tòa nhà')}
            >
              <ArrowLeft className='size-4' />
            </Button>
          }
        />
        <div className='grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]'>
          <div className='space-y-5'>
            <form
              id='building-details-form'
              onSubmit={save}
              className='bg-card rounded-2xl border p-6 shadow-sm'
            >
              <div className='mb-6 flex items-center gap-3'>
                <span className='bg-primary/10 text-primary rounded-xl p-3'>
                  <Building2 className='size-5' />
                </span>
                <h2 className='font-semibold'>{c('Building details', 'Thông tin tòa nhà')}</h2>
              </div>
              <div className='space-y-5'>
                <div>
                  <label htmlFor='building-name' className='mb-2 block text-sm font-medium'>
                    {c('Building name', 'Tên tòa nhà')}{' '}
                    {creating && <span className='text-destructive'>*</span>}
                  </label>
                  <Input
                    id='building-name'
                    value={displayName}
                    maxLength={150}
                    required
                    readOnly={!creating}
                    disabled={busy}
                    placeholder={c('e.g. An Nhien Innovation Hub', 'VD: An Nhiên Innovation Hub')}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                {creating && !editTarget && (
                  <div>
                    <label
                      htmlFor='building-floor-count'
                      className='mb-2 block text-sm font-medium'
                    >
                      {c('Number of floors', 'Số lượng tầng')}
                    </label>
                    <Input
                      id='building-floor-count'
                      type='number'
                      min={0}
                      max={100}
                      step={1}
                      required
                      value={floorCount}
                      disabled={busy}
                      onChange={(event) => setFloorCount(event.target.value)}
                    />
                    <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
                      {c(
                        '0 = add later. Creates empty physical floors 1…N, with a 1200 × 800 px canvas. No workspace or seats are created.',
                        '0 = thêm sau. Tự tạo tầng vật lý trống từ 1…N, canvas 1200 × 800 px. Chưa tạo workspace hay ghế/phòng.'
                      )}
                    </p>
                  </div>
                )}
                {creating ? (
                  <BuildingAddressFields
                    key={editTarget?.id ?? 'new'}
                    initial={editTarget ?? undefined}
                    mapPoint={mapPoint}
                    disabled={busy}
                    onChange={(nextAddress, point, pending, location) => {
                      setAddress(nextAddress);
                      setCoordinates(
                        point ? { latitude: point.latitude, longitude: point.longitude } : null
                      );
                      setLocationBusy(pending);
                      setAdministration({ city: location.city, ward: location.ward });
                    }}
                  />
                ) : (
                  <div>
                    <label htmlFor='building-address' className='mb-2 block text-sm font-medium'>
                      {c('Full address', 'Địa chỉ đầy đủ')}{' '}
                      {creating && <span className='text-destructive'>*</span>}
                    </label>
                    <textarea
                      id='building-address'
                      value={displayAddress}
                      maxLength={500}
                      required
                      readOnly={!creating}
                      disabled={busy}
                      rows={3}
                      className='border-input bg-background focus-visible:ring-ring w-full resize-y rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50'
                      placeholder={c('Street, ward, city', 'Số nhà, đường, phường, thành phố')}
                      onChange={(event) => {
                        setAddress(event.target.value);
                        setCoordinates(null);
                      }}
                    />
                  </div>
                )}
                <div className='bg-muted/40 rounded-xl border p-4'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <MapPin className='text-primary size-4' />
                    {c('Map location', 'Vị trí bản đồ')}
                  </div>
                  {lat != null && lng != null ? (
                    <p className='text-muted-foreground mt-2 font-mono text-xs'>
                      {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                    </p>
                  ) : (
                    <p className='text-muted-foreground mt-2 text-sm'>
                      {creating
                        ? c(
                            'Search or click the map to set a pin.',
                            'Tìm kiếm hoặc bấm trên bản đồ để ghim vị trí.'
                          )
                        : c(
                            'This building has no saved map pin.',
                            'Tòa nhà này chưa lưu vị trí bản đồ.'
                          )}
                    </p>
                  )}
                </div>
              </div>
            </form>
            <div className='from-primary/5 to-card rounded-xl border bg-gradient-to-r px-4 py-3 text-sm'>
              <Layers3 className='text-primary mb-1.5 size-4' />
              <p className='font-medium'>
                {c(
                  'One building, multiple workspace areas',
                  'Một tòa nhà, nhiều khu vực workspace'
                )}
              </p>
              <p className='text-muted-foreground mt-2 leading-relaxed'>
                {c(
                  'Choose how many empty floors to create now, or add them later. Link workspace areas separately in Floor Plan & Zones.',
                  'Chọn số tầng trống cần tạo ngay hoặc thêm sau. Liên kết khu vực workspace riêng trong Sơ đồ tầng & khu vực.'
                )}
              </p>
            </div>
            {error && (
              <p
                role='alert'
                className='border-destructive/20 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm'
              >
                {error}
              </p>
            )}
            {creating && (
              <div className='flex gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={busy}
                  onClick={() => (onCancel ? onCancel() : setCreating(false))}
                >
                  {c('Cancel', 'Hủy')}
                </Button>
                <Button
                  type='submit'
                  form='building-details-form'
                  className='flex-1'
                  disabled={
                    busy ||
                    locationBusy ||
                    !name.trim() ||
                    !address.trim() ||
                    !coordinates ||
                    !administration.city ||
                    !administration.ward
                  }
                >
                  {busy ? (
                    <LoaderCircle className='size-4 animate-spin' />
                  ) : (
                    <Check className='size-4' />
                  )}
                  {busy
                    ? c('Saving…', 'Đang lưu…')
                    : editTarget
                      ? c('Save changes', 'Lưu thay đổi')
                      : c('Create building', 'Tạo tòa nhà')}
                </Button>
              </div>
            )}
            {!creating && (
              <Button type='button' onClick={() => beginEdit(selected!)}>
                {c('Update building details', 'Cập nhật thông tin tòa nhà')}
              </Button>
            )}
            {!creating && (
              <Link
                to='/dashboard/organizer/floorplan'
                className='text-primary flex items-center gap-2 text-sm font-medium'
              >
                {c('Open Floor Plan & Zones', 'Mở Sơ đồ tầng & khu vực')}
                <ArrowUpRight className='size-4' />
              </Link>
            )}
          </div>
          <section className='bg-card min-w-0 overflow-hidden rounded-2xl border shadow-sm'>
            <div className='flex items-center gap-3 border-b p-5'>
              <span className='bg-primary/10 text-primary rounded-lg p-2'>
                <MapPin className='size-5' />
              </span>
              <div>
                <h2 className='font-semibold'>{c('Locate your building', 'Định vị tòa nhà')}</h2>
                <p className='text-muted-foreground mt-1 text-sm'>
                  {creating
                    ? c(
                        'Search an address, drag the marker, then confirm the details.',
                        'Tìm địa chỉ, kéo ghim đến đúng vị trí rồi kiểm tra thông tin.'
                      )
                    : c('Saved building location', 'Vị trí tòa nhà đã lưu')}
                </p>
              </div>
            </div>
            <div
              className={`relative h-[600px] min-h-[520px] xl:h-[680px] ${busy ? 'pointer-events-none' : ''}`}
              inert={busy ? true : undefined}
            >
              {!creating && (lat == null || lng == null) ? (
                <div className='text-muted-foreground flex min-h-[520px] flex-col items-center justify-center gap-3'>
                  <MapPin className='size-10 opacity-30' />
                  <p>{c('No map location saved yet.', 'Chưa có vị trí bản đồ được lưu.')}</p>
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className='text-muted-foreground flex h-[520px] items-center justify-center gap-2'>
                      <LoaderCircle className='size-5 animate-spin' />
                      {c('Loading map…', 'Đang tải bản đồ…')}
                    </div>
                  }
                >
                  <LocationMap
                    recenterOnCoordinatesChange
                    readOnly={!creating}
                    key={creating ? 'create' : selected!.id}
                    venueName={displayName}
                    streetAddress={displayAddress}
                    latitude={lat ?? null}
                    longitude={lng ?? null}
                    onCoordinatesChange={(latitude, longitude) => {
                      if (creating && !busy) {
                        setLocationBusy(true);
                        setMapPoint({
                          latitude: Number(latitude.toFixed(8)),
                          longitude: Number(longitude.toFixed(8))
                        });
                      }
                    }}
                  />
                </Suspense>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-6 pb-8'>
      <OrganizerPageHeader
        title={c('Building Management', 'Quản lý tòa nhà')}
        description={c('Manage buildings and their linked workspaces.', 'Quản lý tòa nhà và các workspace đã liên kết.')}
        icon={<Building2 aria-hidden='true' />}
      >
        <Button size='sm' onClick={beginCreate} disabled={query.isPending || query.isError}>
          <Plus className='size-4' />
          {c('Create building', 'Tạo tòa nhà')}
        </Button>
      </OrganizerPageHeader>
      <div className='grid gap-4 sm:grid-cols-3'>
        {[
          { icon: Building2, value: all.length, label: c('Buildings', 'Tòa nhà') },
          { icon: Layers3, value: totalFloors, label: c('Physical floors', 'Tầng vật lý') },
          {
            icon: MapPin,
            value: workspaceIds.size,
            label: c('Linked workspaces', 'Workspace đã liên kết')
          }
        ].map((stat) => (
          <div key={stat.label} className='bg-card flex items-center gap-3 rounded-xl border px-3 py-2.5'>
            <span className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg'>
              <stat.icon className='size-4' />
            </span>
            <div>
              <p className='text-lg font-semibold leading-tight tabular-nums'>
                {query.isPending || query.isError ? '—' : stat.value}
              </p>
              <p className='text-muted-foreground text-sm'>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='relative min-w-60 flex-1'>
          <Search className='text-muted-foreground absolute top-3 left-3 size-4' />
          <Input
            className='pr-10 pl-10'
            aria-label={c('Search buildings', 'Tìm tòa nhà')}
            placeholder={c(
              'Search by building name or address…',
              'Tìm theo tên tòa nhà hoặc địa chỉ…'
            )}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type='button'
              onClick={() => setSearch('')}
              aria-label={c('Clear search', 'Xóa tìm kiếm')}
              className='text-muted-foreground absolute top-3 right-3'
            >
              <X className='size-4' />
            </button>
          )}
        </div>
        <Button variant='outline' disabled={query.isFetching} onClick={() => void query.refetch()}>
          <RefreshCw className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          {c('Refresh', 'Làm mới')}
        </Button>
      </div>
      {all.length > 0 && (
        <Suspense
          fallback={<div className='bg-muted h-[28rem] animate-pulse rounded-2xl border' />}
        >
          <OverviewMap
            buildings={filtered}
            cityBuildings={cityBuildings}
            cities={cities}
            activeCity={activeCity}
            onCityChange={setCityFilter}
            onOpen={setSelected}
          />
        </Suspense>
      )}
      {query.isPending ? (
        <div
          className='text-muted-foreground flex min-h-60 items-center justify-center gap-3'
          role='status'
        >
          <LoaderCircle className='size-5 animate-spin' />
          {c('Loading buildings…', 'Đang tải tòa nhà…')}
        </div>
      ) : query.isError ? (
        <div role='alert' className='border-destructive/20 bg-destructive/5 rounded-2xl border p-6'>
          <p className='text-destructive'>
            {query.error instanceof Error
              ? query.error.message
              : c('Unable to load buildings.', 'Không tải được danh sách tòa nhà.')}
          </p>
          <Button variant='outline' className='mt-4' onClick={() => void query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      ) : !filtered.length ? (
        <div className='bg-card flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center'>
          <span className='bg-primary/10 text-primary mb-4 rounded-2xl p-5'>
            <Building2 className='size-8' />
          </span>
          <h2 className='text-lg font-semibold'>
            {search || activeCity
              ? c('No matching buildings', 'Không tìm thấy tòa nhà')
              : c('Your first building starts here', 'Bắt đầu với tòa nhà đầu tiên')}
          </h2>
          <p className='text-muted-foreground mt-2 max-w-md text-sm'>
            {search || activeCity
              ? c('Try another name or address.', 'Thử tên hoặc địa chỉ khác.')
              : c(
                  'Add a building and its location. Configure floors and link workspace areas afterwards.',
                  'Thêm tòa nhà và vị trí, sau đó thiết lập tầng và liên kết khu vực workspace.'
                )}
          </p>
          {!search && !activeCity && (
            <Button className='mt-5' onClick={beginCreate}>
              <Plus className='size-4' />
              {c('Create building', 'Tạo tòa nhà')}
            </Button>
          )}
        </div>
      ) : (
        <div className='grid gap-5 md:grid-cols-2 2xl:grid-cols-3'>
          {filtered.map((building) => {
            const occupants = new Map(
              building.floors.flatMap((floor) =>
                floor.occupants.map((item) => [item.workspaceId, item.workspaceName] as const)
              )
            );
            return (
              <article
                key={building.id}
                className='bg-card hover:border-primary/40 group overflow-hidden rounded-2xl border shadow-sm transition-colors'
              >
                <div className='from-primary/5 to-card flex items-center justify-between bg-gradient-to-r px-4 py-3'>
                  <span className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
                    <Building2 className='size-5' />
                  </span>
                  <span className='bg-background/70 text-muted-foreground rounded-full border px-3 py-1 text-xs'>
                    {building.latitude != null && building.longitude != null
                      ? c('Location saved', 'Đã định vị')
                      : c('Address saved', 'Đã lưu địa chỉ')}
                  </span>
                </div>
                <div className='space-y-3 p-4'>
                  <h2 className='text-lg font-semibold break-words'>{building.name}</h2>
                  <p className='text-muted-foreground flex items-start gap-2 text-sm leading-relaxed'>
                    <MapPin className='mt-0.5 size-4 shrink-0 text-primary' />
                    <span className='break-words'>{building.address}</span>
                  </p>
                  <div className='bg-muted/40 flex divide-x rounded-xl border py-3 text-center'>
                    <div className='flex-1'>
                      <p className='font-semibold'>{building.floors.length}</p>
                      <p className='text-muted-foreground text-xs'>{c('Floors', 'Tầng')}</p>
                    </div>
                    <div className='flex-1'>
                      <p className='font-semibold'>{occupants.size}</p>
                      <p className='text-muted-foreground text-xs'>
                        {c('Workspaces', 'Workspace')}
                      </p>
                    </div>
                  </div>
                  <div className='flex min-h-7 flex-wrap gap-2'>
                    {occupants.size ? (
                      [...occupants].slice(0, 3).map(([id, workspace]) => (
                        <span
                          key={id}
                          className='bg-primary/10 text-primary max-w-full truncate rounded-lg px-2 py-1 text-xs'
                        >
                          {workspace || `Workspace #${id}`}
                        </span>
                      ))
                    ) : (
                      <p className='text-muted-foreground text-xs'>
                        {c('No linked workspace areas yet', 'Chưa liên kết khu vực workspace')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant='outline'
                    className='w-full justify-between'
                    onClick={() => setSelected(building)}
                  >
                    {c('View building', 'Xem tòa nhà')}
                    <ArrowUpRight className='size-4' />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
