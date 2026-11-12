import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCheck,
  ChevronRight,
  Download,
  FileCheck2,
  FileSignature,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { currentUser } from '@/features/auth/api/session';
import { invalidateLifecycle } from '@/features/organizer-lifecycle/api/lifecycle';
import { applicationTimestamp } from '@/features/organizer-application-status/api/status';
import {
  contractQueryOptions,
  fetchContractPdf,
  requestContractOtp,
  signContract
} from '../api/contract';

const PdfViewer = lazy(() =>
  import('@/features/admin-organizers/components/pdf-document-viewer').then((m) => ({
    default: m.PdfDocumentViewer
  }))
);
const utc = (value: string | null) =>
  value ? new Date(value.endsWith('Z') ? value : `${value}Z`).getTime() : 0;

/** The same private agreement record is available to the owner and read-only administrator. */
export function ContractPanel({
  applicationId,
  onSigned,
  presentation = 'onboarding'
}: {
  applicationId?: string;
  onSigned?: () => void;
  presentation?: 'onboarding' | 'record';
}) {
  const { language } = useLanguage();
  const t = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const actor = useAuthStore((s) => s.user);
  const client = useQueryClient();
  const options = contractQueryOptions(actor?.id ?? 0, applicationId);
  const query = useQuery({ ...options, enabled: !!actor && !!useAuthStore.getState().accessToken });
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState<'otp' | 'sign' | 'pdf' | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const operation = useRef(false);
  const downloadController = useRef<AbortController | null>(null);
  const contract = query.data;
  const signed = contract?.status === 'SIGNED';
  useEffect(() => {
    setNow(Date.now());
    if (!contract?.resendAvailableAt || signed) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [contract?.resendAvailableAt, signed]);
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl]
  );
  useEffect(() => () => downloadController.current?.abort(), []);
  const cooldown = Math.max(0, Math.ceil((utc(contract?.resendAvailableAt ?? null) - now) / 1000));
  async function execute(action: 'otp' | 'sign') {
    if (!contract || operation.current) return;
    operation.current = true;
    setBusy(action);
    try {
      const result =
        action === 'otp'
          ? await requestContractOtp(contract)
          : await signContract(contract, otp, consent);
      client.setQueryData(options.queryKey, result);
      if (action === 'otp') {
        setOtp('');
        toast.success(
          t(
            'Đã gửi mã xác nhận tới email tài khoản.',
            'Verification code sent to your account email.'
          )
        );
      } else {
        setOtp('');
        setConsent(false);
        setPdfUrl(null);
        toast.success(
          t(
            'Đã xác nhận hợp đồng. Tài khoản Organizer đã được kích hoạt.',
            'Agreement confirmed. Organizer access is now active.'
          )
        );
        // A failed session refresh must not turn a committed signature into a signing error.
        try {
          const user = await currentUser();
          if (useAuthStore.getState().user?.id === actor?.id) useAuthStore.getState().setUser(user);
        } catch {
          toast.info(
            t(
              'Hợp đồng đã lưu. Vui lòng đăng nhập lại để cập nhật quyền.',
              'Agreement saved. Sign in again to refresh your access.'
            )
          );
        }
        await invalidateLifecycle(client);
        onSigned?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              'Không thể hoàn tất. Vui lòng thử lại.',
              'Could not complete this action. Please retry.'
            )
      );
      if (action === 'sign') setOtp('');
    } finally {
      operation.current = false;
      setBusy(null);
    }
  }
  async function openPdf(download: boolean) {
    if (operation.current) return;
    operation.current = true;
    setBusy('pdf');
    const controller = new AbortController();
    downloadController.current = controller;
    try {
      const blob = await fetchContractPdf(applicationId, controller.signal);
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${contract?.contractNumber ?? 'nexspace-agreement'}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPdfUrl(url);
    } catch (error) {
      if (!controller.signal.aborted)
        toast.error(error instanceof Error ? error.message : 'Could not load PDF.');
    } finally {
      operation.current = false;
      setBusy(null);
    }
  }
  if (query.isPending)
    return (
      <div
        role='status'
        className='flex items-center gap-3 rounded-2xl border bg-card p-6 text-sm text-muted-foreground'
      >
        <Loader2 className='size-4 animate-spin' />
        {t('Đang tải hợp đồng…', 'Loading agreement…')}
      </div>
    );
  if (query.isError)
    return (
      <div role='alert' className='space-y-3 rounded-2xl border bg-card p-6'>
        <p className='text-sm'>{query.error.message}</p>
        <Button variant='outline' onClick={() => void query.refetch()}>
          <RefreshCw className='size-4' />
          {t('Thử lại', 'Try again')}
        </Button>
      </div>
    );
  if (!contract)
    return presentation === 'record' ? (
      <div className='rounded-2xl border bg-card p-6 text-sm text-muted-foreground'>
        {t(
          'Chưa có hợp đồng được phát hành cho hồ sơ này. Trạng thái đã duyệt vẫn được giữ nguyên.',
          'No agreement was issued for this application. Its existing approval remains unchanged.'
        )}
      </div>
    ) : null;
  const pdfDialog = (
    <Dialog
      open={!!pdfUrl}
      onOpenChange={(open) => {
        if (!open) setPdfUrl(null);
      }}
    >
      <DialogContent className='flex h-[90dvh] max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-6xl'>
        <DialogHeader className='border-b px-6 py-4 pr-12'>
          <DialogTitle>{contract.contractNumber}</DialogTitle>
          <DialogDescription>
            {t('Hợp đồng riêng tư · Bản thử nghiệm Local', 'Private agreement · Local demo')}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-auto p-3'>
          <Suspense fallback={<p className='p-6 text-sm'>{t('Đang mở PDF…', 'Opening PDF…')}</p>}>
            {pdfUrl && <PdfViewer url={pdfUrl} />}
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
  if (presentation === 'record')
    return (
      <section className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:px-6'>
          <div className='flex items-center gap-3'>
            <span className='flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-background text-primary'>
              <FileSignature className='size-5' />
            </span>
            <div>
              <h2 className='text-base font-semibold'>
                {t('Hợp đồng hợp tác', 'Cooperation agreement')}
              </h2>
              <p className='mt-1 break-all font-mono text-xs text-muted-foreground'>
                {contract.contractNumber}
              </p>
            </div>
          </div>
          <Badge variant='secondary' className='gap-1.5 bg-primary/10 text-primary'>
            <CheckCheck className='size-3.5' />
            {signed ? t('Đã xác nhận', 'Signed') : t('Chờ xác nhận', 'Awaiting signature')}
          </Badge>
        </div>
        <div className='space-y-5 p-5 sm:p-6'>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div className='rounded-xl border bg-muted/15 p-4'>
              <p className='text-xs text-muted-foreground'>
                {t('Phiên bản hợp đồng', 'Agreement version')}
              </p>
              <p className='mt-2 text-sm font-medium'>{contract.templateVersion}</p>
            </div>
            <div className='rounded-xl border bg-muted/15 p-4'>
              <p className='text-xs text-muted-foreground'>
                {t('Thời điểm xác nhận', 'Confirmed at')}
              </p>
              <p className='mt-2 break-words text-sm font-medium'>
                {contract.signedAt ? applicationTimestamp(contract.signedAt) : '—'}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/15 p-4'>
              <p className='text-xs text-muted-foreground'>
                {t('Email xác nhận', 'Confirmation email')}
              </p>
              <p className='mt-2 flex items-center gap-2 text-sm font-medium'>
                <Mail className='size-4 text-primary' />
                {contract.maskedEmail}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <p className='max-w-xl text-sm leading-6 text-muted-foreground'>
              {t(
                'Lưu trữ hợp đồng và biên nhận xác nhận. Bạn có thể xem hoặc tải bản PDF bất cứ lúc nào.',
                'Your agreement and confirmation receipt are archived here. View or download the PDF at any time.'
              )}
            </p>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={!!busy}
                onClick={() => void openPdf(false)}
              >
                <FileCheck2 className='size-4' />
                {t('Xem PDF', 'View PDF')}
              </Button>
              <Button type='button' disabled={!!busy} onClick={() => void openPdf(true)}>
                <Download className='size-4' />
                {t('Tải hợp đồng', 'Download agreement')}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={!!busy || query.isFetching}
                aria-label={t('Làm mới hợp đồng', 'Refresh agreement')}
                onClick={() => void invalidateLifecycle(client)}
              >
                <RefreshCw className={query.isFetching ? 'size-4 animate-spin' : 'size-4'} />
              </Button>
            </div>
          </div>
          {contract.demo && (
            <p className='rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-muted-foreground'>
              <span className='font-semibold text-foreground'>
                {t('Bản thử nghiệm Local.', 'Local demo agreement.')}
              </span>{' '}
              {t(
                'Không dùng cho giao dịch thực tế; chưa có chữ ký đại diện NexSpace hoặc chứng nhận chữ ký số.',
                'Not for real transactions; no NexSpace representative signature or digital-signature certification is included.'
              )}
            </p>
          )}
          <details className='group rounded-xl border bg-background'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium'>
              {t('Xem nội dung và thông tin kiểm tra', 'View agreement text and integrity details')}
              <ChevronRight className='size-4 text-muted-foreground transition-transform group-open:rotate-90' />
            </summary>
            <div className='space-y-4 border-t p-4'>
              <p className='break-all font-mono text-[11px] text-muted-foreground'>
                SHA-256 · {contract.contentHash}
              </p>
              <div
                tabIndex={0}
                className='max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground'
              >
                {contract.content}
              </div>
            </div>
          </details>
        </div>
        {pdfDialog}
      </section>
    );
  return (
    <section className='overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-span-2'>
      <div className='flex flex-wrap items-start justify-between gap-4 border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-7'>
        <div className='flex gap-3.5'>
          <span className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-background text-primary'>
            <FileSignature className='size-6' />
          </span>
          <div>
            <p className='mb-1 text-[10px] font-semibold uppercase tracking-[.2em] text-primary'>
              NexSpace Partners
            </p>
            <h2 className='text-xl font-semibold tracking-tight'>
              {t('Hợp đồng hợp tác', 'Cooperation agreement')}
            </h2>
            <p className='mt-1 break-all font-mono text-xs text-muted-foreground'>
              {contract.contractNumber}
            </p>
          </div>
        </div>
        <Badge
          variant='secondary'
          className={signed ? 'gap-1.5 bg-primary/10 text-primary' : 'gap-1.5'}
        >
          {signed ? <CheckCheck className='size-3.5' /> : <FileCheck2 className='size-3.5' />}
          {signed ? t('Đã xác nhận', 'Signed') : t('Chờ xác nhận', 'Awaiting signature')}
        </Badge>
      </div>
      <div className='grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_340px]'>
        <div className='min-w-0 space-y-5'>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground'>
            {[
              t('Hồ sơ đã kiểm tra', 'Documents reviewed'),
              t('Đọc hợp đồng', 'Read agreement'),
              t('Xác nhận email', 'Email confirmation')
            ].map((step, index) => (
              <span key={step} className='inline-flex items-center gap-2'>
                <span className='flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  {index === 0 || signed ? <Check className='size-3.5' /> : index + 1}
                </span>
                {step}
                {index < 2 && <ChevronRight className='ml-1 size-3' />}
              </span>
            ))}
          </div>
          {contract.demo && (
            <div className='rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6'>
              <p className='font-semibold'>
                {t('Bản thử nghiệm — chỉ dùng tại Local', 'Demo agreement — Local only')}
              </p>
              <p className='text-muted-foreground'>
                {t(
                  'Không dùng cho giao dịch thực tế. Chưa có chữ ký đại diện NexSpace hoặc chứng nhận chữ ký số.',
                  'Not for real transactions. No NexSpace representative signature or digital-signature certification is included.'
                )}
              </p>
            </div>
          )}
          <div className='overflow-hidden rounded-xl border bg-background'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3'>
              <span className='inline-flex items-center gap-2 text-sm font-medium'>
                <FileCheck2 className='size-4 text-primary' />
                {t('Nội dung tiếng Việt', 'Agreement in Vietnamese')}
              </span>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={!!busy}
                  onClick={() => void openPdf(false)}
                >
                  {t('Xem PDF', 'View PDF')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={!!busy}
                  onClick={() => void openPdf(true)}
                >
                  <Download className='size-3.5' />
                  {t('Tải xuống', 'Download')}
                </Button>
              </div>
            </div>
            <div
              tabIndex={0}
              aria-label={t('Nội dung hợp đồng', 'Agreement contents')}
              className='max-h-[440px] overflow-y-auto whitespace-pre-wrap break-words p-5 text-sm leading-7 text-foreground/85 sm:p-6'
            >
              {contract.content}
            </div>
          </div>
          <div className='flex items-start gap-2.5 text-xs leading-5 text-muted-foreground'>
            <LockKeyhole className='mt-0.5 size-4 shrink-0' />
            <p>
              {t(
                'Bản nội dung này được giữ nguyên sau khi phát hành. Hợp đồng chỉ hiển thị cho chủ hồ sơ và quản trị viên.',
                'This issued agreement is preserved. Only the application owner and administrators can access it.'
              )}
            </p>
          </div>
          <details className='text-xs text-muted-foreground'>
            <summary className='cursor-pointer'>
              {t('Thông tin kiểm tra nội dung', 'Content integrity details')}
            </summary>
            <p className='mt-2 break-all font-mono'>SHA-256 · {contract.contentHash}</p>
            <p className='mt-1'>
              {contract.templateVersion} · {applicationTimestamp(contract.issuedAt)}
            </p>
          </details>
        </div>
        <aside className='h-fit space-y-5 rounded-xl border bg-muted/20 p-5'>
          <div className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <ShieldCheck className='size-5' />
          </div>
          <div>
            <h3 className='text-base font-semibold'>
              {signed
                ? t('Xác nhận hoàn tất', 'Agreement completed')
                : applicationId
                  ? t('Theo dõi hợp đồng', 'Agreement tracking')
                  : t('Hoàn tất đăng ký đối tác', 'Complete your partner registration')}
            </h3>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>
              {signed
                ? t(
                    'Bản PDF tải xuống bao gồm biên nhận xác nhận qua OTP.',
                    'The downloaded PDF includes the email-OTP confirmation receipt.'
                  )
                : t(
                    'Chỉ cấp quyền Organizer khi chủ hồ sơ hoàn tất xác nhận hợp đồng.',
                    'Organizer access is granted only after the application owner confirms the agreement.'
                  )}
            </p>
          </div>
          <div className='space-y-1.5 border-y py-4 text-sm'>
            <p className='text-xs text-muted-foreground'>
              {t('Email xác nhận', 'Confirmation email')}
            </p>
            <p className='flex items-center gap-2 font-medium'>
              <Mail className='size-4 text-muted-foreground' />
              {contract.maskedEmail}
            </p>
            {signed && (
              <p className='pt-2 text-xs text-muted-foreground'>
                {applicationTimestamp(contract.signedAt)}
              </p>
            )}
          </div>
          {!applicationId && contract.canSign && !signed && (
            <div className='space-y-4'>
              <label className='flex cursor-pointer items-start gap-3 text-sm leading-6'>
                <input
                  type='checkbox'
                  checked={consent}
                  disabled={!!busy}
                  onChange={(e) => setConsent(e.target.checked)}
                  className='mt-1 size-4 shrink-0 accent-primary'
                />
                <span>
                  {t(
                    'Tôi đã đọc, đồng ý nội dung và xác nhận có thẩm quyền đại diện cho tổ chức trong hợp đồng.',
                    'I have read and accept this agreement, and confirm my authority to represent the organization.'
                  )}
                </span>
              </label>
              <Button
                type='button'
                variant='outline'
                className='w-full'
                disabled={!!busy || !consent || cooldown > 0}
                onClick={() => void execute('otp')}
              >
                {busy === 'otp' ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Mail className='size-4' />
                )}
                {cooldown > 0
                  ? `${t('Gửi lại sau', 'Resend in')} ${cooldown}s`
                  : t('Gửi mã xác nhận', 'Send verification code')}
              </Button>
              {contract.otpExpiresAt && (
                <div className='space-y-2'>
                  <label htmlFor={`contract-otp-${contract.id}`} className='text-xs font-medium'>
                    {t('Mã OTP gồm 6 số', '6-digit verification code')}
                  </label>
                  <Input
                    id={`contract-otp-${contract.id}`}
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    maxLength={6}
                    value={otp}
                    disabled={!!busy}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder='••••••'
                    className='h-12 text-center font-mono text-xl tracking-[.4em]'
                  />
                  <p className='text-xs leading-5 text-muted-foreground'>
                    {t(
                      'Mã có hiệu lực 10 phút, tối đa 5 lần nhập sai. Không chia sẻ mã cho người khác.',
                      'Valid for 10 minutes, with 5 incorrect attempts allowed. Do not share this code.'
                    )}
                  </p>
                </div>
              )}
              <Button
                type='button'
                className='h-11 w-full'
                disabled={
                  !!busy ||
                  !consent ||
                  otp.length !== 6 ||
                  !contract.otpExpiresAt ||
                  utc(contract.otpExpiresAt) <= now
                }
                onClick={() => void execute('sign')}
              >
                {busy === 'sign' ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <FileSignature className='size-4' />
                )}
                {t('Xác nhận hợp đồng', 'Confirm agreement')}
              </Button>
            </div>
          )}
          {!applicationId && signed && (
            <Button className='w-full' asChild>
              <Link to='/dashboard/organizer/workspaces'>
                {t('Vào dashboard Organizer', 'Open Organizer dashboard')}
                <ChevronRight className='size-4' />
              </Link>
            </Button>
          )}
          <Button
            variant='ghost'
            size='sm'
            disabled={!!busy || query.isFetching}
            onClick={() => void invalidateLifecycle(client)}
          >
            <RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
            {t('Làm mới hợp đồng', 'Refresh agreement')}
          </Button>
        </aside>
      </div>
      {pdfDialog}
    </section>
  );
}
