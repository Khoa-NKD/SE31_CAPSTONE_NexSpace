import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
  const query = useQuery(verificationDocumentsQueryOptions(actorId));
  const client = useQueryClient();
  const [type, setType] = useState<UploadDocumentType>('BUSINESS_LICENSE');
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const current = query.data?.documents.find((document) => document.documentType === type);
  const mutation = useMutation({
    mutationFn: async () => {
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
  if (query.isPending) return <p role='status'>Loading current documents…</p>;
  if (query.isError)
    return (
      <div>
        <p role='alert'>{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>Reload documents</Button>
      </div>
    );
  return (
    <section
      className='space-y-4 rounded-lg border p-4'
      aria-label='Correct verification documents'
    >
      <h2 className='text-lg font-semibold'>Correct verification documents</h2>
      <p className='text-sm text-muted-foreground'>
        JPG, PNG or PDF, up to 5 MB. Replacing a document preserves the previous version and does
        not submit your application.
      </p>
      <ul className='space-y-2'>
        {query.data.documents.map((document) => (
          <li key={document.id}>
            {DOCUMENT_LABELS[document.documentType]}: {document.fileName} · {document.status}
          </li>
        ))}
      </ul>
      <fieldset
        disabled={disabled || mutation.isPending || !context.canCorrect}
        className='space-y-3'
      >
        <label className='block'>
          Document type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as UploadDocumentType);
              setConfirmed(false);
            }}
            className='mt-1 block w-full rounded border bg-background p-2'
          >
            {Object.entries(DOCUMENT_LABELS)
              .filter(([value]) => value !== 'BANK_CERTIFICATE')
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <label className='block'>
          New file
          <input
            ref={input}
            type='file'
            accept='.jpg,.jpeg,.png,.pdf'
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setConfirmed(false);
            }}
            className='mt-1 block w-full'
          />
        </label>
        {current && (
          <label className='flex items-start gap-2'>
            <input
              type='checkbox'
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              Replace {current.fileName} with this new file. Keep the previous version in history.
            </span>
          </label>
        )}
        <Button
          type='button'
          disabled={!file || !!documentFileError(file) || (!!current && !confirmed)}
          onClick={() => void upload()}
        >
          {mutation.isPending
            ? 'Uploading…'
            : current
              ? 'Replace current document'
              : 'Add missing document'}
        </Button>
      </fieldset>
      {file && documentFileError(file) && <p role='alert'>{documentFileError(file)}</p>}
      {error && <p role='alert'>{error}</p>}
      {feedback && <p role='status'>{feedback}</p>}
    </section>
  );
}
