import { resourceUsageKinds } from '../utils/resource-usage-kinds';
import { ResourceInventoryTable } from './resource-inventory-table';
import { ResourceFloorManager } from './resource-floor-manager';
import { getResource } from '../api/resources';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Armchair,
  Building2,
  Layers3,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Settings2,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  LockKeyhole
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useLanguage } from '@/features/landing/context/language-context';
import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  resourceWorkspacesOptions,
  resourceOptions,
  resourcesOptions,
  invalidateResources,
  setResourceStatus,
  deleteResource,
  resourceMoney,
  canConfigureWorkspaceResources
} from '../api/resources';
import type { ResourceDetail, ResourceFilters, TypeOption } from '../api/resources';
import { ResourceEditor, ResourceSetupDialog } from './resource-editor';
import { WorkspaceSelector } from './workspace-selector';

const subscribe = () => () => {};
const initialFilters: ResourceFilters = {
  page: 1,
  size: 20,
  search: '',
  category: '',
  status: '',
  floorPlanId: ''
};
const selectClass =
  'border-input bg-background h-10 min-w-0 rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ResourceManagementView({ initialCreate = false }: { initialCreate?: boolean }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const actorId = user?.id ?? 0;
  const allowed = mounted && !!token && getUserRole(user) === 'ORGANIZER';
  const { language } = useLanguage();
  const vi = language === 'vi';
  const c = (en: string, vn: string) => (vi ? vn : en);
  const client = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState(0);
  const [filters, setFilters] = useState<ResourceFilters>(initialFilters);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<ResourceDetail | 'new' | null>(initialCreate ? 'new' : null);
  const [setup, setSetup] = useState<{ kind: 'floor' | 'type'; current?: TypeOption } | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [floorManager, setFloorManager] = useState(false);
  const [remove, setRemove] = useState<ResourceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [notice, setNotice] = useState({ success: '', error: '' });
  useApplicationNotice(notice.success, notice.error, busy || !!editor || !!setup || floorManager);
  const workspaces = useQuery({ ...resourceWorkspacesOptions(actorId), enabled: allowed });
  const selectedWorkspace =
    workspaces.data?.find((w) => w.id === workspaceId) ?? workspaces.data?.[0];
  const selectedId = selectedWorkspace?.id ?? 0;
  const options = useQuery({
    ...resourceOptions(actorId, selectedId),
    enabled: allowed && selectedId > 0
  });
  const query = useQuery({
    ...resourcesOptions(actorId, selectedId, filters),
    enabled: allowed && selectedId > 0
  });
  // A deletion may remove the last page. Retry this render with a valid page before showing controls.
  const lastPage = Math.max(query.data?.totalPages ?? filters.page, 1);
  if (query.data && filters.page > lastPage) {
    setFilters({ ...filters, page: lastPage });
  }
  const updateFilters = (value: Partial<ResourceFilters>) =>
    setFilters((current) => ({ ...current, ...value, page: 1 }));
  const writable = canConfigureWorkspaceResources(selectedWorkspace?.status);
  const openEditor = (value: ResourceDetail | 'new') => {
    setNotice({ success: '', error: '' });
    setEditor(value);
  };
  const openSetup = (value: { kind: 'floor' | 'type'; current?: TypeOption }) => {
    setNotice({ success: '', error: '' });
    setSetup(value);
  };
  async function saved() {
    await invalidateResources(client, actorId);
    setNotice({ success: c('Saved successfully.', 'Đã lưu thành công.'), error: '' });
  }
  async function act(action: () => Promise<unknown>, success: string) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setNotice({ success: '', error: '' });
    try {
      await action();
      await invalidateResources(client, actorId);
      setRemove(null);
      setNotice({ success, error: '' });
    } catch (e) {
      setNotice({
        success: '',
        error: e instanceof Error ? e.message : c('Operation failed.', 'Thao tác thất bại.')
      });
      await invalidateResources(client, actorId);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  if (!mounted)
    return (
      <p role='status' className='text-muted-foreground flex items-center gap-2 p-6'>
        <LoaderCircle className='size-4 animate-spin' />
        {c('Loading your resources…', 'Đang tải ghế/phòng của bạn…')}
      </p>
    );
  if (!allowed)
    return (
      <p role='alert'>
        {c('Sign in with an Organizer account.', 'Vui lòng đăng nhập bằng tài khoản Organizer.')}
      </p>
    );
  if (workspaces.isPending)
    return <p role='status'>{c('Loading your resources…', 'Đang tải ghế/phòng…')}</p>;
  if (editor && options.data && writable)
    return (
      <ResourceEditor
        key={editor === 'new' ? `new-${selectedId}` : editor.id}
        workspaceId={selectedId}
        options={options.data}
        current={editor === 'new' ? undefined : editor}
        onClose={() => setEditor(null)}
        onSaved={saved}
      />
    );
  const statusLabel = (status: string) =>
    ({
      DRAFT: c('Draft', 'Nháp'),
      ACTIVE: c('Active', 'Đang bật'),
      DISABLED: c('Disabled', 'Đã tắt'),
      ARCHIVED: c('Archived', 'Lưu trữ')
    })[status] ?? status;
  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-6 pb-6'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <span className='bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl'>
            <Armchair className='size-6' />
          </span>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
              {c('Resource Management', 'Quản lý ghế & phòng')}
            </h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              {c(
                'A real inventory of bookable desks and rooms across your workspaces.',
                'Quản lý danh sách ghế, phòng và trạng thái nhận đặt tại workspace của bạn.'
              )}
            </p>
          </div>
        </div>
        <Button disabled={!writable || busy || !options.data} onClick={() => openEditor('new')}>
          <Plus className='size-4' />
          {c('Create resource', 'Tạo ghế/phòng')}
        </Button>
      </header>
      {workspaces.isError ? (
        <div role='alert' className='border-destructive/20 text-destructive rounded-xl border p-4'>
          <p>{workspaces.error.message}</p>
          <Button className='mt-3' variant='outline' onClick={() => void workspaces.refetch()}>
            {c('Try again', 'Thử lại')}
          </Button>
        </div>
      ) : !selectedWorkspace ? (
        <Card>
          <CardContent className='text-muted-foreground flex min-h-56 flex-col items-center justify-center gap-3 text-center'>
            <Building2 className='size-10' />
            <h2 className='text-foreground font-semibold'>
              {c('Create a workspace first', 'Bạn chưa có workspace')}
            </h2>
            <p className='text-sm'>
              {c(
                'Resources belong to a workspace, a floor and a resource type.',
                'Ghế/phòng phải thuộc một workspace, tầng và loại chỗ.'
              )}
            </p>
            <Button
              variant='outline'
              onClick={() => {
                window.location.href = '/dashboard/organizer/workspaces';
              }}
            >
              {c('My workspaces', 'Workspace của tôi')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='border-border bg-card flex flex-wrap items-end justify-between gap-4 rounded-xl border p-4 sm:p-5'>
            <div className='min-w-56 flex-1 space-y-2'>
              <span className='text-muted-foreground text-xs font-medium'>
                {c('Workspace', 'Không gian làm việc')}
              </span>
              <WorkspaceSelector
                workspaces={workspaces.data ?? []}
                value={selectedId}
                onChange={(id) => {
                  setWorkspaceId(id);
                  setFilters(initialFilters);
                  setSearch('');
                  setEditor(null);
                }}
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                disabled={!writable || busy}
                onClick={() => openSetup({ kind: 'floor' })}
              >
                <Layers3 className='size-4' />
                {c('Add floor', 'Thêm tầng')}
              </Button>
              <Button
                variant='outline'
                disabled={busy || !options.data}
                onClick={() => setFloorManager(true)}
              >
                <Layers3 className='size-4' />
                {c('Floor canvas', 'Sơ đồ & publish tầng')}
              </Button>
              <Button
                variant='outline'
                disabled={!writable || busy || !options.data}
                onClick={() => setTypesOpen(true)}
              >
                <Settings2 className='size-4' />
                {c('Resource types', 'Loại chỗ & giá')}
              </Button>
              <Button
                variant='outline'
                aria-label={c('Refresh', 'Làm mới')}
                disabled={query.isFetching || options.isFetching}
                onClick={() => void invalidateResources(client, actorId)}
              >
                <RefreshCw className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {!writable && (
            <p
              role='status'
              className='border-border bg-muted text-muted-foreground rounded-lg border p-3 text-sm'
            >
              {c(
                'This workspace is read-only. Floors, resource types and seats/rooms can only be changed while the workspace is Draft, Active or Inactive.',
                'Không gian này chỉ được xem. Chỉ có thể chỉnh sửa tầng, loại chỗ và ghế/phòng khi không gian ở trạng thái Nháp, Đang hoạt động hoặc Tạm ngừng hoạt động.'
              )}
            </p>
          )}
          {options.isError && (
            <p role='alert' className='text-destructive text-sm'>
              {options.error.message}
            </p>
          )}
          {options.data &&
            (!options.data.floors.length ||
              !options.data.types.some((t) => t.active && t.currency)) && (
              <div className='border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border p-4'>
                <Layers3 className='text-primary mt-0.5 size-5 shrink-0' />
                <div>
                  <p className='font-medium'>
                    {c('Complete your resource setup', 'Hoàn thành cấu hình trước khi tạo chỗ')}
                  </p>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {c(
                      'Add a real floor and a resource type with a base price and confirmed VND/USD currency. Draft floors support draft resources; activation requires a published floor.',
                      'Thêm tầng và loại chỗ có giá cơ bản, tiền tệ VND/USD rõ ràng. Tầng nháp cho phép tạo ghế/phòng nháp; muốn bật phải có tầng đã publish.'
                    )}
                  </p>
                </div>
              </div>
            )}
          <section className='border-border bg-card overflow-hidden rounded-xl border'>
            <div className='border-border grid gap-3 border-b p-4 md:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr]'>
              <form
                className='flex gap-2'
                onSubmit={(e) => {
                  e.preventDefault();
                  updateFilters({ search: search.trim() });
                }}
              >
                <div className='relative min-w-0 flex-1'>
                  <Search className='text-muted-foreground absolute top-3 left-3 size-4' />
                  <Input
                    className='pl-9'
                    aria-label={c('Search code or name', 'Tìm mã hoặc tên')}
                    value={search}
                    maxLength={100}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={c('Search code or name…', 'Tìm mã hoặc tên…')}
                  />
                </div>
                <Button type='submit' variant='secondary'>
                  {c('Search', 'Tìm')}
                </Button>
              </form>
              <select
                className={selectClass}
                aria-label={c('Floor', 'Tầng')}
                value={filters.floorPlanId}
                onChange={(e) =>
                  updateFilters({ floorPlanId: e.target.value ? Number(e.target.value) : '' })
                }
              >
                <option value=''>{c('All floors', 'Tất cả tầng')}</option>
                {options.data?.floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label={c('Category', 'Nhóm chỗ')}
                value={filters.category}
                onChange={(e) =>
                  updateFilters({ category: e.target.value as ResourceFilters['category'] })
                }
              >
                <option value=''>{c('Desks & rooms', 'Tất cả ghế/phòng')}</option>
                <option value='DESK'>{c('Desks', 'Ghế')}</option>
                <option value='ROOM'>{c('Rooms', 'Phòng')}</option>
              </select>
              <select
                className={selectClass}
                aria-label={c('Status', 'Trạng thái')}
                value={filters.status}
                onChange={(e) =>
                  updateFilters({ status: e.target.value as ResourceFilters['status'] })
                }
              >
                <option value=''>{c('All statuses', 'Tất cả trạng thái')}</option>
                {(['DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED'] as const).map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-center justify-between px-5 py-3'>
              <p className='text-muted-foreground text-sm'>
                {query.data?.totalRecords ?? 0} {c('matching resources', 'ghế/phòng phù hợp')}
              </p>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setFilters(initialFilters);
                  setSearch('');
                }}
              >
                {c('Reset filters', 'Xóa bộ lọc')}
              </Button>
            </div>
            {query.isPending ? (
              <p role='status' className='text-muted-foreground p-8 text-center'>
                {c('Loading inventory…', 'Đang tải danh sách…')}
              </p>
            ) : query.isError ? (
              <div role='alert' className='space-y-3 p-6'>
                <p className='text-destructive text-sm'>{query.error.message}</p>
                <Button variant='outline' onClick={() => void query.refetch()}>
                  {c('Try again', 'Thử lại')}
                </Button>
              </div>
            ) : !query.data?.listObjects.length ? (
              <div className='text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center'>
                <Armchair className='size-9' />
                <p>
                  {c('No resources match your filters.', 'Chưa có ghế/phòng phù hợp với bộ lọc.')}
                </p>
                <Button variant='outline' disabled={!writable} onClick={() => openEditor('new')}>
                  <Plus className='size-4' />
                  {c('Create the first resource', 'Tạo ghế/phòng đầu tiên')}
                </Button>
              </div>
            ) : (
              <ResourceInventoryTable
                data={query.data}
                options={options.data}
                workspaceStatus={selectedWorkspace.status}
                writable={writable}
                busy={busy}
                onEdit={openEditor}
                onDelete={setRemove}
                onStatus={(resource, status) =>
                  void act(
                    () => setResourceStatus(resource, status),
                    c(
                      'Status updated. Existing bookings are unchanged.',
                      'Đã đổi trạng thái, giữ nguyên booking hiện có.'
                    )
                  )
                }
              />
            )}
            <div className='border-border bg-muted/15 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4'>
              <div className='text-muted-foreground flex items-center gap-3 text-xs'>
                <span>{c('Rows', 'Số dòng')}</span>
                <select
                  className={`${selectClass} h-8`}
                  value={filters.size}
                  onChange={(e) => updateFilters({ size: Number(e.target.value) })}
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size}>{size}</option>
                  ))}
                </select>
                <span>
                  {c('Page', 'Trang')} {filters.page}/{Math.max(query.data?.totalPages ?? 0, 1)}
                </span>
              </div>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={query.isFetching || !query.data?.hasPrevious}
                  onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}
                >
                  <ChevronLeft className='size-4' />
                  {c('Previous', 'Trước')}
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={query.isFetching || !query.data?.hasNext}
                  onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}
                >
                  {c('Next', 'Tiếp')}
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            </div>
          </section>
          <p className='text-muted-foreground flex items-start gap-2 text-xs leading-5'>
            <LockKeyhole className='size-4 shrink-0' />
            {c(
              'Displayed prices retain VND/USD as saved, without currency conversion. Disabling stops new availability and does not cancel bookings. Deletion is blocked by booking history or linked records.',
              'Giá hiển thị giữ nguyên VND/USD đã lưu, không tự quy đổi. Tắt chỗ không hủy booking. Không xóa khi có lịch sử booking hoặc dữ liệu liên kết.'
            )}
          </p>
        </>
      )}
      {floorManager && options.data && (
        <ResourceFloorManager
          actorId={actorId}
          workspaceId={selectedId}
          floors={options.data.floors}
          writable={writable}
          onClose={() => setFloorManager(false)}
          onSaved={() => invalidateResources(client, actorId)}
          onFix={(id) => {
            setFloorManager(false);
            void act(async () => {
              openEditor(await getResource(id));
            }, '');
          }}
        />
      )}
      {setup && selectedId > 0 && (
        <ResourceSetupDialog
          workspaceId={selectedId}
          kind={setup.kind}
          current={setup.current}
          floors={options.data?.floors ?? []}
          onClose={() => setSetup(null)}
          onSaved={saved}
        />
      )}
      <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
        <DialogContent className='max-h-[85dvh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{c('Resource types & base prices', 'Loại chỗ & giá cơ bản')}</DialogTitle>
            <DialogDescription>
              {c(
                'VND and USD are separate price denominations, not automatic conversions.',
                'VND và USD là tiền tệ của từng loại chỗ, không phải giá tự quy đổi.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            {options.data?.types.map((type) => (
              <div
                key={type.id}
                className='border-border flex items-start justify-between gap-3 rounded-lg border p-4'
              >
                <div>
                  <p className='font-medium'>
                    {type.name} <Badge variant='outline'>{type.category}</Badge>
                  </p>
                  <p className='text-muted-foreground mt-2 text-xs'>
                    {type.capacity} {c('people', 'người')} ·{' '}
                    {type.currency ?? c('Currency unconfirmed', 'Chưa xác nhận tiền tệ')}
                  </p>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {type.usageKind
                      ? c(
                          resourceUsageKinds.find((item) => item.value === type.usageKind)?.en ??
                            type.usageKind,
                          resourceUsageKinds.find((item) => item.value === type.usageKind)?.vi ??
                            type.usageKind
                        )
                      : c('Usage unconfirmed', 'Chưa xác nhận kiểu chỗ')}
                    {' · '}
                    {type.standardWidthM && type.standardLengthM
                      ? String(type.standardWidthM) + ' × ' + String(type.standardLengthM) + ' m'
                      : c('Dimensions unconfirmed', 'Chưa xác nhận kích thước')}
                  </p>
                  <p className='mt-2 text-sm'>
                    {resourceMoney(type.pricePerHour, type.currency, vi)} /{c('hour', 'giờ')}
                  </p>
                  {!type.currency && (
                    <p className='text-destructive mt-2 text-xs'>
                      {c(
                        'Confirm denomination before creating or activating resources.',
                        'Cần xác nhận tiền tệ trước khi tạo hoặc bật ghế/phòng.'
                      )}
                    </p>
                  )}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={!writable}
                  onClick={() => {
                    setTypesOpen(false);
                    openSetup({ kind: 'type', current: type });
                  }}
                >
                  <Pencil className='size-3.5' />
                  {c('Edit', 'Sửa')}
                </Button>
              </div>
            ))}
          </div>
          <Button
            disabled={!writable}
            onClick={() => {
              setTypesOpen(false);
              openSetup({ kind: 'type' });
            }}
          >
            <Plus className='size-4' />
            {c('Add resource type', 'Thêm loại chỗ')}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !busy) setRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c('Delete this resource?', 'Xóa ghế/phòng này?')}</DialogTitle>
            <DialogDescription>
              {remove?.code} · {remove?.name}
            </DialogDescription>
          </DialogHeader>
          <p className='text-muted-foreground text-sm'>
            {c(
              'This permanently deletes a resource only if it has no bookings or linked data. If deletion is blocked, disable it instead.',
              'Chỉ xóa vĩnh viễn khi không có booking và dữ liệu liên kết. Nếu không đủ điều kiện, hãy tắt chỗ để giữ lịch sử.'
            )}
          </p>
          <div className='flex justify-end gap-3'>
            <Button variant='outline' disabled={busy} onClick={() => setRemove(null)}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button
              variant='destructive'
              disabled={busy || !remove}
              onClick={() =>
                remove &&
                void act(() => deleteResource(remove), c('Resource deleted.', 'Đã xóa ghế/phòng.'))
              }
            >
              {busy && <LoaderCircle className='size-4 animate-spin' />}
              {c('Delete', 'Xóa')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
