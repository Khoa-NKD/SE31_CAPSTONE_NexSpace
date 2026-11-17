import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  MapPin,
  Clock,
  Radio,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Image as ImageIcon,
  Layers,
  FileText,
  Star,
  Info,
  Car,
  Eye,
  RefreshCw,
  Sparkles,
  Wifi,
  Monitor,
  Printer,
  Coffee,
  Droplets,
  PhoneCall,
  Cast,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { WorkspaceDirectoryItem, mapCanonicalToDirectoryItem } from '../data/mock-workspaces-directory';
import {
  useWorkspaceDetailQuery,
  useWorkspaceMediaQuery,
  useWorkspaceAmenitiesQuery,
  type WorkspaceAmenityDto
} from '@/features/workspaces/api';
import { WorkspaceGoongMap } from './workspace-goong-map';

function AmenityIconHelper({
  icon,
  category,
  className = 'size-3.5'
}: {
  icon?: string;
  category?: string;
  className?: string;
}) {
  const normIcon = (icon || '').toLowerCase();
  const normCat = (category || '').toUpperCase();

  if (normIcon.includes('wifi')) return <Wifi className={className} />;
  if (normIcon.includes('monitor') || normIcon.includes('screen') || normIcon.includes('display'))
    return <Monitor className={className} />;
  if (normIcon.includes('print')) return <Printer className={className} />;
  if (normIcon.includes('coffee') || normIcon.includes('espresso') || normIcon.includes('tea'))
    return <Coffee className={className} />;
  if (normIcon.includes('water') || normIcon.includes('droplet')) return <Droplets className={className} />;
  if (normIcon.includes('phone') || normIcon.includes('booth') || normIcon.includes('call'))
    return <PhoneCall className={className} />;
  if (normIcon.includes('cast') || normIcon.includes('stream') || normIcon.includes('projector'))
    return <Cast className={className} />;
  if (normIcon.includes('car') || normIcon.includes('park')) return <Car className={className} />;
  if (normIcon.includes('shield') || normIcon.includes('security') || normIcon.includes('lock'))
    return <ShieldCheck className={className} />;

  if (normCat === 'TECH') return <Zap className={className} />;
  if (normCat === 'COMFORT') return <Coffee className={className} />;

  return <Sparkles className={className} />;
}

