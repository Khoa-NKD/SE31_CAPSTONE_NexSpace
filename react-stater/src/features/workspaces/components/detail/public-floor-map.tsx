import type { FloorLocation } from '@/features/organizer-resources/api/buildings';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers3,
  Users,
  Armchair,
  Building,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import { backendRequest } from '@/features/auth/api/session';
import { DecorationLayer } from '@/features/organizer-resources/components/decoration-visual';
import { ResourceMapSymbol } from '@/features/organizer-resources/components/resource-map-symbol';
import type { FloorDecoration, Category } from '@/features/organizer-resources/api/resources';
import type { ResourceAvailabilityItem } from '../../api/booking-types';
import {
  type SpaceFilterType,
  isResourceOffice,
  matchesSpaceCategory
} from '../../utils/seat-room-utils';

export { type SpaceFilterType, isResourceOffice, matchesSpaceCategory };

export interface MapResource {
  id: number;
  code: string;
  name: string;
  category: Category;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  selectable: boolean;
  capacity?: number;
  typeName?: string;
  pricePerHour?: number;
  zoneName?: string;
}

export interface CustomerFloor {
  location?: FloorLocation | null;
  id: number;
  name: string;
  width: number;
  height: number;
  resources: MapResource[];
  decorations: FloorDecoration[];
}

export interface PublicFloorMapProps {
  workspaceId: number;
  onSelect?: (resource: MapResource) => void;
  onSelectResource?: (resource: MapResource) => void;
  selectedResourceId?: number | null;
  availabilityMap?: Map<number, ResourceAvailabilityItem>;
  activeFloorId?: number;
  onFloorChange?: (floorId: number) => void;
  filterCategory?: SpaceFilterType;
  onFilterCategoryChange?: (category: SpaceFilterType) => void;
  showCategoryFilters?: boolean;
  onFloorListLoaded?: (floors: CustomerFloor[]) => void;
  onContinueWithResource?: (resource: MapResource, floorId: number) => void;
  hasScheduleSelected?: boolean;
  embedded?: boolean;
}

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the bounding box of all resources and decorations on a floor,
 * accounting for element rotation, with comfortable architectural padding.
 */
function computeOptimalViewBox(floor: CustomerFloor): ViewBoxRect {
  const fullW = Math.max(100, Number(floor.width) || 1200);
  const fullH = Math.max(100, Number(floor.height) || 800);

  const items: Array<{ posX: number; posY: number; width: number; height: number; rotation?: number }> = [
    ...(floor.resources || []),
    ...(floor.decorations || [])
  ].filter(
    (item) =>
      typeof item.posX === 'number' &&
      typeof item.posY === 'number' &&
      typeof item.width === 'number' &&
      typeof item.height === 'number' &&
      item.width > 0 &&
      item.height > 0
  );

  if (items.length === 0) {
    return { x: 0, y: 0, width: fullW, height: fullH };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const cx = item.posX + item.width / 2;
    const cy = item.posY + item.height / 2;
    const rad = ((item.rotation || 0) * Math.PI) / 180;
    const halfW = (Math.abs(Math.cos(rad)) * item.width + Math.abs(Math.sin(rad)) * item.height) / 2;
    const halfH = (Math.abs(Math.sin(rad)) * item.width + Math.abs(Math.cos(rad)) * item.height) / 2;

    minX = Math.min(minX, cx - halfW);
    minY = Math.min(minY, cy - halfH);
    maxX = Math.max(maxX, cx + halfW);
    maxY = Math.max(maxY, cy + halfH);
  }

  const contentW = Math.max(120, maxX - minX);
  const contentH = Math.max(100, maxY - minY);

  // Add 14% margin around the active objects (minimum 44px in floor units)
  const padX = Math.max(48, contentW * 0.14);
  const padY = Math.max(44, contentH * 0.16);

  let boxW = contentW + padX * 2;
  let boxH = contentH + padY * 2;

  // Maintain a balanced landscape aspect ratio (~16:9.5) so SVG fills container cleanly
  const targetRatio = 1.68;
  const currentRatio = boxW / boxH;

  if (currentRatio < targetRatio) {
    boxW = boxH * targetRatio;
  } else if (currentRatio > 2.4) {
    boxH = boxW / 2.0;
  }

  // Ensure minimum reasonable canvas size so single-desk floors don't over-magnify
  boxW = Math.max(380, Math.min(fullW, boxW));
  boxH = Math.max(240, Math.min(fullH, boxH));

  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;

  let boxX = contentCenterX - boxW / 2;
  let boxY = contentCenterY - boxH / 2;

  // Clamp inside floor boundaries when possible
  if (boxX < 0) boxX = 0;
  if (boxY < 0) boxY = 0;
  if (boxX + boxW > fullW) boxX = Math.max(0, fullW - boxW);
  if (boxY + boxH > fullH) boxY = Math.max(0, fullH - boxH);

  return {
    x: Math.round(boxX),
    y: Math.round(boxY),
    width: Math.round(boxW),
    height: Math.round(boxH)
  };
}

