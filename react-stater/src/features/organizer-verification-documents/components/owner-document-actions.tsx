import { useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { DocumentActions } from '@/features/admin-organizers/components/document-actions';
import { fetchDocumentContent } from '@/features/admin-organizers/api/document-content';

export function OwnerDocumentActions({
  profileId,
  document
}: {
  profileId: number;
  document: { id: number; fileName: string };
}) {
  const actorId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.accessToken);
  const load = useCallback(
    (id: string, signal?: AbortSignal, download?: boolean) =>
      fetchDocumentContent(String(profileId), id, signal, download, 'owner'),
    [profileId]
  );
  return (
    <DocumentActions
      key={`${actorId}:${token}`}
      applicationId={String(profileId)}
      document={document}
      fetchContent={load}
    />
  );
}
