import React, { useState, useMemo } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  Wrench,
  Archive,
  Eye,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Star,
  Layers,
  ChevronDown,
  ExternalLink,
  MapPin,
  Calendar,
  AlertTriangle,
  Download,
  Headphones,
  Check,
  Sliders,
  History,
  QrCode,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useWorkspacesStore } from '../store/workspaces-store';
import {
  resolveWorkspaceId,
  useWorkspaceDetailQuery,
  useWorkspacesQuery,
  useWorkspaceLifecycleMutation,
  useUpdateWorkspaceMutation
} from '@/features/workspaces/api';
import { mapCanonicalToOrganizerWorkspace } from '../utils/workspace-mapper';

// Mock organizer identity: Sarah Jenkins / LoftSpaces Hospitality Group
const CURRENT_ORGANIZER_ID = 'USR-9432';

interface WorkspaceLifecycleViewProps {
  workspaceId?: string;
}

export function WorkspaceLifecycleView({ workspaceId }: WorkspaceLifecycleViewProps) {
  const router = useRouter();
  const {
    workspaces,
    updateWorkspaceStatus,
    updateWorkspaceSettings
  } = useWorkspacesStore();

  // Resolve target identifier to authoritative canonical ID (e.g. ws-sg-prime-01 -> WS-104)
  const targetId = workspaceId ? resolveWorkspaceId(workspaceId) : 'WS-104';

  // Centralized Mock REST API Query for active workspace detail
  const {
    data: canonicalWorkspace,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
    refetch: refetchDetail,
    isFetching: isDetailFetching
  } = useWorkspaceDetailQuery(targetId);

  // Centralized Mock REST API Query for available organizer workspaces
  const { data: workspacesListResponse } = useWorkspacesQuery({
    organizerId: CURRENT_ORGANIZER_ID,
    limit: 50
  });

  const availableWorkspaces = useMemo(() => {
    if (workspacesListResponse?.content && workspacesListResponse.content.length > 0) {
      return workspacesListResponse.content.map(mapCanonicalToOrganizerWorkspace);
    }
    return workspaces;
  }, [workspacesListResponse, workspaces]);

  // Compute active workspace presentation model
  const activeWorkspace = useMemo(() => {
    if (canonicalWorkspace) {
      return mapCanonicalToOrganizerWorkspace(canonicalWorkspace);
    }
    return (
      workspaces.find((w) => w.id === targetId) ||
      workspaces.find((w) => w.id === 'WS-104') ||
      workspaces.find((w) => w.id === 'ws-sg-prime-01') ||
      workspaces[0]
    );
  }, [canonicalWorkspace, workspaces, targetId]);

  // Centralized API Mutations
  const lifecycleMutation = useWorkspaceLifecycleMutation();
  const updateMutation = useUpdateWorkspaceMutation();

  const isSuspended = canonicalWorkspace?.moderationStatus === 'Suspended';
  const isDraftOrPending =
    canonicalWorkspace?.reviewStatus === 'Draft' ||
    canonicalWorkspace?.reviewStatus === 'Pending';
  const isArchived = activeWorkspace?.status === 'ARCHIVED';
  const canToggleVisibility = !isDetailError && !isDraftOrPending && !isSuspended && activeWorkspace?.status === 'ACTIVE' && Boolean(canonicalWorkspace);

  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'settings' | 'audit'>('overview');

  // Confirmation dialogs
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Operational Lifecycle Commands via Real HTTP Mutations
  const handlePauseWorkspace = () => {
    lifecycleMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          action: 'pause',
          expectedVersion: canonicalWorkspace?.version,
          reason: 'Organizer requested workspace pause'
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          setIsPauseModalOpen(false);
          updateWorkspaceStatus(activeWorkspace.id, 'PAUSED');
        }
      }
    );
  };

  const handleResumeWorkspace = () => {
    lifecycleMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          action: 'resume',
          expectedVersion: canonicalWorkspace?.version
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          setIsResumeModalOpen(false);
          updateWorkspaceStatus(activeWorkspace.id, 'ACTIVE');
        }
      }
    );
  };

  const handleMaintenanceWorkspace = () => {
    lifecycleMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          action: 'maintenance',
          expectedVersion: canonicalWorkspace?.version
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          setIsMaintenanceModalOpen(false);
          updateWorkspaceStatus(activeWorkspace.id, 'MAINTENANCE');
        }
      }
    );
  };

  const handleArchiveWorkspace = () => {
    if (archiveConfirmText !== activeWorkspace.name) {
      toast.error('Confirmation name mismatch');
      return;
    }
    lifecycleMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          action: 'archive',
          expectedVersion: canonicalWorkspace?.version,
          reason: 'Organizer decommissioned workspace'
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          setIsArchiveModalOpen(false);
          setArchiveConfirmText('');
          updateWorkspaceStatus(activeWorkspace.id, 'ARCHIVED');
        }
      }
    );
  };

  const handleToggleVisibility = (checked: boolean) => {
    updateMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          isListingVisible: checked,
          expectedVersion: canonicalWorkspace?.version
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          updateWorkspaceSettings(activeWorkspace.id, { isLive: checked });
        }
      }
    );
  };

  const handleToggleTurnstile = (checked: boolean) => {
    updateMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          turnstileOnline: checked,
          expectedVersion: canonicalWorkspace?.version
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          updateWorkspaceSettings(activeWorkspace.id, { turnstileOnline: checked });
        }
      }
    );
  };

  const handleBookingModeChange = (mode: 'instant' | 'manual') => {
    updateMutation.mutate(
      {
        id: canonicalWorkspace?.id || activeWorkspace.id,
        dto: {
          bookingConfirmationMode: mode === 'instant' ? 'Instant' : 'Manual_Approval',
          expectedVersion: canonicalWorkspace?.version
        },
        workspaceName: activeWorkspace.name
      },
      {
        onSuccess: () => {
          updateWorkspaceSettings(activeWorkspace.id, { bookingMode: mode });
        }
      }
    );
  };

  if (isDetailLoading && !activeWorkspace) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[50vh] p-8 text-center'>
        <Loader2 className='size-8 animate-spin text-indigo-600 mb-4' />
        <h2 className='text-base font-bold text-foreground'>Loading Workspace Controls...</h2>
        <p className='text-xs text-muted-foreground mt-1'>Fetching canonical workspace record from server.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground pb-20 select-none'>
      {/* Sub-Header / Breadcrumbs */}
      <div className='px-4 sm:px-8 pt-4 pb-2 border-b border-border bg-card/60 backdrop-blur-xs'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs'>
          <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-muted-foreground truncate'>
            <button
              type='button'
              onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces' })}
              className='hover:text-foreground transition-colors'
            >
              Workspaces
            </button>
            <span>/</span>
            <span className='truncate'>{activeWorkspace.district}</span>
            <span>/</span>
            <span className='font-semibold text-foreground truncate'>{activeWorkspace.name}</span>
            <span>/</span>
            <span className='font-bold text-indigo-600 dark:text-indigo-400'>Status &amp; Lifecycle Control (O16)</span>
          </nav>

          <div className='flex items-center gap-2'>
            {/* Workspace Quick Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='h-7 px-2.5 text-xs gap-1 border-border font-medium'>
                  <span className='truncate max-w-[150px]'>{activeWorkspace.name}</span>
                  <ChevronDown className='size-3 text-muted-foreground' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-64'>
                {availableWorkspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/lifecycle', search: { id: ws.id } })}
                    className='flex items-center justify-between py-1.5 text-xs'
                  >
                    <div className='flex flex-col truncate'>
                      <span className='font-semibold text-foreground truncate'>{ws.name}</span>
                      <span className='text-[10px] text-muted-foreground'>{ws.status}</span>
                    </div>
                    {ws.id === activeWorkspace.id && <Check className='size-4 text-indigo-600 ml-2' />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Operational Container */}
      <main className='flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto space-y-6'>
        {/* Connection Error Banner */}
        {isDetailError && (
          <div className='flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='size-5 shrink-0' />
              <span>
                Failed to fetch real-time workspace details from mock server:{' '}
                {detailError instanceof Error ? detailError.message : 'Connection failed'}.
              </span>
            </div>
            <Button
              size='sm'
              variant='outline'
              onClick={() => refetchDetail()}
              className='gap-1.5 border-destructive/30 hover:bg-destructive/20'
            >
              <RefreshCw className='size-3.5' />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {/* Administrative Suspension Banner */}
        {isSuspended && (
          <div className='flex items-start gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'>
            <AlertCircle className='size-5 shrink-0 mt-0.5' />
            <div>
              <h4 className='font-bold text-sm'>Workspace Suspended by Platform Administration</h4>
              <p className='text-xs mt-1 text-rose-600/90 dark:text-rose-300'>
                This workspace has been suspended due to an administrative policy or compliance hold. Operational lifecycle commands are locked and cannot be reactivated through the Organizer console. Contact platform support for assistance.
              </p>
            </div>
          </div>
        )}

        {/* ==================== TOP HERO STATUS BANNER ==================== */}
        <section className='bg-card rounded-xl border border-border p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
          {/* Left: Workspace Identity & Live State */}
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-3'>
              <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
                {activeWorkspace.name}
              </h1>
              {isDetailFetching && !isDetailLoading && (
                <Loader2 className='size-4 text-indigo-500 animate-spin' aria-label='Refreshing workspace status' />
              )}

              {/* Status Badge */}
              {activeWorkspace.status === 'ACTIVE' && (
                <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs'>
                  <span className='size-2 rounded-full bg-emerald-500 animate-pulse' />
                  <span>ACTIVE &amp; PUBLISHED</span>
                </div>
              )}
              {activeWorkspace.status === 'PAUSED' && (
                <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs'>
                  <span className='size-2 rounded-full bg-amber-500' />
                  <span>PAUSED (Listing Inactive)</span>
                </div>
              )}
              {activeWorkspace.status === 'MAINTENANCE' && (
                <div className='bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs'>
                  <span className='size-2 rounded-full bg-purple-500' />
                  <span>SCHEDULED MAINTENANCE</span>
                </div>
              )}
              {activeWorkspace.status === 'ARCHIVED' && (
                <div className='bg-slate-500/20 text-slate-400 border border-slate-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs'>
                  <span className='size-2 rounded-full bg-slate-400' />
                  <span>ARCHIVED (Read-Only)</span>
                </div>
              )}
              {activeWorkspace.status === 'UNDER_REVIEW' && (
                <div className='bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs'>
                  <span className='size-2 rounded-full bg-indigo-500 animate-pulse' />
                  <span>UNDER REVIEW (#NX-VER-2026)</span>
                </div>
              )}

              <Badge variant='secondary' className='text-xs'>
                {activeWorkspace.tier || 'Tier 1 Flagship'}
              </Badge>
            </div>

            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1 text-foreground font-medium'>
                <MapPin className='size-3.5 text-muted-foreground' />
                <span>{activeWorkspace.address}</span>
              </span>
              <span>•</span>
              <span>Coworking &amp; Enterprise Suites</span>
              <span>•</span>
              <a
                href={activeWorkspace.publicUrl || 'https://nexspace.vn/spaces/saigon-prime-hub'}
                target='_blank'
                rel='noreferrer'
                className='text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium'
              >
                <span>nexspace.vn/spaces/{activeWorkspace.id}</span>
                <ExternalLink className='size-3' />
              </a>
            </div>
          </div>

          {/* Right Actions: Preview + Emergency Kill Switch Controls */}
          <div className='flex flex-wrap items-center gap-2.5 shrink-0'>
            <Button
              variant='outline'
              onClick={() => setIsPreviewModalOpen(true)}
              className='h-10 text-xs sm:text-sm font-semibold gap-1.5 border-border hover:bg-muted'
            >
              <Eye className='size-4 text-muted-foreground' />
              <span>Preview Public Page</span>
            </Button>

            {/* Emergency Kill Switch / Toggle */}
            {activeWorkspace.status === 'ACTIVE' ? (
              <Button
                variant='outline'
                onClick={() => setIsPauseModalOpen(true)}
                disabled={lifecycleMutation.isPending || isDetailError || !canonicalWorkspace}
                className='h-10 text-xs sm:text-sm font-semibold border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 shadow-2xs'
              >
                {lifecycleMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <ShieldAlert className='size-4 text-red-500' />
                )}
                <span>Pause Workspace Listing</span>
              </Button>
            ) : isArchived ? (
              <Button
                variant='outline'
                disabled
                className='h-10 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-800 text-slate-500 opacity-60 gap-1.5'
              >
                <Archive className='size-4' />
                <span>Archived</span>
              </Button>
            ) : isSuspended ? (
              <Button
                variant='outline'
                disabled
                className='h-10 text-xs sm:text-sm font-semibold border-red-300 dark:border-red-900 text-red-600 opacity-60 gap-1.5'
              >
                <ShieldAlert className='size-4' />
                <span>Admin Suspended</span>
              </Button>
            ) : (
              <Button
                onClick={() => setIsResumeModalOpen(true)}
                disabled={lifecycleMutation.isPending || isDraftOrPending || isDetailError || !canonicalWorkspace}
                className='h-10 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs'
              >
                {lifecycleMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Play className='size-4' />
                )}
                <span>Resume Operations</span>
              </Button>
            )}

            {/* More Lifecycle Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' className='h-10 px-2.5 border-border'>
                  <Sliders className='size-4 text-muted-foreground' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48'>
                <DropdownMenuItem
                  onClick={() => setIsMaintenanceModalOpen(true)}
                  disabled={isArchived || isSuspended || isDetailError || !canonicalWorkspace}
                  className='text-xs'
                >
                  <Wrench className='size-3.5 mr-2 text-purple-500' />
                  <span>Schedule Maintenance</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsArchiveModalOpen(true)}
                  disabled={isArchived || isDetailError || !canonicalWorkspace}
                  className='text-xs text-red-600 dark:text-red-400'
                >
                  <Archive className='size-3.5 mr-2' />
                  <span>Archive Workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* ==================== 4 KPI METRIC CARDS ROW ==================== */}
        <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
          {/* Card 1: Total Bookings */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-2xs'>
            <div className='flex items-center justify-between text-muted-foreground mb-2'>
              <span className='text-[11px] uppercase font-bold tracking-wider'>Total Bookings (MTD)</span>
              <Calendar className='size-4 text-muted-foreground/70' />
            </div>
            <div className='flex items-baseline justify-between mb-2'>
              <span className='text-2xl sm:text-3xl font-bold font-heading text-foreground tabular-nums'>
                {activeWorkspace.totalBookingsMtd || 348}
              </span>
              <div className='w-16 h-5'>
                <svg className='w-full h-full text-emerald-500' fill='none' viewBox='0 0 80 24'>
                  <path d='M1 20L15 17L28 19L42 12L56 14L70 5L79 2' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                </svg>
              </div>
            </div>
            <div className='flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2'>
              <TrendingUp className='size-3.5' />
              <span>+12% vs last month</span>
            </div>
            <div className='pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between'>
              <span>Avg 11.6 bookings/day</span>
              <span>94% checked-in</span>
            </div>
          </div>

          {/* Card 2: Gross Revenue */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-2xs'>
            <div className='flex items-center justify-between text-muted-foreground mb-2'>
              <span className='text-[11px] uppercase font-bold tracking-wider'>Gross Revenue (MTD)</span>
              <DollarSign className='size-4 text-muted-foreground/70' />
            </div>
            <div className='flex items-baseline justify-between mb-2'>
              <span className='text-2xl sm:text-3xl font-bold font-heading text-foreground tabular-nums'>
                ${(activeWorkspace.grossRevenueMtd || 8420).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div className='w-16 h-5'>
                <svg className='w-full h-full text-emerald-500' fill='none' viewBox='0 0 80 24'>
                  <path d='M1 22L16 18L30 14L45 15L58 8L68 9L79 3' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                </svg>
              </div>
            </div>
            <div className='flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2'>
              <TrendingUp className='size-3.5' />
              <span>+18% growth</span>
            </div>
            <div className='pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between'>
              <span>Payout: Mon, Feb 02</span>
              <span className='font-mono'>VCB Auto</span>
            </div>
          </div>

          {/* Card 3: Avg Occupancy */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-2xs'>
            <div className='flex items-center justify-between text-muted-foreground mb-2'>
              <span className='text-[11px] uppercase font-bold tracking-wider'>Avg Occupancy Rate</span>
              <Users className='size-4 text-muted-foreground/70' />
            </div>
            <div className='flex items-baseline justify-between mb-2'>
              <span className='text-2xl sm:text-3xl font-bold font-heading text-foreground tabular-nums'>
                {activeWorkspace.occupancyRate || 82.4}%
              </span>
              <Badge variant='outline' className='text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200'>
                +2.4% goal
              </Badge>
            </div>
            <div className='w-full bg-muted h-2 rounded-full overflow-hidden mb-2'>
              <div
                className='bg-indigo-600 h-full rounded-full transition-all'
                style={{ width: `${activeWorkspace.occupancyRate || 82.4}%` }}
              />
            </div>
            <div className='pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between'>
              <span>Target: 80.0%</span>
              <span className='font-semibold text-foreground'>Cap: {activeWorkspace.desksCount} Desks</span>
            </div>
          </div>

          {/* Card 4: Customer Satisfaction */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-2xs'>
            <div className='flex items-center justify-between text-muted-foreground mb-2'>
              <span className='text-[11px] uppercase font-bold tracking-wider'>Customer Sentiment</span>
              <Star className='size-4 text-amber-500 fill-amber-500' />
            </div>
            <div className='flex items-baseline gap-1.5 mb-2'>
              <span className='text-2xl sm:text-3xl font-bold font-heading text-foreground'>
                ★ {activeWorkspace.rating || 4.9}
              </span>
              <span className='text-xs text-muted-foreground'>/ 5.0</span>
            </div>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2'>
              <Badge variant='secondary' className='text-[10px]'>
                98% Positive Sentiment
              </Badge>
            </div>
            <div className='pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between'>
              <span>Based on {activeWorkspace.reviewsCount || 128} reviews</span>
              <span className='text-indigo-600 font-medium'>Verified</span>
            </div>
          </div>
        </section>

        {/* ==================== TABBED DETAIL CONTAINER ==================== */}
        <section className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden'>
          {/* Tabs Navigation Header */}
          <div className='border-b border-border px-6 pt-3 flex items-center gap-6 overflow-x-auto'>
            <button
              type='button'
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Layers className='size-4' />
              <span>Overview &amp; Traffic</span>
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('bookings')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Clock className='size-4' />
              <span>Live Booking Activity</span>
              <Badge variant='secondary' className='text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold'>
                8 Active
              </Badge>
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('settings')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Sliders className='size-4' />
              <span>Space Settings &amp; Access</span>
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('audit')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <History className='size-4' />
              <span>Audit Logs &amp; Governance</span>
            </button>
          </div>

          {/* Tab 1: Overview & Traffic */}
          {activeTab === 'overview' && (
            <div className='p-6 grid grid-cols-1 lg:grid-cols-12 gap-6'>
              {/* Left Column (65%) */}
              <div className='lg:col-span-8 space-y-6'>
                {/* Real-time Occupancy Breakdown */}
                <div className='border border-border rounded-xl p-5 bg-card space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-sm sm:text-base font-bold text-foreground'>
                        Real-Time Occupancy &amp; Floor Distribution
                      </h3>
                      <p className='text-xs text-muted-foreground'>
                        Live breakdown across configured zones on Main Floor.
                      </p>
                    </div>
                    <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] font-semibold gap-1'>
                      <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
                      <span>Live Feed Synced</span>
                    </Badge>
                  </div>

                  {/* Zone Bars */}
                  <div className='space-y-3.5'>
                    <div className='p-3 bg-muted/40 rounded-lg border border-border'>
                      <div className='flex items-center justify-between text-xs mb-1.5'>
                        <div className='flex items-center gap-2 font-semibold text-foreground'>
                          <span className='size-2.5 rounded-xs bg-indigo-600' />
                          <span>Zone A (Quiet Focus Bay)</span>
                          <span className='text-muted-foreground text-[11px] font-normal'>• 28 Desks configured</span>
                        </div>
                        <span className='font-bold text-foreground tabular-nums'>22 / 28 (78.5%)</span>
                      </div>
                      <div className='w-full bg-muted h-2 rounded-full overflow-hidden'>
                        <div className='bg-indigo-600 h-full rounded-full' style={{ width: '78.5%' }} />
                      </div>
                    </div>

                    <div className='p-3 bg-muted/40 rounded-lg border border-border'>
                      <div className='flex items-center justify-between text-xs mb-1.5'>
                        <div className='flex items-center gap-2 font-semibold text-foreground'>
                          <span className='size-2.5 rounded-xs bg-amber-500' />
                          <span>Zone B (Collaborative Team Hub)</span>
                          <span className='text-muted-foreground text-[11px] font-normal'>• 16 Desks configured</span>
                        </div>
                        <span className='font-bold text-foreground tabular-nums'>14 / 16 (87.5%)</span>
                      </div>
                      <div className='w-full bg-muted h-2 rounded-full overflow-hidden'>
                        <div className='bg-amber-500 h-full rounded-full' style={{ width: '87.5%' }} />
                      </div>
                    </div>

                    <div className='p-3 bg-muted/40 rounded-lg border border-border'>
                      <div className='flex items-center justify-between text-xs mb-1.5'>
                        <div className='flex items-center gap-2 font-semibold text-foreground'>
                          <span className='size-2.5 rounded-xs bg-purple-600' />
                          <span>Zone C (Conference &amp; Meeting Suites)</span>
                          <span className='text-muted-foreground text-[11px] font-normal'>• 3 Boardrooms</span>
                        </div>
                        <span className='font-bold text-amber-600 dark:text-amber-400 tabular-nums'>3 / 3 (100% In Session)</span>
                      </div>
                      <div className='w-full bg-muted h-2 rounded-full overflow-hidden'>
                        <div className='bg-purple-600 h-full rounded-full' style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Lifecycle Controls */}
                <div className='border border-border rounded-xl p-5 bg-card space-y-4'>
                  <div>
                    <h3 className='text-sm sm:text-base font-bold text-foreground'>
                      Quick Lifecycle Operations &amp; Governance
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                      Immediate switches governing public indexability, physical turnstile security, and gate validation.
                    </p>
                  </div>

                  <div className='space-y-3'>
                    {/* Control 1: Listing Visibility */}
                    <div className='flex items-center justify-between p-3.5 rounded-lg border border-border hover:bg-muted/30 transition-colors'>
                      <div className='flex items-start gap-3'>
                        <div className='size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5'>
                          <Eye className='size-4' />
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='text-xs sm:text-sm font-bold text-foreground'>Listing Marketplace Visibility</span>
                            <Badge variant='outline' className='text-[10px] font-bold'>
                              {activeWorkspace.isLive !== false && canToggleVisibility ? 'LIVE' : 'UNLISTED'}
                            </Badge>
                          </div>
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            Workspace appears in NexSpace search, consumer app, and partner aggregator network.
                          </p>
                          {!canToggleVisibility && (
                            <p className='text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium'>
                              {isSuspended
                                ? 'Locked: Workspace is under administrative suspension.'
                                : isDraftOrPending
                                  ? 'Locked: Requires administrator approval before listing.'
                                  : 'Locked: Workspace must be ACTIVE to be visible on the marketplace.'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={activeWorkspace.isLive !== false && canToggleVisibility}
                        disabled={updateMutation.isPending || !canToggleVisibility}
                        onCheckedChange={handleToggleVisibility}
                      />
                    </div>

                    {/* Control 2: Turnstile Online */}
                    <div className='flex items-center justify-between p-3.5 rounded-lg border border-border hover:bg-muted/30 transition-colors'>
                      <div className='flex items-start gap-3'>
                        <div className='size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5'>
                          <QrCode className='size-4' />
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='text-xs sm:text-sm font-bold text-foreground'>Automated Turnstile Gateway</span>
                            <Badge variant='outline' className='text-[10px] font-bold'>
                              {activeWorkspace.turnstileOnline !== false ? 'ONLINE' : 'OFFLINE'}
                            </Badge>
                          </div>
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            Smart turnstiles active. Generates real-time encrypted QR badges for paid reservations automatically.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={activeWorkspace.turnstileOnline !== false}
                        disabled={updateMutation.isPending}
                        onCheckedChange={handleToggleTurnstile}
                      />
                    </div>

                    {/* Control 3: Booking Mode */}
                    <div className='p-3.5 rounded-lg border border-border bg-muted/20'>
                      <div className='flex items-center justify-between mb-2 text-xs'>
                        <span className='font-bold text-foreground'>Booking Confirmation Protocol</span>
                        <span className='text-muted-foreground text-[11px] font-mono'>Policy #NX-POL-24</span>
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <button
                          type='button'
                          disabled={updateMutation.isPending}
                          onClick={() => handleBookingModeChange('instant')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            activeWorkspace.bookingMode !== 'manual'
                              ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                              : 'border-border bg-card'
                          } ${updateMutation.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className='flex items-center justify-between mb-1'>
                            <span className='text-xs font-bold text-foreground'>Instant Booking</span>
                            <Badge variant='secondary' className='text-[10px] font-semibold'>Recommended</Badge>
                          </div>
                          <p className='text-[11px] text-muted-foreground'>
                            Confirmed instantly if slot is open. Maximum conversion rate (+34%).
                          </p>
                        </button>

                        <button
                          type='button'
                          disabled={updateMutation.isPending}
                          onClick={() => handleBookingModeChange('manual')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            activeWorkspace.bookingMode === 'manual'
                              ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                              : 'border-border bg-card'
                          } ${updateMutation.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className='flex items-center justify-between mb-1'>
                            <span className='text-xs font-bold text-foreground'>Manual Approval</span>
                          </div>
                          <p className='text-[11px] text-muted-foreground'>
                            Organizer reviews KYC &amp; guest company profile before accepting slot.
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (35%) */}
              <div className='lg:col-span-4 space-y-6'>
                {/* Upcoming Lifecycle Events */}
                <div className='border border-border rounded-xl p-5 bg-card space-y-3.5'>
                  <div className='flex items-center justify-between pb-2 border-b border-border'>
                    <h3 className='text-xs sm:text-sm font-bold text-foreground'>Upcoming Events</h3>
                    <Calendar className='size-4 text-muted-foreground' />
                  </div>
                  <div className='space-y-3 text-xs'>
                    <div className='p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20'>
                      <span className='font-bold text-foreground block'>Fire Safety Inspection</span>
                      <span className='text-[11px] text-amber-700 dark:text-amber-300 font-semibold block'>
                        Scheduled: Feb 15, 2026
                      </span>
                      <span className='text-[10px] text-muted-foreground'>Building Authority Unit 4</span>
                    </div>

                    <div className='p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                      <span className='font-bold text-foreground block'>Smart Lock Battery Check</span>
                      <span className='text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block'>
                        All 18 units healthy (92% avg)
                      </span>
                      <span className='text-[10px] text-muted-foreground'>Next cycle in 45 days</span>
                    </div>

                    <div className='p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20'>
                      <span className='font-bold text-foreground block'>Tax Audit &amp; Invoice Payout</span>
                      <span className='text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block'>
                        #NXS-2026-01 Ready
                      </span>
                      <button
                        type='button'
                        onClick={() => toast.success('Tax invoice downloaded')}
                        className='text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-1'
                      >
                        <Download className='size-3' />
                        <span>Download Statement PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payout Destination */}
                <div className='border border-border rounded-xl p-5 bg-card space-y-3.5'>
                  <div className='flex items-center justify-between pb-2 border-b border-border'>
                    <h3 className='text-xs sm:text-sm font-bold text-foreground'>Payout Destination</h3>
                    <Badge variant='outline' className='text-[10px] font-bold bg-emerald-500/10 text-emerald-600'>
                      Active
                    </Badge>
                  </div>
                  <div className='p-4 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-sm'>
                    <div className='flex items-center justify-between text-[11px] text-slate-400'>
                      <span>Corporate Bank Account</span>
                      <span className='font-bold text-white tracking-widest'>VIETCOMBANK</span>
                    </div>
                    <div>
                      <div className='text-sm font-mono tracking-wider text-slate-100'>•••• •••• •••• 8829</div>
                      <div className='text-[10px] text-slate-400 uppercase tracking-wider mt-0.5'>
                        PRIME SPACES VIETNAM JSC
                      </div>
                    </div>
                    <div className='pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400'>
                      <span>Routing: VCB-SGN-01</span>
                      <span className='text-emerald-400 font-semibold'>Auto-settle weekly</span>
                    </div>
                  </div>
                </div>

                {/* Support SLA Box */}
                <div className='p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5'>
                  <div className='flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300'>
                    <Headphones className='size-4' />
                    <span>Dedicated Hub Concierge SLA</span>
                  </div>
                  <p className='text-muted-foreground leading-relaxed text-[11px]'>
                    Enterprise priority response: &lt; 15 mins. Technical managers available 24/7 for smart turnstile support.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Live Booking Activity */}
          {activeTab === 'bookings' && (
            <div className='p-6 space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm sm:text-base font-bold text-foreground'>Active Marketplace Reservations</h3>
                <Badge variant='outline'>Real-time RFID &amp; Turnstile Logs</Badge>
              </div>
              <div className='border border-border rounded-lg overflow-hidden text-xs'>
                <table className='w-full'>
                  <thead className='bg-muted/60 text-muted-foreground font-semibold text-left border-b border-border'>
                    <tr>
                      <th className='p-3'>Guest / Company</th>
                      <th className='p-3'>Zone &amp; Resource</th>
                      <th className='p-3'>Session Window</th>
                      <th className='p-3'>Gate Verification</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border'>
                    <tr>
                      <td className='p-3 font-semibold text-foreground'>Nguyen Van An • FinTech Labs</td>
                      <td className='p-3'>Zone A (Quiet Focus) • Desk A-04</td>
                      <td className='p-3 text-muted-foreground'>09:00 – 18:00 (Today)</td>
                      <td className='p-3'>
                        <span className='px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]'>
                          Checked-in (Turnstile B)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className='p-3 font-semibold text-foreground'>Sarah Jenkins • Skyward Design</td>
                      <td className='p-3'>Zone B (Team Hub) • Desk B-11</td>
                      <td className='p-3 text-muted-foreground'>10:00 – 19:00 (Today)</td>
                      <td className='p-3'>
                        <span className='px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]'>
                          Checked-in (Turnstile A)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className='p-3 font-semibold text-foreground'>Tran Minh Duc • Veloce Mobility</td>
                      <td className='p-3'>Zone C (Boardroom) • Suite CR-01</td>
                      <td className='p-3 text-muted-foreground'>14:00 – 16:30 (Today)</td>
                      <td className='p-3'>
                        <span className='px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-[10px]'>
                          Confirmed (Pending Arrival)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Space Settings & Access */}
          {activeTab === 'settings' && (
            <div className='p-6 space-y-4 text-xs sm:text-sm'>
              <h3 className='text-sm sm:text-base font-bold text-foreground'>Access Hardware &amp; Network Policies</h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='p-4 border border-border rounded-lg bg-card space-y-2'>
                  <span className='font-bold text-foreground block'>Enterprise WiFi Network</span>
                  <p className='text-xs text-muted-foreground'>SSID: NexSpace-Prime-Enterprise</p>
                  <p className='text-xs text-muted-foreground'>Encryption: WPA3-Enterprise 802.1X</p>
                </div>
                <div className='p-4 border border-border rounded-lg bg-card space-y-2'>
                  <span className='font-bold text-foreground block'>Turnstile Controller Node</span>
                  <p className='text-xs text-muted-foreground'>Controller: HID VertX V1000 Gateway</p>
                  <p className='text-xs text-emerald-600 font-semibold'>Status: Online (Ping 12ms)</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Audit Logs & Governance */}
          {activeTab === 'audit' && (
            <div className='p-6 space-y-4 text-xs sm:text-sm'>
              <h3 className='text-sm sm:text-base font-bold text-foreground'>Lifecycle Audit &amp; Event Ledger</h3>
              <div className='space-y-3'>
                <div className='flex items-start gap-3 p-3 bg-muted/40 rounded-lg border border-border text-xs'>
                  <History className='size-4 text-indigo-600 shrink-0 mt-0.5' />
                  <div>
                    <span className='font-bold text-foreground block'>Automated Turnstile Security Heartbeat</span>
                    <span className='text-muted-foreground text-[11px]'>2 hours ago by Platform Agent System</span>
                  </div>
                </div>
                <div className='flex items-start gap-3 p-3 bg-muted/40 rounded-lg border border-border text-xs'>
                  <ShieldCheck className='size-4 text-emerald-600 shrink-0 mt-0.5' />
                  <div>
                    <span className='font-bold text-foreground block'>Workspace Activated on Marketplace</span>
                    <span className='text-muted-foreground text-[11px]'>3 days ago by Prime Spaces Admin</span>
                  </div>
                </div>
                <div className='flex items-start gap-3 p-3 bg-muted/40 rounded-lg border border-border text-xs'>
                  <CheckCircle2 className='size-4 text-indigo-600 shrink-0 mt-0.5' />
                  <div>
                    <span className='font-bold text-foreground block'>Partner Compliance Verification Completed</span>
                    <span className='text-muted-foreground text-[11px]'>Oct 12, 2026 by NexSpace Admin</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ==================== MODAL: PAUSE OPERATIONS ==================== */}
      <Dialog open={isPauseModalOpen} onOpenChange={setIsPauseModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-amber-600 flex items-center gap-2'>
              <Pause className='size-5' />
              <span>Pause Workspace Listing</span>
            </DialogTitle>
            <DialogDescription>
              Temporarily pause marketplace listing for <strong className='text-foreground'>{activeWorkspace.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className='py-3 text-xs text-muted-foreground space-y-2'>
            <p>
              When paused, your workspace will be marked as temporarily unavailable on the marketplace.
            </p>
            <p className='text-foreground font-semibold'>
              Existing paid reservations will remain honored, and turnstile QR codes will still function for current guests.
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsPauseModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePauseWorkspace}
              disabled={lifecycleMutation.isPending}
              className='bg-amber-600 hover:bg-amber-700 text-white'
            >
              {lifecycleMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  Pausing...
                </>
              ) : (
                'Confirm Pause'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: RESUME OPERATIONS ==================== */}
      <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-emerald-600 flex items-center gap-2'>
              <Play className='size-5' />
              <span>Resume Workspace Operations</span>
            </DialogTitle>
            <DialogDescription>
              Reactivate <strong className='text-foreground'>{activeWorkspace.name}</strong> on the public marketplace.
            </DialogDescription>
          </DialogHeader>
          <p className='py-3 text-xs text-muted-foreground'>
            Your workspace will immediately become bookable again for hot desks, dedicated desks, and meeting suites.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsResumeModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleResumeWorkspace}
              disabled={lifecycleMutation.isPending || isSuspended || isDraftOrPending}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {lifecycleMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  Resuming...
                </>
              ) : (
                'Resume Marketplace Listing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: SCHEDULE MAINTENANCE ==================== */}
      <Dialog open={isMaintenanceModalOpen} onOpenChange={setIsMaintenanceModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-purple-600 flex items-center gap-2'>
              <Wrench className='size-5' />
              <span>Schedule Maintenance Window</span>
            </DialogTitle>
            <DialogDescription>
              Flag workspace for physical deep cleaning, hardware calibration, or renovation.
            </DialogDescription>
          </DialogHeader>
          <div className='py-3 space-y-3 text-xs'>
            <div>
              <label htmlFor='maintenance-reason' className='font-semibold text-foreground block mb-1'>Maintenance Reason</label>
              <Input id='maintenance-reason' defaultValue='Deep carpet cleaning and fiber switch upgrade' className='text-xs' />
            </div>
            <p className='text-muted-foreground text-[11px]'>
              Slots during the maintenance window will be blocked from calendar booking.
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsMaintenanceModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMaintenanceWorkspace}
              disabled={lifecycleMutation.isPending || isSuspended}
              className='bg-purple-600 hover:bg-purple-700 text-white'
            >
              {lifecycleMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  Scheduling...
                </>
              ) : (
                'Confirm Maintenance'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ARCHIVE WORKSPACE ==================== */}
      <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-red-600 flex items-center gap-2'>
              <AlertTriangle className='size-5' />
              <span>Archive Workspace</span>
            </DialogTitle>
            <DialogDescription>
              This is a permanent operational decommission. All future bookings will be cancelled and refunded.
            </DialogDescription>
          </DialogHeader>
          <div className='py-3 space-y-3 text-xs'>
            <p className='text-muted-foreground'>
              To confirm, type the exact workspace name below:
            </p>
            <p className='font-bold font-mono text-foreground select-all bg-muted p-2 rounded'>
              {activeWorkspace.name}
            </p>
            <Input
              value={archiveConfirmText}
              onChange={(e) => setArchiveConfirmText(e.target.value)}
              placeholder='Type workspace name to confirm'
              className='text-xs'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
            <Button
              variant='destructive'
              disabled={archiveConfirmText !== activeWorkspace.name || lifecycleMutation.isPending}
              onClick={handleArchiveWorkspace}
            >
              {lifecycleMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  Archiving...
                </>
              ) : (
                'Archive Workspace'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PREVIEW LISTING ==================== */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Public Marketplace Preview</DialogTitle>
            <DialogDescription>{activeWorkspace.name}</DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2 text-xs'>
            {activeWorkspace.imageUrl && (
              <img
                src={activeWorkspace.imageUrl}
                alt={activeWorkspace.name}
                className='w-full aspect-video object-cover rounded-lg'
              />
            )}
            <p className='font-semibold text-foreground'>{activeWorkspace.address}</p>
            <p className='text-muted-foreground'>
              Rating: ★ {activeWorkspace.rating} ({activeWorkspace.reviewsCount} reviews) • {activeWorkspace.desksCount} Desks available
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
