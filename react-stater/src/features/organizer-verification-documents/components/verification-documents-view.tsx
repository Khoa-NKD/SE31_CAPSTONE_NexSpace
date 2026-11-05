import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DOCUMENT_LABELS,
  documentFileError,
  verificationDocumentKeys,
  verificationDocumentMutationOptions,
  verificationDocumentsQueryOptions
} from '../api/documents';
import type { UploadDocumentType, VerificationDocuments } from '../api/documents';
import { OwnerDocumentActions } from './owner-document-actions';
import { DraftVerificationDocuments } from './draft-verification-documents';

const emptySubscribe = () => () => {};

export function VerificationDocumentsView() {
  const tr = useOrganizerTranslation();
  const [editingBusy, setEditingBusy] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const allowed = !!user && !!token && getUserRole(user) !== 'ADMIN';
  const actorId = user?.id ?? 0;
  const query = useQuery({
    ...verificationDocumentsQueryOptions(actorId),
    enabled: mounted && allowed
  });

  if (!mounted) return <p role='status'>{tr('Loading verification documents…')}</p>;
  if (!allowed)
    return (
      <div className='space-y-3' role='alert'>
        <p>{tr('Sign in with the Customer or Organizer account that owns the application.')}</p>
        <Link to='/auth/sign-in' className='text-primary underline'>
          {tr('Sign in')}{' '}
        </Link>
      </div>
    );
  if (query.isPending) return <p role='status'>{tr('Loading verification documents…')}</p>;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : undefined;
    return (
      <div className='space-y-3' role='alert'>
        <p>{query.error.message || tr('Could not load verification documents.')}</p>
        {status !== 403 && status !== 404 ? (
          <Button onClick={() => void query.refetch()}>{tr('Try again')}</Button>
        ) : null}
      </div>
    );
  }
  if (query.data.uploadAllowed)
    return (
      <DraftVerificationDocuments
        actorId={actorId}
        disabled={editingBusy}
        onBusyChange={setEditingBusy}
      />
    );
  return (
    <DocumentsPanel
      key={`${actorId}:${query.data.profileId}`}
      actorId={actorId}
      data={query.data}
    />
  );
}

