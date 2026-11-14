import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Building2, CalendarDays, CircleAlert, Loader2, Mail, PauseCircle, PlayCircle, Search, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { backendRequest } from '@/features/auth/api/session';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { validApplicationId } from '@/features/admin-organizers/api/application-details';
import {
  organizerPartnersEndpoint,
  organizerOperationalStatusKey,
  type OrganizerPartnerDetail,
  type OrganizerPartnerPage
} from '@/features/admin-organizers/api/partners';

const path = '/dashboard/admin/organizer-partners';
const statusFilters = [
  { value: '', label: 'Tất cả' },
  { value: 'false', label: 'Đang hoạt động' },
  { value: 'true', label: 'Tạm ngưng' }
];

export const Route = createFileRoute('/dashboard/admin/organizer-partners')({
  validateSearch: (search: Record<string, unknown>): { organizerId?: string } => {
    const organizerId = String(search.organizerId ?? '');
    return validApplicationId(organizerId) ? { organizerId } : {};
  },
  head: () => ({ meta: [{ title: 'Quản lý đối tác | NexSpace' }] }),
  component: OrganizerPartners
});

function OrganizerPartners() {
  const { organizerId } = Route.useSearch();
  const actorId = useAuthStore((state) => state.user?.id);

  return (
    <main className='mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-8'>
      <header className='relative isolate overflow-hidden rounded-3xl border bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8'>
        <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-indigo-500/15 via-primary/5 to-transparent dark:from-indigo-400/15' />
        <Building2 aria-hidden='true' className='pointer-events-none absolute -right-6 -top-10 -z-10 hidden size-60 rotate-12 text-indigo-500/10 sm:block dark:text-indigo-300/10' strokeWidth={0.7} />
        <div className='flex items-center gap-4'>
          <span className='grid size-12 shrink-0 place-items-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 sm:size-14'>
            <Building2 className='size-6' aria-hidden='true' />
          </span>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>Quản lý đối tác</h1>
            <p className='mt-1 text-sm text-muted-foreground'>Theo dõi quyền hoạt động của Organizer đã được duyệt.</p>
          </div>
        </div>
      </header>
      {actorId != null && (organizerId
        ? <PartnerDetail key={organizerId} actorId={actorId} id={organizerId} />
        : <PartnerDirectory actorId={actorId} />)}
    </main>
  );
}

function PartnerBadge({ suspended }: { suspended: boolean }) {
  return (
    <Badge variant='outline' className={`gap-1.5 rounded-full px-2.5 py-1 ${suspended
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300'
      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'}`}>
      <span className='size-1.5 rounded-full bg-current' aria-hidden='true' />
      {suspended ? 'Tạm ngưng' : 'Đang hoạt động'}
    </Badge>
  );
}

