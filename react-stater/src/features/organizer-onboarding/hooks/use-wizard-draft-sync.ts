import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWizardStore } from '../store/wizard-store';
import {
  mapWizardStateToCreateDto,
  mapWizardStateToUpdateDto
} from '../utils/wizard-api-mapper';
import { workspaceService, workspaceQueryKeys } from '@/features/workspaces/api';
import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import { ApiError } from '@/lib/api-client';

export function useWizardDraftSync() {
  const queryClient = useQueryClient();
  const store = useWizardStore();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(store.lastSavedAt);
  const inFlightPromiseRef = useRef<Promise<CanonicalWorkspace | null> | null>(null);

  /**
   * Saves the current wizard form state to the centralized Mock REST API.
   * - If no canonical ID exists, performs POST /api/v1/workspaces (Draft creation).
   * - If a canonical ID exists, performs PATCH /api/v1/workspaces/:id with optimistic concurrency.
   * - Never duplicates POST requests if one is currently in flight.
   */
  const saveDraftToServer = useCallback(
    async (options?: { silent?: boolean }): Promise<CanonicalWorkspace | null> => {
      // Guard against concurrent double-saving or StrictMode double mounts
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }

      const currentState = useWizardStore.getState();
      setIsSaving(true);
      currentState.setIsSavingToServer(true);

      const savePromise = (async (): Promise<CanonicalWorkspace | null> => {
        try {
          let updatedRecord: CanonicalWorkspace;

          if (!currentState.canonicalWorkspaceId) {
            // Ensure stable client draft key is generated and persisted before the first POST
            let draftKey = currentState.clientDraftKey;
            if (!draftKey) {
              draftKey = `client-draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              currentState.setClientDraftKey(draftKey);
              currentState.saveDraft();
            }

            // Initial Draft Creation on Server with Idempotency Key
            const createDto = mapWizardStateToCreateDto({
              ...currentState,
              clientDraftKey: draftKey
            });
            updatedRecord = await workspaceService.createWorkspace(createDto);

            currentState.setCanonicalWorkspace(updatedRecord.id, updatedRecord.version);
            currentState.saveDraft();
            setLastSavedTime(updatedRecord.updatedAt);

            queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });

            if (!options?.silent) {
              toast.success('Workspace Draft Initialized', {
                description: `Created canonical record "${updatedRecord.name}" (${updatedRecord.id}).`
              });
            }
          } else {
            // Incremental Draft Update via PATCH with optimistic concurrency
            const updateDto = mapWizardStateToUpdateDto(
              currentState,
              currentState.serverVersion
            );
            updatedRecord = await workspaceService.updateWorkspace(
              currentState.canonicalWorkspaceId,
              updateDto
            );

            currentState.setServerVersion(updatedRecord.version);
            currentState.saveDraft();
            setLastSavedTime(updatedRecord.updatedAt);

            queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });

            if (!options?.silent) {
              toast.success('Draft Saved to Server', {
                description: `Saved at ${new Date(updatedRecord.updatedAt).toLocaleTimeString()} (v${updatedRecord.version}).`
              });
            }
          }

          return updatedRecord;
        } catch (err: unknown) {
          if (err instanceof ApiError) {
            if (err.status === 409) {
              currentState.setSyncError('Conflict: Modified by another session');
              toast.error('Version Conflict Detected', {
                description:
                  'This workspace was modified in another session. Please reload the latest server draft.'
              });
            } else if (err.status === 400 && err.validationErrors) {
              const firstErr = Object.values(err.validationErrors)[0];
              toast.error('Draft Validation Warning', {
                description: firstErr || err.message
              });
            } else {
              toast.error('Save Draft Failed', {
                description: err.message
              });
            }
          } else {
            const msg = err instanceof Error ? err.message : 'Unknown network failure';
            toast.error('Network Error', { description: msg });
          }
          return null;
        } finally {
          setIsSaving(false);
          currentState.setIsSavingToServer(false);
          inFlightPromiseRef.current = null;
        }
      })();

      inFlightPromiseRef.current = savePromise;
      return savePromise;
    },
    [queryClient]
  );

  /**
   * Fetches the latest canonical workspace from the server and hydrates local state
   * without losing local temporary media previews.
   */
  const loadWorkspaceFromServer = useCallback(
    async (workspaceId: string) => {
      try {
        const canonical = await workspaceService.getWorkspaceById(workspaceId);
        useWizardStore.getState().hydrateFromServer(canonical);
        setLastSavedTime(canonical.updatedAt);
        toast.info('Workspace Hydrated from Server', {
          description: `Loaded "${canonical.name}" (${canonical.id}) v${canonical.version}.`
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to retrieve workspace';
        toast.error('Could not load workspace from server', { description: msg });
      }
    },
    []
  );

  return {
    canonicalWorkspaceId: store.canonicalWorkspaceId,
    serverVersion: store.serverVersion,
    isDraftSynced: store.isDraftSynced,
    isSaving,
    lastSavedTime,
    syncError: store.syncError,
    saveDraftToServer,
    loadWorkspaceFromServer
  };
}
