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
import { useWorkspaceAvailabilityQuery } from '../../api/booking-queries';
import type { ResourceAvailabilityItem } from '../../api/booking-types';
import { useLanguage } from '@/features/landing/context/language-context';
import type { ScheduleSelection } from './date-time-picker-modal';
import type {
  CustomerFloor,
  MapResource,
  SpaceFilterType
} from './public-floor-map';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceDetailPageProps {
  workspaceId?: string;
}

type SectionId =
  | 'overview'
  | 'spaces-floor-map'
  | 'amenities'
  | 'location'
  | 'reviews';

const SECTION_IDS: SectionId[] = [
  'overview',
  'spaces-floor-map',
  'amenities',
  'location',
  'reviews'
];

export function WorkspaceDetailPage({ workspaceId: propWorkspaceId }: WorkspaceDetailPageProps = {}) {
  const params = useParams({ strict: false }) as { workspaceId?: string };
  const workspaceId = propWorkspaceId || params.workspaceId || '1';

  const { language } = useLanguage();
  const navigate = useNavigate();

  const {
    data: workspace,
    isLoading,
    isError
  } = usePublicWorkspaceDetailQuery(workspaceId);

  const { data: mediaItems = [] } = useWorkspaceMediaQuery(workspaceId);
  const { data: amenitiesList = [] } = useWorkspaceAmenitiesQuery(workspaceId);

  const [schedule, setSchedule] = useState<ScheduleSelection | null>(null);
  const [loadedFloors, setLoadedFloors] = useState<CustomerFloor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | undefined>();
  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null);
  const [filterCategory, setFilterCategory] = useState<SpaceFilterType>('ALL');
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  const numericWorkspaceId = Number(workspaceId) || 1;

  // Fetch real-time resource availability when date/time is chosen
  const { data: availabilityList } = useWorkspaceAvailabilityQuery(
    numericWorkspaceId,
    schedule?.isoStartTime,
    schedule?.isoEndTime,
    activeFloorId
  );

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
    (floors: CustomerFloor[]) => {
      setLoadedFloors(floors);
      if (floors.length > 0 && activeFloorId === undefined) {
        setActiveFloorId(floors[0].id);
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
      setSelectedResource(resource);
      navigate({
        to: '/workspaces/seats',
        search: {
          workspaceId: numericWorkspaceId,
          date: schedule?.date,
          startTime: schedule?.isoStartTime || schedule?.startTime,
          endTime: schedule?.isoEndTime || schedule?.endTime,
          floorId: floorId ?? activeFloorId,
          resourceId: resource.id
        }
      });
    },
    [navigate, numericWorkspaceId, schedule, activeFloorId]
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
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 animate-pulse space-y-6'>
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
        </main>
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
            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors'
          >
            <ArrowLeft className='size-4' />
            {language === 'vi' ? 'Quay lại danh sách' : 'Back to Workspaces'}
          </Link>
        </main>
      ) : (
        <main className='flex-1 w-full'>
          {/* Top Container: Breadcrumb + Header + Compact Gallery */}
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4'>
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
                          const prev =
                            navItems[(idx - 1 + navItems.length) % navItems.length];
                          scrollToSection(prev.id);
                        }
                      }}
                      className={cn(
                        'shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap',
                        isActive
                          ? 'bg-primary text-white shadow-xs'
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
                floors={loadedFloors}
                selectedResource={selectedResource}
                onSelectResource={setSelectedResource}
                activeFloorId={activeFloorId}
                onFloorChange={setActiveFloorId}
                availabilityMap={availabilityMap}
                filterCategory={filterCategory}
                onFilterCategoryChange={setFilterCategory}
                onFloorListLoaded={handleFloorListLoaded}
                onContinueWithResource={handleContinueWithResource}
                hasScheduleSelected={!!schedule}
              />

              <WorkspaceBookingCard
                workspace={workspace}
                floors={loadedFloors}
                selectedResource={selectedResource}
                onClearSelectedResource={() => setSelectedResource(null)}
                activeFloorId={activeFloorId}
                schedule={schedule}
                onScheduleChange={setSchedule}
              />
            </div>
          </div>
        </main>
      )}

      <Footer />
    </div>
  );
}
