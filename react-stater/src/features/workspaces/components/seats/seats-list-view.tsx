import { customerResourceStatus } from '../../utils/customer-resource-status';
import React, { useState, useMemo } from 'react';
import {
  Users,
  Chair,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Search,
  SlidersHorizontal,
  Wifi,
  Zap,
  VolumeX,
  Monitor,
  ShieldCheck,
  AlertCircle
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import type { MapResource, CustomerFloor, SpaceFilterType } from '../detail/public-floor-map';
import { isResourceOffice, matchesSpaceCategory } from '../../utils/seat-room-utils';
import type { ResourceAvailabilityItem } from '../../api/booking-types';

export interface SeatsListViewProps {
  resources: MapResource[];
  availabilityMap?: Map<number, ResourceAvailabilityItem>;
  workspaceId: number;
  floor?: CustomerFloor;
  currentDateLabel: string;
  currentStartTime: string;
  currentEndTime: string;
  durationHours: number;
  filterCategory?: SpaceFilterType;
  selectedResourceId?: number | null;
  onSelectResource?: (resource: MapResource) => void;
  onViewDetail: (resource: MapResource) => void;
  onHoldAndReview?: (resource: MapResource) => void;
  isHolding?: boolean;
}

// Photography mapping for realistic high-end workspace visual presentation
const RESOURCE_PHOTOS: Record<string, string> = {
  DESK_HOT:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
  DESK_DEDICATED:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAoigSMii3ULjhpcVlAYsWAoiHuY_8eYStw4oUQUys8JhwuKdzWKUU1h48wHiWQc4TP0miTNXuk1eX_W4XQUZrwbD1SsTeKvNv6caK6hzUt1tZOTxTII6Vsk_5pMOhtNw4HHv0Xt5EY-5P8d06Y-iH7hPlxiwcHVkEMQjvOVmBf79ZTCrX-sE9dZtdJ0dyz4XHS1g1dp3tEb3zHqGWlP9t8sp20JKszz0yi_Y329SVg',
  ROOM_BOARDROOM:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD1AJurBdsjhb7BFr4j2QVdUoBIX4zG6WvbdcpwhzqzrsPVGMiLnQtsL4jJZDrCi93-OZObPlfrHOPQxMujBm6X0TJd8s7BCsxAZKc4cnnBsw7bkZFGdCJ6Ee5-z9C2ed34gcSlAFIVh9q11MVk_RNgb3dDDUtUL1fU37PzWL-aIOXjuFAp3WSWJlX6mXhM3aZ1Mm5Ml9lECVxPQo_dJ8jici3lkhQ-VOEYAnIZpKGQtZQjnQMVDqgy4g',
  ROOM_POD:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuABy9Ssp5A7AA8ZqBbHHPTnt3vwlcsSKqp5nCfD149Xth-1vi_F51o-4y5MuouSA2PfnQtiFGstpRJYzVrvlrReikmGDGHt9ZdjSl2fnL1bzsUXBHyYlTHiBmGO7uE8UpCSjLaAupxW7bvdBhIrKH54WvO0akAjrhlu0itjpDww5-xUfPB8rkWdJTdZmbnb_nBFYRcrEcgda8OCNO1HYbJZFQMOPyLpafuz_jQBTxGU'
};

function getResourceImage(resource: MapResource): string {
  if (resource.category === 'ROOM') {
    if (isResourceOffice(resource) || (resource.capacity && resource.capacity > 4)) {
      return RESOURCE_PHOTOS.ROOM_BOARDROOM;
    }
    return RESOURCE_PHOTOS.ROOM_POD;
  }
  if (
    resource.code.startsWith('DD') ||
    (resource.typeName && resource.typeName.includes('Cố Định'))
  ) {
    return RESOURCE_PHOTOS.DESK_DEDICATED;
  }
  return RESOURCE_PHOTOS.DESK_HOT;
}

export function SeatsListView({
  resources,
  availabilityMap,
  workspaceId: _workspaceId,
  floor,
  currentDateLabel,
  currentStartTime: _currentStartTime,
  currentEndTime: _currentEndTime,
  durationHours,
  filterCategory = 'ALL',
  selectedResourceId,
  onSelectResource,
  onViewDetail,
  onHoldAndReview,
  isHolding = false
}: SeatsListViewProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc' | 'capacity'>(
    'default'
  );

  const filteredResources = useMemo(() => {
    let list = resources
      .filter((res) => {
        const status = customerResourceStatus(res, availabilityMap?.get(res.id));
        return !status.maintenance && !status.disabled && matchesSpaceCategory(res, filterCategory);
      })
      .map((res) => ({ ...res, capacity: availabilityMap?.get(res.id)?.capacity ?? res.capacity }));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          (r.zoneName && r.zoneName.toLowerCase().includes(term)) ||
          (r.typeName && r.typeName.toLowerCase().includes(term))
      );
    }

    if (sortBy === 'priceAsc') {
      list = [...list].sort((a, b) => (a.pricePerHour || 0) - (b.pricePerHour || 0));
    } else if (sortBy === 'priceDesc') {
      list = [...list].sort((a, b) => (b.pricePerHour || 0) - (a.pricePerHour || 0));
    } else if (sortBy === 'capacity') {
      list = [...list].sort((a, b) => (b.capacity || 1) - (a.capacity || 1));
    }

    return list;
  }, [resources, availabilityMap, filterCategory, searchTerm, sortBy]);

  return (
    <div className='space-y-5 animate-in fade-in duration-300'>
      {/* Search & Sort Toolbelt */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={c(
              'Search by seat code (HD-01, DD-01, POD-01), name, or zone...',
              'Tìm kiếm theo mã (HD-01, DD-01, POD-01), tên hoặc khu vực...'
            )}
            className='w-full rounded-xl border border-border/80 bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          />
        </div>

        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-1'>
            <SlidersHorizontal className='size-3.5 text-primary' />
            <span>{c('Sort:', 'Sắp xếp:')}</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className='rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer'
          >
            <option value='default'>{c('Default Order', 'Mặc định')}</option>
            <option value='priceAsc'>{c('Price: Low to High', 'Giá: Thấp đến cao')}</option>
            <option value='priceDesc'>{c('Price: High to Low', 'Giá: Cao đến thấp')}</option>
            <option value='capacity'>{c('Capacity (High to Low)', 'Sức chứa lớn nhất')}</option>
          </select>
        </div>
      </div>

      {/* Grid of Available Workspaces / Resources */}
      {filteredResources.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-border bg-card p-12 text-center'>
          <div className='mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground'>
            <Chair className='size-6' />
          </div>
          <h3 className='text-sm font-bold text-foreground'>
            {c('No spaces found matching criteria', 'Không tìm thấy vị trí phù hợp')}
          </h3>
          <p className='mt-1 text-xs text-muted-foreground max-w-md mx-auto'>
            {c(
              'Try adjusting your search keywords, clearing filters, or switching to another floor.',
              'Vui lòng thử đổi từ khóa tìm kiếm, chọn lại danh mục hoặc chuyển sang tầng khác.'
            )}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {filteredResources.map((res) => {
            const avail = availabilityMap?.get(res.id);
            const isHeldByMe = Boolean(avail?.isOccupiedByMe);
            const status = customerResourceStatus(res, avail, isHeldByMe);
            const isBooked = status.booked,
              isLocked = status.locked,
              isMaintenance = status.maintenance;
            const isAvailable = status.available;
            const isSelected = selectedResourceId === res.id;
            const isOffice = isResourceOffice(res);
            const capacity = res.capacity || (res.category === 'ROOM' ? (isOffice ? 4 : 6) : 1);
            const hourlyRate = res.pricePerHour || 35000;
            const subtotal = hourlyRate * durationHours;
            const imageUrl = getResourceImage(res);

            return (
              <div
                key={res.id}
                onClick={() => {
                  if (isAvailable) onSelectResource?.(res);
                }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl cursor-pointer ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 shadow-md'
                    : 'border-border/80 hover:border-primary/50'
                }`}
              >
                {/* Visual Thumbnail */}
                <div className='relative h-44 w-full overflow-hidden bg-muted'>
                  <img
                    src={imageUrl}
                    alt={res.name}
                    className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                    loading='lazy'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />

                  {/* Top Badges */}
                  <div className='absolute top-3 left-3 right-3 flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-1.5'>
                      <span className='rounded-lg bg-background/90 backdrop-blur-md px-2.5 py-1 font-mono text-xs font-bold text-foreground shadow-xs'>
                        {res.code}
                      </span>
                      <span className='rounded-lg bg-primary/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-xs'>
                        {res.category === 'ROOM'
                          ? isOffice
                            ? c('Private Office', 'Văn phòng riêng')
                            : c('Meeting Room', 'Phòng họp')
                          : c('Work Desk', 'Bàn làm việc')}
                      </span>
                    </div>

                    {/* Status Indicator Pill */}
                    <div>
                      {isHeldByMe ? (
                        <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-600/95 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs ring-1 ring-emerald-400/50'>
                          <span className='size-1.5 rounded-full bg-white animate-pulse' />
                          {c('Your Hold', 'Bạn đang giữ chỗ')}
                        </span>
                      ) : isAvailable ? (
                        <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs'>
                          <span className='size-1.5 rounded-full bg-white animate-pulse' />
                          {c('Available', 'Còn trống')}
                        </span>
                      ) : isLocked ? (
                        <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs'>
                          {c('Holding', 'Đang giữ chỗ')}
                        </span>
                      ) : isBooked ? (
                        <span className='inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs'>
                          {c('Booked', 'Đã có người đặt')}
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1.5 rounded-full bg-purple-600/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs'>
                          {isMaintenance
                            ? c('Under maintenance', 'Đang bảo trì')
                            : c('Not accepting bookings', 'Ngừng nhận đặt')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Image Overlay Label */}
                  <div className='absolute bottom-2.5 left-3 right-3 text-white'>
                    <h4 className='font-bold text-sm tracking-tight drop-shadow-sm truncate'>
                      {res.name}
                    </h4>
                    <p className='text-[11px] text-white/80 drop-shadow-sm truncate'>
                      {res.zoneName || (floor?.name ?? 'Enouvo Space')} • {capacity}{' '}
                      {c('seats', 'chỗ ngồi')}
                    </p>
                  </div>
                </div>

                {/* Card Body & Specs */}
                <div className='flex-1 p-4 space-y-3.5'>
                  {/* Quick Amenities Icons Strip */}
                  <div className='grid grid-cols-2 gap-2 text-[11px] text-muted-foreground'>
                    <div className='flex items-center gap-1.5 truncate'>
                      <Wifi className='size-3 text-primary shrink-0' />
                      <span>WiFi 6 1,000 Mbps</span>
                    </div>
                    <div className='flex items-center gap-1.5 truncate'>
                      <Zap className='size-3 text-primary shrink-0' />
                      <span>{c('Power Outlets 220V', 'Ổ cắm điện 220V')}</span>
                    </div>
                    {res.category === 'ROOM' ? (
                      <>
                        <div className='flex items-center gap-1.5 truncate'>
                          <Monitor className='size-3 text-primary shrink-0' />
                          <span>{capacity > 4 ? 'TV 4K 75-inch' : 'Display Port & USB-C'}</span>
                        </div>
                        <div className='flex items-center gap-1.5 truncate'>
                          <VolumeX className='size-3 text-primary shrink-0' />
                          <span>{c('Soundproof 38dB', 'Cách âm tiêu chuẩn')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className='flex items-center gap-1.5 truncate'>
                          <Chair className='size-3 text-primary shrink-0' />
                          <span>{c('Ergonomic Chair', 'Ghế công thái học')}</span>
                        </div>
                        <div className='flex items-center gap-1.5 truncate'>
                          <ShieldCheck className='size-3 text-primary shrink-0' />
                          <span>{c('Smart QR Access', 'Mở khóa QR 24/7')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pricing Breakdown Row */}
                  <div className='border-t border-border/60 pt-3 flex items-baseline justify-between'>
                    <div>
                      <span className='font-mono text-base font-bold text-primary'>
                        {formatPrice(hourlyRate)}
                      </span>
                      <span className='text-muted-foreground text-[11px] font-medium'> / giờ</span>
                    </div>
                    <div className='text-right'>
                      <span className='text-xs font-semibold text-foreground'>
                        {formatPrice(subtotal)}
                      </span>
                      <span className='text-muted-foreground text-[10px] block'>
                        {currentDateLabel} • {durationHours}h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footers */}
                <div className='border-t border-border/60 bg-muted/20 p-3 flex items-center gap-2'>
                  {/* Primary CTA: View Details (chuyển qua xem detail của vị trí theo yêu cầu) */}
                  <Button
                    type='button'
                    variant='outline'
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(res);
                    }}
                    className='flex-1 h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 hover:text-primary text-xs font-semibold cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-2xs'
                  >
                    <Eye className='size-3.5' />
                    <span>{c('View Details', 'Xem chi tiết')}</span>
                  </Button>

                  {/* Secondary Action: Instant Hold & Review */}
                  {isAvailable && onHoldAndReview && (
                    <Button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        onHoldAndReview(res);
                      }}
                      disabled={isHolding}
                      className='h-9 px-3 rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer'
                    >
                      <span>{c('Hold', 'Giữ chỗ')}</span>
                      <ArrowRight className='size-3.5' />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
