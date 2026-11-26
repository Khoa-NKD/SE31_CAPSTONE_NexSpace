import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Mail, RefreshCw } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VerificationCode } from '@/components/ui/verification-code';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { applicationTimestamp } from '@/features/organizer-application-status/api/status';
import { translateOrganizer } from '@/features/organizer-application/i18n';
import { fetchContractPdf, type OrganizerContract } from '../api/contract';
import {
  addendaOptions,
  issueAddendum,
  requestAddendumOtp,
  signAddendum,
  type ContractAddendum
} from '../api/addenda';

const PdfViewer = lazy(() =>
  import('@/features/admin-organizers/components/pdf-document-viewer').then((m) => ({
    default: m.PdfDocumentViewer
  }))
);
const time = (value: string | null) =>
  value ? new Date(value.endsWith('Z') ? value : value + 'Z').getTime() : 0;

export function ContractAddenda({
  applicationId,
  contract
}: {
  applicationId?: string;
  contract: OrganizerContract;
}) {
  const actor = useAuthStore((s) => s.user);
  const { language } = useLanguage();
  const t = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const options = addendaOptions(actor?.id ?? 0, applicationId);
  const query = useQuery({
    ...options,
    enabled: !!actor && contract.status === 'SIGNED' && !contract.demo
  });
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const download = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      download.current?.abort();
    },
    []
  );
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl]
  );
  async function issue() {
    if (!applicationId || operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      await issueAddendum(applicationId, contract);
      await client.invalidateQueries({ queryKey: options.queryKey });
      toast.success(
        t(
          'Đã phát hành phụ lục riêng. Hợp đồng gốc được giữ nguyên.',
          'Addendum issued. The original agreement is unchanged.'
        )
      );
    } catch (error) {
      toast.error(
        translateOrganizer(
          error instanceof Error ? error.message : 'Could not issue addendum',
          language
        )
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function openPdf(item: ContractAddendum, save = false) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    const controller = new AbortController();
    download.current = controller;
    try {
      const url = URL.createObjectURL(
        await fetchContractPdf(applicationId, controller.signal, item.id)
      );
      if (save) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${item.number}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPdfUrl(url);
    } catch (error) {
      if (!controller.signal.aborted)
        toast.error(
          t('Chưa tải được PDF phụ lục. Thử lại.', 'Could not load the addendum PDF. Retry.')
        );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  if (contract.status !== 'SIGNED' || contract.demo) return null;
  return (
    <div className='space-y-4 border-t bg-muted/10 p-5 sm:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h3 className='font-semibold'>{t('Phụ lục đính chính', 'Correction addenda')}</h3>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            {t(
              'Chỉ sửa tên/địa chỉ nền tảng. Bản hợp đồng và bằng chứng ký gốc được giữ nguyên.',
              'Corrects the platform name/address only. Original agreement and signature evidence remain unchanged.'
            )}
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          disabled={busy || query.isFetching}
          onClick={() => void query.refetch()}
          aria-label={t('Làm mới phụ lục', 'Refresh addenda')}
        >
          <RefreshCw className='size-4' />
        </Button>
      </div>
      {query.isPending && (
        <p role='status' className='text-sm text-muted-foreground'>
          {t('Đang tải phụ lục…', 'Loading addenda…')}
        </p>
      )}
      {query.isError && (
        <p role='alert' className='text-sm text-destructive'>
          {t(
            'Chưa tải được phụ lục. Bấm làm mới để thử lại.',
            'Could not load addenda. Refresh to retry.'
          )}
        </p>
      )}
      {query.isSuccess && query.data.length === 0 && (
        <div className='space-y-3 rounded-xl border border-dashed p-4 text-sm'>
          <p className='text-muted-foreground'>
            {t('Chưa có phụ lục đính chính.', 'No correction addenda have been issued.')}
          </p>
          {applicationId && (
            <Button type='button' variant='outline' disabled={busy} onClick={() => void issue()}>
              {t('Phát hành phụ lục đính chính tên/địa chỉ', 'Issue name/address correction')}
            </Button>
          )}
        </div>
      )}
      {query.data?.map((item) => (
        <AddendumCard
          key={item.id + ':' + item.contentHash}
          item={item}
          admin={!!applicationId}
          onPdf={() => void openPdf(item)}
          onDownload={() => void openPdf(item, true)}
          pdfBusy={busy}
          onUpdated={() => client.invalidateQueries({ queryKey: options.queryKey })}
        />
      ))}
      <Dialog
        open={!!pdfUrl}
        onOpenChange={(open) => {
          if (!open) setPdfUrl(null);
        }}
      >
        <DialogContent className='flex h-[90dvh] max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-6xl'>
          <DialogHeader className='border-b px-6 py-4 pr-12'>
            <DialogTitle>{t('PDF phụ lục đính chính', 'Correction addendum PDF')}</DialogTitle>
            <DialogDescription>
              {t(
                'Tài liệu riêng tư, tách biệt với hợp đồng gốc.',
                'Private document, separate from the original agreement.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 flex-1 overflow-auto p-3'>
            <Suspense fallback={<p>{t('Đang mở PDF…', 'Opening PDF…')}</p>}>
              {pdfUrl && <PdfViewer url={pdfUrl} />}
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddendumCard({
  item,
  admin,
  onPdf,
  onDownload,
  pdfBusy,
  onUpdated
}: {
  item: ContractAddendum;
  admin: boolean;
  onPdf: () => void;
  onDownload: () => void;
  pdfBusy: boolean;
  onUpdated: () => Promise<unknown>;
}) {
  const { language } = useLanguage();
  const t = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [otp, setOtp] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!item.canSign) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [item.canSign]);
  const cooldown = Math.max(0, Math.ceil((time(item.resendAvailableAt) - now) / 1000));
  const expired = !item.otpExpiresAt || time(item.otpExpiresAt) <= now;
  async function execute(action: 'otp' | 'sign') {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      if (action === 'otp') await requestAddendumOtp(item);
      else await signAddendum(item, otp, consent);
      setOtp('');
      if (action === 'sign') setConsent(false);
      toast.success(
        action === 'otp'
          ? t('Đã gửi OTP tới email tài khoản.', 'OTP sent to your account email.')
          : t(
              'Đã xác nhận phụ lục. Hợp đồng gốc được giữ nguyên.',
              'Addendum confirmed. The original agreement is unchanged.'
            )
      );
      await onUpdated();
    } catch (error) {
      setOtp('');
      toast.error(
        translateOrganizer(
          error instanceof Error ? error.message : 'Could not confirm addendum',
          language
        )
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <article className='space-y-4 rounded-xl border bg-card p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='font-medium'>{item.number}</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {applicationTimestamp(item.issuedAt)} ·{' '}
            {item.status === 'SIGNED'
              ? t('Đã xác nhận', 'Signed')
              : t('Chờ xác nhận qua OTP', 'Awaiting OTP confirmation')}
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={busy || pdfBusy}
          onClick={onPdf}
        >
          <FileCheck2 className='size-4' />
          {t('Xem PDF', 'View PDF')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          disabled={busy || pdfBusy}
          onClick={onDownload}
        >
          {t('Tải PDF', 'Download PDF')}
        </Button>
      </div>
      <details className='rounded-lg border'>
        <summary className='cursor-pointer p-3 text-sm font-medium'>
          {t('Đọc nội dung phụ lục', 'Read addendum content')}
        </summary>
        <div className='max-h-80 overflow-auto whitespace-pre-wrap break-words border-t p-3 text-sm leading-7'>
          {item.content}
        </div>
      </details>
      {item.signedAt && (
        <p className='text-sm text-muted-foreground'>
          {t('Đã ký lúc', 'Signed at')} {applicationTimestamp(item.signedAt)}
        </p>
      )}
      {!admin && item.canSign && (
        <div className='space-y-3 border-t pt-4'>
          <label className='flex cursor-pointer gap-3 text-sm leading-6'>
            <input
              type='checkbox'
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={busy}
              className='mt-1 size-4 accent-primary'
            />
            {t(
              'Tôi đã đọc, đồng ý phụ lục và xác nhận có thẩm quyền đại diện. Hợp đồng gốc không bị thay thế.',
              'I have read and accept this addendum and confirm my authority. The original agreement is not replaced.'
            )}
          </label>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={busy || !consent || cooldown > 0}
              onClick={() => void execute('otp')}
            >
              <Mail className='size-4' />
              {cooldown > 0 ? `${cooldown}s` : t('Gửi OTP email', 'Send email OTP')}
            </Button>
            <span className='text-xs text-muted-foreground'>{item.maskedEmail}</span>
          </div>
          <p className='text-xs text-muted-foreground'>
            {expired
              ? t(
                  'Yêu cầu mã mới để xác nhận. Mỗi mã có hiệu lực 10 phút.',
                  'Request a new code to confirm. Codes expire after 10 minutes.'
                )
              : t(
                  'Mã có hiệu lực 10 phút. Không chia sẻ OTP.',
                  'The code expires after 10 minutes. Do not share it.'
                )}
          </p>
          <div className='flex flex-wrap gap-2'>
            <VerificationCode
              value={otp}
              onChange={setOtp}
              ariaLabel={t('Mã OTP phụ lục', 'Addendum OTP')}
              disabled={busy}
            />
            <Button
              type='button'
              disabled={busy || !consent || expired || !/^\d{6}$/.test(otp)}
              onClick={() => void execute('sign')}
            >
              {t('Xác nhận phụ lục', 'Confirm addendum')}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
