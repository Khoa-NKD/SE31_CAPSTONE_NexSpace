import { useMemo, useState } from 'react';
import {
  MapPin,
  ShieldCheck,
  Zap,
  Wifi,
  Coffee,
  Printer,
  Tv,
  Wind,
  Lock,
  Phone,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  Building2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Navigation,
  Star,
  Layers,
  ArrowUpRight,
  Compass
} from 'lucide-react';
import type { PublicWorkspaceDetail, WorkspaceAmenityDto } from '../../api/types';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import {
  PublicFloorMap,
  type MapResource,
  type CustomerFloor,
  type SpaceFilterType,
  isResourceOffice
} from './public-floor-map';
import type { ResourceAvailabilityItem } from '../../api/booking-types';
import { WorkspaceGoongMap } from '@/features/admin-workspaces/components/workspace-goong-map';
import { cn } from '@/lib/utils';

interface WorkspaceInfoProps {
  workspace?: PublicWorkspaceDetail & {
    organizerName?: string;
    address?: string;
    areaSqm?: number;
  };
  workspaceId: number;
  amenitiesList?: WorkspaceAmenityDto[];
  floors?: CustomerFloor[];
  selectedResource?: MapResource | null;
  onSelectResource?: (resource: MapResource) => void;
  activeFloorId?: number;
  onFloorChange?: (floorId: number) => void;
  availabilityMap?: Map<number, ResourceAvailabilityItem>;
  filterCategory?: SpaceFilterType;
  onFilterCategoryChange?: (category: SpaceFilterType) => void;
  onFloorListLoaded?: (floors: CustomerFloor[]) => void;
  onContinueWithResource?: (resource: MapResource, floorId?: number) => void;
  hasScheduleSelected?: boolean;
}

const getAmenityIcon = (codeOrName: string) => {
  const lower = codeOrName.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet') || lower.includes('mạng')) {
    return Wifi;
  }
  if (
    lower.includes('coffee') ||
    lower.includes('tea') ||
    lower.includes('pantry') ||
    lower.includes('barista') ||
    lower.includes('cà phê') ||
    lower.includes('trà')
  ) {
    return Coffee;
  }
  if (lower.includes('print') || lower.includes('scan') || lower.includes('in ấn')) {
    return Printer;
  }
  if (
    lower.includes('tv') ||
    lower.includes('screen') ||
    lower.includes('monitor') ||
    lower.includes('projector') ||
    lower.includes('màn hình')
  ) {
    return Tv;
  }
  if (
    lower.includes('air') ||
    lower.includes('ac') ||
    lower.includes('hvac') ||
    lower.includes('điều hòa')
  ) {
    return Wind;
  }
  if (
    lower.includes('lock') ||
    lower.includes('security') ||
    lower.includes('24/7') ||
    lower.includes('access') ||
    lower.includes('tủ') ||
    lower.includes('an ninh')
  ) {
    return Lock;
  }
  if (lower.includes('phone') || lower.includes('booth') || lower.includes('call')) {
    return Phone;
  }
  return CheckCircle2;
};