interface WorkspaceDetailsDrawerProps {
  workspace: WorkspaceDirectoryItem | null;
  workspaceId?: string | number | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleSuspend: (workspace: WorkspaceDirectoryItem, reason?: string) => void;
  onToggleFeatured?: (workspace: WorkspaceDirectoryItem) => void;
  isSubmitting?: boolean;
}

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export function WorkspaceDetailsDrawer({
  workspace,
  workspaceId,
  isOpen,
  onClose,
  onToggleSuspend,
  onToggleFeatured,
  isSubmitting = false
}: WorkspaceDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'floor' | 'audit'>('general');
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<{ url: string; label: string } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Target ID resolved from workspace prop or fallback workspaceId
  const targetId = workspace?.id ?? (workspaceId != null ? String(workspaceId) : null);
  const numericWsId = targetId ? Number(targetId.replace(/\D/g, '')) : undefined;

  // 1. Fetch deep workspace record from REST API for Admin
  const { data: detailData, isLoading: isLoadingDetail } = useWorkspaceDetailQuery(
    targetId,
    { role: 'Administrator' }
  );

  // 2. Fetch media gallery photos from REST API
  const { data: mediaList } = useWorkspaceMediaQuery(
    numericWsId || targetId
  );

  // 2b. Fetch assigned workspace amenities from REST API
  const { data: amenitiesList, isLoading: isLoadingAmenities } = useWorkspaceAmenitiesQuery(
    numericWsId || targetId
  );

  // 3. Fallback or merge directory item if workspace was not in parent list
  const activeWorkspace = useMemo<WorkspaceDirectoryItem | null>(() => {
    if (workspace) return workspace;
    if (detailData) {
      return mapCanonicalToDirectoryItem(detailData);
    }
    return null;
  }, [workspace, detailData]);

  // 4. Merge media items from API into gallery
  const effectiveGallery = useMemo(() => {
    if (mediaList && mediaList.length > 0) {
      return mediaList.map((m, idx) => ({
        id: String(m.id),
        label: (m.cover || m.isCover) ? 'Ảnh bìa chính (Cover Photo)' : `Ảnh cơ sở vật chất #${idx + 1}`,
        category: (m.cover || m.isCover) ? 'Cover Photo' : 'Facility View',
        verified: true,
        url: m.url
      }));
    }
    if (activeWorkspace?.gallery && activeWorkspace.gallery.length > 0) {
      return activeWorkspace.gallery;
    }
    return [];
  }, [mediaList, activeWorkspace]);

  // 4b. Effective amenities list (prefers real API response, fallback to tags)
  const effectiveAmenities = useMemo<WorkspaceAmenityDto[]>(() => {
    if (amenitiesList && amenitiesList.length > 0) {
      return amenitiesList;
    }
    if (activeWorkspace?.tags && activeWorkspace.tags.length > 0) {
      return activeWorkspace.tags.map((t, idx) => ({
        id: idx + 1,
        workspaceId: numericWsId || 0,
        amenityId: idx + 1,
        name: t,
        category: 'TECH',
        icon: 'Sparkles',
        addonPricePerHour: 0,
        complimentary: true,
        isComplimentary: true
      }));
    }
    return [];
  }, [amenitiesList, activeWorkspace, numericWsId]);

  // 4c. Consolidated detail record reference & resolved coordinates for Goong Map
  const detailObj = detailData as Record<string, unknown> | null | undefined;

  const mapLat = useMemo(() => {
    const rawLat =
      (typeof detailObj?.latitude === 'number' ? detailObj.latitude : detailData?.latitude) ??
      activeWorkspace?.latitude;
    if (typeof rawLat === 'number' && !isNaN(rawLat) && rawLat !== 0) return rawLat;
    if (rawLat) {
      const parsed = Number(rawLat);
      if (!isNaN(parsed) && parsed !== 0) return parsed;
    }
    if (activeWorkspace?.coordinates) {
      const match = activeWorkspace.coordinates.match(/([0-9.]+)[^\d,]+([0-9.]+)/);
      if (match) return parseFloat(match[1]);
    }
    return null;
  }, [detailObj, detailData, activeWorkspace]);

  const mapLng = useMemo(() => {
    const rawLng =
      (typeof detailObj?.longitude === 'number' ? detailObj.longitude : detailData?.longitude) ??
      activeWorkspace?.longitude;
    if (typeof rawLng === 'number' && !isNaN(rawLng) && rawLng !== 0) return rawLng;
    if (rawLng) {
      const parsed = Number(rawLng);
      if (!isNaN(parsed) && parsed !== 0) return parsed;
    }
    if (activeWorkspace?.coordinates) {
      const match = activeWorkspace.coordinates.match(/([0-9.]+)[^\d,]+([0-9.]+)/);
      if (match) return parseFloat(match[2]);
    }
    return null;
  }, [detailObj, detailData, activeWorkspace]);

  // 5. Consolidated field values (prefers detailed API data, falls back to list projection)
  const name = detailData?.name || activeWorkspace?.name || 'Workspace';
  const description = detailData?.description || activeWorkspace?.description || '';
  const rawCategory = detailData?.category || activeWorkspace?.category || 'COWORKING_HUB';
  const categoryLabel = {
    COWORKING_HUB: 'Coworking Hub',
    MEETING_ROOM: 'Meeting Room',
    PRIVATE_OFFICE: 'Private Dedicated Office',
    EVENT_SPACE: 'Event Space',
    DESK_HOTSPOT: 'Hot Desk Area'
  }[String(rawCategory).toUpperCase()] || String(rawCategory);

  const streetAddress = detailData?.streetAddress || (typeof detailObj?.address === 'string' ? detailObj.address : '') || activeWorkspace?.streetAddress || 'Address pending';
  const city = detailData?.city || activeWorkspace?.city || 'Ho Chi Minh City';
  const district = detailData?.district || '';
  const fullAddress = [streetAddress, district, city].filter(Boolean).join(', ');
  const supportPhone = detailData?.supportPhone || activeWorkspace?.supportPhone || activeWorkspace?.operatorContactPhone || '';
  const entryInstructions = detailData?.entryInstructions || activeWorkspace?.entryInstructions || '';
  const rawBookingMode = detailData?.bookingConfirmationMode || activeWorkspace?.bookingConfirmationMode || 'INSTANT';
  const bookingModeLabel = {
    INSTANT: 'Instant Booking (Tự động xác nhận)',
    MANUAL: 'Host Approval (Chờ Organizer duyệt)'
  }[String(rawBookingMode).toUpperCase()] || String(rawBookingMode);

  const organizerName = (typeof detailObj?.organizerName === 'string' ? detailObj.organizerName : '') || detailData?.organizerLegalName || activeWorkspace?.organizerLegalName || 'Alex Nguyen';
  const organizerId = detailData?.organizerId || activeWorkspace?.organizerId;
  const operatingHours = detailData?.operatingHours || activeWorkspace?.operatingHoursList || [];

  useEffect(() => {
    if (isOpen && activeWorkspace) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen, activeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus?.({ preventScroll: true });
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-50 transition-opacity'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-over Container */}
      <aside
        role='dialog'
        aria-label={`Workspace Details for ${name}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[680px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Top Sticky Header */}
        <div className='border-b border-border bg-card select-none shrink-0'>
          <div className='px-6 py-4 flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground'>
                HUB #{targetId}
              </span>

              {activeWorkspace?.status === 'pending' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-amber-500' aria-hidden='true'></span>
                  Pending (Đang xử lý)
                </span>
              )}
              {activeWorkspace?.status === 'maintenance' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-indigo-500' aria-hidden='true'></span>
                  Maintenance (Đang bảo trì)
                </span>
              )}
              {activeWorkspace?.status === 'draft' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'>
                  <span className='w-1.5 h-1.5 rounded-full bg-slate-400' aria-hidden='true'></span>
                  Draft (Bản nháp)
                </span>
              )}
              {activeWorkspace?.status === 'active' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
                  Active &amp; Bookable (Đang hoạt động)
                </span>
              )}
              {activeWorkspace?.status === 'suspended' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-rose-500' aria-hidden='true'></span>
                  Suspended (Đình chỉ)
                </span>
              )}
            </div>

            <div className='flex items-center gap-1.5'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 text-muted-foreground hover:text-foreground'
                aria-label='Expand to fullscreen'
              >
                <Maximize2 className='size-4' aria-hidden='true' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='size-8 text-muted-foreground hover:text-foreground'
                aria-label='Close drawer'
              >
                <X className='size-4' aria-hidden='true' />
              </Button>
            </div>
          </div>

          {/* Facility Title & Subtitle */}
          <div className='px-6 pb-4'>
            <h2 className='text-lg sm:text-xl font-bold font-heading text-foreground tracking-tight'>
              {name}
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Submitted by <strong className='text-foreground font-semibold'>{organizerName}</strong>
              {organizerId ? ` (ID: ${organizerId})` : ''} • {activeWorkspace?.submittedAt || 'Mới cập nhật'}
            </p>
          </div>

          {/* Tabs Navigation */}
          <div
            role='tablist'
            aria-label='Workspace details tabs'
            className='px-6 flex gap-6 text-xs font-semibold border-t border-border overflow-x-auto'
          >
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              className={`py-3 border-b-2 transition-all shrink-0 ${
                activeTab === 'general'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              General Info (Thông tin chung)
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'media'}
              onClick={() => setActiveTab('media')}
              className={`py-3 border-b-2 transition-all shrink-0 ${
                activeTab === 'media'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Amenities &amp; Media ({effectiveGallery.length} ảnh • {effectiveAmenities.length} tiện ích)
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'floor'}
              onClick={() => setActiveTab('floor')}
              className={`py-3 border-b-2 transition-all shrink-0 ${
                activeTab === 'floor'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Floor Plan &amp; Rates (Mặt bằng &amp; Giá)
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'audit'}
              onClick={() => setActiveTab('audit')}
              className={`py-3 border-b-2 transition-all shrink-0 ${
                activeTab === 'audit'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Review &amp; Governance (Kiểm duyệt)
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {isLoadingDetail && !activeWorkspace && (
            <div className='p-12 text-center flex flex-col items-center justify-center gap-2'>
              <RefreshCw className='size-6 animate-spin text-primary' />
              <p className='text-xs text-muted-foreground'>Đang tải thông tin chi tiết không gian làm việc...</p>
            </div>
          )}

          {activeTab === 'general' && (
            <>
              {/* SECTION: GENERAL OVERVIEW & DESCRIPTION */}
              <section aria-label='General Overview' className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <Info className='size-3.5 text-primary' aria-hidden='true' />
                    Mô tả &amp; Thông số cơ bản
                  </h3>
                  <div className='flex items-center gap-1.5'>
                    <Badge variant='outline' className='text-[10px] font-semibold bg-primary/10 text-primary border-primary/20'>
                      {categoryLabel}
                    </Badge>
                  </div>
                </div>

                {description ? (
                  <div className='p-3.5 rounded-xl border border-border bg-muted/40 text-xs leading-relaxed text-foreground whitespace-pre-line'>
                    {description}
                  </div>
                ) : (
                  <div className='p-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground italic'>
                    Chưa có phần giới thiệu mô tả cho không gian này.
                  </div>
                )}

                {entryInstructions && (
                  <div className='p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs'>
                    <div className='font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-1'>
                      <Car className='size-3.5' aria-hidden='true' />
                      <span>Hướng dẫn ra vào &amp; Gửi xe</span>
                    </div>
                    <p className='text-indigo-900/90 dark:text-indigo-200/90 leading-relaxed whitespace-pre-line'>
                      {entryInstructions}
                    </p>
                  </div>
                )}

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1'>
                  <div className='p-3 rounded-lg border border-border bg-card text-xs'>
                    <span className='text-[11px] text-muted-foreground block'>Số lượng Booking</span>
                    <span className='font-bold font-mono text-foreground mt-0.5 block'>
                      {(detailData?.bookingCount ?? detailData?.totalBookings ?? activeWorkspace?.bookingCount ?? 0).toLocaleString('en-US')} lượt đặt
                    </span>
                  </div>
                  <div className='p-3 rounded-lg border border-border bg-card text-xs'>
                    <span className='text-[11px] text-muted-foreground block'>Hình thức xác nhận đặt chỗ</span>
                    <span className='font-semibold text-foreground mt-0.5 block'>{bookingModeLabel}</span>
                  </div>
                  <div className='p-3 rounded-lg border border-border bg-card text-xs'>
                    <span className='text-[11px] text-muted-foreground block'>Hotline hỗ trợ trực tiếp</span>
                    <span className='font-semibold font-mono text-foreground mt-0.5 block'>
                      {supportPhone || 'Chưa cung cấp'}
                    </span>
                  </div>
                </div>
              </section>

              {/* SECTION: LOCATION & FACILITY SPECS */}
              <section aria-label='Location & Specs' className='space-y-4 pt-2'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <MapPin className='size-3.5 text-primary' aria-hidden='true' />
                    Vị trí &amp; Tọa độ bản đồ
                  </h3>
                  <span className='font-mono text-[10px] text-muted-foreground'>{activeWorkspace?.coordinates}</span>
                </div>

                <div className='rounded-xl border border-border bg-muted/40 p-3.5 space-y-3 relative overflow-hidden'>
                  <WorkspaceGoongMap
                    latitude={mapLat}
                    longitude={mapLng}
                    venueName={name}
                    streetAddress={fullAddress}
                    height={220}
                    className='w-full'
                  />

                  <div className='space-y-2 text-xs'>
                    <div>
                      <span className='text-[11px] text-muted-foreground'>Địa chỉ vật lý</span>
                      <div className='font-medium text-foreground mt-0.5'>{fullAddress}</div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60'>
                      <div>
                        <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                          <Clock className='size-3 text-muted-foreground' aria-hidden='true' />
                          Tiếp tân &amp; Quản lý tòa nhà
                        </span>
                        <div className='font-medium text-foreground mt-0.5'>{activeWorkspace?.receptionHours}</div>
                      </div>
                      <div>
                        <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                          <Radio className='size-3 text-primary' aria-hidden='true' />
                          Phương thức vào cửa
                        </span>
                        <div className='font-medium text-primary mt-0.5'>{activeWorkspace?.accessMethod}</div>
                      </div>
                    </div>

                    <div className='pt-2 border-t border-border/60'>
                      <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                        <Phone className='size-3 text-muted-foreground' aria-hidden='true' />
                        Người đại diện phụ trách
                      </span>
                      <div className='font-medium text-foreground mt-0.5'>
                        {organizerName} •{' '}
                        <span className='font-mono text-muted-foreground'>{supportPhone || activeWorkspace?.operatorContactPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: AMENITIES HIGHLIGHTS PREVIEW */}
              <section aria-label='Amenities Highlights' className='space-y-2.5 pt-2'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <Sparkles className='size-3.5 text-primary' aria-hidden='true' />
                    Tiện ích &amp; Cơ sở vật chất ({effectiveAmenities.length})
                  </h3>
                  <button
                    type='button'
                    onClick={() => setActiveTab('media')}
                    className='text-[11px] text-primary hover:underline font-medium cursor-pointer'
                  >
                    Xem chi tiết ({effectiveAmenities.length}) &rarr;
                  </button>
                </div>

                {isLoadingAmenities ? (
                  <div className='p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
                    <RefreshCw className='size-3.5 animate-spin text-primary' />
                    <span>Đang tải tiện ích không gian...</span>
                  </div>
                ) : effectiveAmenities.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {effectiveAmenities.map((am) => (
                      <span
                        key={am.id || am.name}
                        className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-card text-foreground border border-border shadow-2xs'
                      >
                        <AmenityIconHelper icon={am.icon} category={am.category} className='size-3 text-primary' />
                        <span>{am.name}</span>
                        {am.complimentary || am.isComplimentary ? (
                          <span className='text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'>
                            Miễn phí
                          </span>
                        ) : am.addonPricePerHour ? (
                          <span className='text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono'>
                            +{am.addonPricePerHour} VND/h
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className='p-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground italic'>
                    Chưa có tiện ích nào được gán cho không gian này.
                  </div>
                )}
              </section>

              {/* Operating Hours schedule if configured */}
              {operatingHours && operatingHours.length > 0 && (
                <section aria-label='Operating Hours' className='space-y-2 pt-2'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <Clock className='size-3.5 text-primary' aria-hidden='true' />
                    Lịch mở cửa hàng tuần
                  </h3>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono'>
                    {operatingHours.map((h, i) => (
                      <div key={i} className='flex items-center justify-between p-2 rounded-lg bg-card border border-border'>
                        <span className='text-muted-foreground font-sans text-[11px]'>
                          {DAY_NAMES[h.dayOfWeek % 7] || `Ngày ${h.dayOfWeek}`}
                        </span>
                        <span className='font-semibold text-foreground text-[11px]'>
                          {h.isClosed ? 'Đóng cửa' : h.is24Hours ? 'Mở cửa 24/24' : `${h.openTime} – ${h.closeTime}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION: FACILITY MEDIA VERIFICATION */}
              <section aria-label='Media Verification' className='space-y-3 pt-2'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <ImageIcon className='size-3.5 text-primary' aria-hidden='true' />
                    Hình ảnh không gian ({effectiveGallery.length})
                  </h3>
                  <span className='text-[11px] text-muted-foreground font-semibold'>
                    {effectiveGallery.length > 0 ? `${effectiveGallery.length} ảnh đã tải lên` : 'Chưa có ảnh'}
                  </span>
                </div>

                {effectiveGallery.length > 0 ? (
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
                    {effectiveGallery.map((img) => (
                      <button
                        type='button'
                        key={img.id}
                        onClick={() => img.url && setPreviewImageUrl({ url: img.url, label: img.label })}
                        className='group relative rounded-lg border border-border overflow-hidden bg-slate-900 aspect-[16/10] cursor-pointer hover:border-primary transition-all shadow-xs text-left p-0'
                      >
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.label}
                            className='w-full h-full object-cover transition-transform duration-200 group-hover:scale-105'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
                            <ImageIcon className='size-6 opacity-40' />
                          </div>
                        )}
                        <div className='absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-between p-2'>
                          <div className='flex justify-between items-start'>
                            {img.label.includes('Cover') && (
                              <span className='px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-600 text-white'>
                                COVER
                              </span>
                            )}
                          </div>
                          <div className='text-[10px] text-white font-medium truncate flex items-center justify-between'>
                            <span>{img.label}</span>
                            <Eye className='size-3 opacity-0 group-hover:opacity-100 transition-opacity' />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground'>
                    <ImageIcon className='size-6 mx-auto mb-1.5 opacity-40' />
                    <span>Không gian này chưa có ảnh tải lên trong hệ thống.</span>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'media' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                  <ImageIcon className='size-3.5 text-primary' />
                  Toàn bộ hồ sơ hình ảnh ({effectiveGallery.length} ảnh)
                </h3>
                <span className='text-[11px] text-muted-foreground'>Nhấn vào ảnh để xem kích thước lớn</span>
              </div>

              {effectiveGallery.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {effectiveGallery.map((item) => (
                    <button
                      type='button'
                      key={item.id}
                      onClick={() => item.url && setPreviewImageUrl({ url: item.url, label: item.label })}
                      className='p-3 rounded-xl border border-border bg-card space-y-2 cursor-pointer hover:border-primary/60 transition-all shadow-2xs group text-left w-full'
                    >
                      <div className='h-36 rounded-lg bg-slate-950 overflow-hidden relative flex items-center justify-center'>
                        {item.url ? (
                          <img
                            src={item.url}
                            alt={item.label}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                          />
                        ) : (
                          <ImageIcon className='size-8 text-muted-foreground/40' />
                        )}
                        <div className='absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-white text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Eye className='size-3' />
                          <span>Xem ảnh lớn</span>
                        </div>
                      </div>
                      <div className='flex items-center justify-between text-xs'>
                        <strong className='text-foreground truncate max-w-[200px]'>{item.label}</strong>
                        {item.label.includes('Cover') && (
                          <Badge className='text-[10px] bg-indigo-600 text-white'>Ảnh bìa chính</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className='p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground'>
                  <ImageIcon className='size-8 mx-auto mb-2 opacity-40' />
                  <p className='font-semibold text-foreground'>Chưa có ảnh nào được tải lên</p>
                  <p className='text-[11px] text-muted-foreground mt-1'>Thư viện hình ảnh của không gian làm việc này đang trống.</p>
                </div>
              )}

              {/* Feature Tags & Amenities Detailed Section */}
              <div className='pt-4 space-y-3 border-t border-border'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <Sparkles className='size-3.5 text-primary' />
                    Tiện ích &amp; Cơ sở vật chất đã chọn ({effectiveAmenities.length})
                  </h4>
                  <Badge variant='outline' className='text-[10px] font-mono'>
                    {effectiveAmenities.length} tiện ích
                  </Badge>
                </div>

                {isLoadingAmenities ? (
                  <div className='p-8 rounded-xl border border-border bg-card flex items-center justify-center gap-2 text-xs text-muted-foreground'>
                    <RefreshCw className='size-4 animate-spin text-primary' />
                    <span>Đang tải danh sách tiện ích từ máy chủ...</span>
                  </div>
                ) : effectiveAmenities.length > 0 ? (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                    {effectiveAmenities.map((am) => (
                      <div
                        key={am.id || am.name}
                        className='p-3 rounded-xl border border-border bg-card space-y-1.5 shadow-2xs hover:border-primary/50 transition-colors'
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex items-center gap-2 min-w-0'>
                            <div className='size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                              <AmenityIconHelper icon={am.icon} category={am.category} className='size-3.5' />
                            </div>
                            <span className='font-semibold text-xs text-foreground truncate'>{am.name}</span>
                          </div>
                          {am.complimentary || am.isComplimentary ? (
                            <Badge
                              variant='secondary'
                              className='text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0 font-medium'
                            >
                              Miễn phí
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className='text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 shrink-0 font-mono'
                            >
                              +{am.addonPricePerHour || 0} VND/h
                            </Badge>
                          )}
                        </div>
                        {am.description && (
                          <p className='text-[11px] text-muted-foreground leading-relaxed pl-9 line-clamp-2'>
                            {am.description}
                          </p>
                        )}
                        <div className='pl-9 flex items-center gap-2 text-[10px] text-muted-foreground'>
                          <span className='px-1.5 py-0.2 rounded bg-muted font-mono uppercase text-[9px]'>
                            {am.category || 'TECH'}
                          </span>
                          {am.amenityId && <span>ID: #{am.amenityId}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground'>
                    <Sparkles className='size-6 mx-auto mb-1.5 opacity-40' />
                    <span>Không gian này chưa được gán tiện ích hoặc cơ sở vật chất nào.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'floor' && (
            <div className='space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                <Layers className='size-3.5 text-primary' />
                Sơ đồ mặt bằng, Quy mô &amp; Biểu phí
              </h3>

              <div className='p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs'>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Chỗ ngồi linh hoạt (Hot Desks)</span>
                  <strong className='text-foreground'>
                    {activeWorkspace?.capacityDesks && activeWorkspace.capacityDesks > 0
                      ? `${activeWorkspace.capacityDesks} chỗ ngồi`
                      : 'Chưa thiết lập'}
                  </strong>
                </div>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Phòng họp (Meeting Rooms)</span>
                  <strong className='text-foreground'>
                    {activeWorkspace?.meetingRooms && activeWorkspace.meetingRooms > 0
                      ? `${activeWorkspace.meetingRooms} phòng`
                      : 'Chưa thiết lập'}
                  </strong>
                </div>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Buồng cách âm (Focus &amp; Phone Pods)</span>
                  <strong className='text-foreground'>
                    {activeWorkspace?.focusPods && activeWorkspace.focusPods > 0
                      ? `${activeWorkspace.focusPods} buồng`
                      : 'Chưa thiết lập'}
                  </strong>
                </div>
                {activeWorkspace?.pricePerHour ? (
                  <div className='flex justify-between py-1.5 border-b border-border'>
                    <span className='text-muted-foreground'>Đơn giá theo giờ</span>
                    <strong className='text-foreground font-mono'>{activeWorkspace.pricePerHour.toLocaleString()} VND / giờ</strong>
                  </div>
                ) : null}
                {activeWorkspace?.pricePerDay ? (
                  <div className='flex justify-between py-1.5 border-b border-border'>
                    <span className='text-muted-foreground'>Đơn giá theo ngày</span>
                    <strong className='text-foreground font-mono'>{activeWorkspace.pricePerDay.toLocaleString()} VND / ngày</strong>
                  </div>
                ) : null}
              </div>

              {activeWorkspace?.floorsList && activeWorkspace.floorsList.length > 0 ? (
                <div className='space-y-2 pt-2'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Layers className='size-3.5' aria-hidden='true' />
                    Phân bổ tầng ({activeWorkspace.floorsList.length} tầng)
                  </h4>
                  <div className='space-y-2'>
                    {activeWorkspace.floorsList.map((flp) => (
                      <div key={flp.id} className='p-3 rounded-lg border border-border bg-card flex justify-between items-center text-xs'>
                        <div>
                          <span className='font-semibold text-foreground'>{flp.name}</span>
                          <span className='text-muted-foreground ml-2 text-[11px]'>(Tầng {flp.floorNumber})</span>
                        </div>
                        <div className='text-muted-foreground text-[11px] font-mono'>
                          {flp.totalDesks || 0} Chỗ • {flp.totalRooms || 0} Phòng
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-indigo-900 dark:text-indigo-200 space-y-1'>
                  <p className='font-semibold flex items-center gap-1.5'>
                    <Info className='size-3.5' />
                    Chưa thiết lập sơ đồ phân tầng chi tiết
                  </p>
                  <p className='opacity-90 leading-relaxed'>
                    Không gian này hiện tại chưa bổ sung sơ đồ mặt bằng chi tiết theo từng tầng (Bước O10). Admin có thể thẩm định trước thông tin cơ sở hạ tầng hoặc yêu cầu bổ sung qua ghi chú kiểm duyệt.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className='space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                <FileText className='size-3.5 text-primary' aria-hidden='true' />
                Thông tin thẩm định &amp; Quản trị đối tác
              </h3>
              <div className='p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs'>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Đơn vị / Đối tác Organizer</span>
                  <span className='font-semibold text-foreground'>{organizerName}</span>
                </div>
                {organizerId && (
                  <div className='flex items-center justify-between py-1 border-b border-border'>
                    <span className='text-muted-foreground'>Mã định danh đối tác (Organizer ID)</span>
                    <span className='font-mono font-semibold text-foreground'>#{organizerId}</span>
                  </div>
                )}
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Mã số thuế / Đăng ký kinh doanh</span>
                  <span className='font-mono text-foreground'>{activeWorkspace?.organizerTaxId || 'Chưa cung cấp'}</span>
                </div>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Trạng thái hồ sơ thẩm định</span>
                  <span className='font-semibold text-amber-600 dark:text-amber-400'>
                    {activeWorkspace?.reviewStatus === 'Pending' ? 'Chờ kiểm duyệt (Pending)' : activeWorkspace?.reviewStatus}
                  </span>
                </div>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Thời điểm nộp hồ sơ</span>
                  <span className='text-foreground'>{activeWorkspace?.submittedAt || 'Chưa ghi nhận'}</span>
                </div>
                {activeWorkspace?.reviewedBy && (
                  <div className='flex items-center justify-between py-1 border-b border-border'>
                    <span className='text-muted-foreground'>Người duyệt gần nhất</span>
                    <span className='font-mono text-foreground'>{activeWorkspace.reviewedBy}</span>
                  </div>
                )}
                {activeWorkspace?.reviewedAt && (
                  <div className='flex items-center justify-between py-1 border-b border-border'>
                    <span className='text-muted-foreground'>Thời gian phê duyệt gần nhất</span>
                    <span className='text-muted-foreground'>{new Date(activeWorkspace.reviewedAt).toLocaleString()}</span>
                  </div>
                )}
                {activeWorkspace?.reviewFeedback && (
                  <div className='py-1 border-b border-border'>
                    <span className='text-muted-foreground block mb-0.5'>Ghi chú phản hồi duyệt gần nhất:</span>
                    <span className='text-foreground'>{activeWorkspace.reviewFeedback}</span>
                  </div>
                )}
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Tình trạng điều hành (Moderation)</span>
                  <span className={`font-semibold ${activeWorkspace?.moderationStatus === 'Suspended' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {activeWorkspace?.moderationStatus === 'Suspended' ? 'Đang đình chỉ (Suspended)' : 'Bình thường (Normal)'}
                  </span>
                </div>
                <div className='flex items-center justify-between py-1'>
                  <span className='text-muted-foreground'>Phiên bản dữ liệu (OCC Version)</span>
                  <span className='font-mono text-foreground font-semibold'>v{activeWorkspace?.version || 1}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        {activeWorkspace && (
          <div className='border-t border-border bg-card p-4 space-y-3 shrink-0'>
            <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground justify-between'>
              <span>
                Canonical Hub: <strong className='font-mono text-foreground'>#{targetId}</strong> • Version: <strong className='font-mono text-foreground'>v{activeWorkspace.version}</strong>
              </span>
              <span className='text-[10px] text-muted-foreground'>
                Status: {activeWorkspace.status} • Auto-Approval Enabled
              </span>
            </div>

            <div className='flex items-center gap-3'>
              {activeWorkspace.status === 'active' && (
                <div className='flex items-center gap-2 w-full'>
                  <Button
                    type='button'
                    variant={activeWorkspace.featuredOrder ? 'default' : 'outline'}
                    disabled={isSubmitting}
                    onClick={() => onToggleFeatured?.(activeWorkspace)}
                    className={`flex-1 h-10 text-xs font-semibold ${
                      activeWorkspace.featuredOrder
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                    }`}
                  >
                    <Star className={`size-3.5 mr-1.5 ${activeWorkspace.featuredOrder ? 'fill-white text-white' : ''}`} aria-hidden='true' />
                    <span>{activeWorkspace.featuredOrder ? `Featured (#${activeWorkspace.featuredOrder})` : 'Feature on Marketplace'}</span>
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={isSubmitting}
                    onClick={() => {
                      setSuspendReasonInput('');
                      setIsSuspendModalOpen(true);
                    }}
                    className='flex-1 h-10 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-xs font-semibold'
                  >
                    <AlertTriangle className='size-3.5 mr-1.5' aria-hidden='true' />
                    <span>Suspend Listing</span>
                  </Button>
                </div>
              )}

              {activeWorkspace.status === 'suspended' && (
                <Button
                  type='button'
                  disabled={isSubmitting}
                  onClick={() => onToggleSuspend(activeWorkspace)}
                  className='w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
                >
                  <CheckCircle2 className='size-3.5 mr-1.5' aria-hidden='true' />
                  <span>{isSubmitting ? 'Restoring...' : 'Restore to Active Marketplace'}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Full-size Image Lightbox Modal */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className='max-w-3xl p-4 overflow-hidden bg-card border border-border'>
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base font-semibold truncate'>
              {previewImageUrl?.label || 'Xem ảnh cơ sở vật chất'}
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              Hồ sơ hình ảnh xác thực thẩm định của {name}
            </DialogDescription>
          </DialogHeader>

          {previewImageUrl && (
            <div className='relative my-3 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center max-h-[68vh]'>
              <img
                src={previewImageUrl.url}
                alt={previewImageUrl.label}
                className='w-full h-auto max-h-[68vh] object-contain'
              />
            </div>
          )}

          <DialogFooter className='flex justify-end pt-2 border-t border-border'>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={() => setPreviewImageUrl(null)}
              className='h-8 text-xs px-4'
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      {activeWorkspace && (
        <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
          <DialogContent className='max-w-md bg-card border border-border shadow-xl'>
            <DialogHeader className='space-y-2'>
              <div className='w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center justify-center'>
                <AlertTriangle className='size-5' aria-hidden='true' />
              </div>
              <DialogTitle className='text-base font-bold font-heading text-foreground'>
                Suspend Workspace Listing
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Please specify the reason for suspending <strong>{activeWorkspace.name}</strong> ({activeWorkspace.id}). The workspace will be immediately hidden from the customer marketplace.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-2 py-2'>
              <label htmlFor='suspendReason' className='text-xs font-semibold text-foreground'>
                Suspension Reason (Required, min 5 chars)
              </label>
              <Textarea
                id='suspendReason'
                value={suspendReasonInput}
                onChange={(e) => setSuspendReasonInput(e.target.value)}
                placeholder='e.g., Immediate safety audit due to noisy machinery complaint or unverified lease extension...'
                rows={3}
                className='text-xs bg-background'
              />
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsSuspendModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                size='sm'
                disabled={isSubmitting || suspendReasonInput.trim().length < 5}
                onClick={() => {
                  if (suspendReasonInput.trim().length < 5) {
                    toast.error('Suspension Reason Required', {
                      description: 'Please provide at least 5 characters explaining the reason for suspension.'
                    });
                    return;
                  }
                  setIsSuspendModalOpen(false);
                  onToggleSuspend(activeWorkspace, suspendReasonInput.trim());
                }}
                className='bg-rose-600 hover:bg-rose-700 text-white font-semibold'
              >
                Confirm Suspension
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
