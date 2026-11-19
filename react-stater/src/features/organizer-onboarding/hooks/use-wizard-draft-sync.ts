import { cancellationPolicyError, defaultCancellationRules } from '@/features/workspaces/utils/cancellation-policy';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useWizardStore } from '../store/wizard-store';
import { mapWizardStateToCreateDto, mapWizardStateToUpdateDto } from '../utils/wizard-api-mapper';
import { workspaceService, workspaceQueryKeys } from '@/features/workspaces/api';
import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';

// The wizard can have more than one mounted save caller for the same draft.
const inFlightSaves = new Map<string, Promise<CanonicalWorkspace | null>>();

export function useWizardDraftSync() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();
  const location = useLocation();
  const store = useWizardStore();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(store.lastSavedAt);

  const search = (location.search as Record<string, unknown>) || {};
  const rawId = search.id ?? search.workspaceId;
  const routeWorkspaceId =
    typeof rawId === 'string' || typeof rawId === 'number'
      ? String(rawId)
          .replace(/^["']|["']$/g, '')
          .trim()
      : undefined;

  const fetchedIdRef = useRef<string | null>(null);
  const loadSequenceRef = useRef(0);
  const cancelPendingLoad = useCallback(() => {
    loadSequenceRef.current++;
    fetchedIdRef.current = null;
  }, []);

  /**
   * Saves the current wizard form state to the REST API.
   * - If no canonical ID exists, performs POST /api/workspaces (Draft creation).
   * - If a canonical ID exists, performs PATCH /api/workspaces/:id with optimistic concurrency.
   * - Never duplicates POST requests if one is currently in flight.
   */
  const saveDraftToServer = useCallback(
    async (options?: { silent?: boolean }): Promise<CanonicalWorkspace | null> => {
      const currentState = useWizardStore.getState();
      const policyError = cancellationPolicyError(currentState.cancellationRules ?? defaultCancellationRules(), c);
      if (policyError) { toast.error(policyError); return null; }
      if (!currentState.canonicalWorkspaceId && !currentState.basicInfo.name.trim()) {
        toast.error(
          c(
            'Enter the workspace name before saving or setting up floors.',
            'Nhập tên không gian trước khi lưu hoặc thiết lập sơ đồ tầng.'
          )
        );
        return null;
      }
      if (routeWorkspaceId && currentState.canonicalWorkspaceId !== routeWorkspaceId) {
        toast.error(
          c(
            'Wait for the workspace to finish loading before saving.',
            'Chờ tải xong thông tin không gian trước khi lưu.'
          )
        );
        return null;
      }
      const actorId = useAuthStore.getState().user?.id;
      let draftKey = currentState.clientDraftKey;
      if (!currentState.canonicalWorkspaceId && !draftKey) {
        draftKey = `client-draft-${crypto.randomUUID()}`;
        currentState.setClientDraftKey(draftKey);
        currentState.saveDraft();
      }
      const saveKey = `${actorId}:${currentState.canonicalWorkspaceId ? `workspace:${currentState.canonicalWorkspaceId}` : `draft:${draftKey}`}`;
      const existingSave = inFlightSaves.get(saveKey);
      if (existingSave) return existingSave;
      const isCurrentDraft = () => {
        const latest = useWizardStore.getState();
        return (
          useAuthStore.getState().user?.id === actorId &&
          (currentState.canonicalWorkspaceId
            ? latest.canonicalWorkspaceId === currentState.canonicalWorkspaceId
            : latest.clientDraftKey === draftKey)
        );
      };
      setIsSaving(true);
      currentState.setIsSavingToServer(true);

      const savePromise = Promise.resolve().then(async (): Promise<CanonicalWorkspace | null> => {
        try {
          let updatedRecord: CanonicalWorkspace;

          if (!currentState.canonicalWorkspaceId) {
            // All local callers share this creation request; later saves use the returned ID.
            const createDto = mapWizardStateToCreateDto({
              ...currentState,
              clientDraftKey: draftKey
            });
            updatedRecord = await workspaceService.createWorkspace(createDto);
            if (!isCurrentDraft()) {
              void queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
              return null;
            }

            currentState.setCanonicalWorkspace(
              String(updatedRecord.id),
              updatedRecord.version ?? 1
            );
            currentState.saveDraft();
            setLastSavedTime(updatedRecord.updatedAt);

            queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });

            if (!options?.silent) {
              toast.success(c('Workspace Draft Initialized', 'Đã tạo bản nháp không gian'), {
                description: c(
                  `Created draft "${updatedRecord.name}" (#${updatedRecord.id}).`,
                  `Đã tạo bản nháp "${updatedRecord.name}" (#${updatedRecord.id}).`
                )
              });
            }
          } else {
            // Incremental Draft Update via PATCH with optimistic concurrency
            const updateDto = mapWizardStateToUpdateDto(currentState, currentState.serverVersion);
            updatedRecord = await workspaceService.updateWorkspace(
              String(currentState.canonicalWorkspaceId),
              updateDto
            );
            if (!isCurrentDraft()) return null;

            currentState.setServerVersion(updatedRecord.version);
            currentState.saveDraft();
            setLastSavedTime(updatedRecord.updatedAt);

            queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });

            if (!options?.silent) {
              toast.success(c('Draft Saved to Server', 'Đã lưu bản nháp'), {
                description: c(
                  `Saved at ${new Date(updatedRecord.updatedAt).toLocaleTimeString('en-US')} (v${updatedRecord.version}).`,
                  `Đã lưu lúc ${new Date(updatedRecord.updatedAt).toLocaleTimeString('vi-VN')} (v${updatedRecord.version}).`
                )
              });
            }
          }

          return updatedRecord;
        } catch (err: unknown) {
          if (!isCurrentDraft()) return null;
          if (err instanceof ApiError) {
            if (err.status === 409) {
              currentState.setSyncError('Conflict: Modified by another session');
              toast.error(c('Version Conflict Detected', 'Dữ liệu đã thay đổi'), {
                description: c(
                  'This workspace was modified in another session. Please reload the latest server draft.',
                  'Không gian đã được sửa ở phiên khác. Vui lòng tải lại bản nháp mới nhất.'
                )
              });
            } else if (err.status === 400 && err.validationErrors) {
              const firstErr = Object.values(err.validationErrors)[0];
              toast.error(c('Draft Validation Warning', 'Bản nháp chưa hợp lệ'), {
                description: firstErr || err.message
              });
            } else {
              toast.error(c('Save Draft Failed', 'Không thể lưu bản nháp'), {
                description: err.message
              });
            }
          } else {
            const msg =
              err instanceof Error
                ? err.message
                : c('Unknown network failure', 'Lỗi kết nối không xác định');
            toast.error(c('Network Error', 'Lỗi kết nối'), { description: msg });
          }
          return null;
        } finally {
          setIsSaving(false);
          if (isCurrentDraft()) currentState.setIsSavingToServer(false);
          inFlightSaves.delete(saveKey);
        }
      });

      inFlightSaves.set(saveKey, savePromise);
      return savePromise;
    },
    [queryClient, c, routeWorkspaceId]
  );

  /**
   * Fetches the latest canonical workspace from the server and hydrates local state
   * without losing local temporary media previews.
   */
  const loadWorkspaceFromServer = useCallback(
    async (workspaceId: string) => {
      const sequence = ++loadSequenceRef.current;
      try {
        const canonical = await workspaceService.getWorkspaceById(workspaceId);
        if (sequence !== loadSequenceRef.current) return;
        useWizardStore.getState().hydrateFromServer(canonical);
        setLastSavedTime(canonical.updatedAt);
        toast.info(c('Workspace Hydrated from Server', 'Đã tải thông tin không gian'), {
          description: c(
            `Loaded "${canonical.name}" (#${canonical.id}) v${canonical.version}.`,
            `Đã tải "${canonical.name}" (#${canonical.id}) v${canonical.version}.`
          )
        });
      } catch (err: unknown) {
        if (sequence !== loadSequenceRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : c('Failed to retrieve workspace', 'Không thể tải thông tin không gian');
        toast.error(
          c('Could not load workspace from server', 'Không thể tải thông tin không gian'),
          { description: msg }
        );
      }
    },
    [c]
  );

  // New-workspace entry actions reset the draft explicitly. Saving or revisiting step 1
  // must retain the canonical ID so later steps and floor setup update the same workspace.

  // Automatically hydrate workspace if route parameter id differs from store
  useEffect(() => {
    if (
      routeWorkspaceId &&
      routeWorkspaceId !== store.canonicalWorkspaceId &&
      fetchedIdRef.current !== routeWorkspaceId
    ) {
      fetchedIdRef.current = routeWorkspaceId;
      // oxlint-disable-next-line react/set-state-in-effect
      loadWorkspaceFromServer(routeWorkspaceId);
    }
    return cancelPendingLoad;
  }, [routeWorkspaceId, store.canonicalWorkspaceId, loadWorkspaceFromServer, cancelPendingLoad]);

  // Automatically record current wizard step route for this workspace without triggering infinite re-renders
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/organizer/workspaces/create')) {
      const targetId = routeWorkspaceId || store.canonicalWorkspaceId;
      if (targetId) {
        const state = useWizardStore.getState();
        if (state.workspaceSteps?.[targetId] !== location.pathname) {
          state.setWorkspaceStep(targetId, location.pathname);
        }
      }
    }
  }, [location.pathname, routeWorkspaceId, store.canonicalWorkspaceId]);

  return {
    canonicalWorkspaceId: store.canonicalWorkspaceId,
    serverVersion: store.serverVersion,
    isDraftSynced: store.isDraftSynced,
    isSaving: isSaving || store.isSavingToServer,
    lastSavedTime,
    syncError: store.syncError,
    saveDraftToServer,
    loadWorkspaceFromServer
  };
}
