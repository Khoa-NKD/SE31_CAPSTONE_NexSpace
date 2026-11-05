import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerLifecycleQueryOptions } from '@/features/organizer-lifecycle/api/lifecycle';
import { CorrectionDocuments } from '@/features/organizer-lifecycle/components/correction-documents';
import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { Button } from '@/components/ui/button';

export function DraftVerificationDocuments({
  actorId,
  disabled,
  onBusyChange
}: {
  actorId: number;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const tr = useOrganizerTranslation();
  const client = useQueryClient();
  const options = ownerLifecycleQueryOptions(actorId);
  const query = useQuery(options);
  if (query.isPending) return <p role='status'>{tr('Loading current documents…')}</p>;
  if (query.isError)
    return (
      <div role='alert'>
        <p>{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>{tr('Reload documents')}</Button>
      </div>
    );
  return (
    <CorrectionDocuments
      actorId={actorId}
      context={query.data}
      disabled={disabled}
      onUpdated={(value) => client.setQueryData(options.queryKey, value)}
      onBusyChange={onBusyChange}
    />
  );
}
