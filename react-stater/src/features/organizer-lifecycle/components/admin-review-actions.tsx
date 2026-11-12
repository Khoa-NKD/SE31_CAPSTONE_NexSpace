import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  CheckCircle2,
  FilePenLine,
  XCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { AdminOrganizerDocument } from '@/features/admin-organizers/api/application-details';
import { DOCUMENT_LABELS } from '@/features/organizer-verification-documents/api/documents';
import {
  adminLifecycleQueryOptions,
  reviewMutationOptions,
  type ReviewAction,
  type ReviewDecision
} from '../api/lifecycle';

export function AdminReviewActions({
  applicationId,
  documents
}: {
  applicationId: string;
  documents: AdminOrganizerDocument[];
}) {
  const actor = useAuthStore((state) => state.user);
  const query = useQuery({
    ...adminLifecycleQueryOptions(actor?.id ?? 0, applicationId),
    enabled: actor?.role === 'ADMIN'
  });
  const client = useQueryClient();
  const mutation = useMutation(reviewMutationOptions(client, applicationId));
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [documentFeedbacks, setDocumentFeedbacks] = useState<Record<number, string>>({});
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);
  function open(action: ReviewAction) {
    if (!query.data || submitting.current) return;
    mutation.reset();
    setReason('');
    setConfirmed(false);
    setSelectedDocuments([]);
    setDocumentFeedbacks(
      Object.fromEntries(
        query.data.currentDocumentIds.map((id) => [
          id,
          documents.find((document) => document.id === id)?.adminFeedback ?? ''
        ])
      )
    );
    setError('');
    setFeedback('');
    setDecision({
      action,
      revision: query.data.revision,
      documentIds: [...query.data.currentDocumentIds]
    });
  }
  async function submit() {
    if (!decision || submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      await mutation.mutateAsync({
        ...decision,
        documentsConfirmed: confirmed,
        note: reason,
        reason,
        documentFeedbacks:
          decision.action === 'request-changes'
            ? selectedDocuments.map((documentId) => ({
                documentId,
                feedback: (documentFeedbacks[documentId] ?? '').trim()
              }))
            : undefined
      });
      setDecision(null);
      setFeedback(
        decision.action === 'approve'
          ? 'Documents approved. The applicant must confirm the agreement before Organizer access is granted.'
          : decision.action === 'reject'
            ? 'Application rejected. Editing and resubmission are permanently unavailable.'
            : 'Changes requested. The applicant can see the selected documents and your reasons.'
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not complete the operation.');
    } finally {
      submitting.current = false;
    }
  }
  if (query.isPending) return <p role='status'>Loading review permissions…</p>;
  if (query.isError)
    return (
      <div className='space-y-2'>
        <p role='alert'>{query.error.message}</p>
        <Button variant='outline' onClick={() => void query.refetch()}>
          Reload review permissions
        </Button>
      </div>
    );
  const data = query.data;
  return (
    <section
      className='lg:col-span-2 space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6'
      aria-label='Application review actions'
    >
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <span className='flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <ShieldCheck className='size-5' aria-hidden='true' />
          </span>
          <div>
            <h2 className='text-sm font-semibold'>Application review</h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              Approve, request specific document changes, or reject the application.
            </p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {(data.canApprove || data.canReject) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className='rounded-xl px-5 text-xs shadow-none'
                  disabled={mutation.isPending || query.isFetching}
                >
                  Review actions
                  <ChevronDown className='size-4' aria-hidden='true' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-72 rounded-xl p-1.5'>
                <DropdownMenuItem
                  disabled={!data.canApprove}
                  onSelect={() => open('approve')}
                  className='gap-3 rounded-lg p-3'
                >
                  <CheckCircle2 className='size-4 text-emerald-600' />
                  <span>
                    <span className='block text-sm font-medium'>Approve application</span>
                    <span className='text-xs text-muted-foreground'>
                      Verify documents and grant Organizer access
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!data.canReject || !data.currentDocumentIds.length}
                  onSelect={() => open('request-changes')}
                  className='gap-3 rounded-lg p-3'
                >
                  <FilePenLine className='size-4 text-amber-600' />
                  <span>
                    <span className='block text-sm font-medium'>Request changes</span>
                    <span className='text-xs text-muted-foreground'>
                      Specify documents that need replacement
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!data.canReject}
                  onSelect={() => open('reject')}
                  className='gap-3 rounded-lg p-3 text-destructive'
                >
                  <XCircle className='size-4' />
                  <span>
                    <span className='block text-sm font-medium'>Reject application</span>
                    <span className='text-xs text-muted-foreground'>
                      Final decision; no editing or resubmission
                    </span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant='outline'
            size='icon'
            className='rounded-xl shadow-none'
            aria-label='Refresh review permissions'
            title='Refresh review permissions'
            disabled={query.isFetching || mutation.isPending}
            onClick={() => void query.refetch()}
          >
            <RefreshCw
              className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`}
              aria-hidden='true'
            />
          </Button>
        </div>
      </div>
      {data.status === 'PENDING_REVIEW' && !data.canApprove && (
        <p className='text-sm text-muted-foreground'>
          Approval requires an eligible applicant, complete business information and valid current
          documents.
        </p>
      )}
      {feedback && <p role='status'>{feedback}</p>}
      <Dialog
        open={!!decision}
        onOpenChange={(value) => {
          if (!value && !mutation.isPending) setDecision(null);
        }}
      >
        {decision && (
          <DialogContent className='max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-xl [&_textarea]:rounded-xl [&_textarea]:p-3 [&_textarea]:outline-none [&_textarea]:focus-visible:ring-2 [&_textarea]:focus-visible:ring-ring/30'>
            <DialogHeader>
              <DialogTitle>
                {decision.action === 'approve'
                  ? 'Approve this application?'
                  : decision.action === 'reject'
                    ? 'Reject this application?'
                    : 'Request document changes'}
              </DialogTitle>
              <DialogDescription>
                {decision.action === 'approve'
                  ? 'This verifies the current documents and issues an agreement. The applicant must confirm it by email OTP before Organizer access is granted. Inspect every document before confirming.'
                  : decision.action === 'reject'
                    ? 'This is a final rejection. The applicant will see your reason but cannot edit or resubmit this application.'
                    : 'Select the current documents that must be replaced and explain why. The applicant must replace every selected document before resubmitting.'}
              </DialogDescription>
            </DialogHeader>
            <label className='space-y-2 text-sm'>
              {decision.action === 'approve'
                ? 'Review note (optional)'
                : decision.action === 'request-changes'
                  ? 'Review summary (required)'
                  : 'Reason (required)'}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                disabled={mutation.isPending}
                className='min-h-28 w-full rounded border bg-background p-2'
              />
            </label>
            {decision.action === 'request-changes' && !!decision.documentIds?.length && (
              <fieldset disabled={mutation.isPending} className='space-y-3 rounded-md border p-3'>
                <legend className='px-1 text-sm font-medium'>Required document replacements</legend>
                <p className='text-sm text-muted-foreground'>
                  Select at least one document. Each selected document requires a reason, up to 500
                  characters.
                </p>
                {decision.documentIds.map((id) => {
                  const document = documents.find((item) => item.id === id);
                  return (
                    <div key={id} className='space-y-1'>
                      <label className='flex items-start gap-2 rounded-lg bg-muted/30 p-2 text-sm'>
                        <input
                          type='checkbox'
                          disabled={document?.documentType === 'BANK_CERTIFICATE'}
                          className='mt-1 accent-primary'
                          checked={selectedDocuments.includes(id)}
                          onChange={(event) =>
                            setSelectedDocuments((current) =>
                              event.target.checked
                                ? [...current, id]
                                : current.filter((value) => value !== id)
                            )
                          }
                        />
                        {document
                          ? `${DOCUMENT_LABELS[document.documentType]} · ${document.fileName}`
                          : `Document #${id}`}
                      </label>
                      {selectedDocuments.includes(id) && (
                        <>
                          <label
                            htmlFor={`document-feedback-${id}`}
                            className='block break-words text-sm font-medium'
                          >
                            Reason for replacement (required)
                          </label>
                          <textarea
                            id={`document-feedback-${id}`}
                            value={documentFeedbacks[id] ?? ''}
                            maxLength={500}
                            rows={3}
                            onChange={(event) =>
                              setDocumentFeedbacks((current) => ({
                                ...current,
                                [id]: event.target.value
                              }))
                            }
                            className='w-full rounded border bg-background p-2 text-sm'
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            )}
            {decision.action === 'approve' && (
              <label className='flex items-start gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={mutation.isPending}
                />
                <span>
                  I have inspected all {decision.documentIds?.length ?? 0} current documents and
                  confirm they are valid.
                </span>
              </label>
            )}
            {error && <p role='alert'>{error}</p>}
            <div className='flex flex-wrap justify-end gap-2'>
              <Button
                variant='outline'
                disabled={mutation.isPending}
                onClick={() => setDecision(null)}
              >
                Cancel
              </Button>
              <Button
                variant={decision.action === 'reject' ? 'destructive' : 'default'}
                className='rounded-xl'
                disabled={
                  mutation.isPending ||
                  (decision.action === 'approve' ? !confirmed : !reason.trim()) ||
                  (decision.action === 'request-changes' &&
                    (!selectedDocuments.length ||
                      selectedDocuments.some((id) => !documentFeedbacks[id]?.trim())))
                }
                onClick={() => void submit()}
              >
                {mutation.isPending
                  ? 'Processing…'
                  : decision.action === 'request-changes'
                    ? 'Send change request'
                    : decision.action === 'reject'
                      ? 'Reject application'
                      : 'Approve application'}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
