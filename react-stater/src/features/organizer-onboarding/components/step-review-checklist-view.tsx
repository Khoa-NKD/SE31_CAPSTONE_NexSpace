import { useState } from 'react';
import { useLocation, useRouter, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { workspaceSiteOptions } from '@/features/organizer-resources/api/buildings';
import { amenityQueries } from '@/features/amenities/api/queries';
import { amenityService } from '@/features/amenities/api/service';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Save, ArrowLeft, Pencil, X } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { workspaceQueryKeys, workspaceService } from '@/features/workspaces/api';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { workspaceEditSnapshot, snapshotFromServer } from '../utils/workspace-edit-snapshot';
import {
  WorkspaceOverviewCards,
  overviewChangedSections,
  formatOverviewNumber
} from './workspace-overview-cards';
import { WizardStepIntro } from './wizard-step-intro';

export function StepReviewChecklistView() {
  const router = useRouter();
  const client = useQueryClient();
  const search = useLocation().search as Record<string, unknown>;
  const editing = search.mode === 'edit';
  const state = useWizardStore();
  const workspaceId = state.canonicalWorkspaceId ?? String(search.id ?? '');
  const { saveDraftToServer, isSaving } = useWizardDraftSync();
  const [error, setError] = useState('');
  const actorId = useAuthStore((s) => s.user?.id ?? 0);
  const site = useQuery({
    ...workspaceSiteOptions(actorId, Number(workspaceId)),
    enabled: actorId > 0 && !!workspaceId
  });
  const catalog = useQuery(amenityQueries.organizerAvailable());
  // Older local drafts may predate comparison snapshots. Fetch their original without replacing edits.
  const originalQuery = useQuery({
    queryKey: ['workspace-editor-original', actorId, workspaceId],
    enabled: editing && actorId > 0 && !!workspaceId && !state.editBaseline,
    staleTime: Infinity,
    queryFn: async () => {
      const [workspace, media, amenities, building] = await Promise.all([
        workspaceService.getWorkspaceById(workspaceId),
        workspaceService.getWorkspaceMedia(Number(workspaceId)),
        amenityService.getWorkspaceAmenities(workspaceId),
        client.fetchQuery(workspaceSiteOptions(actorId, Number(workspaceId)))
      ]);
      return snapshotFromServer(workspace, building, amenities, media);
    }
  });
  const original = editing ? (state.editBaseline ?? originalQuery.data) : undefined;
  const value = workspaceEditSnapshot(state, site.data);
  const changes = overviewChangedSections(value, original);
  const changeCount = changes.filter(Boolean).length;
  const cover = value.media.find((photo) => photo.cover) ?? value.media[0];
  const valid =
    value.name.trim().length >= 3 &&
    value.name.trim().length <= 100 &&
    !!value.address.trim() &&
    value.floors.length > 0 &&
    (value.is247 || value.schedule.some((day) => day.isOpen)) &&
    value.media.some((photo) => photo.cover && /^https?:/.test(photo.url));
  const ready = !site.isPending && !site.isError && (!editing || !!original);
  async function save(next: boolean) {
    if (isSaving || !ready) return;
    setError('');
    const saved = await saveDraftToServer({ commitEdit: editing, silent: true });
    if (!saved) {
      setError(
        useWizardStore.getState().syncError || 'Chưa lưu được. Vui lòng kiểm tra lại thông tin.'
      );
      return;
    }
    await client.invalidateQueries({ queryKey: workspaceQueryKeys.all });
    useWizardStore.getState().resetDraft();
    toast.success(editing ? 'Đã lưu thay đổi' : 'Đã lưu thông tin không gian');
    if (next)
      void router.navigate({
        to: '/dashboard/organizer/floorplan',
        search: { workspaceId: Number(saved.id) }
      });
    else
      void router.navigate({
        to: '/dashboard/organizer/workspaces/lifecycle',
        search: { id: String(saved.id) }
      });
  }
  function cancel() {
    // Discard only this local working copy; no compensating write can overwrite another update.
    useWizardStore.getState().resetDraft();
    void router.navigate({
      to: '/dashboard/organizer/workspaces/lifecycle',
      search: { id: workspaceId }
    });
  }
  const totalArea = value.floors.reduce(
    (sum, floor) =>
      sum +
      floor.widthM * floor.lengthM -
      (floor.outline === 'ROUNDED' ? (4 - Math.PI) * floor.cornerRadiusM ** 2 : 0),
    0
  );
  return (
    <div className='wizard-shell space-y-5'>
      <Link
        to='/dashboard/organizer/workspaces'
        className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='size-3.5' />
        Không gian của tôi
      </Link>
      <WizardStepIntro
        icon={CheckCircle2}
        title={editing ? 'Xem lại thay đổi' : 'Kiểm tra và hoàn tất'}
        description={
          editing
            ? 'Kiểm tra toàn bộ thông tin trước khi lưu. Các mục màu tím là phần bạn đã chỉnh sửa.'
            : 'Xem lại đủ 6 mục trước khi hoàn tất thông tin không gian.'
        }
      />
      <div className='overview-summary'>
        {cover && <img src={cover.url} alt='Ảnh bìa không gian' />}
        <div className='min-w-0 flex-1'>
          <h2 className='break-words text-base font-semibold'>
            {value.name || 'Không gian chưa đặt tên'}
          </h2>
          <p className='mt-1 break-words text-xs text-muted-foreground'>
            {value.address || 'Chưa có địa chỉ'}
          </p>
          <dl className='overview-metrics mt-4'>
            <div>
              <dt>Tầng</dt>
              <dd>{value.floors.length}</dd>
            </div>
            <div>
              <dt>Diện tích cấu hình</dt>
              <dd>{formatOverviewNumber(totalArea)} m²</dd>
            </div>
            <div>
              <dt>Tiện ích</dt>
              <dd>{value.amenities.length}</dd>
            </div>
            <div>
              <dt>Hình ảnh</dt>
              <dd>{value.media.length}</dd>
            </div>
            {editing && original && (
              <div>
                <dt>Mục đã thay đổi</dt>
                <dd className='text-primary'>{changeCount}/6</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      {!ready && (
        <div
          className='wizard-hint'
          role={site.isError || originalQuery.isError ? 'alert' : 'status'}
        >
          {site.isError || originalQuery.isError ? (
            <>
              <p>Chưa tải được dữ liệu gốc để đối chiếu. Bản sửa của bạn vẫn được giữ lại.</p>
              <Button
                variant='link'
                onClick={() => {
                  void site.refetch();
                  void originalQuery.refetch();
                }}
              >
                Thử lại
              </Button>
            </>
          ) : (
            'Đang tải thông tin để đối chiếu thay đổi…'
          )}
        </div>
      )}
      <WorkspaceOverviewCards
        value={value}
        original={ready ? original : undefined}
        workspaceId={workspaceId}
        amenityCatalog={catalog.data}
        editing={editing}
      />
      {error && (
        <p
          role='alert'
          className='rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive'
        >
          {error}
        </p>
      )}
      <div className='wizard-actions'>
        <p className='mr-auto text-xs text-muted-foreground'>
          {editing
            ? original && changeCount === 0
              ? 'Chưa có thay đổi so với dữ liệu gốc.'
              : 'Thay đổi chỉ được áp dụng sau khi bạn xác nhận lưu.'
            : 'Thông tin vẫn là bản nháp cho đến khi bật hoạt động.'}
        </p>
        {editing ? (
          <>
            <Button variant='ghost' disabled={isSaving} onClick={cancel}>
              <X className='size-4' />
              Hủy thay đổi
            </Button>
            <Button variant='outline' disabled={isSaving} asChild>
              <Link
                to='/dashboard/organizer/workspaces/create'
                search={{ id: workspaceId, mode: 'edit' }}
              >
                <Pencil className='size-4' />
                Tiếp tục chỉnh sửa
              </Link>
            </Button>
            <Button
              disabled={isSaving || !ready || changeCount === 0}
              onClick={() => void save(false)}
            >
              <Save className='size-4' />
              {isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant='outline'
              disabled={isSaving || !ready || !valid}
              onClick={() => void save(false)}
            >
              Lưu và hoàn tất
            </Button>
            <Button disabled={isSaving || !ready || !valid} onClick={() => void save(true)}>
              Lưu và thiết lập sơ đồ
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
