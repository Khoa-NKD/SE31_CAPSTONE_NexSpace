import { Spinner as LoaderCircle } from '@/components/ui/spinner';
import {
  expandCanvasSelection,
  pasteCanvasSelection,
  type CanvasClipboard
} from '../utils/canvas-selection';
import { changedLayoutResources } from '../utils/manual-layout-draft';
import type { GroupEditPhase } from './use-canvas-multi-selection';
import type { FloorLayout, FloorDecoration } from '../api/resources';
import type { ResourceTypePhoto } from '../api/resource-type-photos';
import { ResourceTypePhotoField } from './resource-type-photo-field';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { copyDisplayName, copyResourceCode } from '../utils/copy-names';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  resourceDraftForm,
  resourceDraftLayout,
  draftGeometry,
  uniqueResourceCode,
  changedResourceDrafts,
  type ResourceDraft,
  type DraftForm
} from '../utils/resource-drafts';
import { moveWithRoom } from '../utils/placement';
import { canvasPosition } from '../utils/canvas-resource-form';
import {
  layoutGeometry,
  insideRoom,
  previewLayout,
  containingRoomId,
  withSpatialParents
} from '../utils/layout-placement';
import { useBlocker } from '@tanstack/react-router';
import { resourceUsageKinds } from '../utils/resource-usage-kinds';
import {
  designMetricsOptions,
  previewDesignMetrics,
  saveDesignMetrics,
  type DesignMetrics,
  type GeometryReview,
  type MeasurementMode
} from '../api/floor-design';
import { GeometryReviewNotice } from './geometry-review';
import { MeasurementModeField } from './measurement-mode-field';
import { geometryDisplay, geometryInput } from '../utils/metric-units';
import type { ResourceUsageKind } from '../api/resources';
import { FloorAllocationDialog } from './floor-allocation-dialog';
import {
  Save,
  LockKeyhole,
  ArrowLeft,
  Armchair,
  DoorOpen,
  MapPin,
  Ruler,
  SlidersHorizontal,
  Copy,
  Plus,
  Trash2
} from '@/components/ui/hugeicons';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  optionalPrice,
  resourceFormSchema,
  saveResource,
  saveResourceBatch,
  saveFloorDecorations,
  deleteResource,
  resourcePayload,
  floorLayoutOptions,
  getResource,
  saveResourceType
} from '../api/resources';
import type { ResourceDetail, ResourceOptions, TypeOption, FloorOption } from '../api/resources';
import { ResourcePlacementEditor } from './resource-placement-editor';
import { usePlacementValidation } from './use-placement-validation';
import { selectPlacementFields, type PlacementFields } from '../utils/placement';

const selectClass =
  'border-input bg-background h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className='block min-w-0 space-y-2 text-sm font-medium'>
      <span>{label}</span>
      {children}
      {error && (
        <span role='alert' className='text-destructive block text-xs font-normal'>
          {error}
        </span>
      )}
    </label>
  );
}
function useCopy() {
  const { language } = useLanguage();
  return (en: string, vi: string) => (language === 'vi' ? vi : en);
}

const hasStandardSize = (item?: TypeOption) =>
  Number(item?.standardWidthM) > 0 && Number(item?.standardLengthM) > 0;
type StudioEditorOptions = {
  canvasTarget: HTMLElement | null;
  initialTypeId?: number;
  existingCodes?: string[];
  onToggleFullscreen?: () => void;
  fullscreenActive?: boolean;
};

/** Keep the form and its canvas in one editor session, even in the studio's separate panes. */
function EditorCanvas({ studio, children }: { studio?: StudioEditorOptions; children: ReactNode }) {
  if (!studio) return children;
  return studio.canvasTarget ? createPortal(children, studio.canvasTarget) : null;
}

