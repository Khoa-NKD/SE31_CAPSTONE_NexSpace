import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  adminLifecycleQueryOptions,
  reviewMutationOptions,
  type ReviewAction,
  type ReviewDecision
} from '../api/lifecycle';

export function AdminReviewActions({ applicationId }: { applicationId: string }) {
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
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);
  function open(action: ReviewAction) {
    if (!query.data || submitting.current) return;
    mutation.reset();
    setReason('');
    setConfirmed(false);
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
        reason
      });
      setDecision(null);
      setFeedback(
        decision.action === 'approve'
          ? 'Application approved and Organizer access granted.'
          : decision.action === 'reject'
            ? 'Application rejected. The applicant can read the reason and correct it.'
            : 'Organizer operations suspended. Account sign-in and customer features remain available.'
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
    <section className='space-y-3 rounded-lg border p-4' aria-label='Application review actions'>
      <h2 className='text-lg font-semibold'>Review and operational status</h2>
      {data.suspended && (
        <div role='status'>
          <Badge variant='destructive'>Organizer operations suspended</Badge>
          <p className='mt-2 whitespace-pre-wrap break-words'>
            {data.suspensionReason || 'No suspension reason recorded.'}
          </p>
        </div>
      )}
      <div className='flex flex-wrap gap-2'>
        {data.canApprove && (
          <Button disabled={mutation.isPending} onClick={() => open('approve')}>
            Approve application
          </Button>
        )}
        {data.canReject && (
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() => open('reject')}
          >
            Reject application
          </Button>
        )}
        {data.canSuspend && (
          <Button
            variant='destructive'
            disabled={mutation.isPending}
            onClick={() => open('suspend')}
          >
            Suspend Organizer
          </Button>
        )}
        <Button
          variant='outline'
          disabled={query.isFetching || mutation.isPending}
          onClick={() => void query.refetch()}
        >
          Refresh review permissions
        </Button>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {decision.action === 'approve'
                  ? 'Approve this application?'
                  : decision.action === 'reject'
                    ? 'Reject this application?'
                    : 'Suspend Organizer operations?'}
              </DialogTitle>
              <DialogDescription>
                {decision.action === 'approve'
                  ? 'Approval grants the Organizer role and marks all current documents as verified. Inspect every current document before confirming.'
                  : decision.action === 'reject'
                    ? 'The applicant will see your reason and can correct and resubmit the same application.'
                    : 'The application remains approved and the role is retained. Organizer management is blocked; existing workspaces, bookings and payments are not modified.'}
              </DialogDescription>
            </DialogHeader>
            <label className='space-y-2 text-sm'>
              {decision.action === 'approve' ? 'Review note (optional)' : 'Reason (required)'}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                disabled={mutation.isPending}
                className='min-h-28 w-full rounded border bg-background p-2'
              />
            </label>
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
                variant={decision.action === 'approve' ? 'default' : 'destructive'}
                disabled={
                  mutation.isPending ||
                  (decision.action === 'approve' ? !confirmed : !reason.trim())
                }
                onClick={() => void submit()}
              >
                {mutation.isPending ? 'Processing…' : 'Confirm'}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