const formatCategoryLabel = (category: string | undefined, language: string) => {
  if (!category) return language === 'vi' ? 'Không gian làm việc' : 'Workspace';
  const normalized = category.toUpperCase().replace(/-/g, '_');
  const mapVi: Record<string, string> = {
    COWORKING_HUB: 'Không gian làm việc chung',
    SERVICED_OFFICE: 'Văn phòng dịch vụ',
    MEETING_SPACE: 'Phòng họp & Hội thảo',
    EVENT_VENUE: 'Không gian sự kiện',
    CREATIVE_STUDIO: 'Studio sáng tạo',
    BUSINESS_LOUNGE: 'Phòng chờ Doanh nhân'
  };
  const mapEn: Record<string, string> = {
    COWORKING_HUB: 'Coworking Hub',
    SERVICED_OFFICE: 'Serviced Office',
    MEETING_SPACE: 'Meeting & Conference Space',
    EVENT_VENUE: 'Event Venue',
    CREATIVE_STUDIO: 'Creative Studio',
    BUSINESS_LOUNGE: 'Business Lounge'
  };
  if (language === 'vi' && mapVi[normalized]) return mapVi[normalized];
  if (mapEn[normalized]) return mapEn[normalized];
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Converts `dayOfWeek` (either 1..7 ISO day or 'MON'..'SUN' string) to JS `Date.getDay()` (0=Sun, 1=Mon..6=Sat).
 */
function normalizeToJsDay(dayOfWeek: number | string | undefined): number {
  if (typeof dayOfWeek === 'number') {
    if (dayOfWeek === 7) return 0;
    return dayOfWeek;
  }
  const upper = String(dayOfWeek || '').toUpperCase();
  const map: Record<string, number> = {
    '1': 1,
    MON: 1,
    MONDAY: 1,
    '2': 2,
    TUE: 2,
    TUESDAY: 2,
    '3': 3,
    WED: 3,
    WEDNESDAY: 3,
    '4': 4,
    THU: 4,
    THURSDAY: 4,
    '5': 5,
    FRI: 5,
    FRIDAY: 5,
    '6': 6,
    SAT: 6,
    SATURDAY: 6,
    '7': 0,
    '0': 0,
    SUN: 0,
    SUNDAY: 0
  };
  return map[upper] ?? -1;
}

const formatDayLabel = (dayOfWeek: number | string, language: string) => {
  const jsDay = normalizeToJsDay(dayOfWeek);
  const viDays: Record<number, string> = {
    1: 'Thứ Hai',
    2: 'Thứ Ba',
    3: 'Thứ Tư',
    4: 'Thứ Năm',
    5: 'Thứ Sáu',
    6: 'Thứ Bảy',
    0: 'Chủ Nhật'
  };
  const enDays: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    0: 'Sunday'
  };
  return (language === 'vi' ? viDays[jsDay] : enDays[jsDay]) ?? String(dayOfWeek);
};

interface SpaceGroupSummary {
  key: string;
  label: string;
  category: 'DESK' | 'ROOM';
  filterType: SpaceFilterType;
  unitCount: number;
  availableCount: number;
  minCapacity: number;
  maxCapacity: number;
  minPricePerHour: number;
  zones: string[];
  sampleResource: MapResource;
  floorId: number;
}

