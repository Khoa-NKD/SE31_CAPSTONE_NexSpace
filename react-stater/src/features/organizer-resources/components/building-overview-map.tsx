import { useId, useState } from 'react';
import { ArrowUpRight, Building2, Compass, Layers3, MapPin, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { VIETNAM_CITIES } from '@/features/organizer-onboarding/data/vietnam-locations';
import { administrativeName, buildingCity } from '../api/building-location';
import type { Building } from '../api/buildings';
import provinces from '../data/vietnam-provinces.json';

const cityAliases = [
  ['hcm', ['Ho Chi Minh', 'Ho Chi Minh City', 'HCM', 'TP HCM', 'Sai Gon']],
  ['danang', ['Da Nang']],
  ['hanoi', ['Ha Noi', 'Hanoi', 'Hanoi Capital']],
  ['haiphong', ['Hai Phong']]
] as const;

function buildingPosition(
  building: Building
): { coordinates: [number, number]; approximate: boolean } | null {
  const { latitude, longitude } = building;
  if (
    latitude != null &&
    longitude != null &&
    latitude >= 8 &&
    latitude <= 24 &&
    longitude >= 101 &&
    longitude <= 117
  ) {
    return { coordinates: [longitude, latitude], approximate: false };
  }

  const addressParts = building.address.split(',').map((part) => part.trim());
  const cityName = buildingCity(building).key;
  const cityId = cityAliases.find(([, aliases]) =>
    aliases.some((alias) => administrativeName(alias) === cityName)
  )?.[0];
  const city = VIETNAM_CITIES.find((item) => item.id === cityId);
  if (!city) return null;
  const wardName = administrativeName(building.ward?.trim() || addressParts.at(-2) || '');
  const ward = city.wards.find(
    (item) => administrativeName(item.name.split(',')[0].replace(/\s+Ward$/i, '')) === wardName
  );
  const point = ward ?? city.defaultCoords;
  return { coordinates: [point.lng, point.lat], approximate: true };
}

const sceneWidth = 840;
const sceneHeight = 560;
const overviewCenter = { x: 420, y: 280 };

function project([lng, lat]: number[]) {
  return { x: 420 + (lng - 105.8) * 40 - (lat - 16) * 4, y: 270 + (16 - lat) * 29 };
}

const regions = provinces.map(({ name, polygons }) => {
  const mainRing = polygons[0][0].map(project);
  const xs = mainRing.map(({ x }) => x);
  const ys = mainRing.map(({ y }) => y);
  const path = polygons
    .flatMap((polygon) =>
      polygon.map(
        (ring) =>
          ring
            .map((coordinate, index) => {
              const { x, y } = project(coordinate);
              return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
            })
            .join(' ') + ' Z'
      )
    )
    .join(' ');
  return {
    key: buildingCity({ city: name, address: '' }).key,
    path,
    center: {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2
    }
  };
});
const outline = regions.map(({ path }) => path).join(' ');

function locate(buildings: Building[]) {
  return buildings.flatMap((building) => {
    const position = buildingPosition(building);
    return position ? [{ building, ...position, ...project(position.coordinates) }] : [];
  });
}

export function BuildingOverviewMap({
  buildings,
  cityBuildings,
  cities,
  activeCity,
  onCityChange,
  onOpen
}: {
  buildings: Building[];
  cityBuildings: Building[];
  cities: ReadonlyMap<string, string>;
  activeCity: string;
  onCityChange: (key: string) => void;
  onOpen: (building: Building) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const id = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [zoomAdjustment, setZoomAdjustment] = useState(0);
  const points = locate(buildings);
  const active =
    points.find(({ building }) => building.id === hovered) ??
    points.find(({ building }) => building.id === selected);
  const cityPoints = activeCity ? locate(cityBuildings) : [];
  const cityOptions = Array.from(cities);
  cityOptions.sort((a, b) => a[1].localeCompare(b[1], language));
  const cityRegion = activeCity ? regions.find(({ key }) => key === activeCity) : undefined;
  const bounds = cityPoints.reduce(
    (box, { x, y }) => ({
      left: Math.min(box.left, x),
      right: Math.max(box.right, x),
      top: Math.min(box.top, y),
      bottom: Math.max(box.bottom, y)
    }),
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  );
  const cityCenter = cityPoints.length
    ? { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 }
    : (cityRegion?.center ?? null);
  // Keep every pin in the initial city frame, with room for the marker and map controls.
  const cityZoom = cityPoints.length
    ? Math.min(
        10,
        (sceneWidth - 210) / Math.max(1, bounds.right - bounds.left),
        (sceneHeight - 170) / Math.max(1, bounds.bottom - bounds.top)
      )
    : 5;
  const focus = cityCenter ?? overviewCenter;
  const zoom = Math.max(1, Math.min(18, (cityCenter ? cityZoom : 1) * 1.3 ** zoomAdjustment));
  const dx = sceneWidth / 2 - focus.x * zoom;
  const dy = sceneHeight / 2 - focus.y * zoom + (cityCenter ? 20 : 0);
  const highlight = active ?? cityCenter;
  const workspaceCount = active
    ? new Set(
        active.building.floors.flatMap((floor) => floor.occupants.map((item) => item.workspaceId))
      ).size
    : 0;

  function chooseCity(key: string) {
    setHovered(null);
    setSelected(null);
    setZoomAdjustment(0);
    onCityChange(key);
  }

  const markerGroupKey = (x: number, y: number) =>
    [Math.round((x * zoom) / 24), Math.round((y * zoom) / 24)].join(',');
  const groups = new Map<string, number[]>();
  for (const { x, y, building } of points) {
    const key = markerGroupKey(x, y);
    const group = groups.get(key) ?? [];
    group.push(building.id);
    groups.set(key, group);
  }

  return (
    <section className='bg-card overflow-hidden rounded-3xl border shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5'>
        <div className='flex items-center gap-3'>
          <span className='bg-primary/10 text-primary rounded-xl p-2.5'>
            <Compass className='size-5' />
          </span>
          <div>
            <h2 className='text-sm font-semibold'>
              {c('Vietnam building map', 'Bản đồ tòa nhà Việt Nam')}
            </h2>
            <p className='text-muted-foreground text-xs'>
              {points.length}/{buildings.length} {c('buildings mapped', 'tòa nhà đã ghim')}
            </p>
          </div>
        </div>
        <label className='flex w-full flex-wrap items-center gap-2 text-xs font-medium sm:w-auto'>
          {c('City / province', 'Tỉnh / Thành phố')}
          <select
            value={activeCity}
            onChange={(event) => chooseCity(event.target.value)}
            className='bg-background text-foreground focus-visible:ring-ring min-w-40 flex-1 rounded-xl border px-3 py-2 text-sm focus-visible:ring-2'
          >
            <option value=''>{c('All Vietnam', 'Toàn Việt Nam')}</option>
            {cityOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className='relative isolate h-[28rem] overflow-hidden bg-slate-100 dark:bg-[#080f20] sm:h-[34rem]'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,.25),transparent_64%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,.15),transparent_62%)]'
        />
        <svg
          viewBox='0 0 840 560'
          className='absolute inset-0 size-full'
          role='group'
          aria-label={c('Interactive 3D map of Vietnam', 'Bản đồ Việt Nam 3D tương tác')}
        >
          <defs>
            <linearGradient id={id + '-surface'} x2='1' y2='1'>
              <stop stopColor='#c7e9f9' stopOpacity='.92' />
              <stop offset='.52' stopColor='#7eacd0' stopOpacity='.76' />
              <stop offset='1' stopColor='#777bba' stopOpacity='.87' />
            </linearGradient>
            <linearGradient id={id + '-selected'} x2='0' y2='1'>
              <stop stopColor='#b5f6ff' />
              <stop offset='1' stopColor='#4699d0' />
            </linearGradient>
            <pattern id={id + '-grid'} width='32' height='32' patternUnits='userSpaceOnUse'>
              <circle cx='1' cy='1' r='.7' className='fill-slate-500/25 dark:fill-sky-200/20' />
            </pattern>
            <filter id={id + '-glow'} x='-60%' y='-60%' width='220%' height='220%'>
              <feGaussianBlur stdDeviation='7' />
            </filter>
          </defs>
          <rect width={sceneWidth} height={sceneHeight} fill={'url(#' + id + '-grid)'} />
          <g
            className='motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out'
            style={{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + zoom + ')' }}
          >
            <path
              d={outline}
              transform='translate(9 17)'
              fill='#070f24'
              fillRule='evenodd'
              opacity='.44'
              filter={'url(#' + id + '-glow)'}
            />
            {[11, 8, 5, 2].map((depth) => (
              <path
                key={depth}
                d={outline}
                transform={'translate(' + depth * 0.28 + ' ' + depth + ')'}
                fill={depth === 11 ? '#263d66' : '#456b96'}
                fillRule='evenodd'
                stroke='#456b96'
                strokeWidth='.8'
              />
            ))}
            <g strokeLinejoin='round'>
              {regions.map(({ key, path }) => (
                <path
                  key={key}
                  d={path}
                  fill={'url(#' + id + (activeCity === key ? '-selected)' : '-surface)')}
                  fillRule='evenodd'
                  stroke={activeCity === key ? '#ebfeff' : '#c3e8ff'}
                  strokeOpacity={activeCity === key ? 1 : 0.58}
                  strokeWidth={activeCity === key ? 1.1 : 0.55}
                  vectorEffect='non-scaling-stroke'
                />
              ))}
            </g>
            {highlight && (
              <g
                aria-hidden='true'
                pointerEvents='none'
                transform={'translate(' + highlight.x + ' ' + highlight.y + ')'}
              >
                <circle
                  r={22 / zoom}
                  fill='#22d3ee'
                  opacity='.75'
                  filter={'url(#' + id + '-glow)'}
                />
                <circle
                  r={18 / zoom}
                  fill='#67e8f9'
                  fillOpacity='.28'
                  stroke='#ecfeff'
                  strokeWidth={1.3 / zoom}
                />
                <circle
                  r={24 / zoom}
                  fill='none'
                  stroke='#67e8f9'
                  strokeWidth={1 / zoom}
                  strokeOpacity='.72'
                />
              </g>
            )}
            {points.map(({ building, x, y, approximate }) => {
              const group = groups.get(markerGroupKey(x, y)) ?? [building.id];
              const offset = (group.indexOf(building.id) - (group.length - 1) / 2) * 30;
              return (
                <g
                  key={building.id}
                  transform={
                    'translate(' + (x + offset / zoom) + ' ' + y + ') scale(' + 1 / zoom + ')'
                  }
                >
                  <foreignObject
                    x='-24'
                    y='-52'
                    width='48'
                    height='55'
                    className='overflow-visible'
                  >
                    <button
                      type='button'
                      aria-label={building.name}
                      aria-pressed={selected === building.id}
                      onMouseEnter={() => setHovered(building.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(building.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() =>
                        setSelected((current) => (current === building.id ? null : building.id))
                      }
                      className='group relative grid h-12 w-12 cursor-pointer place-items-center rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400'
                    >
                      <span
                        aria-hidden='true'
                        className='absolute bottom-0 size-2 rotate-45 border border-white bg-cyan-300 shadow-[0_0_12px_#22d3ee]'
                      />
                      <span
                        aria-hidden='true'
                        className='absolute bottom-1.5 h-3 w-px bg-cyan-100'
                      />
                      <span
                        aria-hidden='true'
                        className='relative -translate-y-1 rounded-lg border border-cyan-200/75 bg-gradient-to-br from-sky-500 to-indigo-700 p-1.5 text-white shadow-[0_3px_8px_#0f172a80,0_0_14px_#38bdf870] transition-transform group-hover:-translate-y-2'
                      >
                        <Building2 className='size-4' />
                      </span>
                    </button>
                  </foreignObject>
                  {activeCity && (points.length === 1 || active?.building.id === building.id) && (
                    <foreignObject
                      x='-95'
                      y='8'
                      width='190'
                      height='48'
                      className='pointer-events-none'
                    >
                      <div className='bg-card/95 text-card-foreground mx-auto w-fit max-w-full rounded-lg border px-2.5 py-1 text-center shadow-md'>
                        <p className='truncate text-[11px] font-semibold'>{building.name}</p>
                        {(building.ward || approximate) && (
                          <p className='text-muted-foreground truncate text-[9px]'>
                            {building.ward || c('Approximate location', 'Vị trí ước lượng')}
                          </p>
                        )}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className='pointer-events-none absolute top-4 left-4 max-w-[65%] rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur dark:bg-slate-950/60 dark:text-sky-100'>
          {cities.get(activeCity) ?? c('Vietnam', 'Việt Nam')}
          {activeCity && (
            <p className='mt-0.5 font-normal opacity-75'>
              {points.length} {c('buildings on the map', 'tòa nhà trên bản đồ')}
            </p>
          )}
        </div>
        <div className='bg-card/90 absolute top-3 right-3 flex flex-col items-center gap-1 rounded-xl border p-1 shadow-md backdrop-blur'>
          <Button
            variant='ghost'
            size='icon'
            disabled={zoom >= 18}
            aria-label={c('Zoom in', 'Phóng to')}
            onClick={() => setZoomAdjustment((value) => value + 1)}
          >
            <Plus className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            disabled={zoom <= 1}
            aria-label={c('Zoom out', 'Thu nhỏ')}
            onClick={() => setZoomAdjustment((value) => value - 1)}
          >
            <Minus className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            title={c('Vietnam overview', 'Toàn cảnh Việt Nam')}
            aria-label={c('Vietnam overview', 'Toàn cảnh Việt Nam')}
            onClick={() => chooseCity('')}
          >
            <Compass className='size-4' />
          </Button>
        </div>
        {active && (
          <div className='bg-card/95 text-card-foreground absolute bottom-4 left-4 z-10 w-[calc(100%-2rem)] max-w-sm rounded-2xl border p-4 shadow-xl backdrop-blur-lg'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <h3 className='break-words font-semibold'>{active.building.name}</h3>
                <p className='text-muted-foreground mt-1 flex items-start gap-1.5 text-xs leading-relaxed'>
                  <MapPin className='text-primary mt-0.5 size-3.5 shrink-0' />
                  {active.building.address}
                </p>
              </div>
              {selected === active.building.id && (
                <button
                  type='button'
                  aria-label={c('Close building info', 'Đóng thông tin tòa nhà')}
                  onClick={() => {
                    setSelected(null);
                    setHovered(null);
                  }}
                >
                  <X className='size-4' />
                </button>
              )}
            </div>
            <div className='text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs'>
              <span className='flex items-center gap-1.5'>
                <Layers3 className='text-primary size-3.5' />
                {active.building.floors.length} {c('floors', 'tầng')}
              </span>
              <span>{workspaceCount} workspace</span>
              {active.approximate && <span>{c('Approximate location', 'Vị trí ước lượng')}</span>}
            </div>
            {selected === active.building.id && (
              <Button
                size='sm'
                className='mt-3 w-full justify-between'
                onClick={() => onOpen(active.building)}
              >
                {c('View building', 'Xem tòa nhà')}
                <ArrowUpRight className='size-4' />
              </Button>
            )}
          </div>
        )}
      </div>
      <p className='text-muted-foreground border-t px-4 py-2.5 text-xs sm:px-5'>
        {c(
          'Schematic map. Hover over a pin for details, or select a city to focus the map.',
          'Bản đồ mô phỏng. Rê chuột lên ghim để xem thông tin hoặc chọn thành phố để phóng tới.'
        )}
        {points.length < buildings.length &&
          ' ' +
            c(
              'Buildings without a location are listed below.',
              'Tòa nhà chưa định vị có trong danh sách bên dưới.'
            )}
      </p>
    </section>
  );
}