/** Only bookable-resource nodes expose selection; decoration nodes have no booking interactions. */
export function PublicFloorMap({
  workspaceId,
  onSelect,
  onSelectResource,
  selectedResourceId,
  availabilityMap,
  activeFloorId,
  onFloorChange,
  filterCategory = 'ALL',
  onFilterCategoryChange,
  showCategoryFilters = false,
  onFloorListLoaded,
  onContinueWithResource,
  hasScheduleSelected = false,
  embedded = false
}: PublicFloorMapProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const c = useCallback((en: string, vi: string) => (language === 'vi' ? vi : en), [language]);

  const query = useQuery({
    queryKey: ['public-floor-maps', workspaceId],
    enabled: Number.isSafeInteger(workspaceId) && workspaceId > 0,
    queryFn: ({ signal }) =>
      backendRequest<CustomerFloor[]>(
        `/public/workspaces/${workspaceId}/floor-maps`,
        'GET',
        undefined,
        false,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });

  const [floorId, setFloorId] = useState<number | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null);
  const [internalFilter, setInternalFilter] = useState<SpaceFilterType>('ALL');

  const activeSelectedId = selectedResourceId !== undefined ? selectedResourceId : internalSelectedId;
  const activeFilter = onFilterCategoryChange ? filterCategory : filterCategory !== 'ALL' ? filterCategory : internalFilter;

  // Viewport Zoom & Pan state
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      onFloorListLoaded?.(query.data);
    }
  }, [query.data, onFloorListLoaded]);

  const effectiveFloorId = activeFloorId ?? floorId;

  const floor = useMemo(() => {
    return query.data?.find((item) => item.id === effectiveFloorId) ?? query.data?.[0];
  }, [query.data, effectiveFloorId]);

  useEffect(() => {
    if (floor?.id) {
      onFloorChange?.(floor.id);
    }
  }, [floor?.id, onFloorChange]);

  const selected = useMemo(() => {
    return floor?.resources.find((resource) => resource.id === activeSelectedId);
  }, [floor?.resources, activeSelectedId]);

  const fitViewBox = useMemo<ViewBoxRect>(() => {
    if (!floor) return { x: 0, y: 0, width: 1200, height: 800 };
    return computeOptimalViewBox(floor);
  }, [floor]);

  const baseViewBox = useMemo<ViewBoxRect>(() => {
    if (!floor) return { x: 0, y: 0, width: 1200, height: 800 };
    if (viewMode === 'full') {
      return {
        x: 0,
        y: 0,
        width: Math.max(100, Number(floor.width) || 1200),
        height: Math.max(100, Number(floor.height) || 800)
      };
    }
    return fitViewBox;
  }, [floor, viewMode, fitViewBox]);

  const activeViewBox = useMemo<ViewBoxRect>(() => {
    const scaledW = baseViewBox.width / zoom;
    const scaledH = baseViewBox.height / zoom;
    const centerX = baseViewBox.x + baseViewBox.width / 2 + pan.x;
    const centerY = baseViewBox.y + baseViewBox.height / 2 + pan.y;

    return {
      x: centerX - scaledW / 2,
      y: centerY - scaledH / 2,
      width: scaledW,
      height: scaledH
    };
  }, [baseViewBox, zoom, pan]);

  // Compute counts by category for optional filter pills
  const categoryStats = useMemo(() => {
    const resources = floor?.resources || [];
    let all = 0;
    let desks = 0;
    let rooms = 0;
    let offices = 0;

    for (const res of resources) {
      const avail = availabilityMap?.get(res.id);
      const isBooked = avail?.state === 'BOOKED' || avail?.state === 'LOCKED';
      const isMaintenance = avail?.state === 'MAINTENANCE';
      const isAvailable = (!avail || avail.state === 'AVAILABLE') && res.selectable && !isBooked && !isMaintenance;

      if (isAvailable) {
        all++;
        if (res.category === 'DESK') desks++;
        else if (res.category === 'ROOM') {
          if (isResourceOffice(res)) offices++;
          else rooms++;
        }
      }
    }

    return { all, desks, rooms, offices };
  }, [floor?.resources, availabilityMap]);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(0.75, Math.round((z - 0.25) * 100) / 100);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleFitToContent = () => {
    setViewMode('fit');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleResetFullCanvas = () => {
    setViewMode((prev) => (prev === 'fit' && zoom === 1 ? 'full' : 'fit'));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only initiate pan if clicking on background or zoomed in, not on a button element
    const target = e.target as Element;
    if (target.closest('[role="button"]')) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStartRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dxPx = e.clientX - dragStartRef.current.clientX;
    const dyPx = e.clientY - dragStartRef.current.clientY;

    const unitsPerPxX = activeViewBox.width / rect.width;
    const unitsPerPxY = activeViewBox.height / rect.height;

    const maxPanX = baseViewBox.width * 0.45;
    const maxPanY = baseViewBox.height * 0.45;

    const nextX = Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.panX - dxPx * unitsPerPxX));
    const nextY = Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.panY - dyPx * unitsPerPxY));

    setPan({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleCategoryChange = (cat: SpaceFilterType) => {
    if (onFilterCategoryChange) {
      onFilterCategoryChange(cat);
    } else {
      setInternalFilter(cat);
    }
  };

  function shape(resource: MapResource) {
    const avail = availabilityMap?.get(resource.id);
    const isBooked = avail?.state === 'BOOKED';
    const isLocked = avail?.state === 'LOCKED';
    const isMaintenance = avail?.state === 'MAINTENANCE' || !resource.selectable;
    const isAvailable =
      (!avail || avail.state === 'AVAILABLE') &&
      resource.selectable &&
      !isBooked &&
      !isLocked &&
      !isMaintenance;
    const isCurrentSelected = activeSelectedId === resource.id;
    const matchesCurrentFilter = matchesSpaceCategory(resource, activeFilter);

    const isOffice = isResourceOffice(resource);
    const capacityText = resource.capacity ? `${resource.capacity}` : isOffice ? '4' : resource.category === 'ROOM' ? '6' : '1';

    const select = () => {
      if (isAvailable && matchesCurrentFilter) {
        setInternalSelectedId(resource.id);
        onSelect?.(resource);
        onSelectResource?.(resource);
      }
    };

    let fillColor = 'fill-primary/5 stroke-primary';
    if (isCurrentSelected) {
      fillColor = 'fill-primary/25 stroke-primary stroke-[3px]';
    } else if (isBooked) {
      fillColor = 'fill-rose-500/20 stroke-rose-600 dark:stroke-rose-400';
    } else if (isLocked) {
      fillColor = 'fill-amber-500/15 stroke-amber-500/70 [stroke-dasharray:3_3]';
    } else if (isMaintenance) {
      fillColor = 'fill-muted/40 stroke-muted-foreground/40 [stroke-dasharray:2_2]';
    } else if (isAvailable) {
      fillColor =
        resource.category === 'ROOM'
          ? 'fill-emerald-500/15 stroke-emerald-600 dark:stroke-emerald-400 hover:fill-emerald-500/25 transition-colors'
          : 'fill-emerald-500/12 stroke-emerald-600 dark:stroke-emerald-400 hover:fill-emerald-500/25 transition-colors';
    }

    const typeLabel =
      resource.category === 'ROOM'
        ? isOffice
          ? c('Private Office', 'Văn phòng riêng')
          : c('Meeting Room', 'Phòng họp')
        : c('Desk', 'Bàn làm việc');

    const statusLabel = isBooked
      ? c('Booked / Confirmed', 'Đã có người đặt')
      : isLocked
        ? c('Holding / In Checkout', 'Đang giữ chỗ')
        : isMaintenance
          ? c('Unavailable', 'Tạm ngưng')
          : hasScheduleSelected
            ? c('Available for selected time', 'Còn trống khung giờ này')
            : c('Active space', 'Không gian hoạt động');

    const priceLabel =
      typeof resource.pricePerHour === 'number' && resource.pricePerHour > 0
        ? ` • ${formatPrice(resource.pricePerHour)}/hr`
        : '';

    const titleText = `${resource.name} (${resource.code}) — ${typeLabel} • ${capacityText} ${c('seats', 'chỗ')}${priceLabel} • ${statusLabel}`;

    const opacityClass = matchesCurrentFilter
      ? 'opacity-100'
      : 'opacity-20 grayscale pointer-events-none transition-opacity duration-200';

    // Improved label sizing so codes remain readable even on dense floors
    const codeFontSize =
      resource.category === 'ROOM'
        ? Math.max(11, Math.min(15, resource.height / 7))
        : Math.max(9.5, Math.min(13, resource.height / 3.4));

    const headerHeight = Math.max(18, Math.min(24, resource.height * 0.26));
    const headerFontSize = Math.max(8.5, Math.min(11, resource.height / 11));

    const badgeRadius = resource.category === 'ROOM' ? 9 : 6.5;
    const badgeCx = resource.posX + resource.width - badgeRadius - 3;
    const badgeCy = resource.posY + badgeRadius + 3;

    return (
      <g
        key={resource.id}
        transform={`rotate(${resource.rotation} ${resource.posX + resource.width / 2} ${resource.posY + resource.height / 2})`}
        role={isAvailable && matchesCurrentFilter ? 'button' : 'img'}
        tabIndex={isAvailable && matchesCurrentFilter ? 0 : undefined}
        aria-label={titleText}
        aria-pressed={isAvailable && matchesCurrentFilter ? isCurrentSelected : undefined}
        onClick={isAvailable && matchesCurrentFilter ? select : undefined}
        onKeyDown={
          isAvailable && matchesCurrentFilter
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }
            : undefined
        }
        className={`group/res ${opacityClass} ${
          isAvailable && matchesCurrentFilter
            ? 'cursor-pointer outline-none transition-all duration-150 focus-visible:opacity-95'
            : 'cursor-not-allowed'
        }`}
      >
        <title>{titleText}</title>

        {/* Selection Halo Ring for Keyboard & Visual Accessibility */}
        {isCurrentSelected && (
          <rect
            x={resource.posX - 4}
            y={resource.posY - 4}
            width={resource.width + 8}
            height={resource.height + 8}
            rx='9'
            fill='none'
            strokeWidth='2'
            vectorEffect='non-scaling-stroke'
            className='stroke-primary/60 [stroke-dasharray:4_2]'
          />
        )}

        {/* Main Base Shape Rectangle */}
        <rect
          x={resource.posX}
          y={resource.posY}
          width={resource.width}
          height={resource.height}
          rx='7'
          strokeWidth={isCurrentSelected ? 3 : 1.75}
          vectorEffect='non-scaling-stroke'
          className={fillColor}
        />

        {/* Desk Symbol */}
        {resource.category === 'DESK' && (
          <ResourceMapSymbol
            category='DESK'
            x={resource.posX}
            y={resource.posY - 2}
            width={resource.width}
            height={resource.height * 0.78}
            className={
              isCurrentSelected
                ? 'text-primary'
                : isBooked
                  ? 'text-amber-600/70 dark:text-amber-400/70'
                  : isMaintenance
                    ? 'text-muted-foreground/50'
                    : 'text-emerald-700 dark:text-emerald-300'
            }
          />
        )}

        {/* Room Header Strip & Capacity Badge */}
        {resource.category === 'ROOM' && (
          <g className='pointer-events-none select-none'>
            <rect
              x={resource.posX + 1.5}
              y={resource.posY + 1.5}
              width={Math.max(0, resource.width - 3)}
              height={headerHeight}
              rx='5.5'
              className={
                isCurrentSelected
                  ? 'fill-primary/25'
                  : isBooked
                    ? 'fill-amber-500/20'
                    : 'fill-background/80 dark:fill-card/80'
              }
            />
            <text
              x={resource.posX + 9}
              y={resource.posY + headerHeight * 0.72}
              fontSize={headerFontSize}
              className='fill-foreground font-bold tracking-wide'
            >
              {isOffice ? 'OFFICE' : 'ROOM'} • {capacityText}P
            </text>
          </g>
        )}

        {/* Non-color Status Indicator Badge (Selected / Booked / Maintenance) */}
        {(isCurrentSelected || isBooked || isMaintenance) && (
          <g className='pointer-events-none select-none'>
            <circle
              cx={badgeCx}
              cy={badgeCy}
              r={badgeRadius}
              className={
                isCurrentSelected
                  ? 'fill-primary'
                  : isBooked
                    ? 'fill-amber-500'
                    : 'fill-muted-foreground/70'
              }
            />
            <text
              x={badgeCx}
              y={badgeCy + badgeRadius * 0.36}
              textAnchor='middle'
              fontSize={badgeRadius * 1.15}
              className='fill-white font-bold'
            >
              {isCurrentSelected ? '✓' : isBooked ? '!' : '×'}
            </text>
          </g>
        )}

        {/* Resource Code Label with High-Contrast Pill Backdrop */}
        <g className='pointer-events-none select-none'>
          {resource.category === 'ROOM' ? (
            <>
              <rect
                x={resource.posX + resource.width / 2 - Math.min(resource.width * 0.42, (resource.code.length * codeFontSize * 0.65) / 2 + 10)}
                y={resource.posY + resource.height / 2 - codeFontSize * 0.75 + 4}
                width={Math.min(resource.width * 0.84, resource.code.length * codeFontSize * 0.65 + 20)}
                height={codeFontSize * 1.55}
                rx='5'
                className={
                  isCurrentSelected
                    ? 'fill-primary text-primary-foreground'
                    : 'fill-background/90 dark:fill-card/90 stroke-border/60'
                }
                strokeWidth='1'
                vectorEffect='non-scaling-stroke'
              />
              <text
                x={resource.posX + resource.width / 2}
                y={resource.posY + resource.height / 2 + codeFontSize * 0.35 + 4}
                textAnchor='middle'
                fontSize={codeFontSize}
                className={`font-bold ${
                  isCurrentSelected ? 'fill-primary-foreground' : 'fill-foreground'
                }`}
              >
                {resource.code}
              </text>
              {resource.height >= 110 && resource.name && (
                <text
                  x={resource.posX + resource.width / 2}
                  y={resource.posY + resource.height / 2 + codeFontSize * 1.65 + 6}
                  textAnchor='middle'
                  fontSize={Math.max(9, codeFontSize * 0.78)}
                  className='fill-muted-foreground font-medium'
                >
                  {resource.name.length > 24 ? `${resource.name.slice(0, 22)}…` : resource.name}
                </text>
              )}
            </>
          ) : (
            <>
              <rect
                x={resource.posX + 4}
                y={resource.posY + resource.height - codeFontSize * 1.45 - 2}
                width={Math.max(0, resource.width - 8)}
                height={codeFontSize * 1.35}
                rx='3.5'
                className={
                  isCurrentSelected
                    ? 'fill-primary'
                    : 'fill-background/90 dark:fill-card/90'
                }
              />
              <text
                x={resource.posX + resource.width / 2}
                y={resource.posY + resource.height - codeFontSize * 0.42 - 2}
                textAnchor='middle'
                fontSize={codeFontSize}
                className={`font-bold ${
                  isCurrentSelected ? 'fill-primary-foreground' : 'fill-foreground'
                }`}
              >
                {resource.code}
              </text>
            </>
          )}
        </g>
      </g>
    );
  }

  const filterButtons: Array<{ id: SpaceFilterType; label: string; count: number; icon: React.ElementType }> = [
    { id: 'ALL', label: c('All', 'Tất cả'), count: categoryStats.all, icon: Sparkles },
    { id: 'DESK', label: c('Desks', 'Bàn lẻ'), count: categoryStats.desks, icon: Armchair },
    { id: 'MEETING_ROOM', label: c('Meeting Rooms', 'Phòng họp'), count: categoryStats.rooms, icon: Users },
    ...(categoryStats.offices > 0
      ? [{ id: 'PRIVATE_OFFICE' as SpaceFilterType, label: c('Offices', 'Văn phòng'), count: categoryStats.offices, icon: Building }]
      : [])
  ];

  return (
    <section
      aria-label={c('Interactive floor map', 'Sơ đồ mặt bằng tương tác')}
      className={
        embedded
          ? 'rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs'
          : 'my-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs'
      }
    >
      {/* Header Row: Title, Instruction & Floor Selector */}
      <div className='mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <div className='flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Layers3 className='size-4' />
            </div>
            <h3 className='text-base font-bold text-foreground tracking-tight'>
              {c('Interactive Floor Map', 'Sơ đồ mặt bằng tương tác')}
            </h3>
            {floor?.location && (
              <span className='hidden md:inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/60'>
                {floor.location.physicalFloorName}
              </span>
            )}
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>
            {c(
              'Click any highlighted desk or room to inspect specifications and pricing. Drag to pan when zoomed.',
              'Nhấp vào bàn làm việc hoặc phòng họp trên sơ đồ để xem thông số và giá thuê. Kéo để di chuyển khi phóng to.'
            )}
          </p>
        </div>

        {floor && query.data && query.data.length > 0 && (
          <div className='flex items-center gap-2 shrink-0'>
            <label
              htmlFor={`floor-select-${workspaceId}`}
              className='text-xs font-semibold text-muted-foreground whitespace-nowrap'
            >
              {c('Floor:', 'Tầng:')}
            </label>
            <select
              id={`floor-select-${workspaceId}`}
              aria-label={c('Select floor', 'Chọn tầng')}
              className='h-8.5 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold text-foreground cursor-pointer transition-colors hover:border-primary focus:border-primary outline-none'
              value={floor.id}
              onChange={(event) => {
                const newId = Number(event.target.value);
                setFloorId(newId);
                setInternalSelectedId(null);
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setViewMode('fit');
                onFloorChange?.(newId);
              }}
            >
              {query.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.location ? `${item.location.physicalFloorName} · ${item.name}` : item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Optional Category Filter Bar + Legend Bar */}
      {floor && (
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2.5 border-y border-border/60 py-2.5'>
          {showCategoryFilters ? (
            <div className='flex flex-wrap items-center gap-1.5' role='group' aria-label={c('Filter space types', 'Lọc loại không gian')}>
              {filterButtons.map((btn) => {
                const Icon = btn.icon;
                const isActive = activeFilter === btn.id;
                return (
                  <button
                    key={btn.id}
                    type='button'
                    onClick={() => handleCategoryChange(btn.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                        : 'bg-background text-muted-foreground border-border/80 hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className='size-3.5' />
                    <span>{btn.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {btn.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className='text-xs font-medium text-muted-foreground'>
              {floor.resources.length} {c('mapped spaces on this floor', 'vị trí trên mặt bằng tầng này')}
            </div>
          )}

          {/* Accessible Legend with Shape & Color Semantics */}
          <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
            <span className='inline-flex items-center gap-1.5 font-medium text-foreground'>
              <span className='size-2.5 rounded-xs bg-emerald-500/30 border border-emerald-600 dark:border-emerald-400' />
              {hasScheduleSelected ? c('Available', 'Còn trống') : c('Bookable', 'Có thể đặt')}
            </span>
            <span className='inline-flex items-center gap-1.5 font-medium text-foreground'>
              <span className='size-2.5 rounded-xs bg-primary/30 border-2 border-primary' />
              {c('Selected (✓)', 'Đang chọn (✓)')}
            </span>
            {hasScheduleSelected && (
              <span className='inline-flex items-center gap-1.5'>
                <span className='size-2.5 rounded-xs bg-amber-500/25 border border-dashed border-amber-500' />
                {c('Occupied (!)', 'Đã đặt (!)')}
              </span>
            )}
            <span className='inline-flex items-center gap-1.5'>
              <span className='size-2.5 rounded-xs bg-muted border border-dotted border-muted-foreground/60' />
              {c('Unavailable (×)', 'Bảo trì (×)')}
            </span>
          </div>
        </div>
      )}

      {query.isPending ? (
        <div className='flex h-72 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/20'>
          <p className='text-sm font-medium text-muted-foreground animate-pulse'>
            {c('Loading floor map layout…', 'Đang tải bố cục sơ đồ tầng…')}
          </p>
        </div>
      ) : query.isError ? (
        <div className='flex h-60 flex-col items-center justify-center space-y-2.5 rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground'>
          <p>{c('The floor map is currently unavailable.', 'Hiện chưa có sơ đồ tầng khả dụng.')}</p>
          <Button type='button' size='sm' variant='outline' onClick={() => query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      ) : !floor ? (
        <div className='flex h-48 flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground'>
          <Layers3 className='size-7 text-muted-foreground/40 mb-2' />
          <p>{c('No published floor map yet for this workspace.', 'Không gian này chưa công bố sơ đồ mặt bằng.')}</p>
        </div>
      ) : (
        <>
          <div className='relative overflow-hidden rounded-xl border border-border bg-muted/15 dark:bg-slate-950/50 shadow-inner'>
            {/* Floating Viewport Controls (Zoom In, Zoom Out, Fit, Reset) */}
            <div className='absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg border border-border/80 bg-card/95 p-1 shadow-sm backdrop-blur-md'>
              <button
                type='button'
                onClick={handleZoomOut}
                disabled={zoom <= 0.75}
                aria-label={c('Zoom out floor map', 'Thu nhỏ sơ đồ')}
                title={c('Zoom out', 'Thu nhỏ')}
                className='flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none cursor-pointer'
              >
                <ZoomOut className='size-3.5' />
              </button>
              <span className='min-w-[40px] text-center font-mono text-[11px] font-semibold text-foreground select-none'>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type='button'
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                aria-label={c('Zoom in floor map', 'Phóng to sơ đồ')}
                title={c('Zoom in', 'Phóng to')}
                className='flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none cursor-pointer'
              >
                <ZoomIn className='size-3.5' />
              </button>
              <div className='mx-0.5 h-4 w-[1px] bg-border' />
              <button
                type='button'
                onClick={handleFitToContent}
                aria-label={c('Fit floor plan to screen', 'Căn vừa màn hình')}
                title={c('Fit spaces to viewport', 'Tự động căn vừa các vị trí')}
                className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === 'fit' && zoom === 1 && pan.x === 0 && pan.y === 0
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Maximize2 className='size-3' />
                <span className='hidden sm:inline'>{c('Fit', 'Vừa khung')}</span>
              </button>
              <button
                type='button'
                onClick={handleResetFullCanvas}
                aria-label={c('Toggle full floor canvas or reset view', 'Xem toàn bộ mặt bằng hoặc đặt lại')}
                title={c('Reset / Full floor view', 'Đặt lại / Xem toàn sàn')}
                className='flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer'
              >
                <RotateCcw className='size-3.5' />
              </button>
            </div>

            {/* Interactive SVG Canvas */}
            <svg
              ref={svgRef}
              viewBox={`${activeViewBox.x} ${activeViewBox.y} ${activeViewBox.width} ${activeViewBox.height}`}
              preserveAspectRatio='xMidYMid meet'
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`h-[300px] sm:h-[380px] lg:h-[420px] w-full select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              aria-label={c('Published floor layout', 'Bố trí tầng đã publish')}
            >
              <defs>
                <pattern
                  id={`floor-grid-${workspaceId}`}
                  width='40'
                  height='40'
                  patternUnits='userSpaceOnUse'
                >
                  <path
                    d='M 40 0 L 0 0 0 40'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='0.6'
                    className='text-border/40'
                  />
                </pattern>
              </defs>

              {/* Subtle Architectural Floor Boundary & Grid */}
              <rect
                x={0}
                y={0}
                width={floor.width}
                height={floor.height}
                rx='12'
                fill={`url(#floor-grid-${workspaceId})`}
                className='stroke-border/60'
                strokeWidth='1.5'
              />

              {/* 1. Rooms layer (Meeting rooms & Private offices) */}
              {floor.resources.filter((item) => item.category === 'ROOM').map(shape)}

              {/* 2. Architectural Decorations (walls, doors, plants, dividers) */}
              <DecorationLayer items={floor.decorations} blockSelection />

              {/* 3. Desks layer (Individual desks) */}
              {floor.resources.filter((item) => item.category === 'DESK').map(shape)}
            </svg>
          </div>

          {/* Quick Selection Summary Footer inside Map */}
          {selected && (
            <div className='mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 animate-in fade-in duration-200'>
              <div className='flex items-start sm:items-center gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs'>
                  {selected.category === 'ROOM' ? (
                    isResourceOffice(selected) ? (
                      <Building className='size-5' />
                    ) : (
                      <Users className='size-5' />
                    )
                  ) : (
                    <Armchair className='size-5' />
                  )}
                </div>
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-bold text-foreground'>
                      {selected.name}
                    </span>
                    <span className='rounded-md bg-background px-1.5 py-0.5 font-mono text-xs font-bold text-primary border border-primary/20'>
                      {selected.code}
                    </span>
                    <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300'>
                      <CheckCircle2 className='size-3' />
                      {hasScheduleSelected
                        ? c('Available for selected slot', 'Trống trong khung giờ chọn')
                        : c('Selected space', 'Đã chọn vị trí')}
                    </span>
                  </div>
                  <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                    <span>
                      {selected.typeName ||
                        (selected.category === 'ROOM'
                          ? isResourceOffice(selected)
                            ? c('Private Office', 'Văn phòng riêng')
                            : c('Meeting Room', 'Phòng họp')
                          : c('Workstation Desk', 'Bàn làm việc'))}
                    </span>
                    <span>•</span>
                    <span>
                      {selected.capacity || (selected.category === 'ROOM' ? 6 : 1)}{' '}
                      {c('seats capacity', 'chỗ ngồi')}
                    </span>
                    {selected.zoneName && (
                      <>
                        <span>•</span>
                        <span className='font-medium text-foreground'>{selected.zoneName}</span>
                      </>
                    )}
                    {typeof selected.pricePerHour === 'number' && selected.pricePerHour > 0 && (
                      <>
                        <span>•</span>
                        <span className='font-bold text-primary'>
                          {formatPrice(selected.pricePerHour)} / {c('hr', 'giờ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {onContinueWithResource && floor && (
                <Button
                  type='button'
                  size='sm'
                  onClick={() => onContinueWithResource(selected, floor.id)}
                  className='shrink-0 gap-1.5 rounded-xl font-semibold shadow-xs cursor-pointer'
                >
                  <span>
                    {c(`Book ${selected.code}`, `Đặt vị trí ${selected.code}`)}
                  </span>
                  <ArrowRight className='size-3.5' />
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
