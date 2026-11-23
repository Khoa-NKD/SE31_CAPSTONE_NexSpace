import { Spinner, Spinner as Loader2 } from '@/components/ui/spinner';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, RefreshCw, AlertCircle, Activity, type AppIcon } from '@/components/ui/hugeicons';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { resourceWorkspacesOptions } from '@/features/organizer-resources/api/resources';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { operationsApi } from '../api';
import { Button } from '@/components/ui/button';

export const selectClass = 'organizer-control';
export const panelClass = 'organizer-surface p-4 sm:p-5';
export function useOperationsWorkspace(initialWorkspaceId?: number) {
  const actor = useAuthStore((s) => s.user?.id) ?? 0;
  const [chosen, setChosen] = useState<number | undefined>(initialWorkspaceId);
  const workspaces = useQuery({ ...resourceWorkspacesOptions(actor), enabled: !!actor });
  const workspaceId = workspaces.data?.some((w) => w.id === chosen)
    ? chosen
    : workspaces.data?.[0]?.id;
  const pricing = useQuery({
    queryKey: ['organizer-operations', actor, workspaceId, 'pricing'],
    queryFn: ({ signal }) => operationsApi.pricing(workspaceId!, signal),
    enabled: !!actor && !!workspaceId
  });
  const client = useQueryClient();
  async function invalidate() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['organizer-operations', actor] }),
      client.invalidateQueries({ queryKey: ['organizer-resources', actor] }),
      client.invalidateQueries({ queryKey: ['bookings'] }),
      client.invalidateQueries({ queryKey: ['availability'] }),
      client.invalidateQueries({ queryKey: ['public-floor-maps'] }),
      client.invalidateQueries({ queryKey: ['workspaces'] })
    ]);
  }
  return { actor, workspaces, workspaceId, setWorkspaceId: setChosen, pricing, invalidate };
}
export type OperationsWorkspace = ReturnType<typeof useOperationsWorkspace>;
export function OperationsHeader({
  title,
  description,
  state,
  children,
  icon,
  disabled = false
}: {
  title: string;
  description: string;
  state: OperationsWorkspace;
  children?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const c = useOrganizerCopy();
  return (
    <div className='space-y-3'>
      <OrganizerPageHeader title={title} description={description} icon={icon ?? <Building2 />}>
        {children}
        <Button
          variant='outline'
          size='icon'
          aria-label={c('Refresh', 'Làm mới')}
          disabled={disabled}
          onClick={() => void state.invalidate()}
        >
          {state.pricing.isFetching ? <Spinner className={`size-4 `} /> : <RefreshCw className={`size-4 `} />}
        </Button>
      </OrganizerPageHeader>
      <div className='organizer-toolbar justify-between'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <span className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
            <Building2 className='size-4' />
            {c('Workspace', 'Không gian')}
          </span>
          <select
            aria-label={c('Workspace', 'Không gian')}
            className={`${selectClass} w-full sm:w-auto sm:min-w-60`}
            value={state.workspaceId ?? ''}
            onChange={(e) => state.setWorkspaceId(Number(e.target.value))}
            disabled={disabled || !state.workspaces.data?.length}
          >
            {!state.workspaces.data?.length && (
              <option value=''>{c('No workspaces', 'Chưa có workspace')}</option>
            )}
            {state.workspaces.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || `Workspace #${w.id}`}
              </option>
            ))}
          </select>
        </div>
        <p className='text-[11px] text-muted-foreground'>
          {c(
            'Manage settings for the selected workspace.',
            'Quản lý thiết lập của không gian đang chọn.'
          )}
        </p>
      </div>
    </div>
  );
}
export function OperationsState({ state }: { state: OperationsWorkspace }) {
  const c = useOrganizerCopy();
  const error = state.workspaces.error ?? state.pricing.error;
  if (error)
    return (
      <div role='alert' className={`${panelClass} flex items-center gap-2 text-destructive`}>
        <AlertCircle className='size-4' />
        {error.message}
        <Button
          variant='outline'
          onClick={() => {
            void state.workspaces.refetch();
            void state.pricing.refetch();
          }}
        >
          {c('Retry', 'Thử lại')}
        </Button>
      </div>
    );
  if (state.workspaces.isPending || (state.workspaceId && state.pricing.isPending))
    return (
      <div role='status' className={`${panelClass} flex items-center gap-2`}>
        <Loader2 className='size-4' />
        {c('Loading workspace data…', 'Đang tải dữ liệu workspace…')}
      </div>
    );
  if (!state.workspaceId)
    return (
      <p className={panelClass}>
        {c(
          'Create a workspace first to start managing operations.',
          'Tạo workspace để bắt đầu quản lý giá và lịch nhận đặt.'
        )}
      </p>
    );
  return null;
}
export function OperationMetrics({
  items
}: {
  items: Array<{ label: string; value: ReactNode; icon?: AppIcon; unit?: string }>;
}) {
  return (
    <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
      {items.map((item, index) => {
        const Icon = item.icon ?? Activity;
        const tone = [
          'bg-primary/10 text-primary',
          'bg-sky-500/10 text-sky-600 dark:text-sky-400',
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        ][index % 4];
        return (
          <div
            key={item.label}
            className={`${panelClass} organizer-kpi flex items-start justify-between gap-3`}
          >
            <div className='min-w-0'>
              <p className='text-[11px] font-medium leading-relaxed text-muted-foreground'>
                {item.label}
              </p>
              <p className='mt-2 break-words text-[clamp(1.4rem,2vw,1.8rem)] font-semibold tracking-tight tabular-nums'>
                {item.value}
                {item.unit && (
                  <span className='ml-1.5 text-xs font-normal text-muted-foreground'>
                    {item.unit}
                  </span>
                )}
              </p>
            </div>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className='size-4' />
            </span>
          </div>
        );
      })}
    </div>
  );
}
