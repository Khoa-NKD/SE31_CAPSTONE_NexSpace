import { WorkspaceHolidayNotice } from '@/features/workspaces/components/detail/workspace-holiday-notice';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Layers3,
  Wrench,
  Pencil,
  ExternalLink,
  Building2,
  PlayCircle,
  PauseCircle
} from '@/components/ui/hugeicons';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useWizardStore } from '@/features/organizer-onboarding/store/wizard-store';
import {
  WorkspaceOverviewCards,
  formatOverviewNumber
} from '@/features/organizer-onboarding/components/workspace-overview-cards';
import { snapshotFromServer } from '@/features/organizer-onboarding/utils/workspace-edit-snapshot';
import { workspaceSiteOptions } from '@/features/organizer-resources/api/buildings';
import { amenityQueries } from '@/features/amenities/api/queries';
import {
  useWorkspaceDetailQuery,
  useWorkspaceMediaQuery,
  useWorkspaceLifecycleMutation
} from '@/features/workspaces/api';
import { mapCanonicalToOrganizerWorkspace } from '../utils/workspace-mapper';
import { WorkspaceStatusBadge } from './workspace-status-badge';

export function WorkspaceLifecycleView({
  workspaceId
}: {
  workspaceId?: string;
  initialTab?: 'overview' | 'bookings' | 'settings' | 'audit' | 'assets';
}) {
  const navigate = useNavigate();
  const actorId = useAuthStore((s) => s.user?.id ?? 0);
  const query = useWorkspaceDetailQuery(workspaceId ?? '');
  const media = useWorkspaceMediaQuery(workspaceId);
  const amenities = useQuery(amenityQueries.workspaceAmenities(workspaceId));
  const site = useQuery({
    ...workspaceSiteOptions(actorId, Number(workspaceId)),
    enabled: actorId > 0 && !!workspaceId
  });
  const mutation = useWorkspaceLifecycleMutation();
  if (query.isPending)
    return (
      <p role='status' className='p-6 text-sm text-muted-foreground'>
        Đang tải không gian…
      </p>
    );
  if (query.isError || !query.data)
    return (
      <div className='p-6'>
        <p role='alert'>Không tải được thông tin không gian.</p>
        <Button variant='outline' onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  const data = query.data,
    workspace = mapCanonicalToOrganizerWorkspace(data);
  const restricted = workspace.status === 'ARCHIVED';
  const value = snapshotFromServer(data, site.data ?? null, amenities.data ?? [], media.data ?? []);
  const cover = value.media.find((photo) => photo.cover) ?? value.media[0];
  const totalArea = value.floors.reduce(
    (sum, f) =>
      sum +
      f.widthM * f.lengthM -
      (f.outline === 'ROUNDED' ? (4 - Math.PI) * f.cornerRadiusM ** 2 : 0),
    0
  );
  function transition(action: 'ACTIVATE' | 'DRAFT') {
    if (mutation.isPending) return;
    mutation.mutate(
      { id: String(data.id), dto: { action }, workspaceName: data.name },
      {
        onSuccess: () => {
          void query.refetch();
        }
      }
    );
  }
  return (
    <div className='wizard-shell space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Link
          to='/dashboard/organizer/workspaces'
          className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-3.5' />
          Không gian của tôi
        </Link>
        <span className='text-[11px] text-muted-foreground'>Chi tiết không gian</span>
      </div>
      <section className='overflow-hidden rounded-2xl border bg-card'>
        <div className='flex flex-col gap-5 p-5 sm:flex-row sm:items-center'>
          {cover ? (
            <img
              src={cover.url}
              alt={data.name}
              className='h-32 w-full rounded-xl object-cover sm:h-28 sm:w-40'
            />
          ) : (
            <div className='flex h-24 w-28 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground'>
              <Building2 className='size-8' />
            </div>
          )}
          <div className='min-w-0 flex-1'>
            <div className='mb-2 flex flex-wrap items-center gap-3'>
              <h1 className='break-words text-xl font-semibold'>{data.name}</h1>
              <WorkspaceStatusBadge status={workspace.status} />
            </div>
            <p className='flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground'>
              <MapPin className='mt-0.5 size-3.5 shrink-0' />
              {value.address || 'Chưa thiết lập địa chỉ'}
            </p>
            <dl className='overview-metrics mt-4'>
              {site.data && (
                <>
                  <div>
                    <dt>Tầng</dt>
                    <dd>{value.floors.length}</dd>
                  </div>
                  <div>
                    <dt>Diện tích cấu hình</dt>
                    <dd>{formatOverviewNumber(totalArea)} m²</dd>
                  </div>
                </>
              )}
              {amenities.data && (
                <div>
                  <dt>Tiện ích</dt>
                  <dd>{value.amenities.length}</dd>
                </div>
              )}
              {media.data && (
                <div>
                  <dt>Hình ảnh</dt>
                  <dd>{value.media.length}</dd>
                </div>
              )}
              {workspace.desksCount != null && (
                <div>
                  <dt>Ghế</dt>
                  <dd>{workspace.desksCount}</dd>
                </div>
              )}
              {workspace.meetingRoomsCount != null && (
                <div>
                  <dt>Phòng họp</dt>
                  <dd>{workspace.meetingRoomsCount}</dd>
                </div>
              )}
            </dl>
          </div>
          {!restricted && (
            <div className='flex flex-wrap gap-2 sm:max-w-52'>
              <Button asChild size='sm'>
                <Link
                  to='/dashboard/organizer/workspaces/create'
                  search={{ id: String(data.id), mode: 'edit' }}
                  onClick={() => useWizardStore.getState().resetDraft()}
                >
                  <Pencil className='size-3.5' />
                  Chỉnh sửa hồ sơ
                </Link>
              </Button>
              {(workspace.status === 'ACTIVE' || workspace.status === 'HOLIDAY') && (
                <Button asChild variant='outline' size='sm'>
                  <Link to='/workspaces/$workspaceId' params={{ workspaceId: String(data.id) }}>
                    <ExternalLink className='size-3.5' />
                    Trang công khai
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2 border-t bg-muted/15 px-5 py-3'>
          <Button asChild size='sm' variant='ghost'>
            <Link to='/dashboard/organizer/floorplan' search={{ workspaceId: Number(data.id) }}>
              <Layers3 className='size-4' />
              Sơ đồ tầng
            </Link>
          </Button>
          <Button asChild size='sm' variant='ghost'>
            <Link to='/dashboard/organizer/blockout' search={{ workspaceId: Number(data.id) }}>
              <Wrench className='size-4' />
              Lịch bảo trì
            </Link>
          </Button>
          {!restricted && (
            <div className='ml-auto flex flex-wrap gap-2'>
              {workspace.status === 'ACTIVE' || workspace.status === 'HOLIDAY' ? (
                <Button
                  size='sm'
                  variant='outline'
                  disabled={mutation.isPending}
                  onClick={() => transition('DRAFT')}
                >
                  <PauseCircle className='size-3.5' />
                  Ngưng hoạt động
                </Button>
              ) : (
                workspace.status !== 'MAINTENANCE' && (
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={mutation.isPending}
                    onClick={() => transition('ACTIVATE')}
                  >
                    <PlayCircle className='size-3.5' />
                    Bật hoạt động
                  </Button>
                )
              )}
              {workspace.status !== 'MAINTENANCE' && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() =>
                    void navigate({
                      to: '/dashboard/organizer/blockout',
                      search: { workspaceId: Number(data.id), scope: 'workspace' }
                    })
                  }
                >
                  <Wrench className='size-3.5' />
                  Bảo trì toàn không gian
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
      <WorkspaceHolidayNotice workspace={data} />
      {mutation.isError && (
        <p role='alert' className='text-xs text-destructive'>
          {mutation.error.message}
        </p>
      )}
      {site.isError || amenities.isError || media.isError ? (
        <div className='wizard-hint' role='alert'>
          Một số thông tin chưa tải được.
          <Button
            variant='link'
            onClick={() => {
              void site.refetch();
              void amenities.refetch();
              void media.refetch();
            }}
          >
            Tải lại
          </Button>
        </div>
      ) : site.isPending || amenities.isPending || media.isPending ? (
        <p role='status' className='text-xs text-muted-foreground'>
          Đang tải tầng, tiện ích và hình ảnh…
        </p>
      ) : null}
      <WorkspaceOverviewCards
        value={value}
        workspaceId={String(data.id)}
        amenityCatalog={amenities.data?.map((a) => ({
          id: a.amenityId,
          name: a.name,
          icon: a.icon
        }))}
        editable={false}
      />
    </div>
  );
}
