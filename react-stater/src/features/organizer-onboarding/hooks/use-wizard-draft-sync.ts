import { workspaceSiteOptions } from '@/features/organizer-resources/api/buildings';
import { workspaceEditSnapshot } from '../utils/workspace-edit-snapshot';
import { amenityQueries } from '@/features/amenities/api/queries';
import { amenityService } from '@/features/amenities/api/service';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useWizardSaveFeedback } from '../components/wizard-save-feedback';
import { getWizardValidationMessage } from '../utils/wizard-copy';
import { useWizardStore } from '../store/wizard-store';
import { mapWizardStateToCreateDto, mapWizardStateToUpdateDto } from '../utils/wizard-api-mapper';
import { workspaceService, workspaceQueryKeys } from '@/features/workspaces/api';
import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import { ApiError, apiClient } from '@/lib/api-client';
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
    async (options?: {
      silent?: boolean;
      commitEdit?: boolean;
    }): Promise<CanonicalWorkspace | null> => {
      const currentState = useWizardStore.getState();
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
      const editing = search.mode === 'edit';
      if (
        editing &&
        options?.commitEdit &&
        currentState.media.items.some(
          (item) => item.uploadStatus === 'uploading' || item.uploadStatus === 'error'
        )
      ) {
        toast.error('Hoàn tất tải ảnh hoặc xử lý ảnh lỗi trước khi lưu.');
        return null;
      }
      if (
        editing &&
        currentState.canonicalWorkspaceId &&
        (!options?.commitEdit || !location.pathname.endsWith('/review'))
      ) {
        if (options?.commitEdit)
          useWizardSaveFeedback.setState({ workspaceId: currentState.canonicalWorkspaceId });
        return {
          id: currentState.canonicalWorkspaceId,
          version: currentState.serverVersion
        } as unknown as CanonicalWorkspace;
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
            updatedRecord = editing
              ? await apiClient.put<CanonicalWorkspace>(
                  `/workspaces/${currentState.canonicalWorkspaceId}/editor`,
                  {
                    workspace: updateDto,
                    site: currentState.stagedSite,
                    amenities: currentState.editAmenitiesDirty
                      ? {
                          amenities: currentState.amenities.map((id) => ({
                            amenityId: Number(id),
                            addonPricePerHour: currentState.amenityAddonRates?.[id] ?? 0
                          }))
                        }
                      : undefined,
                    media: currentState.editMediaDirty
                      ? {
                          items: currentState.media.items
                            .filter((item) => /^https?:/.test(item.url))
                            .map((item, displayOrder) => ({
                              url: item.url,
                              isCover: item.id === currentState.media.coverPhotoId,
                              displayOrder,
                              mediaType: 'IMAGE'
                            }))
                        }
                      : undefined
                  }
                )
              : await workspaceService.updateWorkspace(
                  String(currentState.canonicalWorkspaceId),
                  updateDto
                );
            if (!isCurrentDraft()) return null;

            currentState.setServerVersion(updatedRecord.version);
            currentState.saveDraft();
            setLastSavedTime(updatedRecord.updatedAt);

            queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });

            if (!options?.silent && !editing) {
              toast.success(
                editing
                  ? c('Changes saved', 'Đã lưu thay đổi')
                  : c('Draft Saved to Server', 'Đã lưu bản nháp'),
                {
                  description: c(
                    `Saved at ${new Date(updatedRecord.updatedAt).toLocaleTimeString('en-US')} (v${updatedRecord.version}).`,
                    `Đã lưu lúc ${new Date(updatedRecord.updatedAt).toLocaleTimeString('vi-VN')} (v${updatedRecord.version}).`
                  )
                }
              );
            }
          }

          const latest = useWizardStore.getState();
          const unchanged =
            JSON.stringify(mapWizardStateToUpdateDto(latest)) ===
              JSON.stringify(mapWizardStateToUpdateDto(currentState)) &&
            JSON.stringify(latest.amenityAddonRates) ===
              JSON.stringify(currentState.amenityAddonRates) &&
            JSON.stringify(latest.media) === JSON.stringify(currentState.media) &&
            JSON.stringify(latest.stagedSite) === JSON.stringify(currentState.stagedSite);
          if (unchanged) {
            latest.markDraftSynced(true);
            if (editing)
              useWizardStore.setState({
                editAmenitiesDirty: false,
                editMediaDirty: false,
                stagedSite: undefined
              });
          }
          if (editing && currentState.editAmenitiesDirty) {
            await queryClient.invalidateQueries({
              queryKey: amenityQueries.workspaceAmenities(currentState.canonicalWorkspaceId)
                .queryKey
            });
          }
          if (editing && options?.commitEdit && !location.pathname.endsWith('/review')) {
            useWizardSaveFeedback.setState({ workspaceId: String(updatedRecord.id) });
          }
          return updatedRecord;
        } catch (err: unknown) {
          if (!isCurrentDraft()) return null;
          if (err instanceof ApiError) {
            if (err.status === 409) {
              const message = getWizardValidationMessage(err.message, c);
              currentState.setSyncError(message);
              toast.error(c('Changes could not be saved', 'Chưa lưu được thay đổi'), {
                description: message
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
    [queryClient, c, routeWorkspaceId, search.mode, location.pathname]
  );

  /**
   * Fetches the latest canonical workspace from the server and hydrates local state
   * without losing local temporary media previews.
   */
  const loadWorkspaceFromServer = useCallback(
    async (workspaceId: string) => {
      const sequence = ++loadSequenceRef.current;
      try {
        const [canonical, media, amenities, site] = await Promise.all([
          workspaceService.getWorkspaceById(workspaceId),
          workspaceService.getWorkspaceMedia(Number(workspaceId)),
          amenityService.getWorkspaceAmenities(workspaceId),
          queryClient.fetchQuery(
            workspaceSiteOptions(useAuthStore.getState().user?.id ?? 0, Number(workspaceId))
          )
        ]);
        if (sequence !== loadSequenceRef.current) return;
        useWizardStore.getState().hydrateFromServer(canonical);
        const state = useWizardStore.getState();
        const items = media.map((item) => ({
          id: String(item.id),
          url: item.url,
          name: 'Ảnh không gian',
          isCover: Boolean(item.cover ?? item.isCover),
          uploadStatus: 'uploaded' as const
        }));
        state.setMediaGallery({
          items,
          coverPhotoId: items.find((item) => item.isCover)?.id ?? items[0]?.id ?? ''
        });
        state.setAmenities(amenities.map((item) => String(item.amenityId)));
        useWizardStore.setState({
          amenityAddonRates: Object.fromEntries(
            amenities.map((item) => [String(item.amenityId), item.addonPricePerHour ?? 0])
          ),
          editMediaDirty: false,
          editAmenitiesDirty: false,
          stagedSite: undefined
        });
        useWizardStore.setState({
          editBaseline: workspaceEditSnapshot(useWizardStore.getState(), site)
        });
        state.markDraftSynced(true);
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
    [c, queryClient]
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