function DocumentsPanel({ actorId, data }: { actorId: number; data: VerificationDocuments }) {
  const tr = useOrganizerTranslation();
  const queryClient = useQueryClient();
  const mutation = useMutation(verificationDocumentMutationOptions(queryClient, actorId));
  const [selectedType, setSelectedType] = useState<UploadDocumentType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  useApplicationNotice(
    feedback && !feedback.error ? feedback.message : '',
    feedback?.error ? feedback.message : '',
    mutation.isPending
  );
  const submitting = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const availableTypes = data.supportedDocumentTypes.filter(
    (type) => !data.documents.some((document) => document.documentType === type)
  );
  const documentType = availableTypes.includes(selectedType as UploadDocumentType)
    ? (selectedType as UploadDocumentType)
    : (availableTypes[0] ?? '');
  const canUpload = data.uploadAllowed && availableTypes.length > 0;

  const upload = async () => {
    if (submitting.current || !canUpload || !documentType) return;
    const error = documentFileError(file, data.maxFileSizeBytes);
    if (error || !file) {
      setFileError(error ?? 'Choose a document.');
      return;
    }
    submitting.current = true;
    setFeedback(null);
    try {
      await mutation.mutateAsync({ documentType, file });
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setFileError('');
      setFeedback({ error: false, message: 'Verification document uploaded successfully.' });
    } catch (error) {
      setFeedback({
        error: true,
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      });
      if (error instanceof ApiError && error.status === 409) {
        // A refreshed type list can select another type; require an explicit new file selection.
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
        setFileError('Review the refreshed document list and choose the file again.');
      }
      if (error instanceof ApiError && (error.status === 409 || error.status === 403))
        void queryClient.invalidateQueries({
          queryKey: verificationDocumentKeys.detail(actorId),
          exact: true
        });
    } finally {
      submitting.current = false;
    }
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{tr('Upload verification document')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            {tr(
              'Documents belong to your Organizer profile. Ownership or operating evidence uses Other and is not linked to an individual workspace.'
            )}{' '}
          </p>
          {!data.uploadAllowed ? (
            <p role='status'>
              {tr(
                'Upload is only available for DRAFT or REVISION_REQUESTED profiles. Current documents are shown below.'
              )}{' '}
            </p>
          ) : !availableTypes.length ? (
            <p role='status'>
              {tr(
                'A current document already exists for every supported type. Replacement is not available here.'
              )}{' '}
            </p>
          ) : null}
          {canUpload ? (
            <form
              noValidate
              className='space-y-4'
              onSubmit={(event) => {
                event.preventDefault();
                void upload();
              }}
            >
              <fieldset
                disabled={mutation.isPending}
                className='min-w-0 space-y-4 disabled:opacity-70'
              >
                <legend className='sr-only'>{tr('New verification document')}</legend>
                <div className='space-y-2'>
                  <label htmlFor='verification-document-type' className='text-sm font-medium'>
                    {tr('Document type')}{' '}
                  </label>
                  <select
                    id='verification-document-type'
                    value={documentType}
                    onChange={(event) => setSelectedType(event.target.value as UploadDocumentType)}
                    className='h-10 w-full rounded-md border border-input bg-background px-3'
                  >
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {tr(DOCUMENT_LABELS[type])}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='space-y-2'>
                  <label htmlFor='verification-file' className='text-sm font-medium'>
                    {tr('Verification file')}{' '}
                  </label>
                  <Input
                    ref={fileInput}
                    id='verification-file'
                    type='file'
                    accept='.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'
                    aria-required='true'
                    aria-invalid={!!fileError}
                    aria-describedby='verification-file-help verification-file-error'
                    onChange={(event) => {
                      const chosen = event.target.files?.[0] ?? null;
                      const error = chosen
                        ? documentFileError(chosen, data.maxFileSizeBytes)
                        : null;
                      setFile(error ? null : chosen);
                      setFileError(error ?? '');
                      setFeedback(null);
                      if (error) event.target.value = '';
                    }}
                  />
                  <p id='verification-file-help' className='text-sm text-muted-foreground'>
                    {tr(
                      'One JPG, PNG or PDF, nonempty and up to 5 MB. Verification files are stored privately.'
                    )}{' '}
                  </p>
                  <p
                    id='verification-file-error'
                    role={fileError ? 'alert' : undefined}
                    className='text-sm text-destructive'
                  >
                    {tr(fileError)}
                  </p>
                </div>
              </fieldset>
              <Button type='submit' disabled={mutation.isPending}>
                {mutation.isPending ? tr('Uploading…') : tr('Upload document')}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{tr('Current verification documents')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.documents.length ? (
            <p>{tr('No current documents have been uploaded.')}</p>
          ) : (
            <ul className='divide-y'>
              {data.documents.map((document) => (
                <li key={document.id} className='space-y-1 py-4 first:pt-0 last:pb-0'>
                  <OwnerDocumentActions profileId={data.profileId} document={document} />
                  <p className='font-medium'>
                    {tr(DOCUMENT_LABELS[document.documentType] ?? document.documentType)}
                  </p>
                  <p className='break-all text-sm'>{document.fileName}</p>
                  {document.adminFeedback?.trim() && (
                    <p className='whitespace-pre-wrap break-words text-sm'>
                      {tr('Last document feedback:')} {document.adminFeedback}
                    </p>
                  )}
                  <p className='text-sm text-muted-foreground'>
                    {tr('Document #')}
                    {document.id} · {tr(document.status)}
                  </p>
                  {document.uploadedAt ? (
                    <p className='text-xs text-muted-foreground'>
                      {tr('Uploaded:')}{' '}
                      <time dateTime={document.uploadedAt}>
                        {document.uploadedAt.replace('T', ' ')}
                      </time>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
