import { Spinner as Loader2 } from '@/components/ui/spinner';
import { formatDateLabel } from '@/lib/format';
import { customerResourceStatus } from '../../utils/customer-resource-status';
import { formatDate } from '@/lib/format';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { backendRequest } from '@/features/auth/api/session';
import {
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Users,
  Chair,
  Building,
  Sparkles,
  MousePointerClick,
  Map as MapIcon,
  LayoutList,
  Eye,
  ShieldAlert
} from '@/components/ui/hugeicons';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { toast } from 'sonner';
import {
  PublicFloorMap,
  type MapResource,
  type CustomerFloor,
  type SpaceFilterType,
  isResourceOffice
} from '../detail/public-floor-map';
import { SeatsListView } from './seats-list-view';
import {
  DateTimePickerModal,
  parseTimeToMinutes,
  type ScheduleSelection
} from '../detail/date-time-picker-modal';
import { usePublicWorkspaceDetailQuery } from '../../api/queries';
import { useWorkspaceAvailabilityQuery, useCreateBookingMutation } from '../../api/booking-queries';
import { useCurrentPendingBooking } from '@/features/payments/api';
import { useRealtimeResourceStatus } from '@/features/resource-availability';
import type { ResourceAvailabilityItem } from '../../api/booking-types';

export interface SeatsPageProps {
  priceType?: 'HOURLY' | 'DAILY';
  workspaceId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  floorId?: number;
  resourceId?: number;
  view?: 'map' | 'list' | '3d';
}

function computeDurationHours(startIso?: string, endIso?: string, fallback = 4): number {
  if (!startIso || !endIso) return fallback;
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    if (!isNaN(s) && !isNaN(e) && e > s) {
      const diffHours = (e - s) / (1000 * 60 * 60);
      return Math.round(diffHours * 10) / 10;
    }
    const startM = parseTimeToMinutes(startIso);
    const endM = parseTimeToMinutes(endIso);
    const diffM = endM > startM ? endM - startM : endM + 1440 - startM;
    const hours = Math.round((diffM / 60) * 10) / 10;
    if (Number.isFinite(hours) && hours > 0) return hours;
  } catch {
    // fallback
  }
  return fallback;
}

function formatTimeSlot(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    const [h, m] = timePart.split(':');
    if (h !== undefined && m !== undefined) {
      return `${h}:${m}`;
    }
  }
  return timeStr;
}

function getDefaultSchedule() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const monthNum = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const isoDate = `${year}-${monthNum}-${day}`;
  return {
    date: formatDate(tomorrow),
    startTimeStr: '09:00 AM',
    endTimeStr: '01:00 PM',
    isoStartTime: `${isoDate}T09:00:00`,
    isoEndTime: `${isoDate}T13:00:00`,
    durationHours: 4
  };
}

