import { useLanguage } from '@/features/landing/context/language-context';
import type { ApplicationInput } from '@/features/organizer-application/api/application';
import {
  documentPoliciesQueryOptions,
  documentTypeLabel
} from '@/features/organizer-application/api/document-requirements';
import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  Check,
  LoaderCircle,
  FileCheck2,
  ArrowUpFromLine
} from 'lucide-react';
import { OwnerDocumentActions } from '@/features/organizer-verification-documents/components/owner-document-actions';
import {
  DOCUMENT_LABELS,
  documentFileError,
  verificationDocumentsQueryOptions,
  type UploadDocumentType
} from '@/features/organizer-verification-documents/api/documents';
import { correctDocument, invalidateLifecycle, type LifecycleContext } from '../api/lifecycle';

export function CorrectionDocuments({
  focusRequest,
  businessType,
  actorId,
  context,
  disabled,
  onUpdated,
  onBusyChange
}: {
  focusRequest?: { documentId: number; requestId: number } | null;
  businessType?: ApplicationInput['businessType'];
  actorId: number;
  context: LifecycleContext;
  disabled: boolean;
  onUpdated: (value: LifecycleContext) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const tr = useOrganizerTranslation();
  const { language } = useLanguage();
  const query = useQuery(verificationDocumentsQueryOptions(actorId));
  const client = useQueryClient();
  const policies = useQuery(documentPoliciesQueryOptions());
  const policy = policies.data?.find((item) => item.businessType === businessType);
  const [selectedType, setType] = useState<UploadDocumentType>('BUSINESS_LICENSE');
  const correcting = context.status === 'REVISION_REQUESTED';
  const [dragging, setDragging] = useState(false);
  const allowedTypes = Object.keys(DOCUMENT_LABELS).filter(
    (value): value is UploadDocumentType =>
      value !== 'BANK_CERTIFICATE' &&
      (context.status === 'DRAFT' ||
        (context.status === 'REVISION_REQUESTED' &&
          !!query.data?.documents.some(
            (document) => document.documentType === value && document.status === 'REJECTED'
          )))
  );
  const lastJump = useRef(-1);
  useEffect(() => {
    if (!focusRequest || lastJump.current === focusRequest.requestId) return;
    const target = query.data?.documents.find(
      (document) => document.id === focusRequest.documentId && document.status === 'REJECTED'
    );
    if (!target) return;
    lastJump.current = focusRequest.requestId;
    setType(target.documentType as UploadDocumentType);
    setFile(null);
    setConfirmed(false);
    if (input.current) input.current.value = '';
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById('organizer-document-' + target.id);
      element?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center'
      });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, query.data]);
  const type = allowedTypes.includes(selectedType) ? selectedType : (allowedTypes[0] ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  useApplicationNotice(feedback, error, disabled);
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const current = query.data?.documents.find((document) => document.documentType === type);
  const label = (value: UploadDocumentType | keyof typeof DOCUMENT_LABELS) =>
    documentTypeLabel(value, language, policy);
  const requirement = policy?.requiredDocuments.find((item) => item.documentType === type);
  function selectType(value: string) {
    setType(value as UploadDocumentType);
    setFile(null);
    setConfirmed(false);
    if (input.current) input.current.value = '';
    setError('');
    setFeedback('');
  }
  function selectFile(value: File | null) {
    setFile(value);
    setConfirmed(false);
    setError('');
    setFeedback('');
  }
  const mutation = useMutation({
    mutationFn: async () => {
      if (!type) throw new Error('No requested documents remain to be replaced.');
      const failure = documentFileError(file);
      if (failure || !file) throw new Error(failure || 'Choose a file.');
      if (current && !confirmed) throw new Error('Confirm replacement of the current document.');
      return correctDocument(context.revision, type, current?.id ?? null, file);
    },
    onSuccess: async (value: LifecycleContext) => {
      onUpdated(value);
      await invalidateLifecycle(client);
      setFile(null);
      setConfirmed(false);
      if (input.current) input.current.value = '';
      setFeedback(
        correcting
          ? 'Document saved. Previous versions are retained. Submit the corrected application when ready.'
          : 'Document uploaded. Your draft has not been submitted.'
      );
    }
  });
  async function upload() {
    if (submitting.current) return;
    submitting.current = true;
    onBusyChange(true);
    setError('');
    setFeedback('');
    try {
      await mutation.mutateAsync();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Upload failed.');
    } finally {
      submitting.current = false;
      onBusyChange(false);
    }
  }
  if (query.isPending) return <p role='status'>{tr('Loading current documents…')}</p>;
  if (query.isError)
    return (
      <div>
        <p role='alert'>{tr(query.error.message)}</p>
        <Button onClick={() => void query.refetch()}>{tr('Reload documents')}</Button>
      </div>
    );
  return (
    <section
      className='overflow-hidden rounded-2xl border border-indigo-500/15 bg-card shadow-sm'
      aria-label={tr(
        correcting ? 'Correct verification documents' : 'Upload verification document'
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4 sm:px-6'>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <FileText className='size-4 text-indigo-600 dark:text-indigo-300' aria-hidden='true' />
          {tr('Your documents')}
          <span className='rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
            {query.data.documents.length}
          </span>
        </h3>
        <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
          <ShieldCheck className='size-3.5 text-emerald-600' aria-hidden='true' />
          {tr('Documents stay private')}
        </span>
      </div>
      <div className='grid min-w-0 lg:grid-cols-2'>
        <ul className='min-w-0 space-y-3 p-5 sm:p-6'>
          <li className='flex items-center gap-2 pb-1 text-xs font-medium text-muted-foreground'>
            <FileCheck2 className='size-4' />
            {language === 'vi' ? 'Giấy tờ đã tải lên' : 'Uploaded documents'}
          </li>
          {!query.data.documents.length && (
            <li className='flex min-h-44 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 px-5 text-center text-sm text-muted-foreground'>
              <FileText
                className='size-8 text-indigo-500/60 dark:text-indigo-300'
                aria-hidden='true'
              />
              <p>{tr('No current documents have been uploaded.')}</p>
            </li>
          )}
          {query.data.documents.map((document) => (
            <li
              key={document.id}
              id={'organizer-document-' + document.id}
              tabIndex={-1}
              className={`scroll-mt-24 min-w-0 space-y-3 rounded-xl border p-4 focus-visible:ring-2 focus-visible:ring-ring ${type === document.documentType ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.04]' : 'bg-background'}`}
            >
              <div className='flex items-start gap-3'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-300'>
                  <FileText className='size-5' aria-hidden='true' />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold'>{label(document.documentType)}</p>
                  <p className='mt-1 break-all text-xs leading-5 text-muted-foreground'>
                    {document.fileName}
                  </p>
                </div>
              </div>
              <Badge
                variant={document.status === 'REJECTED' ? 'destructive' : 'secondary'}
                className='rounded-md text-[11px]'
              >
                {tr(
                  context.status === 'REVISION_REQUESTED' && document.status === 'REJECTED'
                    ? 'Replacement required'
                    : document.status
                )}
              </Badge>
              {document.adminFeedback?.trim() && (
                <p className='whitespace-pre-wrap break-words rounded-lg bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground'>
                  {tr('Last document feedback:')} {document.adminFeedback}
                </p>
              )}
              <OwnerDocumentActions profileId={query.data.profileId} document={document} />
              {allowedTypes.includes(document.documentType as UploadDocumentType) && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  disabled={disabled || mutation.isPending}
                  className='h-8 px-2 text-xs text-primary'
                  onClick={() => {
                    selectType(document.documentType);
                    input.current?.focus();
                  }}
                >
                  <UploadCloud className='size-3.5' />
                  {language === 'vi' ? 'Chọn để thay file' : 'Choose to replace file'}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {allowedTypes.length ? (
          <fieldset
            disabled={
              disabled || mutation.isPending || !(context.status === 'DRAFT' || context.canCorrect)
            }
            className='min-w-0 space-y-5 border-t bg-gradient-to-br from-indigo-500/[0.035] via-background to-violet-500/[0.045] p-5 disabled:opacity-60 sm:p-6 lg:border-t-0 lg:border-l'
          >
            <legend className='sr-only'>{tr('Upload verification document')}</legend>
            <div className='flex items-start gap-3'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300'>
                <UploadCloud className='size-5' />
              </span>
              <div>
                <h3 className='text-base font-semibold'>
                  {tr(correcting ? 'Upload requested documents' : 'Upload verification document')}
                </h3>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {tr(
                    correcting
                      ? 'Only replace the documents requested by the administrator.'
                      : 'Choose a document type, then select your file.'
                  )}
                </p>
              </div>
            </div>
            <div className='space-y-2'>
              <label
                htmlFor='organizer-upload-document-type'
                className='text-xs font-semibold text-muted-foreground'
              >
                {tr('Document type')}
              </label>
              <Select
                value={type}
                disabled={
                  disabled ||
                  mutation.isPending ||
                  !(context.status === 'DRAFT' || context.canCorrect)
                }
                onValueChange={selectType}
              >
                <SelectTrigger
                  id='organizer-upload-document-type'
                  className='h-auto min-h-12 w-full rounded-xl bg-background px-3.5 py-3 text-left shadow-none [&_[data-slot=select-value]]:whitespace-normal'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position='popper'
                  className='max-h-72 w-[var(--radix-select-trigger-width)] rounded-xl'
                >
                  {allowedTypes.map((value) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className='py-3 [&_[data-slot=select-item-text]]:whitespace-normal'
                    >
                      {label(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className='flex items-start gap-2 pt-1 text-xs leading-5 text-muted-foreground'>
                <Badge variant='secondary' className='mt-0.5 shrink-0 text-[10px]'>
                  {language === 'vi'
                    ? requirement
                      ? 'Bắt buộc'
                      : 'Tùy chọn'
                    : requirement
                      ? 'Required'
                      : 'Optional'}
                </Badge>
                <p>
                  {requirement?.[language === 'vi' ? 'guidanceVi' : 'guidanceEn'] ||
                    (language === 'vi'
                      ? 'Chỉ tải lên nếu phù hợp với hồ sơ của bạn.'
                      : 'Upload only if relevant to your application.')}
                </p>
              </div>
            </div>
            <label
              onDragOver={(event) => {
                event.preventDefault();
                if (!disabled && !mutation.isPending) setDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !(
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  )
                )
                  setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (
                  disabled ||
                  mutation.isPending ||
                  !(context.status === 'DRAFT' || context.canCorrect)
                )
                  return;
                if (event.dataTransfer.files.length !== 1) {
                  setError('Choose one verification document at a time.');
                  return;
                }
                selectFile(event.dataTransfer.files[0]);
                if (input.current) input.current.value = '';
              }}
              className={`relative flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2 focus-within:ring-indigo-500/30 ${dragging ? 'border-indigo-500 bg-indigo-500/10' : file ? 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 to-teal-500/5' : 'border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.06] via-background to-violet-500/[0.08] hover:border-indigo-500/50 hover:from-indigo-500/10 hover:to-violet-500/10'}`}
            >
              <span className='flex size-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/20 to-violet-500/15 text-indigo-600 dark:text-indigo-300'>
                {file ? (
                  <Check className='size-5' aria-hidden='true' />
                ) : (
                  <ArrowUpFromLine className='size-5' aria-hidden='true' />
                )}
              </span>
              <span className='max-w-full break-all text-sm font-medium'>
                {file ? file.name : tr('Drop a file here or click to browse')}
              </span>
              <span className='text-xs text-muted-foreground'>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : tr('JPG, PNG or PDF · Up to 5 MB')}
              </span>
              <input
                ref={input}
                type='file'
                accept='.jpg,.jpeg,.png,.pdf'
                aria-label={tr('New file')}
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
              />
            </label>
            {current && (
              <label
                aria-label={tr('Confirm document replacement')}
                className='flex cursor-pointer items-start gap-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-xs leading-5'
              >
                <input
                  type='checkbox'
                  className='mt-0.5 size-4 shrink-0 accent-primary'
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span className='min-w-0'>
                  <span className='block font-medium'>{tr('Confirm document replacement')}</span>
                  <span className='break-all text-muted-foreground'>{current.fileName}</span>
                  <span className='mt-1 block text-muted-foreground'>
                    {tr('The previous version will be retained.')}
                  </span>
                </span>
              </label>
            )}
            <Button
              type='button'
              className='h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/15 hover:from-indigo-700 hover:to-violet-700 disabled:shadow-none'
              disabled={
                disabled ||
                mutation.isPending ||
                !file ||
                !!documentFileError(file) ||
                (!!current && !confirmed)
              }
              onClick={() => void upload()}
            >
              {mutation.isPending ? (
                <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
              ) : (
                <UploadCloud className='size-4' aria-hidden='true' />
              )}
              {mutation.isPending
                ? tr('Uploading…')
                : correcting
                  ? tr('Upload requested replacement')
                  : current
                    ? tr('Replace current document')
                    : tr('Upload document')}
            </Button>
            <p className='text-center text-xs leading-5 text-muted-foreground'>
              {tr('Uploading does not submit your application.')}
            </p>
          </fieldset>
        ) : (
          <div className='flex flex-col items-center justify-center gap-3 border-t bg-muted/20 p-6 text-center lg:border-t-0 lg:border-l'>
            <Check className='size-8 text-primary' aria-hidden='true' />
            <p className='text-sm font-semibold'>
              {tr('All requested documents have been replaced.')}
            </p>
            <p className='text-xs leading-5 text-muted-foreground'>
              {tr('Review your updates, then resubmit the application below.')}
            </p>
          </div>
        )}
      </div>
      {file && documentFileError(file) && (
        <p
          role='alert'
          className='mx-5 mb-5 rounded-md bg-destructive/5 p-3 text-sm text-destructive'
        >
          {tr(documentFileError(file))}
        </p>
      )}
    </section>
  );
}
