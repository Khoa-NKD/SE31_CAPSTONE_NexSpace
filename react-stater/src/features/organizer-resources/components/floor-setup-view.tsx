import { buildingsOptions } from '../api/buildings';
import { FloorActions } from './floor-actions';
import { useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import {
  resourceWorkspacesOptions,
  resourceOptions,
  canConfigureWorkspaceResources,
  invalidateResources,
  type ResourceDetail
} from '../api/resources';
import { FloorCanvasWorkspace } from './floor-canvas-workspace';
import { WorkspaceFloorGallery } from './workspace-floor-gallery';
import { WorkspaceBuildingView } from './workspace-building-view';
import { ResourceEditor, ResourceSetupDialog } from './resource-editor';

const subscribe = () => () => {};
export type FloorStudioLocation = { workspaceId?: number; floorId?: number };
export function FloorSetupView({
  location,
  onNavigate
}: {
  location: FloorStudioLocation;
  onNavigate: (next: FloorStudioLocation) => void;
}) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const actorId = user?.id ?? 0;
  const allowed = mounted && !!token && getUserRole(user) === 'ORGANIZER';
  const client = useQueryClient();
  const workspaces = useQuery({ ...resourceWorkspacesOptions(actorId), enabled: allowed });
  const selected = workspaces.data?.find((workspace) => workspace.id === location.workspaceId);
  const options = useQuery({
    ...resourceOptions(actorId, selected?.id ?? 0),
    enabled: allowed && !!selected
  });
  const locations = useQuery({ ...buildingsOptions(actorId), enabled: allowed });
  const physicalBuilding = locations.data?.find((b) =>
    options.data?.floors.some((f) => f.location?.buildingId === b.id)
  );
  const [dialog, setDialog] = useState<{
    kind: 'floor' | 'type' | 'resource';
    floorId: number;
    resource?: ResourceDetail;
  } | null>(null);
  const saved = () => invalidateResources(client, actorId);
  if (!mounted || workspaces.isPending || (!!selected && options.isPending))
    return (
      <div
        role='status'
        className='flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground'
      >
        <LoaderCircle className='size-5 animate-spin text-primary' />
        {c('Opening Floor Studio…', 'Đang mở trình thiết kế tầng…')}
      </div>
    );
  if (workspaces.isError || (selected && options.isError))
    return (
      <div role='alert' className='rounded-2xl border border-destructive/20 bg-destructive/5 p-6'>
        <p className='mb-3 text-sm text-destructive'>
          {workspaces.error?.message ?? options.error?.message}
        </p>
        <Button
          variant='outline'
          onClick={() => {
            void workspaces.refetch();
            if (selected) void options.refetch();
          }}
        >
          {c('Retry', 'Thử lại')}
        </Button>
      </div>
    );
  if (!location.workspaceId)
    return (
      <WorkspaceFloorGallery
        workspaces={workspaces.data ?? []}
        onOpen={(workspaceId) => onNavigate({ workspaceId })}
      />
    );
  const floor = options.data?.floors.find((item) => item.id === location.floorId);
  if (!selected || !options.data || (location.floorId && !floor))
    return (
      <div className='space-y-4 rounded-2xl border border-border p-10 text-center'>
        <p className='text-sm text-muted-foreground'>
          {c(
            'This workspace or floor is no longer available to your account.',
            'Không gian hoặc tầng không tồn tại hoặc không thuộc tài khoản của bạn.'
          )}
        </p>
        <Button variant='outline' onClick={() => onNavigate({})}>
          <ArrowLeft className='size-4' />
          {c('Back to workspaces', 'Về danh sách không gian')}
        </Button>
      </div>
    );
  if (dialog?.kind === 'resource')
    return (
      <ResourceEditor
        workspaceId={selected.id}
        options={
          dialog.resource
            ? options.data
            : {
                ...options.data,
                floors: options.data.floors.filter((item) => item.id === dialog.floorId)
              }
        }
        current={dialog.resource}
        onSaved={saved}
        onClose={() => setDialog(null)}
      />
    );
  return (
    <>
      {!floor && physicalBuilding && options.data.floors.some((f) => !f.location) && (
        <section className='mb-4 space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4'>
          <p className='text-sm font-semibold'>
            {c(
              'Existing layouts awaiting physical location',
              'Sơ đồ cũ chờ liên kết vị trí vật lý'
            )}
          </p>
          {options.data.floors
            .filter((f) => !f.location)
            .map((f) => (
              <div
                key={f.id}
                className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3'
              >
                <button
                  type='button'
                  className='text-sm font-medium hover:text-primary'
                  onClick={() => onNavigate({ workspaceId: selected.id, floorId: f.id })}
                >
                  {f.name} · {f.floorNumber}
                </button>
                <FloorActions
                  workspaceId={selected.id}
                  floor={f}
                  floors={options.data!.floors}
                  disabled={!canConfigureWorkspaceResources(selected.status)}
                  onSaved={saved}
                  onCopied={(copy) => onNavigate({ workspaceId: selected.id, floorId: copy.id })}
                />
              </div>
            ))}
        </section>
      )}
      {floor ? (
        <FloorCanvasWorkspace
          key={`${selected.id}:${floor.id}`}
          actorId={actorId}
          workspaceId={selected.id}
          initialFloorId={floor.id}
          workspaces={workspaces.data ?? []}
          options={options.data}
          writable={canConfigureWorkspaceResources(selected.status)}
          onWorkspaceChange={(workspaceId) => onNavigate({ workspaceId })}
          onFloorChange={(floorId) => onNavigate({ workspaceId: selected.id, floorId })}
          onBack={() => onNavigate({ workspaceId: selected.id })}
          onSaved={saved}
          onAdd={(kind, floorId) => setDialog({ kind, floorId })}
          onEditResource={(resource) =>
            setDialog({ kind: 'resource', floorId: resource.floorPlanId, resource })
          }
        />
      ) : (
        <WorkspaceBuildingView
          onSaved={saved}
          actorId={actorId}
          workspace={selected}
          building={physicalBuilding}
          floors={options.data.floors}
          onBack={() => onNavigate({})}
          onOpenFloor={(floorId, workspaceId) =>
            onNavigate({ workspaceId: workspaceId ?? selected.id, floorId })
          }
          onAddFloor={() => setDialog({ kind: 'floor', floorId: 0 })}
        />
      )}
      {dialog && (
        <ResourceSetupDialog
          workspaceId={selected.id}
          kind={dialog.kind}
          floors={options.data.floors}
          onSaved={saved}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
