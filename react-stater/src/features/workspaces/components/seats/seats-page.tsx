import { useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Users,
  Armchair,
  Building,
  Sparkles,
  MousePointerClick
} from 'lucide-react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import {
  PublicFloorMap,
  type MapResource,
  type CustomerFloor,
  type SpaceFilterType,
  isResourceOffice
} from '../detail/public-floor-map';
import { DateTimePickerModal, type ScheduleSelection } from '../detail/date-time-picker-modal';
import { usePublicWorkspaceDetailQuery } from '../../api/queries';
import { useWorkspaceAvailabilityQuery } from '../../api/booking-queries';
import type { ResourceAvailabilityItem } from '../../api/booking-types';

export interface SeatsPageProps {
  workspaceId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  floorId?: number;
  resourceId?: number;
}

function getDefaultSchedule() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;
  return {
    date: `Jan ${day}, ${year}`,
    startTimeStr: '09:00 AM',
    endTimeStr: '01:00 PM',
    isoStartTime: `${isoDate}T09:00:00`,
    isoEndTime: `${isoDate}T13:00:00`,
    durationHours: 4
  };
}

export function SeatsPage({
  workspaceId,
  date,
  startTime,
  endTime,
  floorId: initialFloorId,
  resourceId: initialResourceId
}: SeatsPageProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);

  const defaults = useMemo(() => getDefaultSchedule(), []);

  const [currentStartTime, setCurrentStartTime] = useState<string>(startTime || defaults.isoStartTime);
  const [currentEndTime, setCurrentEndTime] = useState<string>(endTime || defaults.isoEndTime);
  const [currentDateLabel, setCurrentDateLabel] = useState<string>(date || defaults.date);
  const [durationHours, setDurationHours] = useState<number>(4);

  const [activeFloorId, setActiveFloorId] = useState<number | undefined>(initialFloorId);
  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<SpaceFilterType>('ALL');
  const [loadedFloors, setLoadedFloors] = useState<CustomerFloor[]>([]);

  // 1. Fetch Workspace Details
  const { data: workspace } = usePublicWorkspaceDetailQuery(workspaceId ? String(workspaceId) : null);

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
      const isBooked = avail?.state === 'BOOKED' || avail?.state === 'LOCKED';
      const isMaintenance = avail?.state === 'MAINTENANCE';
      const isAvailable = (!avail || avail.state === 'AVAILABLE') && res.selectable && !isBooked && !isMaintenance;

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

  const handleScheduleChange = (schedule: ScheduleSelection) => {
    if (schedule.isoStartTime && schedule.isoEndTime) {
      setCurrentStartTime(schedule.isoStartTime);
      setCurrentEndTime(schedule.isoEndTime);
      setCurrentDateLabel(schedule.date);
      setDurationHours(schedule.durationHours);
      setSelectedResource(null); // Reset selection on time shift
    }
  };

  const handleProceedToReview = () => {
    if (!workspaceId || !selectedResource) return;
    navigate({
      to: '/workspaces/review',
      search: {
        workspaceId,
        resourceId: selectedResource.id,
        startTime: currentStartTime,
        endTime: currentEndTime,
        date: currentDateLabel,
        priceType: 'HOURLY'
      }
    });
  };

  // Specific unit rate of selected resource (with fallback to workspace base rate)
  const resourceHourlyRate = useMemo(() => {
    if (selectedResource && typeof selectedResource.pricePerHour === 'number' && selectedResource.pricePerHour > 0) {
      return selectedResource.pricePerHour;
    }
    return workspace?.pricePerHour ?? 2.5;
  }, [selectedResource, workspace?.pricePerHour]);

  const estimatedCost = resourceHourlyRate * durationHours;

  const filterTabs: { id: SpaceFilterType; label: string; icon: typeof Armchair; count: number }[] = [
    { id: 'ALL', label: c('All Spaces', 'Tất cả'), icon: Sparkles, count: categoryCounts.all },
    { id: 'DESK', label: c('Desks', 'Bàn làm việc'), icon: Armchair, count: categoryCounts.desks },
    { id: 'MEETING_ROOM', label: c('Meeting Rooms', 'Phòng họp'), icon: Users, count: categoryCounts.meetingRooms },
    { id: 'PRIVATE_OFFICE', label: c('Private Offices', 'Văn phòng riêng'), icon: Building, count: categoryCounts.privateOffices }
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
                  {c('Select Available Seat, Meeting Room or Office', 'Chọn Chỗ Ngồi, Phòng Họp Hoặc Văn Phòng Riêng')}
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
                    <span>{durationHours} hrs</span>
                    <ChevronDown className='size-3.5 text-muted-foreground' />
                  </button>
                </DateTimePickerModal>
              </div>
            </div>

            {/* Category Filter Tabs & Availability Strip */}
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

              {/* Status Legend */}
              <div className='flex items-center gap-3 text-xs bg-muted/40 border border-border/80 rounded-xl px-3 py-1.5'>
                <div className='flex items-center gap-1.5'>
                  <span className='size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20' />
                  <span className='text-foreground font-medium'>{c('Available', 'Còn trống')}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='size-2.5 rounded-full bg-amber-500' />
                  <span>{c('Booked / Hold', 'Đã đặt / Đang giữ')}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='size-2.5 rounded-full bg-muted-foreground/40' />
                  <span>{c('Maintenance', 'Bảo trì')}</span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Floor Map */}
            <PublicFloorMap
              workspaceId={workspaceId}
              onSelect={(res) => setSelectedResource(res)}
              selectedResourceId={selectedResource?.id ?? initialResourceId}
              availabilityMap={availabilityMap}
              onFloorChange={(floorId) => setActiveFloorId(floorId)}
              filterCategory={activeCategoryFilter}
              onFloorListLoaded={(floors) => setLoadedFloors(floors)}
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
                        <Armchair className='size-6' />
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
                            {selectedResource.capacity || (selectedResource.category === 'ROOM' ? 6 : 1)}{' '}
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
                            <span className='text-primary font-medium'>{selectedResource.zoneName}</span>
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

                    <Button
                      onClick={handleProceedToReview}
                      className='h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer'
                    >
                      <span>{c('Review & Hold 15 Min', 'Xem lại & Giữ chỗ 15 phút')}</span>
                      <ArrowRight className='size-4' />
                    </Button>
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