export function SeatsPage({
  workspaceId,
  priceType: initialPriceType = 'HOURLY',
  date,
  startTime,
  endTime,
  floorId: initialFloorId,
  resourceId: initialResourceId,
  view: initialView
}: SeatsPageProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const c = useCallback((en: string, vi: string) => (language === 'vi' ? vi : en), [language]);

  const { data: holdData } = useCurrentPendingBooking();
  const maxHoldAttempts = holdData?.maxHoldAttempts ?? 3;
  const penaltyBlockMinutes = holdData?.penaltyBlockMinutes ?? 20;
  const isHoldBlocked = Boolean(
    holdData?.isBookingSuspended ||
    (holdData?.remainingHoldAttempts !== undefined && holdData.remainingHoldAttempts <= 0)
  );

  const defaults = useMemo(() => getDefaultSchedule(), []);

  const [viewMode, setViewMode] = useState<'map' | 'list'>(initialView === 'list' ? 'list' : 'map');
  const initialDuration = useMemo(() => {
    return computeDurationHours(startTime, endTime, 4);
  }, [startTime, endTime]);

  const [currentStartTime, setCurrentStartTime] = useState<string>(
    startTime || defaults.isoStartTime
  );
  const [currentEndTime, setCurrentEndTime] = useState<string>(endTime || defaults.isoEndTime);
  const [currentDateLabel, setCurrentDateLabel] = useState<string>(
    formatDateLabel(date) || defaults.date
  );
  const [priceType, setPriceType] = useState<'HOURLY' | 'DAILY'>(initialPriceType);
  const [durationHours, setDurationHours] = useState<number>(initialDuration);

  const [activeFloorId, setActiveFloorId] = useState<number | undefined>(initialFloorId);
  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<SpaceFilterType>('ALL');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [hasManuallyDeselected, setHasManuallyDeselected] = useState(false);
  const hasScheduleSelected = Boolean(currentStartTime && currentEndTime);

  // Sync date/time from props if changed
  const [prevScheduleProps, setPrevScheduleProps] = useState({ startTime, endTime, date });
  if (
    prevScheduleProps.startTime !== startTime ||
    prevScheduleProps.endTime !== endTime ||
    prevScheduleProps.date !== date
  ) {
    setPrevScheduleProps({ startTime, endTime, date });
    if (startTime) setCurrentStartTime(startTime);
    if (endTime) setCurrentEndTime(endTime);
    if (date) setCurrentDateLabel(formatDateLabel(date));
    if (startTime && endTime) {
      setDurationHours(computeDurationHours(startTime, endTime, 4));
    }
  }

  const timeRangeLabel = useMemo(() => {
    const start = formatTimeSlot(currentStartTime);
    const end = formatTimeSlot(currentEndTime);
    if (start && end) {
      return `${start} - ${end}`;
    }
    return '';
  }, [currentStartTime, currentEndTime]);

  // 1. Fetch Workspace Details
  const { data: workspace } = usePublicWorkspaceDetailQuery(
    workspaceId ? String(workspaceId) : null
  );

  // 1.5. Fetch Floor Maps directly so both Map and List views always have full floor and resource data
  const { data: apiFloors = [] } = useQuery<CustomerFloor[]>({
    queryKey: ['public-floor-maps', workspaceId],
    refetchInterval: 3000,
    enabled: Number.isSafeInteger(workspaceId) && Number(workspaceId) > 0,
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

  const loadedFloors = useMemo(() => {
    return apiFloors.length > 0 ? apiFloors : [];
  }, [apiFloors]);

  // Sync activeFloorId when initialFloorId from URL changes
  const [prevInitialFloorId, setPrevInitialFloorId] = useState(initialFloorId);
  if (initialFloorId !== prevInitialFloorId) {
    setPrevInitialFloorId(initialFloorId);
    if (initialFloorId) {
      setActiveFloorId(initialFloorId);
    }
  }

  // Default to first floor with resources once apiFloors are loaded if not set yet
  const [prevApiFloors, setPrevApiFloors] = useState(apiFloors);
  if (apiFloors !== prevApiFloors) {
    setPrevApiFloors(apiFloors);
    if (apiFloors.length > 0 && !activeFloorId) {
      const defaultFloor = apiFloors.find((floor) => floor.resources.length > 0) ?? apiFloors[0];
      if (defaultFloor) {
        setActiveFloorId(defaultFloor.id);
      }
    }
  }

  // If initialResourceId is provided, auto-select it once floors are loaded (unless manually deselected)
  const [prevAutoSelectKey, setPrevAutoSelectKey] = useState({ initialResourceId, loadedFloors });
  if (
    prevAutoSelectKey.initialResourceId !== initialResourceId ||
    prevAutoSelectKey.loadedFloors !== loadedFloors
  ) {
    setPrevAutoSelectKey({ initialResourceId, loadedFloors });
    if (
      initialResourceId &&
      loadedFloors.length > 0 &&
      !selectedResource &&
      !hasManuallyDeselected
    ) {
      for (const fl of loadedFloors) {
        const found = fl.resources?.find((r) => r.id === initialResourceId);
        if (found) {
          setSelectedResource(found);
          if (!activeFloorId) setActiveFloorId(fl.id);
          break;
        }
      }
    }
  }

  // 2. Fetch Real-time Resource Availability
  const { data: availabilityList } = useWorkspaceAvailabilityQuery(
    workspaceId,
    currentStartTime,
    currentEndTime,
    activeFloorId,
    { enabled: Boolean(workspaceId) }
  );

  const availabilityMap = useMemo(() => {
    const map = new Map<number, ResourceAvailabilityItem>();
    if (availabilityList) {
      for (const item of availabilityList) {
        map.set(item.resourceId, item);
      }
    }
    return map;
  }, [availabilityList]);

  // Current floor resources
  const currentFloor = useMemo(() => {
    return loadedFloors.find((f) => f.id === activeFloorId) ?? loadedFloors[0];
  }, [loadedFloors, activeFloorId]);

  // Compute live counts of available resources per category
  const categoryCounts = useMemo(() => {
    const resources = currentFloor?.resources || [];
    let allAvailable = 0;
    let desksAvailable = 0;
    let meetingRoomsAvailable = 0;
    let privateOfficesAvailable = 0;

    for (const res of resources) {
      const avail = availabilityMap.get(res.id);
      const isAvailable = customerResourceStatus(res, avail).available;

      if (isAvailable) {
        allAvailable++;
        if (res.category === 'DESK') {
          desksAvailable++;
        } else if (res.category === 'ROOM') {
          if (isResourceOffice(res)) {
            privateOfficesAvailable++;
          } else {
            meetingRoomsAvailable++;
          }
        }
      }
    }

    return {
      all: allAvailable,
      desks: desksAvailable,
      meetingRooms: meetingRoomsAvailable,
      privateOffices: privateOfficesAvailable
    };
  }, [currentFloor, availabilityMap]);

  const createBookingMutation = useCreateBookingMutation();
  const { data: currentPendingBooking } = useCurrentPendingBooking();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const lastUnavailableIdRef = useRef<number | null>(null);

  // Hook kết nối SSE cập nhật khả dụng thời gian thực và tự động bỏ chọn (Auto-Deselect)
  useRealtimeResourceStatus(workspaceId, {
    enabled: Boolean(workspaceId),
    onResourceChange: (payload) => {
      if (selectedResource && selectedResource.id === payload.resourceId) {
        const isOccupiedByMe =
          (payload.customerId && currentUserId && payload.customerId === currentUserId) ||
          (currentPendingBooking && currentPendingBooking.resourceId === payload.resourceId);

        const isOccupiedStatus =
          payload.newStatus === 'HOLDING' ||
          payload.newStatus === 'BOOKED' ||
          payload.newStatus === 'BLOCKED' ||
          payload.newStatus === 'DISABLED';

        if (isOccupiedStatus && !isOccupiedByMe) {
          setSelectedResource(null);
          toast.warning(
            c(
              'The seat you selected was just held or booked by someone else. System has automatically deselected it.',
              'Rất tiếc! Chỗ vừa chọn đã được người khác giữ, hệ thống đã tự động bỏ chọn chỗ này.'
            )
          );
        }
      }
    }
  });

  // Real-time defense fallback: Khi dữ liệu availabilityMap thay đổi mà chỗ chọn bị chiếm bởi người khác
  useEffect(() => {
    if (selectedResource && availabilityMap.has(selectedResource.id)) {
      const avail = availabilityMap.get(selectedResource.id);
      const isOccupiedByMe = Boolean(
        avail?.isOccupiedByMe ||
        (currentPendingBooking?.resourceId &&
          Number(currentPendingBooking.resourceId) === Number(selectedResource.id))
      );
      if (
        (avail?.state === 'BOOKED' ||
          avail?.state === 'LOCKED' ||
          avail?.state === 'MAINTENANCE' ||
          avail?.state === 'DISABLED') &&
        !isOccupiedByMe &&
        lastUnavailableIdRef.current !== selectedResource.id
      ) {
        lastUnavailableIdRef.current = selectedResource.id;
        setSelectedResource(null);
        toast.warning(
          c(
            'The seat you selected was just held or booked by someone else. System has automatically deselected it.',
            'Rất tiếc! Chỗ vừa chọn đã được người khác giữ, hệ thống đã tự động bỏ chọn chỗ này.'
          )
        );
      }
    }
  }, [availabilityMap, selectedResource, currentPendingBooking, c]);
  const handleScheduleChange = (schedule: ScheduleSelection) => {
    if (schedule.isoStartTime && schedule.isoEndTime) {
      setCurrentStartTime(schedule.isoStartTime);
      setCurrentEndTime(schedule.isoEndTime);
      setCurrentDateLabel(schedule.date);
      setDurationHours(schedule.durationHours);
      setPriceType(schedule.priceType ?? 'HOURLY');
      setSelectedResource(null); // Reset selection on time shift
    }
  };

  const handleSelectResource = useCallback(
    (res: MapResource | null) => {
      if (!res || (selectedResource && selectedResource.id === res.id)) {
        setSelectedResource(null);
        setHasManuallyDeselected(true);
      } else {
        setSelectedResource(res);
        setHasManuallyDeselected(false);
      }
    },
    [selectedResource]
  );

  const handleFloorChange = useCallback(
    (newFloorId: number) => {
      setActiveFloorId(newFloorId);
      // If currently selected resource is not on the new floor, deselect it
      if (selectedResource) {
        const targetFloor = loadedFloors.find((f) => f.id === newFloorId);
        const existsOnNewFloor = targetFloor?.resources?.some((r) => r.id === selectedResource.id);
        if (!existsOnNewFloor) {
          setSelectedResource(null);
        }
      }
      (navigate as any)({
        to: '/workspaces/seats',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          floorId: newFloorId
        }),
        replace: true
      });
    },
    [selectedResource, loadedFloors, navigate]
  );

  const handleViewDetail = (res: MapResource) => {
    const isMatchingHold =
      currentPendingBooking &&
      Boolean(currentPendingBooking.bookingId) &&
      currentPendingBooking.resourceId === res.id &&
      (!currentPendingBooking.workspaceId || currentPendingBooking.workspaceId === workspaceId) &&
      (currentPendingBooking.remainingSeconds
        ? Number(currentPendingBooking.remainingSeconds) > 0
        : true);

    navigate({
      to: '/workspaces/seat-detail',
      search: {
        workspaceId,
        resourceId: res.id,
        floorId: activeFloorId ?? currentFloor?.id,
        date: currentDateLabel,
        startTime: currentStartTime,
        endTime: currentEndTime,
        bookingId: isMatchingHold ? (currentPendingBooking?.bookingId ?? undefined) : undefined,
        bookingCode: isMatchingHold ? (currentPendingBooking?.bookingCode ?? undefined) : undefined
      }
    });
  };

  const handleProceedToReview = async (targetResource?: MapResource) => {
    const res = targetResource || selectedResource;
    if (!workspaceId || !res) return;

    if (isHoldBlocked) {
      toast.error(
        c(
          'Your account is temporarily suspended from holding or booking spaces.',
          `Tài khoản của bạn đã dùng hết số lần giữ chỗ cho phép (${maxHoldAttempts} lần) hoặc đang bị tạm khóa. Vui lòng hoàn tất thanh toán đơn hiện tại hoặc chờ hết thời gian khóa.`
        ),
        {
          description: holdData?.bookingSuspendedUntil
            ? `Tạm khóa đến ${new Date(holdData.bookingSuspendedUntil).toLocaleTimeString('vi-VN')} (trong vòng ${penaltyBlockMinutes} phút).`
            : undefined
        }
      );
      return;
    }

    // Check if user already holds this exact resource
    const hasActiveHold =
      currentPendingBooking &&
      Boolean(currentPendingBooking.bookingId) &&
      currentPendingBooking.resourceId === res.id &&
      (!currentPendingBooking.workspaceId || currentPendingBooking.workspaceId === workspaceId) &&
      (currentPendingBooking.remainingSeconds
        ? Number(currentPendingBooking.remainingSeconds) > 0
        : true);

    if (hasActiveHold && currentPendingBooking?.bookingId) {
      navigate({
        to: '/workspaces/review',
        search: {
          workspaceId,
          resourceId: res.id,
          bookingId: currentPendingBooking.bookingId,
          bookingCode: currentPendingBooking.bookingCode || '',
          startTime: currentStartTime,
          endTime: currentEndTime,
          date: currentDateLabel,
          priceType
        }
      });
      return;
    }

    const currentAvail = availabilityMap.get(res.id);
    const isHeldByMe = Boolean(
      currentAvail?.isOccupiedByMe ||
      (holdData?.resourceId && Number(holdData.resourceId) === Number(res.id))
    );
    const isLockedByOthers =
      (currentAvail?.state === 'LOCKED' || currentAvail?.state === 'HOLDING') && !isHeldByMe;

    if (
      currentAvail?.state === 'BOOKED' ||
      isLockedByOthers ||
      currentAvail?.state === 'MAINTENANCE' ||
      currentAvail?.state === 'DISABLED'
    ) {
      toast.error(
        c(
          'This seat is currently held or booked by someone else. Please select another seat.',
          'Vị trí này hiện đang được người khác giữ chỗ hoặc đã có người đặt trong khung giờ này. Vui lòng chọn vị trí khác.'
        )
      );
      return;
    }

    if (!isAuthenticated) {
      toast.info(
        c(
          'Please sign in to hold this seat and proceed',
          'Vui lòng đăng nhập để giữ chỗ và tiếp tục'
        )
      );
      const redirectUrl = `/workspaces/seats?workspaceId=${workspaceId}&date=${encodeURIComponent(currentDateLabel)}&startTime=${encodeURIComponent(currentStartTime)}&endTime=${encodeURIComponent(currentEndTime)}${activeFloorId ? `&floorId=${activeFloorId}` : ''}&resourceId=${res.id}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nexspace_auth_redirect', redirectUrl);
      }
      navigate({
        to: '/auth/sign-in',
        search: { redirect: redirectUrl }
      });
      return;
    }

    // Nếu người dùng đã giữ chỗ này trước đó (ví dụ sau khi login xong quay lại hoặc đã có pending hold),
    // chuyển trực tiếp sang trang review mà không cần gọi hold lại hoặc hiển thị warning
    if (isHeldByMe && holdData?.bookingId) {
      navigate({
        to: '/workspaces/review',
        search: {
          workspaceId,
          resourceId: res.id,
          bookingId: holdData.bookingId,
          bookingCode: holdData.bookingCode || '',
          startTime: currentStartTime,
          endTime: currentEndTime,
          date: currentDateLabel,
          priceType
        }
      });
      return;
    }

    try {
      // Hold seat/room right here with a 10-minute hold window
      const booking = await createBookingMutation.mutateAsync({
        workspaceId,
        resourceId: res.id,
        startTime: currentStartTime,
        endTime: currentEndTime,
        priceType,
        partySize: currentAvail?.capacity ?? res.capacity ?? 1
      });

      toast.success(
        c(
          `Held ${res.name || res.code}! Please complete payment before hold expires.`,
          `Đã giữ chỗ ${res.name || res.code}! Vui lòng hoàn tất thanh toán trước khi hết hạn giữ chỗ.`
        )
      );

      navigate({
        to: '/workspaces/review',
        search: {
          workspaceId,
          resourceId: res.id,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          startTime: currentStartTime,
          endTime: currentEndTime,
          date: currentDateLabel,
          priceType
        }
      });
    } catch (err: unknown) {
      const errorObj = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
        c(
          'This seat is currently held or booked by someone else. Please select another seat.',
          'Vị trí này hiện đang được giữ chỗ hoặc đã có người đặt trong khung giờ này. Vui lòng chọn vị trí khác.'
        );
      toast.error(c('Cannot hold seat', 'Không thể giữ chỗ'), {
        description: msg
      });
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['public-floor-maps'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    }
  };

  // Specific unit rate of selected resource (with fallback to workspace base rate)
  const resourceHourlyRate = useMemo(() => {
    if (
      selectedResource &&
      typeof selectedResource.pricePerHour === 'number' &&
      selectedResource.pricePerHour > 0
    ) {
      return selectedResource.pricePerHour;
    }
    return workspace?.pricePerHour ?? 2.5;
  }, [selectedResource, workspace?.pricePerHour]);

  const estimatedCost = resourceHourlyRate * durationHours;

  const filterTabs: {
    id: SpaceFilterType;
    label: string;
    icon: typeof Chair;
    count: number;
  }[] = [
    {
      id: 'ALL',
      label: c('All Spaces', 'Tất cả'),
      icon: Sparkles,
      count: categoryCounts.all
    },
    {
      id: 'DESK',
      label: c('Desks', 'Bàn làm việc'),
      icon: Chair,
      count: categoryCounts.desks
    },
    {
      id: 'MEETING_ROOM',
      label: c('Meeting Rooms', 'Phòng họp'),
      icon: Users,
      count: categoryCounts.meetingRooms
    },
    {
      id: 'PRIVATE_OFFICE',
      label: c('Private Offices', 'Văn phòng riêng'),
      icon: Building,
      count: categoryCounts.privateOffices
    }
  ];

  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20'>
      <WorkspaceHeader />

      <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8'>
        {workspaceId ? (
          <div className='space-y-6'>
            {/* Header & Reassurance Bar */}
            <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5'>
              <div>
                <nav className='text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5'>
                  <Link to='/workspaces' className='hover:text-primary transition-colors'>
                    Workspaces
                  </Link>
                  <span>/</span>
                  <Link
                    to='/workspaces/$workspaceId'
                    params={{ workspaceId: String(workspaceId) }}
                    className='hover:text-primary transition-colors font-medium text-foreground'
                  >
                    {workspace?.name || `Workspace #${workspaceId}`}
                  </Link>
                  <span>/</span>
                  <span>{c('Select Seat / Space', 'Chọn chỗ ngồi / Phòng')}</span>
                </nav>
                <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
                  {c(
                    'Select Available Seat, Meeting Room or Office',
                    'Chọn Chỗ Ngồi, Phòng Họp Hoặc Văn Phòng Riêng'
                  )}
                </h1>
                <p className='mt-1 text-xs text-muted-foreground sm:text-sm'>
                  {c(
                    'Interactive live floor plan synchronized with real-time bookings.',
                    'Sơ đồ tương tác đồng bộ trạng thái chỗ trống theo thời gian thực.'
                  )}
                </p>
              </div>

              {/* Time Configuration Strip with Modal */}
              <div className='flex items-center gap-2.5'>
                <DateTimePickerModal
                  workspaceId={workspaceId}
                  workspaceName={workspace?.name}
                  operatingHours={workspace?.operatingHours}
                  pricePerHour={workspace?.pricePerHour}
                  open={isScheduleModalOpen}
                  onOpenChange={setIsScheduleModalOpen}
                  initialDate={currentStartTime ? currentStartTime.split('T')[0] : undefined}
                  initialStartTime={currentStartTime ? currentStartTime.split('T')[1] : undefined}
                  initialEndTime={currentEndTime ? currentEndTime.split('T')[1] : undefined}
                  onConfirm={handleScheduleChange}
                >
                  <button
                    type='button'
                    className='flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold shadow-xs hover:border-primary transition-colors'
                  >
                    <Calendar className='size-3.5 text-primary' />
                    <span>{currentDateLabel}</span>
                    <span className='text-muted-foreground'>•</span>
                    <Clock className='size-3.5 text-primary' />
                    <span>
                      {timeRangeLabel ? `${timeRangeLabel} • ` : ''}
                      {durationHours} {c('hrs', 'giờ')}
                    </span>
                    <ChevronDown className='size-3.5 text-muted-foreground' />
                  </button>
                </DateTimePickerModal>
              </div>
            </div>

            {/* Banner Cảnh báo khi người dùng bị khóa đặt chỗ do quá số lần hold cho phép không thanh toán */}
            {isHoldBlocked && (
              <div className='rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-3 shadow-xs animate-in fade-in'>
                <ShieldAlert className='size-5 shrink-0 text-destructive' />
                <div className='flex-1'>
                  <p className='font-bold text-sm'>
                    {c(
                      'Booking privileges temporarily suspended',
                      'Tài khoản đang bị tạm khóa quyền giữ chỗ và đặt phòng/ghế'
                    )}
                  </p>
                  <p className='text-xs text-destructive/90 mt-0.5'>
                    {c(
                      `You have reached the maximum of ${maxHoldAttempts} hold attempts without payment. You cannot hold or book any desks or rooms${
                        holdData?.bookingSuspendedUntil
                          ? ` until ${new Date(holdData.bookingSuspendedUntil).toLocaleTimeString('vi-VN')}`
                          : ` for the next ${penaltyBlockMinutes} minutes`
                      }.`,
                      `Bạn đã dùng hết ${maxHoldAttempts} lần giữ chỗ mà không thanh toán. Hệ thống tạm khóa quyền giữ chỗ và đặt phòng/bàn mới${
                        holdData?.bookingSuspendedUntil
                          ? ` (đến ${new Date(holdData.bookingSuspendedUntil).toLocaleTimeString('vi-VN')})`
                          : ''
                      }. Vui lòng hoàn tất thanh toán hoặc thử lại sau khi hết thời gian khóa/24h.`
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Category Filter Tabs & 2 View Modes (Xem sơ đồ & Xem theo List) */}
            <div className='flex flex-wrap items-center justify-between gap-3'>
              {/* Category Filter Buttons */}
              <div className='flex flex-wrap items-center gap-2'>
                {filterTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeCategoryFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type='button'
                      onClick={() => setActiveCategoryFilter(tab.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs scale-102'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/60 hover:text-foreground'
                      }`}
                    >
                      <Icon className='size-3.5' />
                      <span>{tab.label}</span>
                      <span
                        className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* View Modes Toggle: Xem sơ đồ & Xem theo List */}
              <div className='flex items-center gap-2.5'>
                <div className='flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs'>
                  <button
                    type='button'
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <MapIcon className='size-3.5' />
                    <span>{c('Floor Map', 'Xem sơ đồ')}</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <LayoutList className='size-3.5' />
                    <span>{c('List View', 'Xem theo List')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Map Mode vs List Mode Viewports */}
            {viewMode === 'map' ? (
              <>
                {/* Interactive SVG Floor Map */}
                <PublicFloorMap
                  workspaceId={workspaceId}
                  onSelect={handleSelectResource}
                  onSelectResource={handleSelectResource}
                  onViewDetail={handleViewDetail}
                  selectedResourceId={selectedResource ? selectedResource.id : null}
                  availabilityMap={availabilityMap}
                  activeFloorId={activeFloorId}
                  onFloorChange={handleFloorChange}
                  filterCategory={activeCategoryFilter}
                  showResourceInspector={false}
                  hasScheduleSelected={hasScheduleSelected}
                  onRequestSelectSchedule={() => setIsScheduleModalOpen(true)}
                />

                {/* Interactive Guidance when No Resource is Selected */}
                {!selectedResource && (
                  <div className='flex items-center justify-between rounded-xl border border-dashed border-border bg-card/60 p-4 text-xs text-muted-foreground'>
                    <div className='flex items-center gap-2.5'>
                      <MousePointerClick className='size-4 text-primary animate-bounce' />
                      <span>
                        {c(
                          'Click on any green desk, meeting room, or private office above to inspect details and reserve.',
                          'Nhấp vào bất kỳ bàn làm việc, phòng họp hoặc văn phòng riêng màu xanh trên sơ đồ để xem thông tin và giữ chỗ.'
                        )}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5 text-muted-foreground/80 font-medium'>
                      <ShieldCheck className='size-3.5 text-emerald-600' />
                      <span>{c('Zero commitment at this step', 'Chưa trừ tiền ở bước này')}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <SeatsListView
                resources={currentFloor?.resources || []}
                availabilityMap={availabilityMap}
                workspaceId={workspaceId}
                floor={currentFloor}
                currentDateLabel={currentDateLabel}
                currentStartTime={currentStartTime}
                currentEndTime={currentEndTime}
                durationHours={durationHours}
                filterCategory={activeCategoryFilter}
                selectedResourceId={selectedResource ? selectedResource.id : undefined}
                onSelectResource={handleSelectResource}
                onViewDetail={handleViewDetail}
                onHoldAndReview={(res) => handleProceedToReview(res)}
                isHolding={createBookingMutation.isPending}
              />
            )}

            {/* Floating / Sticky Selected Resource Drawer & CTA */}
            {selectedResource && (
              <div className='sticky bottom-6 z-30 rounded-2xl border border-primary/50 bg-card/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 ring-1 ring-primary/20'>
                <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                  <div className='flex items-center gap-4 w-full sm:w-auto'>
                    <div className='flex size-13 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-mono font-bold text-base shadow-sm'>
                      {selectedResource.category === 'ROOM' ? (
                        isResourceOffice(selectedResource) ? (
                          <Building className='size-6' />
                        ) : (
                          <Users className='size-6' />
                        )
                      ) : (
                        <Chair className='size-6' />
                      )}
                    </div>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm sm:text-base font-bold text-foreground'>
                          {selectedResource.name}
                        </span>
                        <span className='font-mono text-xs font-semibold text-muted-foreground'>
                          ({selectedResource.code})
                        </span>
                        <span className='rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400'>
                          {c('Available for Booking', 'Sẵn sàng đặt chỗ')}
                        </span>
                        <span className='rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                          {selectedResource.category === 'ROOM'
                            ? isResourceOffice(selectedResource)
                              ? c('Private Office', 'Văn phòng riêng')
                              : c('Meeting Room', 'Phòng họp')
                            : c('Dedicated Desk', 'Bàn làm việc')}
                        </span>
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                        <div className='flex items-center gap-1'>
                          <Users className='size-3.5 text-primary' />
                          <span>
                            {availabilityMap.get(selectedResource.id)?.capacity ??
                              selectedResource.capacity ??
                              1}{' '}
                            {c('seats capacity', 'chỗ ngồi')}
                          </span>
                        </div>
                        <span>•</span>
                        <div>
                          {currentDateLabel} • {durationHours} {c('hours reserved', 'giờ sử dụng')}
                        </div>
                        {selectedResource.zoneName && (
                          <>
                            <span>•</span>
                            <span className='text-primary font-medium'>
                              {selectedResource.zoneName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0'>
                    <div className='text-left sm:text-right'>
                      <div className='text-[11px] text-muted-foreground'>
                        {c('Rate:', 'Đơn giá:')}{' '}
                        <span className='font-semibold text-foreground'>
                          {formatPrice(resourceHourlyRate)}/hr
                        </span>
                      </div>
                      <div className='text-lg font-bold text-primary font-mono'>
                        {formatPrice(estimatedCost)}
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => handleViewDetail(selectedResource)}
                        className='h-11 px-4 rounded-xl font-semibold text-xs sm:text-sm border-primary/40 text-primary hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs'
                      >
                        <Eye className='size-4' />
                        <span>{c('View Details', 'Xem chi tiết vị trí')}</span>
                      </Button>

                      <Button
                        onClick={() => handleProceedToReview()}
                        disabled={createBookingMutation.isPending || isHoldBlocked}
                        className={`h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                          isHoldBlocked
                            ? 'opacity-60 bg-muted-foreground/30 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        {createBookingMutation.isPending ? (
                          <>
                            <Loader2 className='size-4' />
                            <span>{c('Holding Seat...', 'Đang giữ chỗ...')}</span>
                          </>
                        ) : isHoldBlocked ? (
                          <>
                            <ShieldAlert className='size-4 text-destructive' />
                            <span>
                              {holdData?.isBookingSuspended
                                ? c('Privileges Suspended (20m)', 'Đang bị khóa đặt chỗ (20p)')
                                : c('Hold Limit Exceeded (0 left)', 'Hết lượt giữ chỗ (0 lượt)')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{c('Review & Hold Seat', 'Xem lại & Giữ chỗ')}</span>
                            <ArrowRight className='size-4' />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='rounded-2xl border border-border bg-card px-6 py-16 text-center'>
            <Building2 className='mx-auto mb-4 size-10 text-primary' />
            <h1 className='text-xl font-semibold'>
              {c('Choose a workspace first', 'Chọn không gian trước')}
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              {c(
                'Open a workspace to see its published floors and select a seat, meeting room or private office.',
                'Mở một không gian để xem sơ đồ đã publish và chọn ghế, phòng họp hoặc văn phòng riêng.'
              )}
            </p>
            <Button asChild className='mt-5'>
              <Link to='/workspaces'>{c('Explore workspaces', 'Khám phá không gian')}</Link>
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