export function ResourceEditor({
  workspaceId,
  options: initialOptions,
  current: initialCurrent,
  studio,
  onClose,
  onSaved
}: {
  workspaceId: number;
  options: ResourceOptions;
  current?: ResourceDetail;
  studio?: StudioEditorOptions;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = useCopy();
  const [addedTypes, setAddedTypes] = useState<TypeOption[]>([]);
  const [creatingType, setCreatingType] = useState(false);
  const [editingType, setEditingType] = useState(false);
  const [editingDimensions, setEditingDimensions] = useState(false);
  const options = {
    ...initialOptions,
    types: [
      ...initialOptions.types,
      ...addedTypes.filter((added) => !initialOptions.types.some((type) => type.id === added.id))
    ]
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(initialCurrent);
  const [activeForm, setActiveForm] = useState(() => {
    const initial = resourceDraftForm(options, initialCurrent);
    const chosen = options.types.find(
      (item) => item.id === (studio?.initialTypeId ?? Number(initial.resourceTypeId))
    );
    return studio && !initialCurrent
      ? {
          ...initial,
          resourceTypeId: String(chosen?.id ?? ''),
          name: chosen?.name ?? '',
          code: uniqueResourceCode(
            `${chosen?.category === 'ROOM' ? 'ROOM' : 'SEAT'}-${initial.floorPlanId}`,
            studio.existingCodes ?? []
          ),
          posX: '0',
          posY: '0'
        }
      : initial;
  });
  const [activeKey, setActiveKey] = useState(initialCurrent?.id ?? -1);
  const nextKey = useRef(-2);
  const [staged, setStaged] = useState<ResourceDraft[]>([]);
  const [extraDecorations, setExtraDecorations] = useState<
    import('../api/resources').FloorDecoration[]
  >([]);
  const [sceneOverride, setSceneOverride] = useState<FloorLayout>();
  const [emptyCanvas, setEmptyCanvas] = useState(false);
  const [groupClipboard, setGroupClipboard] = useState<CanvasClipboard | null>(null);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const groupOperation = useRef(false);
  const [copyContents, setCopyContents] = useState(true);
  const [deskTypeId, setDeskTypeId] = useState(
    String(options.types.find((t) => t.category === 'DESK' && t.active && t.currency)?.id ?? '')
  );
  const [clipboard, setClipboard] = useState<{
    root: ResourceDraft;
    children: ResourceDraft[];
    objects: import('../api/resources').FloorDecoration[];
  } | null>(null);
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const floorId = Number(activeForm.floorPlanId);
  const floorQuery = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: actorId > 0 && floorId > 0
  });
  const metrics = useQuery({
    ...designMetricsOptions(actorId, workspaceId, floorId),
    enabled: actorId > 0 && floorId > 0
  });
  const type = options.types.find((item) => item.id === Number(activeForm.resourceTypeId));
  const standardSize = (item?: TypeOption) => {
    const layout = floorQuery.data;
    const scale = metrics.data;
    if (
      !hasStandardSize(item) ||
      !layout?.width ||
      !layout.height ||
      !scale?.widthM ||
      !scale.lengthM
    )
      return undefined;
    return {
      width: String(
        Number(((Number(item?.standardWidthM) * layout.width) / scale.widthM).toFixed(2))
      ),
      height: String(
        Number(((Number(item?.standardLengthM) * layout.height) / scale.lengthM).toFixed(2))
      )
    };
  };
  const inheritSize = (draft: ResourceDraft): ResourceDraft => {
    if (draft.current?.resourceTypeId === Number(draft.form.resourceTypeId)) return draft;
    const draftType = options.types.find((item) => item.id === Number(draft.form.resourceTypeId));
    const size = standardSize(draftType);
    return size ? { ...draft, form: { ...draft.form, ...size } } : draft;
  };
  const activeDraft = inheritSize({ key: activeKey, form: activeForm, current });
  const form = activeDraft.form;
  const drafts = emptyCanvas ? staged.map(inheritSize) : [...staged.map(inheritSize), activeDraft];
  const sizeLocked = hasStandardSize(type);
  const sizeUnavailable = drafts.some((draft) => {
    if (draft.current?.resourceTypeId === Number(draft.form.resourceTypeId)) return false;
    const draftType = options.types.find((item) => item.id === Number(draft.form.resourceTypeId));
    return hasStandardSize(draftType) && !standardSize(draftType);
  });
  const composed = floorQuery.data
    ? resourceDraftLayout(
        sceneOverride?.floor.id === floorId ? sceneOverride : floorQuery.data,
        drafts,
        options
      )
    : undefined;
  const canvasLayout = composed
    ? { ...composed, decorations: [...(composed.decorations ?? []), ...extraDecorations] }
    : undefined;
  const setForm = (update: DraftForm | ((previous: DraftForm) => DraftForm)) => {
    setEmptyCanvas(false);
    let next = typeof update === 'function' ? update(form) : update;
    const nextPose = draftGeometry(next);
    if (
      nextPose &&
      canvasLayout &&
      options.types.find((item) => item.id === Number(next.resourceTypeId))?.category === 'DESK'
    ) {
      const parent = containingRoomId(canvasLayout.resources, nextPose, activeKey);
      next = { ...next, parentRoomId: parent ? String(parent) : '' };
    }
    const before = draftGeometry(form),
      after = draftGeometry(next);
    if (
      before &&
      after &&
      options.types.find((t) => t.id === Number(form.resourceTypeId))?.category === 'ROOM'
    ) {
      setStaged((items) =>
        items.map((item) => {
          const pose = draftGeometry(item.form);
          if (
            options.types.find((type) => type.id === Number(item.form.resourceTypeId))?.category !==
              'DESK' ||
            !pose ||
            !insideRoom(pose, before)
          )
            return item;
          const moved = moveWithRoom(pose, before, after);
          return {
            ...item,
            form: {
              ...item.form,
              posX: String(moved.x),
              posY: String(moved.y),
              rotation: String(moved.rotation)
            }
          };
        })
      );
      setExtraDecorations((items) =>
        items.map((item) => {
          const pose = layoutGeometry(item)!;
          if (!insideRoom(pose, before)) return item;
          const moved = moveWithRoom(pose, before, after);
          return { ...item, posX: moved.x, posY: moved.y, rotation: moved.rotation };
        })
      );
    }
    setActiveForm(next);
  };
  const [initialPosition, setInitialPosition] = useState(() => selectPlacementFields(form));
  const [initialForm] = useState(() => JSON.stringify(activeForm));
  const [confirmClose, setConfirmClose] = useState(false);
  const dirty =
    staged.length > 0 ||
    extraDecorations.length > 0 ||
    !!sceneOverride ||
    emptyCanvas ||
    JSON.stringify(activeForm) !== initialForm;
  const navigation = useBlocker({
    shouldBlockFn: () => dirty || busy,
    enableBeforeUnload: () => dirty || busy,
    withResolver: true
  });
  const close = () => {
    if (busy) return;
    if (dirty) setConfirmClose(true);
    else onClose();
  };
  type EditorSnapshot = {
    drafts: ResourceDraft[];
    extra: FloorDecoration[];
    scene?: FloorLayout;
    empty: boolean;
    active: number;
  };
  const snapshot = (): EditorSnapshot => ({
    drafts: drafts.map((draft) => ({ ...draft, form: { ...draft.form } })),
    extra: [...extraDecorations],
    scene: sceneOverride,
    empty: emptyCanvas,
    active: activeKey
  });
  const restore = (saved: EditorSnapshot) => {
    const active = saved.drafts.find((draft) => draft.key === saved.active) ?? saved.drafts[0];
    if (active) {
      setActiveKey(active.key);
      setCurrent(active.current);
      setActiveForm({ ...active.form });
    }
    setStaged(saved.drafts.filter((draft) => draft.key !== active?.key));
    setExtraDecorations(saved.extra);
    setSceneOverride(saved.scene);
    setEmptyCanvas(saved.empty);
  };
  const [undoPositions, setUndoPositions] = useState<EditorSnapshot[]>([]);
  const [redoPositions, setRedoPositions] = useState<EditorSnapshot[]>([]);
  const groupStart = useRef<EditorSnapshot | null>(null);
  const checkpoint = () => {
    setUndoPositions((previous) => [...previous.slice(-99), snapshot()]);
    setRedoPositions([]);
  };
  const changePosition = (position: PlacementFields, record = true) => {
    if (record) checkpoint();
    setForm((previous) => ({ ...previous, ...position }));
  };
  const undoPosition = () => {
    const saved = undoPositions.at(-1);
    if (!saved) return;
    setRedoPositions((previous) => [...previous, snapshot()]);
    setUndoPositions((previous) => previous.slice(0, -1));
    restore(saved);
  };
  const redoPosition = () => {
    const saved = redoPositions.at(-1);
    if (!saved) return;
    setUndoPositions((previous) => [...previous, snapshot()]);
    setRedoPositions((previous) => previous.slice(0, -1));
    restore(saved);
  };
  function installGroupScene(next: FloorLayout, collection = drafts) {
    next = withSpatialParents(next);
    const updated = collection.map((draft) => {
      const item = next.resources.find((item) => item.id === draft.key);
      return item
        ? {
            ...draft,
            form: {
              ...draft.form,
              ...canvasPosition(item),
              parentRoomId: item.parentRoomId ? String(item.parentRoomId) : ''
            }
          }
        : draft;
    });
    const active = updated.find((draft) => draft.key === activeKey) ?? updated[0];
    if (active) {
      setActiveKey(active.key);
      setCurrent(active.current);
      setActiveForm({ ...active.form });
    } else {
      setCurrent(undefined);
      setActiveKey(nextKey.current--);
      setActiveForm({
        ...resourceDraftForm(options),
        floorPlanId: String(floorId),
        posX: '',
        posY: ''
      });
    }
    setStaged(updated.filter((draft) => draft.key !== active?.key));
    setEmptyCanvas(!active);
    const extraIds = new Set(extraDecorations.map((item) => item.id));
    setExtraDecorations((next.decorations ?? []).filter((item) => extraIds.has(item.id)));
    setSceneOverride({
      ...next,
      resources: next.resources.filter((item) => item.id > 0),
      decorations: (next.decorations ?? []).filter((item) => !extraIds.has(item.id))
    });
  }
  function changeGroup(next: FloorLayout, phase: GroupEditPhase) {
    if (phase === 'start') {
      groupStart.current = snapshot();
      checkpoint();
      return;
    }
    if (phase === 'cancel') {
      if (groupStart.current) restore(groupStart.current);
      setUndoPositions((previous) => previous.slice(0, -1));
      groupStart.current = null;
      return;
    }
    installGroupScene(next);
    if (phase === 'end') groupStart.current = null;
  }
  function copyGroup(keys: string[], includeContents = true) {
    if (!canvasLayout || busy) return null;
    const copied = {
      scene: canvasLayout,
      keys: includeContents ? expandCanvasSelection(canvasLayout, keys) : keys,
      includeContents
    };
    setGroupClipboard(copied);
    toast.success(c('Group copied.', 'Đã sao chép nhóm.'));
    return copied;
  }
  async function pasteGroup(copied = groupClipboard) {
    if (!copied || !canvasLayout || busy || groupOperation.current) return;
    groupOperation.current = true;
    setBusy(true);
    setError('');
    try {
      const pasted = pasteCanvasSelection(canvasLayout, copied, c('en', 'vi') as 'en' | 'vi');
      if (!pasted) return;
      const copies = await Promise.all(
        pasted.resources.map(async (item) => {
          const sourceId = pasted.sources.get(item.id)!;
          const original = drafts.find((draft) => draft.key === sourceId);
          const detail =
            original?.current ?? (sourceId > 0 ? await getResource(sourceId) : undefined);
          if (detail && (detail.workspaceId !== workspaceId || detail.floorPlanId !== floorId))
            throw new Error(
              c('Resource no longer belongs to this floor.', 'Chỗ không còn thuộc sơ đồ này.')
            );
          const sourceForm = original?.form ?? resourceDraftForm(options, detail);
          return {
            key: item.id,
            form: {
              ...sourceForm,
              ...canvasPosition(item),
              code: item.code,
              name: item.name,
              parentRoomId: item.parentRoomId ? String(item.parentRoomId) : ''
            }
          };
        })
      );
      checkpoint();
      nextKey.current = Math.min(nextKey.current, ...copies.map((item) => item.key)) - 1;
      if (copies[0]) {
        setActiveKey(copies[0].key);
        setActiveForm(copies[0].form);
        setCurrent(undefined);
        setEmptyCanvas(false);
        setStaged([...drafts, ...copies.slice(1)]);
      }
      setExtraDecorations((items) => [...items, ...pasted.decorations]);
      setGroupSelection([
        ...copies.map((item) => 'resource:' + item.key),
        ...pasted.decorations.map((item) => 'decoration:' + item.id)
      ]);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Could not paste group.', 'Không dán được nhóm.')
      );
    } finally {
      groupOperation.current = false;
      setBusy(false);
    }
  }
  async function deleteGroup(keys: string[]) {
    if (!canvasLayout || busy || groupOperation.current) return;
    const selected = new Set(expandCanvasSelection(canvasLayout, keys));
    if (!selected.size) return;
    groupOperation.current = true;
    setBusy(true);
    setError('');
    const deleted = new Set<number>();
    let failure: unknown;
    try {
      const details = await Promise.all(
        canvasLayout.resources
          .filter((item) => item.id > 0 && selected.has('resource:' + item.id))
          .map(async (item) => {
            const detail = await getResource(item.id);
            if (
              detail.revision !== item.revision ||
              detail.workspaceId !== workspaceId ||
              detail.floorPlanId !== floorId
            )
              throw new Error(
                c(
                  'The floor changed. Reload before deleting.',
                  'Sơ đồ đã thay đổi. Tải lại trước khi xóa.'
                )
              );
            return detail;
          })
      );
      details.sort((a, b) => Number(a.category === 'ROOM') - Number(b.category === 'ROOM'));
      for (const detail of details) {
        await deleteResource(detail);
        deleted.add(detail.id);
      }
    } catch (error) {
      failure = error;
    }
    const remaining = canvasLayout.resources.filter((item) =>
      item.id > 0 ? !deleted.has(item.id) : !selected.has('resource:' + item.id)
    );
    const next = {
      ...canvasLayout,
      resources: remaining,
      decorations: (canvasLayout.decorations ?? []).filter(
        (item) => !selected.has('decoration:' + item.id)
      )
    };
    if (deleted.size) {
      const refreshed = await floorQuery.refetch();
      if (refreshed.data) next.floor = refreshed.data.floor;
    }
    installGroupScene(
      next,
      drafts.filter((draft) => remaining.some((item) => item.id === draft.key))
    );
    setGroupSelection([]);
    setUndoPositions([]);
    setRedoPositions([]);
    groupOperation.current = false;
    setBusy(false);
    if (failure)
      setError(
        failure instanceof Error
          ? failure.message
          : c('Some objects could not be deleted.', 'Một số đối tượng chưa xóa được.')
      );
    else toast.success(c('Selection removed.', 'Đã xóa nhóm đã chọn.'));
  }
  const set = (key: keyof typeof form, value: string) => {
    if (['posX', 'posY', 'width', 'height', 'rotation'].includes(key)) checkpoint();
    setForm((v) => ({ ...v, [key]: value }));
  };
  const placement = usePlacementValidation(
    workspaceId,
    Number(form.floorPlanId),
    form,
    {
      resourceId: activeKey,
      parentRoomId: Number(form.parentRoomId) || undefined,
      category: type?.category
    },
    canvasLayout
  );
  function activate(draft: ResourceDraft, collection = drafts) {
    setGroupSelection([]);
    setEmptyCanvas(false);
    setStaged(collection.filter((item) => item.key !== draft.key));
    setActiveKey(draft.key);
    setCurrent(draft.current);
    setActiveForm({ ...draft.form });
    setInitialPosition(selectPlacementFields(draft.form));
    setUndoPositions([]);
    setRedoPositions([]);
    setErrors({});
    setError('');
  }
  async function selectDraft(key: string) {
    if (busy) return;
    const id = Number(key.replace('resource:', ''));
    const draft = drafts.find((item) => item.key === id);
    if (draft) activate(draft);
    else if (id > 0) {
      setBusy(true);
      try {
        const resource = await getResource(id);
        if (
          resource.floorPlanId !== Number(form.floorPlanId) ||
          resource.workspaceId !== workspaceId
        )
          throw new Error(
            c('Select a resource in this workspace.', 'Chỉ chọn chỗ trong workspace này.')
          );
        const next = { key: id, current: resource, form: resourceDraftForm(options, resource) };
        activate(next, [...drafts, next]);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Could not select resource');
      } finally {
        setBusy(false);
      }
    }
  }
  async function copySelection() {
    if (busy || !canvasLayout || !draftGeometry(form)) return;
    if (!form.code.trim() || !form.name.trim()) {
      toast.error(c('Enter a code and name before copying.', 'Nhập mã và tên trước khi sao chép.'));
      return;
    }
    setBusy(true);
    try {
      const children =
        copyContents && type?.category === 'ROOM'
          ? await Promise.all(
              canvasLayout.resources
                .filter((item) => item.parentRoomId === activeKey)
                .map(async (item) => {
                  const draft = drafts.find((d) => d.key === item.id);
                  if (draft) return { ...draft, form: { ...draft.form } };
                  const resource = await getResource(item.id);
                  return {
                    key: item.id,
                    current: resource,
                    form: {
                      ...resourceDraftForm(options, resource),
                      posX: String(item.posX),
                      posY: String(item.posY),
                      rotation: String(item.rotation)
                    }
                  };
                })
            )
          : [];
      const pose = draftGeometry(form)!;
      const snapshot = {
        root: { key: activeKey, form: { ...form }, current },
        children,
        objects:
          copyContents && type?.category === 'ROOM'
            ? (canvasLayout.decorations ?? [])
                .filter((item) => insideRoom(layoutGeometry(item)!, pose))
                .map((item) => ({ ...item }))
            : []
      };
      setClipboard(snapshot);
      toast.success(
        c('Copied. Paste to add a draft copy.', 'Đã sao chép. Bấm Dán để thêm bản nháp.')
      );
      return snapshot;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Copy failed');
    } finally {
      setBusy(false);
    }
  }
  function pasteSelection(snapshot = clipboard) {
    if (!snapshot || !canvasLayout) return;
    if (snapshot.root.form.floorPlanId !== form.floorPlanId) {
      toast.error(
        c('Copy and paste within the same floor.', 'Sao chép và dán trong cùng sơ đồ tầng.')
      );
      return;
    }
    if (drafts.length + snapshot.children.length + 1 > 100) {
      toast.error(
        c('Save before adding more than 100 resources.', 'Lưu trước khi thêm quá 100 ghế/phòng.')
      );
      return;
    }
    const before = draftGeometry(snapshot.root.form)!;
    const after = { ...before, x: before.x + before.width + 20 };
    const codes = canvasLayout.resources.map((item) => item.code);
    const names = canvasLayout.resources.map((item) => item.name);
    const rootKey = nextKey.current--;
    const copies = [snapshot.root, ...snapshot.children].map((source, index) => {
      const pose = draftGeometry(source.form)!;
      const moved = index === 0 ? after : moveWithRoom(pose, before, after);
      const code = copyResourceCode(source.form.code, codes);
      const name = copyDisplayName(source.form.name, names, c('en', 'vi') as 'en' | 'vi');
      codes.push(code);
      names.push(name);
      return {
        key: index === 0 ? rootKey : nextKey.current--,
        form: {
          ...source.form,
          code,
          name,
          parentRoomId: index === 0 ? source.form.parentRoomId : String(rootKey),
          posX: String(moved.x),
          posY: String(moved.y),
          rotation: String(moved.rotation)
        }
      };
    });
    setExtraDecorations((items) => [
      ...items,
      ...snapshot.objects.map((object) => {
        const moved = moveWithRoom(layoutGeometry(object)!, before, after);
        return {
          ...object,
          id: crypto.randomUUID(),
          posX: moved.x,
          posY: moved.y,
          rotation: moved.rotation
        };
      })
    ]);
    activate(copies[0], [...drafts, ...copies]);
  }
  function addDesk() {
    if (!canvasLayout || type?.category !== 'ROOM') return;
    const room = draftGeometry(form),
      deskType = options.types.find((t) => t.id === Number(deskTypeId));
    if (!room || !deskType?.active || deskType.category !== 'DESK' || !deskType.currency) {
      toast.error(
        c(
          'Set room geometry and select an active desk type.',
          'Điền vị trí phòng và chọn loại ghế hợp lệ.'
        )
      );
      return;
    }
    if (drafts.length >= 100) {
      toast.error(c('Save before adding more resources.', 'Lưu trước khi thêm chỗ mới.'));
      return;
    }
    const size = standardSize(deskType);
    if (hasStandardSize(deskType) && !size) {
      toast.error(
        c(
          'Set the physical floor dimensions first.',
          'Hãy cấu hình kích thước thực của tầng trước.'
        )
      );
      return;
    }
    const width = Number(size?.width ?? 50);
    const height = Number(size?.height ?? 50);
    const key = nextKey.current--;
    let pose: ReturnType<typeof draftGeometry>;
    let attempts = 0;
    for (let y = 15; y + height < room.height && !pose && attempts < 2000; y += height + 20)
      for (let x = 15; x + width < room.width && !pose && attempts++ < 2000; x += width + 20) {
        const candidate = moveWithRoom(
          { x: room.x + x, y: room.y + y, width, height, rotation: 0 },
          { ...room, rotation: 0 },
          room
        );
        if (
          previewLayout(canvasLayout, candidate, {
            resourceId: key,
            parentRoomId: activeKey,
            category: 'DESK'
          }).valid
        )
          pose = candidate;
      }
    if (!pose) {
      toast.error(
        c(
          'No free space in this room. Adjust its layout first.',
          'Phòng chưa có chỗ trống phù hợp. Hãy chỉnh bố trí trước.'
        )
      );
      return;
    }
    const code = uniqueResourceCode(
      'SEAT',
      canvasLayout.resources.map((item) => item.code)
    );
    const draft: ResourceDraft = {
      key,
      form: {
        ...resourceDraftForm(options),
        floorPlanId: form.floorPlanId,
        resourceTypeId: String(deskType.id),
        parentRoomId: String(activeKey),
        code,
        name: `${c('Seat', 'Ghế')} ${code}`,
        zoneName: form.zoneName,
        posX: String(pose.x),
        posY: String(pose.y),
        width: String(width),
        height: String(height),
        rotation: String(pose.rotation)
      }
    };
    activate(draft, [...drafts, draft]);
  }
  function removeDraft() {
    const removed = new Set([
      activeKey,
      ...drafts
        .filter((d) => Number(d.form.parentRoomId) === activeKey && !d.current)
        .map((d) => d.key)
    ]);
    const remaining = drafts.filter((d) => !removed.has(d.key));
    if (current || !remaining.length) return;
    const room = type?.category === 'ROOM' ? draftGeometry(form) : undefined;
    if (room)
      setExtraDecorations((items) =>
        items.filter((item) => !insideRoom(layoutGeometry(item)!, room))
      );
    activate(remaining[0], remaining);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || (!emptyCanvas && placement.blocked) || sizeUnavailable) return;
    setErrors({});
    setError('');
    if (studio && !drafts.every((draft) => draftGeometry(draft.form))) {
      setError(
        c(
          'Place every resource on the canvas before saving.',
          'Đặt từng ghế/phòng lên sơ đồ trước khi lưu.'
        )
      );
      return;
    }
    const savingDrafts = drafts.map((draft) => {
      const pose = draftGeometry(draft.form);
      if (
        !pose ||
        !canvasLayout ||
        options.types.find((type) => type.id === Number(draft.form.resourceTypeId))?.category !==
          'DESK'
      )
        return draft;
      const parent = containingRoomId(canvasLayout.resources, pose, draft.key);
      return { ...draft, form: { ...draft.form, parentRoomId: parent ? String(parent) : '' } };
    });
    if (!savingDrafts.length && canvasLayout && floorQuery.data) {
      setBusy(true);
      try {
        const changes = changedLayoutResources(floorQuery.data, canvasLayout);
        const items = await Promise.all(
          changes.map(async (item) => {
            const detail = await getResource(item.id);
            const parsed = resourceFormSchema.parse({
              ...resourceDraftForm(options, detail),
              ...canvasPosition(item),
              parentRoomId: item.parentRoomId ? String(item.parentRoomId) : ''
            });
            return {
              clientId: 'r_' + item.id,
              id: item.id,
              input: resourcePayload(parsed, detail)
            };
          })
        );
        if (items.length)
          await saveResourceBatch(
            workspaceId,
            floorId,
            floorQuery.data.floor.revision,
            items,
            canvasLayout.decorations
          );
        else
          await saveFloorDecorations(
            workspaceId,
            floorQuery.data,
            canvasLayout.decorations ?? [],
            String(canvasLayout.width ?? 1200),
            String(canvasLayout.height ?? 800)
          );
        await onSaved();
        onClose();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Could not save layout');
      } finally {
        setBusy(false);
      }
      return;
    }
    const activeSaving = savingDrafts.find((draft) => draft.key === activeKey)!.form;
    const parsed = resourceFormSchema.safeParse({
      ...activeSaving,
      parentRoomId: Number(activeSaving.parentRoomId) < 0 ? '' : activeSaving.parentRoomId
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (!type?.currency || !type.active) {
      setError(c('Choose a type with confirmed currency.', 'Chọn loại chỗ đã xác nhận tiền tệ.'));
      return;
    }
    if (
      type.category === 'DESK' &&
      parsed.data.capacityOverride &&
      parsed.data.capacityOverride !== '1'
    ) {
      setErrors({
        capacityOverride: c('A desk accommodates one person.', 'Một ghế dành cho một người.')
      });
      return;
    }
    setBusy(true);
    try {
      const changedPeers = (canvasLayout?.resources ?? []).filter((item) => {
        if (
          item.id < 1 ||
          item.status === 'ARCHIVED' ||
          savingDrafts.some((draft) => draft.key === item.id)
        )
          return false;
        const before = floorQuery.data?.resources.find((resource) => resource.id === item.id);
        const pose = layoutGeometry(item);
        if (!before || !pose || !canvasLayout) return false;
        return (
          (before.parentRoomId ?? null) !== (item.parentRoomId ?? null) ||
          ['posX', 'posY', 'width', 'height', 'rotation'].some(
            (field) => before[field as keyof typeof before] !== item[field as keyof typeof item]
          )
        );
      });
      for (const item of changedPeers) {
        const detail = await getResource(item.id);
        if (
          detail.revision !==
          floorQuery.data?.resources.find((resource) => resource.id === item.id)?.revision
        )
          throw new Error(
            c(
              'The floor changed. Reload before saving.',
              'Sơ đồ đã thay đổi. Tải lại trước khi lưu.'
            )
          );
        const parent = item.parentRoomId;
        savingDrafts.push({
          key: item.id,
          current: detail,
          form: {
            ...resourceDraftForm(options, detail),
            ...canvasPosition(item),
            parentRoomId: parent ? String(parent) : ''
          }
        });
      }
      if (savingDrafts.length === 1 && !extraDecorations.length && !sceneOverride)
        await saveResource(workspaceId, parsed.data, current);
      else {
        if (!floorQuery.data || !canvasLayout)
          throw new Error(c('Reload the floor before saving.', 'Tải lại sơ đồ trước khi lưu.'));
        const changedDrafts = changedResourceDrafts(savingDrafts, options);
        const items = changedDrafts.map((draft) => {
          const data = resourceFormSchema.safeParse({
            ...draft.form,
            parentRoomId: Number(draft.form.parentRoomId) < 0 ? '' : draft.form.parentRoomId
          });
          if (!data.success) {
            activate(draft);
            setErrors(
              Object.fromEntries(
                data.error.issues.map((issue) => [String(issue.path[0]), issue.message])
              )
            );
            throw new Error(
              c(
                `Check resource ${draft.form.code || draft.key}.`,
                `Kiểm tra ghế/phòng ${draft.form.code || draft.key}.`
              )
            );
          }
          const parent = Number(draft.form.parentRoomId);
          return {
            clientId: `r_${draft.key}`,
            id: draft.current?.id,
            ...(parent < 0 ? { parentClientId: `r_${parent}` } : {}),
            input: resourcePayload(data.data, draft.current)
          };
        });
        if (items.length)
          await saveResourceBatch(
            workspaceId,
            Number(form.floorPlanId),
            floorQuery.data.floor.revision,
            items,
            canvasLayout.decorations
          );
        else
          await saveFloorDecorations(
            workspaceId,
            floorQuery.data,
            canvasLayout.decorations ?? [],
            String(canvasLayout.width ?? 1200),
            String(canvasLayout.height ?? 800)
          );
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : c('Could not save resource.', 'Không thể lưu ghế/phòng.')
      );
      if (e instanceof ApiError) setErrors(e.validationErrors ?? {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={studio ? 'min-h-0 overflow-y-auto p-4' : 'mx-auto w-full max-w-[1800px] pb-4'}>
      {studio ? (
        <div className='mb-4 space-y-2 border-b pb-3'>
          <Button type='button' size='sm' variant='ghost' disabled={busy} onClick={close}>
            <ArrowLeft className='size-4' />
            {c('Back to layout', 'Về bố trí')}
          </Button>
          <h2 className='text-base font-semibold'>
            {current
              ? c('Edit seat / room', 'Chỉnh ghế / phòng')
              : c('Add seat / room', 'Thêm ghế / phòng')}
          </h2>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Drag on the canvas, enter details, then save. Publishing and booking availability stay separate.',
              'Kéo trên sơ đồ, điền thông tin rồi lưu. Xuất bản và bật nhận đặt là các bước riêng.'
            )}
          </p>
        </div>
      ) : (
        <OrganizerPageHeader
          className='mb-4'
          title={
            current
              ? c('Edit resource', 'Cập nhật ghế/phòng')
              : c('Create resource', 'Tạo ghế/phòng')
          }
          description={
            current
              ? undefined
              : c(
                  'Save as a draft before enabling bookings.',
                  'Lưu bản nháp trước khi bật nhận đặt.'
                )
          }
          leading={
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='size-9 shrink-0'
              disabled={busy}
              onClick={close}
              aria-label={c('Back', 'Quay lại')}
            >
              <ArrowLeft className='size-4' />
            </Button>
          }
        >
          <span className='inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary'>
            {type?.category === 'ROOM' ? (
              <DoorOpen className='size-3.5' />
            ) : (
              <Armchair className='size-3.5' />
            )}
            {type?.category === 'ROOM'
              ? c('Meeting room', 'Phòng')
              : c('Work seat', 'Ghế làm việc')}
          </span>
        </OrganizerPageHeader>
      )}
      <form onSubmit={submit} noValidate className='space-y-4'>
        {error && (
          <p
            role='alert'
            className='border-destructive/20 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm'
          >
            {error}
          </p>
        )}
        <div
          className={
            studio
              ? 'space-y-4'
              : 'grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]'
          }
        >
          <section
            className={studio ? 'min-w-0' : 'min-w-0 rounded-2xl border border-border bg-card p-5'}
          >
            <h2 className='mb-1 flex items-center gap-2 text-base font-semibold'>
              <SlidersHorizontal className='size-4 text-primary' />
              {c('Resource details', 'Thông tin ghế/phòng')}
            </h2>
            <p className='mb-5 text-xs text-muted-foreground' hidden={!!studio}>
              {c(
                'Choose the floor, type and details for this resource.',
                'Chọn tầng, loại chỗ và điền thông tin cho ghế/phòng.'
              )}
            </p>
            <fieldset
              disabled={busy}
              className={studio ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-1'}
            >
              {!studio && (
                <Field label={c('Floor *', 'Tầng *')} error={errors.floorPlanId}>
                  <select
                    className={selectClass}
                    value={form.floorPlanId}
                    disabled={!!current || staged.length > 0}
                    onChange={(e) =>
                      setForm((value) => ({
                        ...value,
                        floorPlanId: e.target.value,
                        parentRoomId: options.rooms ? '' : undefined
                      }))
                    }
                  >
                    <option value=''>{c('Choose floor', 'Chọn tầng')}</option>
                    {options.floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {c('Floor', 'Tầng')} {f.floorNumber} · {f.status}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={c('Resource type *', 'Loại chỗ *')} error={errors.resourceTypeId}>
                <select
                  className={selectClass}
                  value={form.resourceTypeId}
                  onChange={(e) =>
                    setForm((value) => ({
                      ...value,
                      resourceTypeId: e.target.value,
                      parentRoomId:
                        options.types.find((t) => t.id === Number(e.target.value))?.category ===
                        'ROOM'
                          ? options.rooms
                            ? ''
                            : undefined
                          : value.parentRoomId
                    }))
                  }
                >
                  <option value=''>{c('Choose type', 'Chọn loại chỗ')}</option>
                  {options.types.map((t) => (
                    <option key={t.id} value={t.id} disabled={!t.active || !t.currency}>
                      {t.name} · {t.category} ·{' '}
                      {t.currency ?? c('Confirm currency first', 'Cần xác nhận tiền tệ')}
                    </option>
                  ))}
                </select>
                {type && (
                  <details className='mt-2 rounded-lg border bg-muted/20 p-2 text-xs font-normal'>
                    <summary className='cursor-pointer font-medium'>
                      {c('Type details & prices', 'Thông tin loại chỗ & giá')}
                    </summary>
                    <div className='mt-2 space-y-1 text-muted-foreground'>
                      <p>
                        {type.name} · {type.capacity} {c('people', 'người')} · {type.currency}
                      </p>
                      <p>
                        {type.standardWidthM ?? '—'} × {type.standardLengthM ?? '—'} m
                      </p>
                      <p>
                        {c('Hourly', 'Theo giờ')}: {type.pricePerHour ?? '—'} ·{' '}
                        {c('Daily', 'Theo ngày')}: {type.pricePerDay ?? '—'}
                      </p>
                      <p>
                        {c('Monthly', 'Theo tháng')}: {type.pricePerMonth ?? '—'}
                      </p>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={busy}
                        onClick={() => setEditingType(true)}
                      >
                        {c('Edit shared type', 'Sửa loại chỗ dùng chung')}
                      </Button>
                    </div>
                  </details>
                )}
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='mt-1 px-2 text-primary'
                  disabled={busy}
                  onClick={() => setCreatingType(true)}
                >
                  <Plus className='size-4' />
                  {c('Create a resource type', 'Tạo loại chỗ mới')}
                </Button>
              </Field>
              {type?.category === 'DESK' && options.rooms && (
                <div className='sm:col-span-2 xl:col-span-1 rounded-xl border border-border bg-muted/30 p-4 space-y-2'>
                  <Field label={c('Desk location', 'Vị trí ghế')} error={errors.parentRoomId}>
                    <select
                      className={selectClass}
                      value={form.parentRoomId ?? ''}
                      disabled
                      onChange={(e) => set('parentRoomId', e.target.value)}
                    >
                      <option value=''>
                        {c('Open area — not inside a room', 'Khu làm việc mở — không thuộc phòng')}
                      </option>
                      {staged
                        .filter(
                          (draft) =>
                            draft.key < 0 &&
                            options.types.find((t) => t.id === Number(draft.form.resourceTypeId))
                              ?.category === 'ROOM'
                        )
                        .map((draft) => (
                          <option key={draft.key} value={draft.key}>
                            {draft.form.name || draft.form.code} ·{' '}
                            {c('Unsaved room', 'Phòng chưa lưu')}
                          </option>
                        ))}
                      {options.rooms
                        .filter(
                          (room) =>
                            room.floorPlanId === Number(form.floorPlanId) && room.id !== current?.id
                        )
                        .map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} · {room.code}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <p className='text-xs text-muted-foreground'>
                    {c(
                      'Room membership is determined by position. Drag the seat fully inside a room to assign it, or outside to make it an open-area seat.',
                      'Phòng được xác định theo vị trí. Kéo ghế nằm trọn trong phòng để gán vào phòng; kéo ra ngoài để thành ghế khu mở.'
                    )}
                  </p>
                </div>
              )}
              {(
                [
                  ['code', c('Resource code *', 'Mã ghế/phòng *'), 50],
                  ['name', c('Display name *', 'Tên hiển thị *'), 150],
                  ['zoneName', c('Zone name', 'Tên khu vực'), 100],
                  ['capacityOverride', c('Capacity override', 'Sức chứa riêng'), 5],
                  [
                    'pricePerHour',
                    c(
                      `Hourly override (${type?.currency ?? '—'})`,
                      `Giá giờ riêng (${type?.currency ?? '—'})`
                    ),
                    19
                  ]
                ] as const
              ).map(([key, label, max]) => (
                <Field key={key} label={label} error={errors[key]}>
                  <Input
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    maxLength={max}
                    inputMode={
                      key === 'pricePerHour'
                        ? 'decimal'
                        : key === 'capacityOverride'
                          ? 'numeric'
                          : undefined
                    }
                    placeholder={
                      key === 'pricePerHour' || key === 'capacityOverride'
                        ? c(
                            'Blank = inherit from resource type',
                            'Để trống = dùng giá trị của loại chỗ'
                          )
                        : undefined
                    }
                  />
                </Field>
              ))}
              <Field label={c('Noise level', 'Mức độ tiếng ồn')}>
                <select
                  className={selectClass}
                  value={form.noiseLevel}
                  onChange={(e) => set('noiseLevel', e.target.value)}
                >
                  <option value=''>{c('Not specified', 'Chưa xác định')}</option>
                  <option value='QUIET'>{c('Quiet', 'Yên tĩnh')}</option>
                  <option value='MODERATE'>{c('Moderate', 'Vừa phải')}</option>
                  <option value='LIVELY'>{c('Lively', 'Sôi động')}</option>
                </select>
              </Field>
            </fieldset>
            <div className='mt-5 space-y-4 border-t border-border pt-5'>
              <Field label={c('Notes', 'Ghi chú')} error={errors.description}>
                <textarea
                  className={`${selectClass} min-h-24 py-2`}
                  value={form.description}
                  maxLength={1000}
                  disabled={busy}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
              <p className='text-muted-foreground flex items-start gap-2 text-xs'>
                <LockKeyhole className='size-4 shrink-0' />
                {c(
                  'Prices keep the selected currency. Historical booking amounts are never recalculated. Changing type, capacity or geometry may be blocked by live bookings.',
                  'Giá giữ đúng tiền tệ đã chọn, không tính lại booking cũ. Thay loại chỗ, sức chứa hoặc vị trí có thể bị chặn khi còn booking hiệu lực.'
                )}
              </p>
            </div>
          </section>
          <EditorCanvas studio={studio}>
            <section
              className={
                studio
                  ? 'flex h-full min-h-[480px] min-w-0 flex-1 flex-col overflow-hidden bg-card'
                  : 'min-w-0 overflow-hidden rounded-2xl border border-border bg-card xl:sticky xl:top-4'
              }
            >
              <details
                open={studio ? undefined : true}
                className='border-b border-border bg-muted/20 p-3'
              >
                <summary className='cursor-pointer text-xs font-medium'>
                  {c('Position & dimensions', 'Vị trí & kích thước')}
                </summary>
                <div className='mt-3'>
                  <h2 className='mb-3 flex items-center gap-2 text-sm font-semibold'>
                    <MapPin className='size-4 text-primary' />
                    {metrics.data?.geometryVersion === 2 && current?.status !== 'ARCHIVED'
                      ? c('Real position & dimensions (m)', 'Vị trí và kích thước thực (m)')
                      : c(
                          'Floor coordinates & dimensions (px)',
                          'Vị trí và kích thước trên sơ đồ (px)'
                        )}
                  </h2>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
                    {(['posX', 'posY', 'width', 'height', 'rotation'] as const).map((key) => (
                      <Field
                        key={key}
                        label={
                          {
                            posX: 'X',
                            posY: 'Y',
                            width: c('Length (horizontal)', 'Dài (ngang)'),
                            height: c('Width (vertical)', 'Rộng (dọc)'),
                            rotation: c('Rotation', 'Góc xoay')
                          }[key]
                        }
                        error={errors[key]}
                      >
                        <Input
                          value={geometryDisplay(
                            form[key],
                            metrics.data?.geometryVersion === 2 && current?.status !== 'ARCHIVED',
                            key === 'rotation'
                          )}
                          disabled={busy}
                          readOnly={sizeLocked && (key === 'width' || key === 'height')}
                          inputMode='decimal'
                          onChange={(e) =>
                            set(
                              key,
                              geometryInput(
                                e.target.value,
                                metrics.data?.geometryVersion === 2 &&
                                  current?.status !== 'ARCHIVED',
                                key === 'rotation'
                              )
                            )
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  {sizeUnavailable ? (
                    <div className='mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm'>
                      <p className='font-medium'>
                        {floorQuery.isError || metrics.isError
                          ? c('Could not load floor dimensions.', 'Không tải được kích thước tầng.')
                          : floorQuery.isPending || metrics.isPending
                            ? c('Loading floor dimensions…', 'Đang tải kích thước tầng…')
                            : floorQuery.data?.floor.location
                              ? c(
                                  'Set the floor dimensions to use this resource type.',
                                  'Nhập kích thước thực của tầng để dùng loại chỗ này.'
                                )
                              : c(
                                  'Link the layout to a physical floor first.',
                                  'Hãy liên kết sơ đồ với một tầng vật lý trước.'
                                )}
                      </p>
                      {(floorQuery.isError || metrics.isError) && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={() => {
                            if (floorQuery.isError) void floorQuery.refetch();
                            if (metrics.isError) void metrics.refetch();
                          }}
                        >
                          {c('Retry', 'Thử lại')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    sizeLocked && (
                      <div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                        <span>
                          {c(
                            'Size follows the selected type. Choose a separate type for a different size.',
                            'Kích thước theo loại chỗ. Muốn dùng kích thước khác, hãy chọn loại chỗ riêng.'
                          )}
                        </span>
                        {current && standardSize(type) && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={busy}
                            onClick={() =>
                              changePosition({
                                ...selectPlacementFields(form),
                                ...standardSize(type)
                              })
                            }
                          >
                            {c('Use standard size', 'Dùng kích thước chuẩn')}
                          </Button>
                        )}
                      </div>
                    )
                  )}
                  {floorQuery.data?.floor.location && metrics.data && (
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='mt-3'
                      disabled={busy}
                      onClick={() => {
                        if (dirty) {
                          toast.error(
                            c(
                              'Save or discard the current changes before reviewing shared floor measurements.',
                              'Lưu hoặc bỏ thay đổi đang chỉnh trước khi cập nhật số đo tầng dùng chung.'
                            )
                          );
                          return;
                        }
                        setEditingDimensions(true);
                      }}
                    >
                      <Ruler className='size-4' />
                      {metrics.data.physicalWidthM && metrics.data.physicalLengthM
                        ? c('Edit floor dimensions', 'Sửa kích thước tầng')
                        : c('Set floor dimensions', 'Cấu hình kích thước tầng')}
                    </Button>
                  )}
                </div>
              </details>
              <div
                className={
                  studio
                    ? 'flex min-h-[360px] flex-1 flex-col'
                    : 'flex h-[680px] min-h-[540px] flex-col xl:h-[calc(100dvh-340px)]'
                }
              >
                <ResourcePlacementEditor
                  onToggleFullscreen={studio?.onToggleFullscreen}
                  fullscreenActive={studio?.fullscreenActive}
                  presentation='workspace'
                  key={form.floorPlanId}
                  draftLayout={canvasLayout}
                  onSelect={(key) => void selectDraft(key)}
                  onCopy={() => void copySelection()}
                  onPaste={() => (groupClipboard ? void pasteGroup() : pasteSelection())}
                  actions={(selectionToolbar, selectionCount) => (
                    <div className='space-y-3'>
                      <div className='flex items-center gap-2 overflow-x-auto whitespace-nowrap'>
                        {selectionToolbar}
                        {selectionCount === 0 && (
                          <Button
                            type='button'
                            size='sm'
                            variant='secondary'
                            disabled={busy || !draftGeometry(form)}
                            onClick={async () => {
                              const copied = copyGroup(['resource:' + activeKey], copyContents);
                              if (copied) void pasteGroup(copied);
                            }}
                          >
                            <Copy className='size-4' />
                            {c('Duplicate', 'Nhân bản')}
                          </Button>
                        )}
                        {selectionCount === 0 && type?.category === 'ROOM' && (
                          <label className='flex shrink-0 items-center gap-2 text-xs text-muted-foreground'>
                            <input
                              type='checkbox'
                              checked={copyContents}
                              onChange={(e) => setCopyContents(e.target.checked)}
                              disabled={busy}
                              className='size-4 accent-primary'
                            />
                            {c('Include seats and furnishings', 'Kèm ghế và đồ bố trí trong phòng')}
                          </label>
                        )}
                        {selectionCount === 0 && !current && drafts.length > 1 && (
                          <Button
                            type='button'
                            size='sm'
                            variant='ghost'
                            disabled={busy}
                            onClick={removeDraft}
                          >
                            <Trash2 className='size-4' />
                            {c('Remove draft', 'Bỏ bản nháp')}
                          </Button>
                        )}
                      </div>
                      {type?.category === 'ROOM' && (
                        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3'>
                          <select
                            aria-label={c('Desk type to add', 'Loại ghế cần thêm')}
                            className={`${selectClass} min-w-0 flex-1`}
                            value={deskTypeId}
                            disabled={busy}
                            onChange={(e) => setDeskTypeId(e.target.value)}
                          >
                            <option value=''>{c('Choose a desk type', 'Chọn loại ghế')}</option>
                            {options.types
                              .filter((t) => t.category === 'DESK' && t.active && t.currency)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} · {t.currency}
                                </option>
                              ))}
                          </select>
                          <Button
                            type='button'
                            size='sm'
                            disabled={busy || !deskTypeId || !draftGeometry(form)}
                            onClick={addDesk}
                          >
                            <Plus className='size-4' />
                            {c('Add seat inside room', 'Thêm ghế trong phòng')}
                          </Button>
                        </div>
                      )}
                      <div
                        className='flex max-h-24 flex-wrap gap-2 overflow-y-auto'
                        aria-label={c('Resources in this edit session', 'Ghế/phòng đang chỉnh')}
                      >
                        {drafts.map((draft) => (
                          <Button
                            key={draft.key}
                            type='button'
                            size='sm'
                            variant={draft.key === activeKey ? 'default' : 'outline'}
                            disabled={busy}
                            onClick={() => activate(draft)}
                            className='h-7 rounded-full px-3 text-xs'
                          >
                            {draft.form.code || c('New resource', 'Chỗ mới')}
                            {!draft.current && (
                              <span className='opacity-70'>· {c('Draft', 'Nháp')}</span>
                            )}
                          </Button>
                        ))}
                      </div>
                      <p className='text-[11px] text-muted-foreground'>
                        {c(
                          'Copies are unsaved. Position them in free space, then save all changes together. Ctrl/Cmd+C and V work when the canvas is focused.',
                          'Bản sao chưa được lưu. Kéo đến chỗ trống rồi lưu tất cả cùng lúc. Ctrl/Cmd+C và V dùng khi đang chọn canvas.'
                        )}
                      </p>
                    </div>
                  )}
                  onGroupChange={changeGroup}
                  onGroupDelete={(keys) => void deleteGroup(keys)}
                  onGroupCopy={(keys) => {
                    copyGroup(keys);
                  }}
                  onGroupDuplicate={(keys) => {
                    const copied = copyGroup(keys);
                    if (copied) void pasteGroup(copied);
                  }}
                  groupSelection={groupSelection}
                  hideActive={emptyCanvas}
                  workspaceId={workspaceId}
                  floorId={Number(form.floorPlanId)}
                  resourceId={activeKey}
                  parentRoomId={form.parentRoomId ? Number(form.parentRoomId) : undefined}
                  category={type?.category}
                  value={form}
                  disabled={busy}
                  sizeLocked={sizeLocked}
                  onBegin={checkpoint}
                  onChange={changePosition}
                  onUndo={undoPosition}
                  onRedo={redoPosition}
                  onReset={() => changePosition(initialPosition)}
                  canUndo={undoPositions.length > 0}
                  canRedo={redoPositions.length > 0}
                />
              </div>
            </section>
          </EditorCanvas>
        </div>
        {!emptyCanvas && placement.result && !placement.result.valid &&
          !placement.result.roomEdgeCollisions.size && (
          <p
            role='alert'
            className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive'
          >
            {c(
              'Cannot save: objects overlap or extend outside their floor/room. Adjust the layout.',
              'Không thể lưu: các đối tượng chồng lấn hoặc vượt khỏi tầng/phòng. Vui lòng chỉnh lại vị trí.'
            )}
          </p>
        )}
        <footer
          className={
            studio
              ? 'sticky -bottom-4 z-20 space-y-2 border-t bg-card/95 py-3 backdrop-blur-md'
              : 'sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-5 py-4 shadow-lg backdrop-blur-md'
          }
        >
          <p className='text-sm text-muted-foreground' role='status'>
            {dirty
              ? c('You have unsaved changes', 'Có thay đổi chưa lưu')
              : c('Ready to edit', 'Sẵn sàng chỉnh sửa')}
          </p>
          <div className='flex gap-3'>
            <Button type='button' variant='outline' disabled={busy} onClick={close}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button
              type='submit'
              disabled={busy || (!emptyCanvas && placement.blocked) || sizeUnavailable}
            >
              {busy ? (
                <LoaderCircle className='size-4' />
              ) : (
                <Save className='size-4' />
              )}
              {drafts.length > 1
                ? c(`Save ${drafts.length} resources`, `Lưu ${drafts.length} ghế/phòng`)
                : c('Save resource', 'Lưu ghế/phòng')}
            </Button>
          </div>
        </footer>
      </form>
      {editingDimensions && metrics.data && (
        <FloorDimensionsDialog
          key={floorId}
          actorId={actorId}
          workspaceId={workspaceId}
          floorId={floorId}
          metrics={metrics.data}
          onConverted={async () => {
            await onSaved();
            onClose();
          }}
          onClose={() => setEditingDimensions(false)}
        />
      )}
      {creatingType && (
        <ResourceTypeSetupDialog
          workspaceId={workspaceId}
          onClose={() => setCreatingType(false)}
          onSaved={onSaved}
          onTypeSaved={(savedType) => {
            setAddedTypes((types) => [...types, savedType]);
            setForm((value) => ({
              ...value,
              resourceTypeId: String(savedType.id),
              parentRoomId: savedType.category === 'ROOM' ? '' : value.parentRoomId
            }));
          }}
        />
      )}
      {editingType && type && (
        <ResourceTypeSetupDialog
          workspaceId={workspaceId}
          current={type}
          onClose={() => setEditingType(false)}
          onSaved={onSaved}
        />
      )}
      <Dialog
        open={confirmClose || navigation.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setConfirmClose(false);
            navigation.reset?.();
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{c('Discard unsaved changes?', 'Bỏ thay đổi chưa lưu?')}</DialogTitle>
            <DialogDescription>
              {c(
                'Stay to finish your changes, or discard them and leave this editor.',
                'Ở lại để hoàn tất hoặc bỏ thay đổi và rời trang chỉnh sửa.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              disabled={busy}
              onClick={() => {
                setConfirmClose(false);
                navigation.reset?.();
              }}
            >
              {c('Stay', 'Ở lại')}
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={busy}
              onClick={() => {
                if (navigation.status === 'blocked') navigation.proceed();
                else onClose();
              }}
            >
              {c('Discard changes', 'Bỏ thay đổi')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FloorDimensionsDialog({
  actorId,
  workspaceId,
  floorId,
  metrics,
  onClose,
  onConverted
}: {
  actorId: number;
  workspaceId: number;
  floorId: number;
  metrics: DesignMetrics;
  onConverted: () => Promise<void>;
  onClose: () => void;
}) {
  const c = useCopy();
  const queryClient = useQueryClient();
  const [width, setWidth] = useState(String(metrics.physicalWidthM ?? ''));
  const [length, setLength] = useState(String(metrics.physicalLengthM ?? ''));
  const [initialMetrics] = useState(metrics);
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('RESIZE');
  const [review, setReview] = useState<GeometryReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const saving = useRef(false);
  const queryKey = designMetricsOptions(actorId, workspaceId, floorId).queryKey;
  const outdated = conflict || initialMetrics.revision !== metrics.revision;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || outdated) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const input = {
        expectedRevision: initialMetrics.revision,
        measurementMode,
        widthM: Number(width),
        lengthM: Number(length),
        maxOccupancy: initialMetrics.maxOccupancy,
        occupancyLimit: initialMetrics.occupancyLimit,
        confirmGeometryConversion: true
      };
      if (!review) {
        setReview(await previewDesignMetrics(workspaceId, floorId, input));
        return;
      }
      if (!review.applicable) return;
      const saved = await saveDesignMetrics(workspaceId, floorId, input);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, saved);
      void queryClient.invalidateQueries({
        predicate: ({ queryKey: key }) =>
          key[0] === 'organizer-resources' &&
          key[1] === actorId &&
          key[3] === 'design-metrics' &&
          (key[2] !== workspaceId || key[4] !== floorId)
      });
      void queryClient.invalidateQueries({ queryKey: ['organizer-resources', actorId] });
      toast.success(c('Floor dimensions saved.', 'Đã lưu kích thước tầng.'));
      onClose();
      if (review.conversionRequired) await onConverted();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflict(true);
        void queryClient.invalidateQueries({ queryKey });
      }
      setError(
        e instanceof Error
          ? e.message
          : c('Could not save floor dimensions.', 'Không lưu được kích thước tầng.')
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving.current) onClose();
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Ruler className='size-5 text-primary' />
            {c('Physical floor dimensions', 'Kích thước thực của tầng')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Use the measurements of the entire physical floor. All workspaces on this floor share them.',
              'Nhập số đo của toàn tầng vật lý. Các workspace trên cùng tầng dùng chung số đo này.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form className='space-y-4' onSubmit={submit}>
          <MeasurementModeField
            value={measurementMode}
            disabled={busy}
            onChange={(value) => {
              setMeasurementMode(value);
              setReview(null);
            }}
          />
          <div className='grid grid-cols-2 gap-3'>
            <Field label={c('Floor width (m)', 'Dài toàn tầng — ngang (m)')}>
              <Input
                type='number'
                min='0.01'
                max='10000'
                step='0.01'
                required
                value={width}
                disabled={busy}
                onChange={(event) => {
                  setWidth(event.target.value);
                  setReview(null);
                }}
              />
            </Field>
            <Field label={c('Floor length (m)', 'Rộng toàn tầng — dọc (m)')}>
              <Input
                type='number'
                min='0.01'
                max='10000'
                step='0.01'
                required
                value={length}
                disabled={busy}
                onChange={(event) => {
                  setLength(event.target.value);
                  setReview(null);
                }}
              />
            </Field>
          </div>
          <GeometryReviewNotice review={review} />
          {(outdated || error) && (
            <p role='alert' className='text-sm text-destructive'>
              {outdated
                ? c(
                    'Close and reopen this dialog to review the latest floor settings.',
                    'Đóng rồi mở lại hộp thoại để kiểm tra cấu hình tầng mới nhất.'
                  )
                : error}
            </p>
          )}
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={busy || outdated || (!!review && !review.applicable)}>
              {busy ? (
                <LoaderCircle className='size-4' />
              ) : (
                <Save className='size-4' />
              )}
              {review
                ? c('Confirm and save', 'Xác nhận và lưu')
                : c('Review dimensions', 'Kiểm tra kích thước')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResourceSetupDialog(props: {
  workspaceId: number;
  kind: 'floor' | 'type';
  current?: TypeOption;
  floors?: FloorOption[];
  defaultFloorName?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onFloorLinked?: (floor: FloorOption) => void;
}) {
  return props.kind === 'floor' ? (
    <FloorAllocationDialog
      workspaceId={props.workspaceId}
      floors={props.floors ?? []}
      defaultName={props.defaultFloorName}
      onSaved={props.onSaved}
      onLinked={props.onFloorLinked}
      onClose={props.onClose}
    />
  ) : (
    <ResourceTypeSetupDialog {...props} />
  );
}

function ResourceTypeSetupDialog({
  workspaceId,
  current,
  onClose,
  onSaved,
  onTypeSaved
}: {
  workspaceId: number;
  current?: TypeOption;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onTypeSaved?: (type: TypeOption) => void;
}) {
  const c = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(current?.name ?? '');
  const [category, setCategory] = useState(current?.category ?? 'DESK');
  const [currency, setCurrency] = useState(current?.currency ?? 'VND');
  const [legacyCurrencyConfirmed, setLegacyCurrencyConfirmed] = useState(false);
  const [capacity, setCapacity] = useState(String(current?.capacity ?? 1));
  const [usageKind, setUsageKind] = useState<ResourceUsageKind | ''>(
    current ? (current.usageKind ?? '') : 'WORK_SEAT'
  );
  const [standardWidth, setStandardWidth] = useState(String(current?.standardWidthM ?? ''));
  const [standardLength, setStandardLength] = useState(String(current?.standardLengthM ?? ''));
  const [hour, setHour] = useState(current?.pricePerHour ?? '');
  const [day, setDay] = useState(current?.pricePerDay ?? '');
  const [month, setMonth] = useState(current?.pricePerMonth ?? '');
  const [photos, setPhotos] = useState<ResourceTypePhoto[]>();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!name.trim() || name.trim().length > 100) {
      setError(c('Enter a name up to 100 characters.', 'Nhập tên tối đa 100 ký tự.'));
      return;
    }
    if (
      !/^[1-9]\d*$/.test(capacity) ||
      Number(capacity) > 10000 ||
      (category === 'DESK' && capacity !== '1') ||
      ![hour, day, month].some(Boolean) ||
      ![hour, day, month].every((value) => optionalPrice.safeParse(value).success)
    ) {
      setError(
        c(
          'Check capacity and provide at least one positive price (max 2 decimals). Desks have capacity 1.',
          'Kiểm tra sức chứa và nhập ít nhất một mức giá dương, tối đa 2 số thập phân. Ghế có sức chứa 1.'
        )
      );
      return;
    }
    const hasConfiguration = !!usageKind || !!standardWidth || !!standardLength;
    if (
      (!current || hasConfiguration) &&
      (!resourceUsageKinds.some((item) => item.value === usageKind && item.category === category) ||
        !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(standardWidth) ||
        !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(standardLength) ||
        Number(standardWidth) <= 0 ||
        Number(standardLength) <= 0 ||
        Number(standardWidth) > 10000 ||
        Number(standardLength) > 10000)
    ) {
      setError(
        c(
          'Confirm usage and positive dimensions in metres (max 2 decimals).',
          'Xác nhận kiểu chỗ và kích thước theo mét, tối đa 2 số thập phân.'
        )
      );
      return;
    }
    if (current && !current.currency && !legacyCurrencyConfirmed) {
      setError(
        c(
          'Confirm the currency of existing prices before saving.',
          'Xác nhận tiền tệ của các giá đang lưu trước khi tiếp tục.'
        )
      );
      return;
    }
    setBusy(true);
    try {
      const savedType = await saveResourceType(
        workspaceId,
        {
          name: name.trim(),
          category,
          currency,
          capacity: Number(capacity),
          pricePerHour: hour || null,
          pricePerDay: day || null,
          pricePerMonth: month || null,
          legacyCurrencyConfirmed,
          usageKind: usageKind || null,
          standardWidthM: standardWidth ? Number(standardWidth) : null,
          standardLengthM: standardLength ? Number(standardLength) : null
        },
        current,
        photos
      );
      await onSaved();
      onTypeSaved?.(savedType);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {current
              ? c('Update resource type', 'Cập nhật loại chỗ')
              : c('Create resource type', 'Tạo loại chỗ')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Seats and rooms inherit prices and currency from this type. For another currency, create a separate type.',
              'Ghế/phòng kế thừa giá và tiền tệ của loại chỗ. Muốn dùng tiền tệ khác, tạo loại riêng.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          {error && (
            <p role='alert' className='text-destructive text-sm'>
              {error}
            </p>
          )}
          <fieldset disabled={busy} className='space-y-4'>
            <Field label={c('Name *', 'Tên *')}>
              <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </Field>
            <>
              <div className='grid grid-cols-2 gap-4'>
                <Field label={c('Bookable category', 'Nhóm đặt chỗ')}>
                  <select
                    className={selectClass}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as 'DESK' | 'ROOM');
                      setUsageKind(e.target.value === 'DESK' ? 'WORK_SEAT' : 'MEETING_ROOM');
                      if (e.target.value === 'DESK') setCapacity('1');
                    }}
                  >
                    <option value='DESK'>{c('Desk', 'Ghế')}</option>
                    <option value='ROOM'>{c('Room', 'Phòng')}</option>
                  </select>
                  <span className='block text-xs font-normal text-muted-foreground'>
                    {c(
                      'Tables, plants and partitions belong in Floor Setup → Layout objects, not pricing.',
                      'Bàn, cây xanh, vách ngăn: thêm tại Bố trí tầng → Đồ bố trí, không tạo giá riêng.'
                    )}
                  </span>
                </Field>
                <Field label={c('Currency', 'Tiền tệ')}>
                  <select
                    className={selectClass}
                    value={currency}
                    disabled={!!current?.currency}
                    onChange={(e) => setCurrency(e.target.value as 'VND' | 'USD')}
                  >
                    <option value='VND'>VND</option>
                    <option value='USD'>USD</option>
                  </select>
                </Field>
              </div>
              <div className='grid grid-cols-3 gap-3'>
                <Field label={c('Usage', 'Kiểu chỗ')}>
                  <select
                    className={selectClass}
                    value={usageKind}
                    onChange={(e) => setUsageKind(e.target.value as ResourceUsageKind | '')}
                  >
                    {current && !current.usageKind && (
                      <option value=''>{c('Legacy / unconfirmed', 'Chưa xác nhận')}</option>
                    )}
                    {resourceUsageKinds
                      .filter((item) => item.category === category)
                      .map((item) => (
                        <option key={item.value} value={item.value}>
                          {c(item.en, item.vi)}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label={c('Width (m)', 'Dài — ngang (m)')}>
                  <Input
                    type='number'
                    min='.01'
                    max='10000'
                    step='.01'
                    value={standardWidth}
                    onChange={(e) => setStandardWidth(e.target.value)}
                  />
                </Field>
                <Field label={c('Length (m)', 'Rộng — dọc (m)')}>
                  <Input
                    type='number'
                    min='.01'
                    max='10000'
                    step='.01'
                    value={standardLength}
                    onChange={(e) => setStandardLength(e.target.value)}
                  />
                </Field>
              </div>
              <p className='text-xs text-muted-foreground'>
                {c(
                  'Different usage or dimensions require a separate type. Existing resources and bookings are preserved.',
                  'Khác kiểu chỗ hoặc kích thước cần loại riêng. Không thay đổi ghế/phòng và booking hiện có.'
                )}
              </p>
              {current && !current.currency && (
                <label className='border-primary/20 bg-primary/5 flex items-start gap-2 rounded-lg border p-3 text-sm'>
                  <input
                    type='checkbox'
                    className='mt-0.5 size-4 accent-primary'
                    checked={legacyCurrencyConfirmed}
                    onChange={(e) => setLegacyCurrencyConfirmed(e.target.checked)}
                  />
                  <span>
                    {c(
                      'I confirm that the existing amounts are denominated in ',
                      'Tôi xác nhận các giá đang lưu là '
                    )}
                    <strong>{currency}</strong>
                    {c('. No conversion will be performed.', ', không thực hiện quy đổi số tiền.')}
                  </span>
                </label>
              )}
              <Field label={c('Capacity', 'Sức chứa')}>
                <Input
                  value={capacity}
                  inputMode='numeric'
                  disabled={category === 'DESK'}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </Field>
              <div className='grid gap-3 sm:grid-cols-3'>
                {[
                  [c('Per hour', 'Theo giờ'), hour, setHour],
                  [c('Per day', 'Theo ngày'), day, setDay],
                  [c('Per month', 'Theo tháng'), month, setMonth]
                ].map(([label, value, setValue]) => (
                  <Field key={String(label)} label={`${label} (${currency})`}>
                    <Input
                      value={String(value)}
                      inputMode='decimal'
                      onChange={(e) => (setValue as (v: string) => void)(e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <ResourceTypePhotoField<ResourceTypePhoto>
                photos={photos ?? current?.photoUrls ?? []}
                onChange={setPhotos}
                disabled={busy}
              />
              <p className='text-muted-foreground text-xs'>
                {c(
                  'Updating type prices affects resources inheriting those prices, never past booking totals. Existing currencies are not converted.',
                  'Đổi giá loại chỗ ảnh hưởng các ghế/phòng đang kế thừa giá, không sửa tổng tiền booking cũ. Không quy đổi các giá trị đang lưu.'
                )}
              </p>
            </>
          </fieldset>
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={busy}>
              {busy && <LoaderCircle className='size-4' />}
              {c('Save', 'Lưu')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
