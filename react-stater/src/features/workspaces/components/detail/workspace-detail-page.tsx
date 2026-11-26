import { WorkspaceHolidayNotice } from './workspace-holiday-notice';
import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { WorkspaceGallery } from './workspace-gallery';
import { WorkspaceInfo } from './workspace-info';
import { WorkspaceBookingCard } from './workspace-booking-card';
import {
  usePublicWorkspaceDetailQuery,
  useWorkspaceMediaQuery,
  useWorkspaceAmenitiesQuery
} from '../../api/queries';
import { useWorkspaceAvailabilityQuery, bookingKeys } from '../../api/booking-queries';
import type { ResourceAvailabilityItem } from '../../api/booking-types';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  DateTimePickerModal,
  type ScheduleSelection,
  parseTimeToMinutes
} from './date-time-picker-modal';
import type { CustomerFloor, MapResource, SpaceFilterType } from './public-floor-map';
import { AlertCircle, ArrowLeft } from '@/components/ui/hugeicons';
import { cn } from '@/lib/utils';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { backendRequest } from '@/features/auth/api/session';
import { toast } from 'sonner';
import { useCurrentPendingBooking } from '@/features/payments/api';
import { useRealtimeResourceStatus } from '@/features/resource-availability';

interface WorkspaceDetailPageProps {
  workspaceId?: string;
}

type SectionId = 'overview' | 'spaces-floor-map' | 'amenities' | 'location' | 'reviews';

const SECTION_IDS: SectionId[] = [
  'overview',
  'spaces-floor-map',
  'amenities',
  'location',
  'reviews'
];

function getDefaultSchedule(): ScheduleSelection {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const monthNum = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const isoDate = `${year}-${monthNum}-${day}`;
  const dayOfWeek = tomorrow.getDay();
  return {
    date: `${day}/${monthNum}/${year}`,
    day: dayOfWeek,
    startTime: '09:00',
    endTime: '13:00',
    durationHours: 4,
    isoDate,
    isoStartTime: `${isoDate}T09:00:00`,
    isoEndTime: `${isoDate}T13:00:00`
  };
}