function PartnerDirectory({ actorId }: { actorId: number }) {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const partners = useQuery({
    queryKey: ['organizer-partners', actorId, 'list', page, search, status],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), search });
      if (status) params.set('suspended', status);
      return backendRequest<OrganizerPartnerPage>(`${organizerPartnersEndpoint}?${params}`, 'GET', undefined, true, signal);
    },
    retry: false
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(keyword.trim());
    setPage(1);
  }

  return (
    <Card className='gap-0 overflow-hidden rounded-2xl py-0 shadow-sm'>
      <CardHeader className='gap-4 border-b p-4 sm:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <CardTitle>Danh sách đối tác</CardTitle>
          {partners.data && <Badge variant='secondary' aria-live='polite'>{partners.data.totalRecords} kết quả</Badge>}
        </div>
        <form onSubmit={submit} className='flex gap-2'>
          <div className='relative min-w-0 flex-1'>
            <Search aria-hidden='true' className='pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground' />
            <Input aria-label='Tìm đối tác' className='h-10 rounded-xl px-9' placeholder='Tên doanh nghiệp, tài khoản hoặc email' value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            {(keyword || search) && <Button type='button' size='icon' variant='ghost' aria-label='Xóa từ khóa' className='absolute top-1 right-1 size-8' onClick={() => { setKeyword(''); setSearch(''); setPage(1); }}><X className='size-4' /></Button>}
          </div>
          <Button type='submit' className='h-10 rounded-xl px-5'>Tìm</Button>
        </form>
        <div role='group' aria-label='Lọc trạng thái hoạt động' className='flex flex-wrap gap-1.5'>
          {statusFilters.map((filter) => (
            <Button key={filter.value} type='button' size='sm'
              variant={filter.value === status ? 'secondary' : 'ghost'} aria-pressed={filter.value === status}
              className='rounded-full px-3.5' onClick={() => { setStatus(filter.value); setPage(1); }}>
              {filter.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        {partners.isPending && <p role='status' className='flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' /> Đang tải đối tác…</p>}
        {partners.isError && <div role='alert' className='flex flex-wrap items-center gap-3 p-5 text-sm'>{partners.error.message} <Button variant='outline' onClick={() => void partners.refetch()}>Thử lại</Button></div>}
        {partners.data && (
          <>
            {partners.data.listObjects.length === 0 ? (
              <div className='grid justify-items-center gap-2 px-5 py-12 text-center'>
                <Search className='mb-1 size-6 text-muted-foreground' aria-hidden='true' />
                <p className='font-medium'>Chưa có đối tác phù hợp</p>
                {(search || status) && <Button variant='outline' size='sm' onClick={() => { setKeyword(''); setSearch(''); setStatus(''); setPage(1); }}>Xóa bộ lọc</Button>}
              </div>
            ) : <ul className='divide-y'>
              {partners.data.listObjects.map((partner) => (
                <li key={partner.organizerId}>
                  <Link to={path} search={{ organizerId: String(partner.organizerId) }} className='group flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6 sm:py-4'>
                    <span className='flex min-w-0 grow basis-48 items-center gap-3'>
                      <span className='grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary'><Building2 className='size-4' aria-hidden='true' /></span>
                      <span className='min-w-0'>
                        <span className='block font-semibold wrap-break-word'>{partner.legalName || partner.username}</span>
                        <span className='block text-sm text-muted-foreground wrap-break-word'>{partner.email}</span>
                      </span>
                    </span>
                    <span className='ml-auto flex items-center gap-3'>
                      <PartnerBadge suspended={partner.suspended} />
                      <span className='grid size-8 place-items-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:text-primary'>
                        <ArrowUpRight className='size-4' aria-hidden='true' />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>}
            {(partners.data.hasPrevious || partners.data.hasNext) && <div className='flex items-center justify-end gap-2 border-t p-4 sm:px-6'>
              <Button size='sm' variant='outline' disabled={!partners.data.hasPrevious} onClick={() => setPage(page - 1)}>Trước</Button>
              <span className='px-2 text-sm tabular-nums'>Trang {page} / {partners.data.totalPages}</span>
              <Button size='sm' variant='outline' disabled={!partners.data.hasNext} onClick={() => setPage(page + 1)}>Tiếp</Button>
            </div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PartnerDetail({ actorId, id }: { actorId: number; id: string }) {
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<OrganizerPartnerDetail>();
  const [reason, setReason] = useState('');
  const key = ['organizer-partners', actorId, 'detail', id] as const;
  const endpoint = `${organizerPartnersEndpoint}/${id}`;
  const detail = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => backendRequest<OrganizerPartnerDetail>(endpoint, 'GET', undefined, true, signal),
    retry: false
  });
  const change = useMutation({
    mutationFn: (target: OrganizerPartnerDetail) => backendRequest<OrganizerPartnerDetail>(
      `${endpoint}/${target.partner.suspended ? 'restore' : 'suspend'}`, 'POST', { revision: target.revision, reason: reason.trim() }
    ),
    onSuccess: (result) => {
      client.setQueryData(key, result);
      void client.invalidateQueries({ queryKey: ['organizer-partners', actorId, 'list'] });
      void client.invalidateQueries({ queryKey: organizerOperationalStatusKey(result.partner.organizerId) });
      setConfirmation(undefined);
      toast.success(result.partner.suspended ? 'Đã tạm ngưng đối tác' : 'Đã khôi phục đối tác');
    },
    onError: () => { void detail.refetch(); }
  });
  const data = detail.data;
  const suspended = data?.partner.suspended ?? false;

  return (
    <div className='space-y-4'>
      <Button asChild variant='ghost' className='-ml-2'><Link to={path} search={{}}><ArrowLeft className='size-4' /> Danh sách đối tác</Link></Button>
      {detail.isPending && <p role='status' className='flex items-center gap-2 rounded-2xl border p-6 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' /> Đang tải thông tin đối tác…</p>}
      {detail.isError && <div role='alert' className='flex items-center gap-3 text-sm'>{detail.error.message} <Button variant='outline' onClick={() => void detail.refetch()}>Tải lại</Button></div>}
      {data && <>
        <Card className='rounded-2xl bg-linear-to-br from-primary/5 via-card to-card shadow-sm'>
          <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-4'>
            <div className='flex min-w-0 items-center gap-3'>
              <span className='grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary'><Building2 aria-hidden='true' className='size-5' /></span>
              <div className='min-w-0 space-y-1.5'>
                <CardTitle className='text-xl wrap-break-word'>{data.partner.legalName || data.partner.username}</CardTitle>
                <p className='flex items-center gap-1.5 text-sm text-muted-foreground wrap-break-word'><Mail className='size-3.5 shrink-0' aria-hidden='true' /><span className='min-w-0 wrap-break-word'>{data.partner.email}</span></p>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <PartnerBadge suspended={suspended} />
              <Button variant={suspended ? 'default' : 'outline'} className='rounded-xl' onClick={() => { change.reset(); setReason(''); setConfirmation(data); }}>
                {suspended ? <PlayCircle className='size-4' /> : <PauseCircle className='size-4' />}
                {suspended ? 'Khôi phục đối tác' : 'Tạm ngưng đối tác'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {data.reason && <div className='flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm'>
              <CircleAlert className='mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300' aria-hidden='true' />
              <p className='min-w-0 whitespace-pre-wrap wrap-break-word'><strong className='mb-1 block'>Lý do tạm ngưng</strong>{data.reason}</p>
            </div>}
            <Impact detail={data} />
          </CardContent>
        </Card>
        <Card className='rounded-2xl shadow-sm'>
          <CardHeader><CardTitle>Workspace của đối tác</CardTitle></CardHeader>
          <CardContent>
            {data.workspaces.length === 0 ? <p className='text-sm text-muted-foreground'>Chưa có workspace.</p> :
              <ul className='divide-y rounded-xl border'>{data.workspaces.map((workspace) =>
                <li key={workspace.id} className='flex items-center justify-between gap-3 p-3 text-sm'>
                  <span className='min-w-0 wrap-break-word'>{workspace.name}</span><Badge variant='outline'>{workspace.status}</Badge>
                </li>
              )}</ul>}
          </CardContent>
        </Card>
      </>}
      <Dialog open={confirmation != null} onOpenChange={(open) => { if (!open && !change.isPending) setConfirmation(undefined); }}>
        <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl'>
          {confirmation && <form className='space-y-5' onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim() && !change.isPending && data?.revision === confirmation.revision) change.mutate(confirmation);
          }}>
            <DialogHeader>
              <span className={`mb-1 grid size-11 place-items-center self-start rounded-xl ${confirmation.partner.suspended ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {confirmation.partner.suspended ? <ShieldCheck className='size-5' aria-hidden='true' /> : <PauseCircle className='size-5' aria-hidden='true' />}
              </span>
              <DialogTitle>{confirmation.partner.suspended ? 'Khôi phục đối tác' : 'Tạm ngưng đối tác'}</DialogTitle>
              <DialogDescription>{confirmation.partner.suspended
                ? 'Đối tác có thể quản lý workspace và các chỗ đủ điều kiện sẽ nhận đặt mới.'
                : 'Đối tác vẫn đăng nhập và xử lý booking hiện có. Hệ thống chặn giữ chỗ mới và thao tác quản lý workspace.'}</DialogDescription>
            </DialogHeader>
            <Impact detail={confirmation} />
            <div className='space-y-2'>
              <Label htmlFor='partner-reason'>Lý do (bắt buộc)</Label>
              <Textarea id='partner-reason' className='min-h-24 rounded-xl' placeholder='Nhập lý do để ghi nhận và thông báo cho đối tác' value={reason} maxLength={500} required disabled={change.isPending} onChange={(event) => setReason(event.target.value)} />
              <p className='text-right text-xs tabular-nums text-muted-foreground'>{reason.length}/500</p>
            </div>
            {change.isError && <p role='alert' className='text-sm text-destructive'>{change.error.message}</p>}
            <DialogFooter>
              <Button type='button' variant='outline' disabled={change.isPending} onClick={() => setConfirmation(undefined)}>Hủy</Button>
              <Button type='submit' variant={confirmation.partner.suspended ? 'default' : 'destructive'}
                disabled={!reason.trim() || change.isPending || data?.revision !== confirmation.revision}>
                {change.isPending && <Loader2 className='size-4 animate-spin' />}
                {confirmation.partner.suspended ? 'Xác nhận khôi phục' : 'Xác nhận tạm ngưng'}
              </Button>
            </DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Impact({ detail }: { detail: OrganizerPartnerDetail }) {
  return (
    <dl className='grid gap-2 sm:grid-cols-2 sm:gap-3'>
      <div className='grid gap-1 rounded-xl border bg-background/60 p-3'>
        <dt className='flex items-center gap-2 text-sm text-muted-foreground'><Building2 className='size-4 shrink-0 text-primary' aria-hidden='true' /> Workspace</dt>
        <dd className='text-2xl font-semibold tabular-nums'>{detail.workspaces.length}</dd>
      </div>
      <div className='grid gap-1 rounded-xl border bg-background/60 p-3'>
        <dt className='flex items-center gap-2 text-sm text-muted-foreground'><CalendarDays className='size-4 shrink-0 text-primary' aria-hidden='true' /> Booking đã xác nhận hoặc đang diễn ra</dt>
        <dd className='text-2xl font-semibold tabular-nums'>{detail.upcomingBookings}</dd>
      </div>
    </dl>
  );
}
