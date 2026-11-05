import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, UploadCloud, ShieldCheck, Check, LoaderCircle } from 'lucide-react';
import { OwnerDocumentActions } from '@/features/organizer-verification-documents/components/owner-document-actions';
import {
  DOCUMENT_LABELS,
  documentFileError,
  verificationDocumentsQueryOptions,
  type UploadDocumentType
} from '@/features/organizer-verification-documents/api/documents';
import { correctDocument, invalidateLifecycle, type LifecycleContext } from '../api/lifecycle';

export function CorrectionDocuments({
  actorId,
  context,
  disabled,
  onUpdated,
  onBusyChange
}: {
  actorId: number;
  context: LifecycleContext;
  disabled: boolean;
  onUpdated: (value: LifecycleContext) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const tr = useOrganizerTranslation();
  const query = useQuery(verificationDocumentsQueryOptions(actorId));
  const client = useQueryClient();
  const [selectedType, setType] = useState<UploadDocumentType>('BUSINESS_LICENSE');
  const allowedTypes = Object.keys(DOCUMENT_LABELS).filter(
    (value): value is UploadDocumentType =>
      value !== 'BANK_CERTIFICATE' &&
      (context.status === 'DRAFT' ||
        (context.status === 'REVISION_REQUESTED' &&
          !!query.data?.documents.some(
            (document) => document.documentType === value && document.status === 'REJECTED'
          )))
  );
  const type = allowedTypes.includes(selectedType) ? selectedType : (allowedTypes[0] ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  useApplicationNotice(feedback, error, disabled);
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const current = query.data?.documents.find((document) => document.documentType === type);
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
        'Document saved. Previous versions are retained. Submit the corrected application when ready.'
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
      className='overflow-hidden rounded-lg border bg-card shadow-sm'
      aria-label={tr('Correct verification documents')}
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6'>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <FileText className='size-4 text-primary' aria-hidden='true' />
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
          {!query.data.documents.length && (
            <li className='flex min-h-44 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 px-5 text-center text-sm text-muted-foreground'>
              <FileText className='size-8 text-muted-foreground/50' aria-hidden='true' />
              <p>{tr('No current documents have been uploaded.')}</p>
            </li>
          )}
          {query.data.documents.map((document) => (
            <li
              key={document.id}
              className={`min-w-0 space-y-3 rounded-md border p-4 ${type === document.documentType ? 'border-primary/30 bg-primary/5' : 'bg-background'}`}
            >
              <div className='flex items-start gap-3'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                  <FileText className='size-5' aria-hidden='true' />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold'>
                    {tr(DOCUMENT_LABELS[document.documentType])}
                  </p>
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
            </li>
          ))}
        </ul>
        {allowedTypes.length ? (
          <fieldset
            disabled={
              disabled || mutation.isPending || !(context.status === 'DRAFT' || context.canCorrect)
            }
            className='min-w-0 space-y-5 border-t bg-muted/20 p-5 disabled:opacity-60 sm:p-6 lg:border-t-0 lg:border-l'
          >
            <legend className='sr-only'>{tr('Upload verification document')}</legend>
            <div>
              <h3 className='text-base font-semibold'>
                {tr(current ? 'Replace current document' : 'Add missing document')}
              </h3>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                {tr('Choose a document type, then select your file.')}
              </p>
            </div>
            <label className='block space-y-2 text-sm font-medium'>
              {tr('Document type')}{' '}
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as UploadDocumentType);
                  setFile(null);
                  if (input.current) input.current.value = '';
                  setConfirmed(false);
                  setError('');
                  setFeedback('');
                }}
                className='block h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20'
              >
                {allowedTypes.map((value) => (
                  <option key={value} value={value}>
                    {tr(DOCUMENT_LABELS[value])}
                  </option>
                ))}
              </select>
            </label>
            <label className='relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary/25 bg-background p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring/30'>
              <span className='flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary'>
                {file ? (
                  <Check className='size-5' aria-hidden='true' />
                ) : (
                  <UploadCloud className='size-5' aria-hidden='true' />
                )}
              </span>
              <span className='max-w-full break-all text-sm font-medium'>
                {file ? file.name : tr('Click to choose a file')}
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
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setConfirmed(false);
                  setError('');
                  setFeedback('');
                }}
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
              className='h-10 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90'
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
                : current
                  ? tr('Replace current document')
                  : tr('Add missing document')}
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