export function WorkspaceInfo({
  workspace,
  workspaceId,
  amenitiesList = [],
  floors = [],
  selectedResource,
  onSelectResource,
  activeFloorId,
  onFloorChange,
  availabilityMap,
  filterCategory = 'ALL',
  onFilterCategoryChange,
  onFloorListLoaded,
  onContinueWithResource,
  hasScheduleSelected = false
}: WorkspaceInfoProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isHoursExpanded, setIsHoursExpanded] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Deduplicated full address
  const fullAddress = useMemo(() => {
    const rawAddress = (workspace?.address || workspace?.streetAddress || '').trim();
    const building = (workspace?.buildingName || '').trim();
    const district = (workspace?.district || '').trim();
    const city = (workspace?.city || '').trim();

    const parts: string[] = [];
    if (building && !rawAddress.toLowerCase().includes(building.toLowerCase())) {
      parts.push(building);
    }
    if (rawAddress) {
      parts.push(rawAddress);
    }
    if (district && !rawAddress.toLowerCase().includes(district.toLowerCase())) {
      parts.push(district);
    }
    if (city && !rawAddress.toLowerCase().includes(city.toLowerCase())) {
      parts.push(city);
    }
    return parts.join(', ');
  }, [workspace]);

  // Confirmation mode normalization (handles 'INSTANT', 'Instant', etc.)
  const isInstantConfirmation = useMemo(() => {
    const mode = String(workspace?.bookingConfirmationMode || '').toUpperCase();
    return mode === 'INSTANT';
  }, [workspace?.bookingConfirmationMode]);

  // Compute real inventory & capacity from loaded floor maps or fallback fields
  const inventoryStats = useMemo(() => {
    let desksCount = 0;
    let roomsCount = 0;
    let totalSeatsCapacity = 0;

    for (const floor of floors) {
      for (const res of floor.resources || []) {
        if (res.category === 'DESK') {
          desksCount += 1;
          totalSeatsCapacity += Math.max(1, res.capacity || 1);
        } else if (res.category === 'ROOM') {
          roomsCount += 1;
          totalSeatsCapacity += Math.max(1, res.capacity || 1);
        }
      }
    }

    if (desksCount === 0 && workspace?.capacityDesks) {
      desksCount = workspace.capacityDesks;
    }
    if (roomsCount === 0 && workspace?.meetingRooms) {
      roomsCount = workspace.meetingRooms;
    }

    return {
      desksCount,
      roomsCount,
      totalSeatsCapacity,
      floorCount: floors.length
    };
  }, [floors, workspace?.capacityDesks, workspace?.meetingRooms]);

  // Group available spaces by type from actual floor resources
  const spaceGroups = useMemo<SpaceGroupSummary[]>(() => {
    const groupMap = new Map<string, SpaceGroupSummary>();

    for (const floor of floors) {
      for (const res of floor.resources || []) {
        if (res.category !== 'DESK' && res.category !== 'ROOM') continue;

        const isOffice = isResourceOffice(res);
        const filterType: SpaceFilterType =
          res.category === 'ROOM' ? (isOffice ? 'PRIVATE_OFFICE' : 'MEETING_ROOM') : 'DESK';

        const label =
          res.typeName?.trim() ||
          (res.category === 'ROOM'
            ? isOffice
              ? language === 'vi'
                ? 'Văn phòng riêng'
                : 'Private Office'
              : language === 'vi'
                ? 'Phòng họp tiêu chuẩn'
                : 'Meeting Room'
            : language === 'vi'
              ? 'Bàn làm việc linh hoạt'
              : 'Flexible Work Desk');

        const key = `${res.category}:${label.toLowerCase()}`;
        const availItem = availabilityMap?.get(res.id);
        const isBooked = availItem?.state === 'BOOKED' || availItem?.state === 'LOCKED';
        const isMaint = availItem?.state === 'MAINTENANCE' || !res.selectable;
        const isAvailable = (!availItem || availItem.state === 'AVAILABLE') && !isBooked && !isMaint;
        const cap = Math.max(1, res.capacity || 1);
        const price = res.pricePerHour || 0;

        const existing = groupMap.get(key);
        if (!existing) {
          groupMap.set(key, {
            key,
            label,
            category: res.category,
            filterType,
            unitCount: 1,
            availableCount: isAvailable ? 1 : 0,
            minCapacity: cap,
            maxCapacity: cap,
            minPricePerHour: price,
            zones: res.zoneName ? [res.zoneName] : [],
            sampleResource: res,
            floorId: floor.id
          });
        } else {
          existing.unitCount += 1;
          if (isAvailable) {
            existing.availableCount += 1;
            if (!existing.sampleResource.selectable) {
              existing.sampleResource = res;
              existing.floorId = floor.id;
            }
          }
          existing.minCapacity = Math.min(existing.minCapacity, cap);
          existing.maxCapacity = Math.max(existing.maxCapacity, cap);
          if (price > 0 && (existing.minPricePerHour === 0 || price < existing.minPricePerHour)) {
            existing.minPricePerHour = price;
          }
          if (res.zoneName && !existing.zones.includes(res.zoneName)) {
            existing.zones.push(res.zoneName);
          }
        }
      }
    }

    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category === 'DESK' ? -1 : 1;
      return a.minPricePerHour - b.minPricePerHour;
    });
  }, [floors, availabilityMap, language]);

  // Normalize amenities from API endpoint + workspace.amenities string[] fallback
  const normalizedAmenities = useMemo(() => {
    if (amenitiesList.length > 0) {
      return amenitiesList.map((item, idx) => {
        const raw = item as WorkspaceAmenityDto & {
          amenityName?: string;
          amenityCode?: string;
          customNote?: string;
          amenityDescription?: string;
          isFree?: boolean;
          extraPrice?: number;
        };
        const displayName = raw.name || raw.amenityName || `Amenity #${idx + 1}`;
        const displayCode = raw.icon || raw.amenityCode || displayName;
        const displayDesc = raw.description || raw.customNote || raw.amenityDescription || '';
        const isFree =
          raw.isComplimentary ??
          raw.complimentary ??
          raw.isFree ??
          !(raw.addonPricePerHour || raw.extraPrice);
        const extraPrice = raw.addonPricePerHour || raw.extraPrice;

        return {
          key: String(raw.id || raw.amenityId || `${displayName}-${idx}`),
          code: displayCode,
          name: displayName,
          description: displayDesc,
          isFree,
          extraPrice
        };
      });
    }
    if (workspace?.amenities && workspace.amenities.length > 0) {
      return workspace.amenities.map((name, idx) => ({
        key: `${name}-${idx}`,
        code: name,
        name,
        description: '',
        isFree: true,
        extraPrice: undefined
      }));
    }
    return [];
  }, [amenitiesList, workspace]);

  // Today's operating hours summary
  const todayOperatingSummary = useMemo(() => {
    const hours = workspace?.operatingHours || [];
    if (hours.length === 0) return null;
    const todayJsDay = new Date().getDay();
    const match =
      hours.find((h) => normalizeToJsDay(h.dayOfWeek) === todayJsDay) || hours[0];
    return match;
  }, [workspace?.operatingHours]);

  const descriptionText = workspace?.description?.trim() || '';
  const shouldClampDescription =
    descriptionText.length > 260 || descriptionText.split('\n').length > 3;

  const usableArea = workspace?.usableAreaSqm || workspace?.areaSqm;
  const hostName = workspace?.organizerName || workspace?.organizerLegalName;

  const hasValidCoordinates =
    typeof workspace?.latitude === 'number' &&
    typeof workspace?.longitude === 'number' &&
    Math.abs(workspace.latitude) > 0.0001 &&
    Math.abs(workspace.longitude) > 0.0001;

  const googleMapsUrl = useMemo(() => {
    if (hasValidCoordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${workspace?.latitude},${workspace?.longitude}`;
    }
    if (fullAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    }
    return null;
  }, [hasValidCoordinates, workspace?.latitude, workspace?.longitude, fullAddress]);

  const hasReviews =
    typeof workspace?.rating === 'number' &&
    workspace.rating > 0 &&
    (workspace?.reviewsCount ?? 0) > 0;

  const visibleAmenities = showAllAmenities
    ? normalizedAmenities
    : normalizedAmenities.slice(0, 6);

  const handlePreviewSpaceOnMap = (group: SpaceGroupSummary) => {
    onFilterCategoryChange?.(group.filterType);
    if (group.floorId && group.floorId !== activeFloorId) {
      onFloorChange?.(group.floorId);
    }
    onSelectResource?.(group.sampleResource);
    const mapEl = document.getElementById('interactive-floor-map-anchor');
    if (mapEl) {
      const top = mapEl.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className='lg:col-span-8 space-y-7'>
      {/* =====================================================================
          SECTION 1: OVERVIEW (About + Compact Highlights + Operating Hours)
      ===================================================================== */}
      <section id='overview' className='scroll-mt-32 space-y-6'>
        <div className='rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs'>
          <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
            <h2 className='text-lg font-bold text-slate-900 dark:text-white tracking-tight'>
              {language === 'vi' ? 'Giới thiệu không gian' : 'About This Workspace'}
            </h2>
            {hostName && (
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full'>
                <ShieldCheck className='size-3.5 text-emerald-500 shrink-0' />
                <span className='truncate max-w-[200px]'>{hostName}</span>
              </span>
            )}
          </div>

          {descriptionText ? (
            <div>
              <p
                className={cn(
                  'text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line',
                  !isDescriptionExpanded && shouldClampDescription && 'line-clamp-3'
                )}
              >
                {descriptionText}
              </p>
              {shouldClampDescription && (
                <button
                  type='button'
                  onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                  className='mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer'
                >
                  <span>
                    {isDescriptionExpanded
                      ? language === 'vi'
                        ? 'Thu gọn'
                        : 'Show less'
                      : language === 'vi'
                        ? 'Xem thêm mô tả'
                        : 'Show more'}
                  </span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className='size-3.5' />
                  ) : (
                    <ChevronDown className='size-3.5' />
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className='text-sm text-slate-500 dark:text-slate-400 italic'>
              {language === 'vi'
                ? 'Không gian làm việc chuyên nghiệp, linh hoạt được xác thực trên nền tảng NexSpace.'
                : 'A professional, flexible workspace verified on the NexSpace platform.'}
            </p>
          )}

          {/* Compact Workspace Highlights & Specifications Grid */}
          <div className='mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3'>
            {/* 1. Category */}
            <div className='flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800'>
              <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5'>
                <Building2 className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider'>
                  {language === 'vi' ? 'Loại hình' : 'Category'}
                </div>
                <div className='text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5'>
                  {formatCategoryLabel(workspace?.category, language)}
                </div>
              </div>
            </div>

            {/* 2. Inventory & Capacity */}
            <div className='flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800'>
              <div className='size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5'>
                <Users className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider'>
                  {language === 'vi' ? 'Quy mô chỗ' : 'Capacity'}
                </div>
                <div className='text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5'>
                  {inventoryStats.desksCount > 0 || inventoryStats.roomsCount > 0 ? (
                    <>
                      {inventoryStats.desksCount > 0 &&
                        `${inventoryStats.desksCount} ${language === 'vi' ? 'bàn' : 'desks'}`}
                      {inventoryStats.desksCount > 0 && inventoryStats.roomsCount > 0 && ' · '}
                      {inventoryStats.roomsCount > 0 &&
                        `${inventoryStats.roomsCount} ${language === 'vi' ? 'phòng' : 'rooms'}`}
                    </>
                  ) : language === 'vi' ? (
                    'Linh hoạt'
                  ) : (
                    'Flexible'
                  )}
                </div>
              </div>
            </div>

            {/* 3. Confirmation Method */}
            <div className='flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800'>
              <div
                className={cn(
                  'size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  isInstantConfirmation
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                <Zap className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider'>
                  {language === 'vi' ? 'Xác nhận' : 'Confirmation'}
                </div>
                <div className='text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5'>
                  {isInstantConfirmation
                    ? language === 'vi'
                      ? 'Tức thì (Instant)'
                      : 'Instant Book'
                    : language === 'vi'
                      ? 'Chủ duyệt nhanh'
                      : 'Host Approval'}
                </div>
              </div>
            </div>

            {/* 4. Usable Floor Area / Floors */}
            <div className='flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800'>
              <div className='size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5'>
                <Maximize2 className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider'>
                  {usableArea
                    ? language === 'vi'
                      ? 'Diện tích'
                      : 'Floor Area'
                    : language === 'vi'
                      ? 'Sơ đồ tầng'
                      : 'Floor Levels'}
                </div>
                <div className='text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5'>
                  {usableArea
                    ? `${usableArea} m²${
                        inventoryStats.floorCount > 0
                          ? ` · ${inventoryStats.floorCount} ${language === 'vi' ? 'tầng' : 'fl'}`
                          : ''
                      }`
                    : inventoryStats.floorCount > 0
                      ? `${inventoryStats.floorCount} ${language === 'vi' ? 'tầng tương tác' : 'interactive floors'}`
                      : language === 'vi'
                        ? 'Tiêu chuẩn'
                        : 'Standard'}
                </div>
              </div>
            </div>
          </div>

          {/* Compact Operating Hours Bar */}
          {workspace?.operatingHours && workspace.operatingHours.length > 0 && (
            <div className='mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-xs sm:text-sm'>
                  <Clock className='size-4 text-primary shrink-0' />
                  <span className='font-semibold text-slate-800 dark:text-slate-200'>
                    {language === 'vi' ? 'Giờ hoạt động hôm nay:' : 'Operating hours today:'}
                  </span>
                  {todayOperatingSummary ? (
                    todayOperatingSummary.isClosed ? (
                      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400'>
                        {language === 'vi' ? 'Đóng cửa hôm nay' : 'Closed today'}
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400'>
                        <span className='size-1.5 rounded-full bg-emerald-500' />
                        {todayOperatingSummary.openTime} – {todayOperatingSummary.closeTime}
                      </span>
                    )
                  ) : null}
                </div>

                <button
                  type='button'
                  onClick={() => setIsHoursExpanded((prev) => !prev)}
                  className='inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer'
                >
                  <span>
                    {isHoursExpanded
                      ? language === 'vi'
                        ? 'Ẩn lịch tuần'
                        : 'Hide weekly schedule'
                      : language === 'vi'
                        ? 'Xem cả tuần (7 ngày)'
                        : 'View 7-day schedule'}
                  </span>
                  {isHoursExpanded ? (
                    <ChevronUp className='size-3.5' />
                  ) : (
                    <ChevronDown className='size-3.5' />
                  )}
                </button>
              </div>

              {isHoursExpanded && (
                <div className='mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2'>
                  {workspace.operatingHours.map((hour, idx) => {
                    const isToday =
                      normalizeToJsDay(hour.dayOfWeek) === new Date().getDay();
                    return (
                      <div
                        key={`${String(hour.dayOfWeek)}-${idx}`}
                        className={cn(
                          'px-2.5 py-2 rounded-lg border text-xs',
                          isToday
                            ? 'bg-primary/5 border-primary/30 text-slate-900 dark:text-white font-semibold'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <div className='text-[11px] font-bold text-slate-900 dark:text-white truncate'>
                          {formatDayLabel(hour.dayOfWeek, language)}
                        </div>
                        <div className='mt-0.5 text-[11px]'>
                          {hour.isClosed ? (
                            <span className='text-rose-500 font-medium'>
                              {language === 'vi' ? 'Đóng cửa' : 'Closed'}
                            </span>
                          ) : (
                            <span>
                              {hour.openTime} – {hour.closeTime}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: SPACES & INTERACTIVE FLOOR MAP
      ===================================================================== */}
      <section id='spaces-floor-map' className='scroll-mt-32 space-y-5'>
        {/* 2A. Available Space Types Summary Cards */}
        {spaceGroups.length > 0 && (
          <div className='rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs'>
            <div className='flex flex-wrap items-center justify-between gap-2 mb-4'>
              <div>
                <h2 className='text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2'>
                  <Layers className='size-5 text-primary' />
                  {language === 'vi'
                    ? 'Các loại chỗ ngồi & phòng hiện có'
                    : 'Available Spaces'}
                </h2>
                <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
                  {language === 'vi'
                    ? 'Tổng hợp trực tiếp từ sơ đồ mặt bằng. Nhấn vào từng loại để lọc và định vị trên bản đồ.'
                    : 'Grouped directly from live floor plans. Select a space type to highlight it on the floor map.'}
                </p>
              </div>
              {filterCategory !== 'ALL' && (
                <button
                  type='button'
                  onClick={() => onFilterCategoryChange?.('ALL')}
                  className='text-xs font-semibold text-primary hover:underline cursor-pointer'
                >
                  {language === 'vi' ? 'Hiện tất cả loại chỗ' : 'Show all space types'}
                </button>
              )}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {spaceGroups.map((group) => {
                const isSelectedGroup =
                  selectedResource &&
                  selectedResource.category === group.category &&
                  (selectedResource.typeName || '') === (group.sampleResource.typeName || '');

                return (
                  <div
                    key={group.key}
                    className={cn(
                      'group relative flex flex-col justify-between rounded-xl border p-4 transition-all',
                      isSelectedGroup
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1.5',
                              group.category === 'ROOM'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            )}
                          >
                            {group.category === 'ROOM'
                              ? language === 'vi'
                                ? 'Phòng khép kín'
                                : 'Private Space'
                              : language === 'vi'
                                ? 'Bàn làm việc'
                                : 'Desk Space'}
                          </span>
                          <h3 className='text-sm font-bold text-slate-900 dark:text-white'>
                            {group.label}
                          </h3>
                        </div>

                        {group.minPricePerHour > 0 && (
                          <div className='text-right shrink-0'>
                            <div className='text-sm font-extrabold text-primary'>
                              {formatPrice(group.minPricePerHour)}
                              <span className='text-[11px] font-normal text-slate-500'>
                                /{language === 'vi' ? 'giờ' : 'hr'}
                              </span>
                            </div>
                            <div className='text-[10px] text-slate-400'>
                              {language === 'vi' ? 'Giá khởi điểm' : 'Starting rate'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className='mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400'>
                        <span className='inline-flex items-center gap-1'>
                          <Users className='size-3.5 text-slate-400' />
                          {group.minCapacity === group.maxCapacity
                            ? `${group.minCapacity} ${
                                language === 'vi'
                                  ? 'người'
                                  : group.minCapacity === 1
                                    ? 'person'
                                    : 'people'
                              }`
                            : `${group.minCapacity}–${group.maxCapacity} ${
                                language === 'vi' ? 'người' : 'people'
                              }`}
                        </span>
                        <span>•</span>
                        <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                          {group.availableCount}/{group.unitCount}{' '}
                          {language === 'vi' ? 'vị trí sẵn sàng' : 'units available'}
                        </span>
                      </div>

                      {group.zones.length > 0 && (
                        <div className='mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate'>
                          {language === 'vi' ? 'Khu vực:' : 'Zones:'} {group.zones.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className='mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2'>
                      <button
                        type='button'
                        onClick={() => handlePreviewSpaceOnMap(group)}
                        className='inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer'
                      >
                        <Compass className='size-3.5 text-primary' />
                        <span>
                          {language === 'vi' ? 'Xem trên sơ đồ' : 'Locate on map'}
                        </span>
                      </button>

                      <button
                        type='button'
                        onClick={() => {
                          if (group.floorId && group.floorId !== activeFloorId) {
                            onFloorChange?.(group.floorId);
                          }
                          onSelectResource?.(group.sampleResource);
                          onContinueWithResource?.(group.sampleResource, group.floorId);
                        }}
                        className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer'
                      >
                        <span>{language === 'vi' ? 'Chọn đặt' : 'Select'}</span>
                        <ArrowUpRight className='size-3.5' />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2B. Interactive Floor Map Preview */}
        <div
          id='interactive-floor-map-anchor'
          className='rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs'
        >
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4'>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-lg font-bold text-slate-900 dark:text-white tracking-tight'>
                  {language === 'vi' ? 'Sơ đồ mặt bằng tương tác' : 'Interactive Floor Map'}
                </h2>
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'>
                  <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                  {hasScheduleSelected
                    ? language === 'vi'
                      ? 'Trạng thái theo khung giờ đã chọn'
                      : 'Live for selected time slot'
                    : language === 'vi'
                      ? 'Sơ đồ trực quan'
                      : 'Interactive Layout'}
                </span>
              </div>
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
                {language === 'vi'
                  ? 'Nhấp vào bất kỳ bàn hoặc phòng họp màu xanh để xem giá, sức chứa và chọn chỗ trực tiếp.'
                  : 'Click any green desk or meeting room to inspect pricing, capacity, and select it for booking.'}
              </p>
            </div>
          </div>

          <PublicFloorMap
            workspaceId={workspaceId}
            selectedResourceId={selectedResource?.id}
            onSelect={onSelectResource}
            onSelectResource={onSelectResource}
            filterCategory={filterCategory}
            onFilterCategoryChange={onFilterCategoryChange}
            showCategoryFilters
            availabilityMap={availabilityMap}
            activeFloorId={activeFloorId}
            onFloorChange={onFloorChange}
            onFloorListLoaded={onFloorListLoaded}
            onContinueWithResource={onContinueWithResource}
            hasScheduleSelected={hasScheduleSelected}
            embedded
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: AMENITIES & FACILITIES
      ===================================================================== */}
      <section
        id='amenities'
        className='scroll-mt-32 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs'
      >
        <div className='flex items-center justify-between gap-2 mb-4'>
          <div>
            <h2 className='text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2'>
              <Sparkles className='size-5 text-primary' />
              {language === 'vi' ? 'Tiện ích & Dịch vụ đi kèm' : 'Amenities & Facilities'}
            </h2>
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
              {language === 'vi'
                ? 'Trang thiết bị và tiện nghi phục vụ tại không gian làm việc này.'
                : 'Equipment, services, and facilities included or available at this location.'}
            </p>
          </div>
          {normalizedAmenities.length > 0 && (
            <span className='text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full'>
              {normalizedAmenities.length}{' '}
              {language === 'vi' ? 'tiện ích' : 'amenities'}
            </span>
          )}
        </div>

        {normalizedAmenities.length > 0 ? (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5'>
              {visibleAmenities.map((item) => {
                const IconComponent = getAmenityIcon(item.code || item.name);
                return (
                  <div
                    key={item.key}
                    className='flex items-start gap-3 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'
                  >
                    <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5'>
                      <IconComponent className='size-4' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center justify-between gap-1.5'>
                        <span className='text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate'>
                          {item.name}
                        </span>
                        {item.isFree ? (
                          <span className='shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'>
                            {language === 'vi' ? 'Miễn phí' : 'Included'}
                          </span>
                        ) : item.extraPrice ? (
                          <span className='shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400'>
                            +{formatPrice(item.extraPrice)}
                          </span>
                        ) : null}
                      </div>
                      {item.description && (
                        <p className='text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5'>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {normalizedAmenities.length > 6 && (
              <button
                type='button'
                onClick={() => setShowAllAmenities((prev) => !prev)}
                className='mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer'
              >
                <span>
                  {showAllAmenities
                    ? language === 'vi'
                      ? 'Thu gọn danh sách tiện ích'
                      : 'Show fewer amenities'
                    : language === 'vi'
                      ? `Xem tất cả ${normalizedAmenities.length} tiện ích`
                      : `Show all ${normalizedAmenities.length} amenities`}
                </span>
                {showAllAmenities ? (
                  <ChevronUp className='size-3.5' />
                ) : (
                  <ChevronDown className='size-3.5' />
                )}
              </button>
            )}
          </>
        ) : (
          <div className='flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400'>
            <Wifi className='size-4 text-slate-400 shrink-0' />
            <span>
              {language === 'vi'
                ? 'Tiện ích tiêu chuẩn văn phòng (Wi-Fi tốc độ cao, điều hòa, nước uống) được trang bị sẵn tại cơ sở.'
                : 'Standard workspace facilities (high-speed Wi-Fi, air conditioning, refreshments) are provided on-site.'}
            </span>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 4: LOCATION & ENTRY INSTRUCTIONS
      ===================================================================== */}
      <section
        id='location'
        className='scroll-mt-32 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs space-y-4'
      >
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2'>
              <MapPin className='size-5 text-primary' />
              {language === 'vi'
                ? 'Vị trí & Hướng dẫn check-in'
                : 'Location & Entry Instructions'}
            </h2>
            {fullAddress && (
              <p className='text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium'>
                {fullAddress}
              </p>
            )}
          </div>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-primary/40 hover:text-primary transition-colors'
            >
              <Navigation className='size-3.5 text-primary' />
              <span>{language === 'vi' ? 'Chỉ đường Google Maps' : 'Open in Google Maps'}</span>
              <ExternalLink className='size-3 opacity-60' />
            </a>
          )}
        </div>

        {/* Entry Instructions & Support Contact Callout */}
        {(workspace?.entryInstructions || workspace?.supportPhone) && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            {workspace?.entryInstructions && (
              <div
                className={cn(
                  'p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20',
                  workspace?.supportPhone ? 'md:col-span-2' : 'md:col-span-3'
                )}
              >
                <div className='text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1'>
                  {language === 'vi' ? 'Hướng dẫn ra vào & Gửi xe' : 'Arrival & Entry Instructions'}
                </div>
                <p className='text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed'>
                  {workspace.entryInstructions}
                </p>
              </div>
            )}

            {workspace?.supportPhone && (
              <div className='p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-center'>
                <div className='text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1'>
                  {language === 'vi' ? 'Hotline lễ tân cơ sở' : 'On-site Reception Desk'}
                </div>
                <a
                  href={`tel:${workspace.supportPhone}`}
                  className='inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white hover:text-primary transition-colors'
                >
                  <Phone className='size-4 text-primary shrink-0' />
                  <span>{workspace.supportPhone}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Interactive Map Preview */}
        {hasValidCoordinates && (
          <div className='rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800'>
            <WorkspaceGoongMap
              latitude={workspace?.latitude}
              longitude={workspace?.longitude}
              venueName={workspace?.name}
              streetAddress={fullAddress}
              height={260}
            />
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 5: RATINGS & REVIEWS
      ===================================================================== */}
      <section
        id='reviews'
        className='scroll-mt-32 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs'
      >
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2'>
              <Star className='size-5 text-amber-500 fill-amber-500' />
              {language === 'vi' ? 'Đánh giá từ khách hàng' : 'Guest Ratings & Reviews'}
            </h2>
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
              {language === 'vi'
                ? 'Chỉ những khách hàng đã hoàn tất đặt chỗ thực tế mới có thể gửi đánh giá.'
                : 'Only verified members who completed a booking can submit a review.'}
            </p>
          </div>

          {hasReviews && (
            <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20'>
              <Star className='size-4 text-amber-500 fill-amber-500' />
              <span className='text-base font-extrabold text-slate-900 dark:text-white'>
                {Number(workspace?.rating).toFixed(1)}
              </span>
              <span className='text-xs text-slate-500 dark:text-slate-400'>
                ({workspace?.reviewsCount}{' '}
                {language === 'vi' ? 'đánh giá' : 'reviews'})
              </span>
            </div>
          )}
        </div>

        {!hasReviews && (
          <div className='mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                <Sparkles className='size-4' />
              </div>
              <div>
                <div className='text-xs sm:text-sm font-bold text-slate-900 dark:text-white'>
                  {language === 'vi'
                    ? 'Không gian mới trên NexSpace — Chưa có đánh giá'
                    : 'New Workspace on NexSpace — No reviews yet'}
                </div>
                <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
                  {language === 'vi'
                    ? 'Không gian này đã được đội ngũ NexSpace kiểm duyệt tiêu chuẩn vận hành. Hãy là người đầu tiên trải nghiệm!'
                    : 'This workspace has passed NexSpace operational verification. Book a session to be the first verified reviewer!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