export function WorkspaceDetailPage({
  workspaceId: propWorkspaceId
}: WorkspaceDetailPageProps = {}) {
  const params = useParams({ strict: false }) as { workspaceId?: string };
  const workspaceId = propWorkspaceId || params.workspaceId || '1';

  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: holdData } = useCurrentPendingBooking();

  const { data: workspace, isLoading, isError } = usePublicWorkspaceDetailQuery(workspaceId);

  const { data: mediaItems = [] } = useWorkspaceMediaQuery(workspaceId);
  const { data: amenitiesList = [] } = useWorkspaceAmenitiesQuery(workspaceId);

  const [schedule, setSchedule] = useState<ScheduleSelection | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    const startTime = params.get('startTime');
    const endTime = params.get('endTime');
    const isoStartTime = params.get('isoStartTime');
    const isoEndTime = params.get('isoEndTime');
    if (date && startTime && endTime) {
      let durationHours = 1;
      try {
        const startM = parseTimeToMinutes(startTime);
        const endM = parseTimeToMinutes(endTime);
        const diffM = endM > startM ? endM - startM : endM + 1440 - startM;
        const actualMinutes =
          isoStartTime && isoEndTime
            ? (+new Date(isoEndTime) - +new Date(isoStartTime)) / 60000
            : diffM;
        durationHours = Math.max(0.5, Math.round((actualMinutes / 60) * 100) / 100);
      } catch {
        durationHours = 1;
      }
      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        durationHours = 1;
      }
      return {
        date,
        day: 1,
        startTime,
        endTime,
        durationHours,
        isoDate: date,
        isoStartTime: isoStartTime || undefined,
        isoEndTime: isoEndTime || undefined,
        priceType: params.get('priceType') === 'DAILY' ? 'DAILY' : 'HOURLY'
      };
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !schedule) return;
    const url = new URL(window.location.href);
    if (schedule.date) url.searchParams.set('date', schedule.date);
    if (schedule.startTime) url.searchParams.set('startTime', schedule.startTime);
    if (schedule.endTime) url.searchParams.set('endTime', schedule.endTime);
    if (schedule.isoStartTime) url.searchParams.set('isoStartTime', schedule.isoStartTime);
    if (schedule.priceType) url.searchParams.set('priceType', schedule.priceType);
    if (schedule.isoEndTime) url.searchParams.set('isoEndTime', schedule.isoEndTime);
    window.history.replaceState({}, '', url.toString());
  }, [schedule]);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loadedFloors, setLoadedFloors] = useState<CustomerFloor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | undefined>();
  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null);
  const [filterCategory, setFilterCategory] = useState<SpaceFilterType>('ALL');
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  const numericWorkspaceId = Number(workspaceId) || 1;

  // Nạp danh sách tầng trực tiếp từ cache React Query dùng chung
  const { data: directFloors } = useQuery({
    queryKey: ['public-floor-maps', numericWorkspaceId],
    enabled: Number.isSafeInteger(numericWorkspaceId) && numericWorkspaceId > 0,
    queryFn: ({ signal }) =>
      backendRequest<CustomerFloor[]>(
        `/public/workspaces/${numericWorkspaceId}/floor-maps`,
        'GET',
        undefined,
        false,
        signal
      ),
    refetchInterval: 3000,
    refetchOnWindowFocus: false
  });

  const floors = useMemo(() => {
    if (directFloors && directFloors.length > 0) return directFloors;
    return loadedFloors;
  }, [directFloors, loadedFloors]);

  useEffect(() => {
    if (floors.length > 0 && activeFloorId === undefined) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  // Fetch real-time resource availability for the whole workspace (all floors) when date/time is chosen
  const { data: availabilityList } = useWorkspaceAvailabilityQuery(
    numericWorkspaceId,
    schedule?.isoStartTime,
    schedule?.isoEndTime
  );

  // Hook kết nối SSE để tự động cập nhật khả dụng tức thời khi có người giữ chỗ hoặc trả chỗ
  useRealtimeResourceStatus(numericWorkspaceId, {
    enabled: Boolean(numericWorkspaceId),
    onResourceChange: () => {
      queryClient.invalidateQueries({
        queryKey: bookingKeys.availability(
          numericWorkspaceId,
          schedule?.isoStartTime ?? '',
          schedule?.isoEndTime ?? ''
        )
      });
      queryClient.invalidateQueries({
        queryKey: ['public-floor-maps', numericWorkspaceId]
      });
    }
  });

  const availabilityMap = useMemo(() => {
    const map = new Map<number, ResourceAvailabilityItem>();
    if (Array.isArray(availabilityList)) {
      for (const item of availabilityList) {
        map.set(item.resourceId, item);
      }
    }
    return map;
  }, [availabilityList]);

  // Update document title dynamically when workspace loads
  useEffect(() => {
    if (workspace?.name) {
      document.title = `${workspace.name} | NexSpace`;
    }
  }, [workspace?.name]);

  // Handle floor list loaded from PublicFloorMap
  const handleFloorListLoaded = useCallback(
    (incomingFloors: CustomerFloor[]) => {
      setLoadedFloors(incomingFloors);
      if (incomingFloors.length > 0 && activeFloorId === undefined) {
        setActiveFloorId(incomingFloors[0].id);
      }
    },
    [activeFloorId]
  );

  // Scroll-spy for Sticky Section Navigation
  useEffect(() => {
    if (isLoading || isError || !workspace) return;

    const handleScroll = () => {
      const scrollThreshold = window.scrollY + 180;
      let currentSection: SectionId = 'overview';

      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const offsetTop = el.offsetTop;
          if (scrollThreshold >= offsetTop) {
            currentSection = id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, isError, workspace]);

  const scrollToSection = useCallback((id: string) => {
    if (SECTION_IDS.includes(id as SectionId)) {
      setActiveSection(id as SectionId);
    }
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 124;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const handleContinueWithResource = useCallback(
    (resource: MapResource, floorId?: number) => {
      if (!schedule) {
        toast.warning(
          language === 'vi'
            ? 'Vui lòng chọn ngày và khung giờ đặt chỗ trước khi chọn vị trí!'
            : 'Please select a date and time slot before choosing a space!'
        );
        setIsDatePickerOpen(true);
        return;
      }

      const avail = availabilityMap?.get(resource.id);
      const isHeldByMe = Boolean(
        avail?.isOccupiedByMe ||
        (holdData?.resourceId && Number(holdData.resourceId) === Number(resource.id))
      );
      const isLocked = (avail?.state === 'LOCKED' || avail?.state === 'HOLDING') && !isHeldByMe;
      const isBooked = avail?.state === 'BOOKED';
      const isMaintenance = avail?.state === 'MAINTENANCE';

      if (isLocked) {
        toast.warning(
          language === 'vi'
            ? `Vị trí ${resource.name || resource.code} đang được người khác giữ chỗ trong khung giờ này.`
            : `Space ${resource.name || resource.code} is currently held by someone else in this timeframe.`
        );
        return;
      }

      if (isBooked) {
        toast.warning(
          language === 'vi'
            ? `Vị trí ${resource.name || resource.code} đã có người đặt trong khung giờ này.`
            : `Space ${resource.name || resource.code} is already booked in this timeframe.`
        );
        return;
      }

      if (isMaintenance) {
        toast.warning(
          language === 'vi'
            ? `Vị trí ${resource.name || resource.code} hiện đang bảo trì trong khung giờ này.`
            : `Space ${resource.name || resource.code} is currently under maintenance in this timeframe.`
        );
        return;
      }

      setSelectedResource(resource);
      navigate({
        to: '/workspaces/seats',
        search: {
          workspaceId: numericWorkspaceId,
          priceType: schedule?.priceType ?? 'HOURLY',
          date: schedule?.date,
          startTime: schedule?.isoStartTime || schedule?.startTime,
          endTime: schedule?.isoEndTime || schedule?.endTime,
          floorId: floorId ?? activeFloorId,
          resourceId: resource.id
        }
      });
    },
    [navigate, numericWorkspaceId, schedule, activeFloorId, availabilityMap, holdData, language]
  );

  const navItems: Array<{ id: SectionId; label: string }> = [
    {
      id: 'overview',
      label: language === 'vi' ? 'Tổng quan' : 'Overview'
    },
    {
      id: 'spaces-floor-map',
      label: language === 'vi' ? 'Chỗ ngồi & Sơ đồ' : 'Spaces & Floor Map'
    },
    {
      id: 'amenities',
      label: language === 'vi' ? 'Tiện ích' : 'Amenities'
    },
    {
      id: 'location',
      label: language === 'vi' ? 'Vị trí' : 'Location'
    },
    {
      id: 'reviews',
      label: language === 'vi' ? 'Đánh giá' : 'Reviews'
    }
  ];

  return (
    <div className='bg-slate-50/40 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col pb-24 lg:pb-0'>
      <WorkspaceHeader />

      {isLoading ? (
        <LoadingPlaceholder
          as='main'
          className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6'
        >
          <div className='space-y-3'>
            <div className='h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded' />
            <div className='h-8 w-80 bg-slate-200 dark:bg-slate-800 rounded-lg' />
            <div className='h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded' />
          </div>
          <div className='h-[300px] sm:h-[340px] w-full bg-slate-200 dark:bg-slate-800 rounded-2xl' />
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
            <div className='lg:col-span-8 space-y-6'>
              <div className='h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl' />
              <div className='h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl' />
            </div>
            <div className='hidden lg:block lg:col-span-4'>
              <div className='h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl' />
            </div>
          </div>
        </LoadingPlaceholder>
      ) : isError || !workspace ? (
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1 flex flex-col items-center justify-center text-center'>
          <div className='size-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-5'>
            <AlertCircle className='size-8' />
          </div>
          <h1 className='text-2xl font-bold text-slate-900 dark:text-white mb-2'>
            {language === 'vi' ? 'Không tìm thấy không gian' : 'Workspace Not Found'}
          </h1>
          <p className='text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6'>
            {language === 'vi'
              ? 'Không gian bạn đang tìm kiếm không tồn tại hoặc đã tạm ngừng hiển thị.'
              : 'The workspace you are looking for does not exist or is currently unavailable.'}
          </p>
          <Link
            to='/workspaces'
            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors'
          >
            <ArrowLeft className='size-4' />
            {language === 'vi' ? 'Quay lại danh sách' : 'Back to Workspaces'}
          </Link>
        </main>
      ) : (
        <main className='flex-1 w-full'>
          {/* Top Container: Breadcrumb + Header + Compact Gallery */}
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4'>
            <WorkspaceHolidayNotice workspace={workspace} />
            <WorkspaceGallery
              workspace={workspace}
              mediaItems={mediaItems}
              onScrollToSection={scrollToSection}
            />
          </div>

          {/* Sticky Section Navigation Bar - Contained within layout (not full-bleed) */}
          <div className='sticky top-[72px] z-30 py-2 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-md transition-all'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <nav
                aria-label={
                  language === 'vi' ? 'Điều hướng chi tiết không gian' : 'Workspace sections'
                }
                className='inline-flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-full overflow-x-auto no-scrollbar'
              >
                {navItems.map((item, idx) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => scrollToSection(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') {
                          const next = navItems[(idx + 1) % navItems.length];
                          scrollToSection(next.id);
                        } else if (e.key === 'ArrowLeft') {
                          const prev = navItems[(idx - 1 + navItems.length) % navItems.length];
                          scrollToSection(prev.id);
                        }
                      }}
                      className={cn(
                        'shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap',
                        isActive
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main 2-Column Content Layout (Left ~68% / Right ~32%) */}
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7'>
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
              <WorkspaceInfo
                workspace={workspace}
                workspaceId={numericWorkspaceId}
                amenitiesList={amenitiesList}
                floors={floors}
                selectedResource={selectedResource}
                onSelectResource={(res) => {
                  if (!schedule) {
                    toast.warning(
                      language === 'vi'
                        ? 'Vui lòng chọn ngày và khung giờ đặt chỗ trước khi chọn vị trí!'
                        : 'Please select a date and time slot before choosing a space!'
                    );
                    setIsDatePickerOpen(true);
                    return;
                  }
                  if (!res || (selectedResource && selectedResource.id === res.id)) {
                    setSelectedResource(null);
                  } else {
                    setSelectedResource(res);
                  }
                }}
                activeFloorId={activeFloorId}
                onFloorChange={setActiveFloorId}
                availabilityMap={availabilityMap}
                filterCategory={filterCategory}
                onFilterCategoryChange={setFilterCategory}
                onFloorListLoaded={handleFloorListLoaded}
                onContinueWithResource={handleContinueWithResource}
                hasScheduleSelected={!!schedule}
                onRequestSelectSchedule={() => setIsDatePickerOpen(true)}
              />

              <WorkspaceBookingCard
                workspace={workspace}
                floors={floors}
                selectedResource={selectedResource}
                onClearSelectedResource={() => setSelectedResource(null)}
                activeFloorId={activeFloorId}
                schedule={schedule}
                onScheduleChange={setSchedule}
                availabilityMap={availabilityMap}
                isDatePickerOpen={isDatePickerOpen}
                onDatePickerOpenChange={setIsDatePickerOpen}
              />
            </div>
          </div>
        </main>
      )}

      <Footer />
    </div>
  );
}
