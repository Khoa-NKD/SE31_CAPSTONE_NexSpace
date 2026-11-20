import {
  expandCanvasSelection,
  pasteCanvasSelection,
  type CanvasClipboard
} from '../utils/canvas-selection';
import type { GroupEditPhase } from './use-canvas-multi-selection';
import { aiPreviewGeometry } from '../utils/ai-preview-geometry';
import { geometryDisplay, geometryInput } from '../utils/metric-units';
import { FurnishingPalette } from './furnishing-palette';
import { ResourceEditor, FloorDimensionsDialog } from './resource-editor';
import { designMetricsOptions } from '../api/floor-design';
import { FloorLocationBanner } from './floor-location-banner';
import { stageLayoutObject, changedLayoutResources } from '../utils/manual-layout-draft';

import { FloorAiAssistant } from './floor-ai-assistant';
import {
  aiDesignPreview,
  aiPreviewChanges,
  adjustAiProposal,
  aiProposalWithScene
} from '../utils/ai-design-preview';
import { insideRoom, layoutGeometry, withSpatialParents } from '../utils/layout-placement';
import { decorationBelongsToRoom } from '../utils/room-door';
import type { AiProposal } from '../api/floor-design';
import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Armchair,
  DoorOpen,
  Layers3,
  Plus,
  Search,
  SlidersHorizontal,
  Save,
  Upload,
  Download,
  Maximize2,
  RefreshCw,
  MousePointer2,
  LockKeyhole,
  Trash2,
  CheckCircle2,
  LoaderCircle,
  X,
  ChevronLeft,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  floorLayoutOptions,
  getResource,
  deleteResource,
  deleteRoomWithSeats,
  saveResourceBatch,
  resourcePayload,
  saveFloorDecorations,
  publishResourceFloor,
  resourceFormSchema,
  type FloorDecoration,
  type FloorLayout,
  type ResourceDetail,
  type ResourceOptions,
  type WorkspaceOption
} from '../api/resources';
import { canvasPosition, canvasResourceForm } from '../utils/canvas-resource-form';
import { selectPlacementFields, type PlacementFields } from '../utils/placement';
import { FloorLayoutPreview } from './floor-layout-preview';
import { ResourcePlacementEditor } from './resource-placement-editor';
import { DecorationIcon, furnishingIcon } from './decoration-visual';
import { usePlacementValidation } from './use-placement-validation';
import { FloorActions } from './floor-actions';
import {
  FloorAvailabilityPanel,
  FloorAvailabilityInspector,
  useFloorAvailability
} from './floor-availability-panel';
import { availabilityColors, availabilityLabel } from '../utils/availability';

type Selection = {
  key: string;
  resource?: ResourceDetail;
  object?: FloorDecoration;
  initial: PlacementFields;
  fields: PlacementFields;
  originalObject?: FloorDecoration;
};
const samePosition = (a: PlacementFields, b: PlacementFields) =>
  Object.keys(a).every(
    (key) => Number(a[key as keyof PlacementFields]) === Number(b[key as keyof PlacementFields])
  );

/** A single-resource editor backed by the same persisted geometry as Seats & Rooms. */
export function FloorCanvasWorkspace({
  actorId,
  workspaceId,
  workspaces,
  options,
  writable,
  onWorkspaceChange,
  onSaved,
  onAdd,
  initialFloorId,
  onFloorChange,

  onBack
}: {
  actorId: number;
  workspaceId: number;
  workspaces: WorkspaceOption[];
  options: ResourceOptions;
  writable: boolean;
  onWorkspaceChange: (id: number) => void;
  onSaved: () => Promise<void>;
  onAdd: (kind: 'floor' | 'type', floorId: number) => void;
  initialFloorId: number;
  onFloorChange: (id: number) => void;

  onBack: () => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const container = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const [overviewDragging, setOverviewDragging] = useState(false);
  const overviewDrag = useRef<{
    key: string;
    fields: PlacementFields;
    initial: PlacementFields;
    ready: Promise<void>;
    scene: FloorLayout;
  } | null>(null);
  const floorId = initialFloorId;
  const queryClient = useQueryClient();
  const query = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: floorId > 0
  });
  const metrics = useQuery({
    ...designMetricsOptions(actorId, workspaceId, floorId),
    enabled: floorId > 0
  });
  const [editingFloorDimensions, setEditingFloorDimensions] = useState(false);
  const [pendingObjects, setPendingObjects] = useState<FloorDecoration[]>([]);
  const [sceneDraft, setSceneDraft] = useState<{ base: FloorLayout; layout: FloorLayout } | null>(
    null
  );
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  useEffect(() => {
    const syncFullscreen = () => setNativeFullscreen(!!document.fullscreenElement);
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !document.fullscreenElement &&
        !document.querySelector('input[data-file-picker-open="true"]') &&
        !document.querySelector('[role="dialog"][data-state="open"]')
      )
        setCanvasFullscreen(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    if (!canvasFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [canvasFullscreen]);
  const toggleCanvasFullscreen = async () => {
    if (canvasFullscreen) {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {
        toast.error(c('Press Esc to exit fullscreen.', 'Nhấn Esc để thoát toàn màn hình.'));
        return;
      }
      setCanvasFullscreen(false);
      return;
    }
    // Fullscreen the page so body portals stay mounted alongside the studio.
    // Browser-initiated exits must not reset the editor or its photo form.
    setCanvasFullscreen(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      toast.error(
        c(
          'Browser fullscreen is unavailable. The canvas is expanded in this window.',
          'Trình duyệt không cho phép toàn màn hình. Canvas đã được mở rộng trong cửa sổ.'
        )
      );
    }
  };
  const [aiPrecisionEdit, setAiPrecisionEdit] = useState(false);
  const aiDrag = useRef<{ key: string; proposal: AiProposal } | null>(null);
  const [aiWorking, setAiWorking] = useState(false);
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null);
  const [aiUndo, setAiUndo] = useState<AiProposal[]>([]);
  const [aiRedo, setAiRedo] = useState<AiProposal[]>([]);
  const scene = sceneDraft?.layout ?? query.data;
  const layout = scene
    ? {
        ...scene,
        decorations: [
          ...(scene.decorations ?? []).filter(
            (item) => !pendingObjects.some((draft) => draft.id === item.id)
          ),
          ...pendingObjects
        ]
      }
    : undefined;
  const [groupClipboard, setGroupClipboard] = useState<CanvasClipboard | null>(null);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [copySources, setCopySources] = useState<Map<number, ResourceDetail>>(new Map());
  const groupOperation = useRef(false);
  const groupStart = useRef<{ layout: FloorLayout; proposal: AiProposal | null } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const selectedType = options.types.find(
    (type) => type.id === selection?.resource?.resourceTypeId
  );
  const selectedSizeLocked =
    Number(selectedType?.standardWidthM) > 0 && Number(selectedType?.standardLengthM) > 0;
  const [availabilityMode, setAvailabilityMode] = useState(false);
  const [calendarFocus, setCalendarFocus] = useState({ key: null as string | null, sequence: 0 });
  const calendar = useFloorAvailability(actorId, workspaceId, floorId, availabilityMode, layout);
  const calendarState = (key: string) => calendar.states[Number(key.slice('resource:'.length))];
  const availabilityStatus = (key: string) => {
    const state = calendarState(key);
    const resource = layout?.resources.find((item) => `resource:${item.id}` === key);
    const room =
      resource?.category === 'DESK' && resource.parentRoomId
        ? layout?.resources.find((item) => item.id === resource.parentRoomId)
        : undefined;
    return (
      <span className='mt-1.5 block space-y-1'>
        <span
          className='inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold'
          style={
            state
              ? { color: availabilityColors[state], borderColor: availabilityColors[state] }
              : undefined
          }
        >
          {state && <span className='size-1.5 shrink-0 rounded-full bg-current' />}
          {state
            ? availabilityLabel(state, language === 'vi')
            : calendar.query.isPending
              ? c('Loading status…', 'Đang tải trạng thái…')
              : c('Status unavailable', 'Chưa tải được trạng thái')}
        </span>
        {room && (
          <span className='block truncate text-[10px] text-muted-foreground' title={room.name}>
            {c('Follows room', 'Theo phòng')}: {room.name}
          </span>
        )}
      </span>
    );
  };
  const focusCalendar = (key: string | null) =>
    setCalendarFocus((previous) => ({ key, sequence: previous.sequence + 1 }));
  const [undo, setUndo] = useState<PlacementFields[]>([]);
  const [redo, setRedo] = useState<PlacementFields[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [search, setSearch] = useState('');
  const [allObjectsOpen, setAllObjectsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [resourceEditor, setResourceEditor] = useState<{
    resource?: ResourceDetail;
    typeId?: number;
  } | null>(null);
  const [editorCanvas, setEditorCanvas] = useState<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'resources' | 'objects'>('all');
  const [settings, setSettings] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: string; height: string } | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [remove, setRemove] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState({ key: null as string | null, sequence: 0 });
  const dirtySelection =
    !!selection &&
    (!samePosition(selection.fields, selection.initial) ||
      (!!selection.object &&
        JSON.stringify(selection.object) !== JSON.stringify(selection.originalObject)));
  const dirtyDimensions =
    !!dimensions &&
    (Number(dimensions.width) !== layout?.width || Number(dimensions.height) !== layout?.height);
  const dirtyScene =
    !!sceneDraft &&
    (JSON.stringify(sceneDraft.base.resources) !== JSON.stringify(sceneDraft.layout.resources) ||
      JSON.stringify(sceneDraft.base.decorations) !==
        JSON.stringify(sceneDraft.layout.decorations));
  const dirtyManual = dirtySelection || dirtyDimensions || pendingObjects.length > 0 || dirtyScene;
  const dirty = dirtyManual || !!aiProposal;
  const navigation = useBlocker({
    shouldBlockFn: () => dirty || busy || aiWorking,
    enableBeforeUnload: () => dirty || busy || aiWorking,
    withResolver: true
  });
  const validation = usePlacementValidation(
    workspaceId,
    floorId,
    selection?.fields ?? { posX: '', posY: '', width: '', height: '', rotation: '0' },
    {
      resourceId: selection?.resource?.id,
      parentRoomId: selection?.resource?.parentRoomId ?? undefined,
      category: selection?.resource?.category,
      decoration: selection?.object
    },
    layout
  );
  const groupGeometry = !selection && dirtyScene && layout ? aiPreviewGeometry(layout) : undefined;
  const editable =
    writable && !!layout?.editableLayout && !availabilityMode && !aiWorking && !aiProposal;
  const width = dimensions?.width ?? String(layout?.width ?? 1200);
  const height = dimensions?.height ?? String(layout?.height ?? 800);
  const act = (action: () => void) => {
    if (aiWorking) return;
    if (busy || loadingSelection) return;
    if (dirty) setPending(() => action);
    else action();
  };
  const clearSelection = () => {
    request.current++;
    setLoadingSelection(false);
    setSelection(null);
    setFocus((previous) => ({ ...previous, key: null }));
    setUndo([]);
    setRedo([]);
    setError('');
  };
  const checkpoint = () => {
    if (selection)
      setUndo((previous) => [...previous.slice(-99), selectPlacementFields(selection.fields)]);
    setRedo([]);
  };
  const change = (fields: PlacementFields, record = true) => {
    if (record) checkpoint();
    setSelection((previous) => (previous ? { ...previous, fields } : previous));
    if (selection) stage(selection.key, fields, selection.object);
    setError('');
  };
  const history = (direction: 'undo' | 'redo') => {
    if (!selection) return;
    const stack = direction === 'undo' ? undo : redo;
    const next = stack.at(-1);
    if (!next) return;
    if (direction === 'undo') {
      setUndo(stack.slice(0, -1));
      setRedo((previous) => [...previous, selection.fields]);
    } else {
      setRedo(stack.slice(0, -1));
      setUndo((previous) => [...previous, selection.fields]);
    }
    setSelection({ ...selection, fields: next });
    stage(selection.key, next, selection.object);
    setError('');
  };
  function stage(key: string, fields: PlacementFields, object?: FloorDecoration) {
    if (!query.data) return;
    setSceneDraft((previous) => {
      const current = previous?.layout ?? query.data!;
      const complete = {
        ...current,
        decorations: [
          ...(current.decorations ?? []),
          ...pendingObjects.filter(
            (item) => !current.decorations?.some((existing) => existing.id === item.id)
          )
        ]
      };
      return {
        base: previous?.base ?? query.data!,
        layout: stageLayoutObject(complete, key, fields, object)
      };
    });
    setPendingObjects([]);
  }
  async function choose(key: string) {
    const serial = ++request.current;
    setError('');
    const object = layout?.decorations?.find((item) => `decoration:${item.id}` === key);
    if (object) {
      const fields = canvasPosition(object);
      setSelection({
        key,
        object,
        originalObject: object,
        initial: fields,
        fields: overviewDrag.current?.key === key ? overviewDrag.current.fields : fields
      });
      setUndo([]);
      setRedo([]);
      setSettings(false);
      return;
    }
    const resource = layout?.resources.find((item) => `resource:${item.id}` === key);
    if (!resource) return;
    setLoadingSelection(true);
    try {
      const copied = resource.id < 0 ? copySources.get(resource.id) : undefined;
      const detail = copied
        ? {
            ...copied,
            ...resource,
            id: resource.id,
            workspaceId,
            floorPlanId: floorId,
            category: resource.category ?? copied.category,
            resourceTypeId: resource.resourceTypeId ?? copied.resourceTypeId,
            capacity: resource.capacity ?? copied.capacity
          }
        : await getResource(resource.id);
      if (request.current !== serial) return;
      if (detail.revision !== resource.revision) {
        await query.refetch();
        throw new Error(
          c(
            'The layout changed. Select the object again.',
            'Sơ đồ đã thay đổi. Vui lòng chọn lại đối tượng.'
          )
        );
      }
      const fields = canvasPosition(detail);
      setSelection({
        key,
        resource: detail,
        initial: fields,
        fields:
          overviewDrag.current?.key === key ? overviewDrag.current.fields : canvasPosition(resource)
      });
      setUndo([]);
      setRedo([]);
      setSettings(false);
    } catch (failure) {
      if (serial === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : c('Cannot load object.', 'Không thể tải đối tượng.')
        );
    } finally {
      if (serial === request.current) setLoadingSelection(false);
    }
  }
  async function dragOverview(
    key: string,
    fields: PlacementFields,
    phase: 'start' | 'move' | 'end' | 'cancel'
  ) {
    if (phase === 'cancel') {
      const previous = overviewDrag.current;
      if (previous && query.data) {
        setSceneDraft((draft) => ({ base: draft?.base ?? query.data!, layout: previous.scene }));
      }
      overviewDrag.current = null;
      clearSelection();
      setOverviewDragging(false);
      return;
    }
    if (phase === 'start') {
      if (!editable || busy || loadingSelection || !layout) return;
      const scene = selection
        ? stageLayoutObject(layout, selection.key, selection.fields, selection.object)
        : layout;
      const current = { key, fields, initial: fields, ready: Promise.resolve(), scene };
      overviewDrag.current = current;
      setOverviewDragging(true);
      current.ready = choose(key);
      return;
    }
    const current = overviewDrag.current;
    if (!current || current.key !== key) return;
    current.fields = fields;
    if (query.data) {
      setSceneDraft((draft) => ({
        base: draft?.base ?? query.data!,
        layout: stageLayoutObject(current.scene, key, fields)
      }));
      setPendingObjects([]);
    }
    setSelection((previous) => (previous?.key === key ? { ...previous, fields } : previous));
    if (phase === 'end') {
      await current.ready;
      if (overviewDrag.current !== current) return;
      setSelection((previous) =>
        previous?.key === key ? { ...previous, fields: current.fields } : previous
      );
      overviewDrag.current = null;
      setUndo([current.initial]);
      setRedo([]);
      setOverviewDragging(false);
    }
  }
  const select = (key: string) => {
    if (availabilityMode) {
      focusCalendar(key);
      return;
    }
    if (busy || loadingSelection || overviewDragging || key === selection?.key) return;
    setFocus((previous) => ({ ...previous, key: null }));
    if (selection) stage(selection.key, selection.fields, selection.object);
    void choose(key);
  };
  function changeGroupScene(next: FloorLayout, phase: GroupEditPhase) {
    if (!layout || busy || aiWorking) return;
    if (phase === 'start') {
      groupStart.current = { layout: aiLayout ?? layout, proposal: aiProposal };
      if (aiProposal) rememberAi();
      return;
    }
    if (phase === 'cancel') {
      if (groupStart.current?.proposal) {
        setAiProposal(groupStart.current.proposal);
        setAiUndo((items) => items.slice(0, -1));
      } else if (groupStart.current) {
        setSceneDraft({ base: sceneDraft?.base ?? query.data!, layout: groupStart.current.layout });
        setPendingObjects([]);
      }
      groupStart.current = null;
      return;
    }
    if (aiProposal) {
      try {
        setAiProposal(
          aiProposalWithScene(layout, groupStart.current?.proposal ?? aiProposal, next)
        );
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Could not move selection');
      }
    } else {
      setSceneDraft({ base: sceneDraft?.base ?? query.data!, layout: next });
      setPendingObjects([]);
      setSelection((previous) => {
        if (!previous) return null;
        const object = next.decorations?.find((item) => 'decoration:' + item.id === previous.key);
        const resource = next.resources.find((item) => 'resource:' + item.id === previous.key);
        return object || resource
          ? {
              ...previous,
              fields: canvasPosition((object ?? resource)!),
              ...(object ? { object } : {})
            }
          : null;
      });
    }
    if (phase === 'end') groupStart.current = null;
  }
  function copySceneGroup(keys: string[]) {
    const source = aiLayout ?? layout;
    if (!source || busy || aiWorking) return null;
    const copied = { scene: source, keys: expandCanvasSelection(source, keys) };
    setGroupClipboard(copied);
    return copied;
  }
  async function duplicateSceneGroup(keys: string[]) {
    const copied = copySceneGroup(keys);
    if (copied) await pasteSceneGroup(copied);
  }
  async function pasteSceneGroup(copied = groupClipboard) {
    const destination = aiLayout ?? layout;
    if (!copied || !destination || busy || aiWorking || groupOperation.current) return;
    groupOperation.current = true;
    setBusy(true);
    setError('');
    try {
      const pasted = pasteCanvasSelection(destination, copied, language === 'vi' ? 'vi' : 'en');
      if (!pasted) return;
      let copiedResourceIds = pasted.resources.map((item) => item.id);
      if (aiProposal && layout) {
        const nextProposal = aiProposalWithScene(layout, aiProposal, pasted.layout);
        rememberAi();
        setAiProposal(nextProposal);
        copiedResourceIds = pasted.resources.map(
          (_, index) =>
            -(nextProposal.design.resources.length - pasted.resources.length + index + 1)
        );
      } else {
        const sources = await Promise.all(
          pasted.resources.map(async (item) => {
            const sourceId = pasted.sources.get(item.id)!;
            const source = sourceId < 0 ? copySources.get(sourceId) : await getResource(sourceId);
            if (!source || source.workspaceId !== workspaceId || source.floorPlanId !== floorId)
              throw new Error(
                c(
                  'Save the source before duplicating it here.',
                  'Lưu đối tượng nguồn trước khi nhân bản tại đây.'
                )
              );
            return [item.id, source] as const;
          })
        );
        setCopySources((previous) => new Map([...previous, ...sources]));
        setSceneDraft({ base: sceneDraft?.base ?? query.data!, layout: pasted.layout });
        setPendingObjects([]);
        clearSelection();
      }
      setGroupSelection([
        ...copiedResourceIds.map((id) => `resource:${id}`),
        ...pasted.decorations.map((item) => 'decoration:' + item.id)
      ]);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Could not duplicate.', 'Không nhân bản được.')
      );
    } finally {
      groupOperation.current = false;
      setBusy(false);
    }
  }
  async function deleteSceneGroup(keys: string[]) {
    const source = aiLayout ?? layout;
    if (!source || busy || aiWorking || groupOperation.current) return;
    const selected = new Set(expandCanvasSelection(source, keys));
    if (!selected.size) return;
    if (aiProposal && layout) {
      rememberAi();
      setAiProposal(
        aiProposalWithScene(layout, aiProposal, {
          ...source,
          resources: source.resources.filter((item) => !selected.has('resource:' + item.id)),
          decorations: (source.decorations ?? []).filter(
            (item) => !selected.has('decoration:' + item.id)
          )
        })
      );
      setGroupSelection([]);
      return;
    }
    groupOperation.current = true;
    setBusy(true);
    setError('');
    const deleted = new Set<number>();
    let failure: unknown;
    try {
      const details = await Promise.all(
        source.resources
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
    let base = sceneDraft?.base ?? query.data!;
    if (deleted.size) {
      const refreshed = await query.refetch();
      if (refreshed.data) base = refreshed.data;
    }
    const next = withSpatialParents({
      ...source,
      floor: base.floor,
      resources: source.resources.filter((item) =>
        item.id > 0 ? !deleted.has(item.id) : !selected.has('resource:' + item.id)
      ),
      decorations: (source.decorations ?? []).filter(
        (item) => !selected.has('decoration:' + item.id)
      )
    });
    setSceneDraft({ base, layout: next });
    setPendingObjects([]);
    clearSelection();
    setGroupSelection([]);
    groupOperation.current = false;
    setBusy(false);
    if (failure)
      setError(
        failure instanceof Error
          ? failure.message
          : c('Some objects could not be removed.', 'Một số đối tượng chưa xóa được.')
      );
  }
  async function save() {
    if (
      !layout ||
      busy ||
      loadingSelection ||
      overviewDragging ||
      !editable ||
      validation.blocked ||
      groupGeometry?.roomEdgeCollisions.size
    )
      return;
    setBusy(true);
    setError('');
    try {
      const finalLayout = withSpatialParents(
        selection
          ? stageLayoutObject(layout, selection.key, selection.fields, selection.object)
          : layout
      );
      const base = sceneDraft?.base ?? query.data!;
      const changes = [
        ...changedLayoutResources(base, finalLayout),
        ...finalLayout.resources.filter((item) => item.id < 0)
      ];
      const items = await Promise.all(
        changes.map(async (item) => {
          const detail = item.id < 0 ? copySources.get(item.id) : await getResource(item.id);
          if (!detail)
            throw new Error(
              c(
                'Copy source is missing. Duplicate the object again.',
                'Thiếu dữ liệu nguồn. Vui lòng nhân bản lại.'
              )
            );
          const original = base.resources.find((resource) => resource.id === item.id)!;
          if (item.id > 0 && detail.revision !== original.revision)
            throw new Error(
              c(
                'The floor changed. Reload before saving.',
                'Sơ đồ đã thay đổi. Tải lại trước khi lưu.'
              )
            );
          const form = resourceFormSchema.parse({
            ...canvasResourceForm(detail, canvasPosition(item)),
            code: item.code,
            name: item.name,
            parentRoomId:
              item.parentRoomId && item.parentRoomId > 0 ? String(item.parentRoomId) : ''
          });
          return {
            clientId: `r_${item.id}`,
            id: item.id > 0 ? item.id : undefined,
            ...(item.parentRoomId && item.parentRoomId < 0
              ? { parentClientId: `r_${item.parentRoomId}` }
              : {}),
            input: resourcePayload(form, item.id > 0 ? detail : undefined)
          };
        })
      );
      if (items.length)
        await saveResourceBatch(
          workspaceId,
          floorId,
          base.floor.revision,
          items,
          finalLayout.decorations ?? []
        );
      else
        await saveFloorDecorations(
          workspaceId,
          { ...finalLayout, floor: base.floor },
          finalLayout.decorations ?? [],
          width,
          height
        );
      clearSelection();
      setDimensions(null);
      await onSaved();
      setSceneDraft(null);
      setCopySources(new Map());
      setPendingObjects([]);
      toast.success(
        c(
          'Saved. Seats & Rooms now uses these coordinates.',
          'Đã lưu. Quản lý ghế & phòng đã cập nhật cùng tọa độ.'
        )
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Cannot save layout.', 'Không thể lưu sơ đồ.')
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveCanvas() {
    if (!layout || busy || !editable) return;
    if (
      ![width, height].every((value) => /^\d{1,8}(?:\.\d{1,2})?$/.test(value) && Number(value) >= 1)
    ) {
      setError(
        c(
          'Enter positive canvas dimensions, up to two decimals.',
          'Nhập kích thước canvas dương, tối đa 2 số thập phân.'
        )
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveFloorDecorations(workspaceId, layout, layout.decorations ?? [], width, height);
      setDimensions(null);
      await onSaved();
      toast.success(c('Canvas draft saved.', 'Đã lưu kích thước canvas nháp.'));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save canvas');
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!layout || busy || dirty || !confirmed || !editable) return;
    setBusy(true);
    setError('');
    try {
      await publishResourceFloor(workspaceId, layout, width, height);
      await onSaved();
      setPublishing(false);
      setConfirmed(false);
      toast.success(
        c(
          'Floor published. Availability is managed separately.',
          'Đã xuất bản tầng. Trạng thái nhận đặt vẫn quản lý riêng.'
        )
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
  }
  async function removeResource() {
    if (!selection?.resource || dirty || busy || !editable) return;
    setBusy(true);
    setDeleteError('');
    try {
      const resource = selection.resource;
      const deletedIds = new Set([resource.id]);
      if (resource.category === 'ROOM') {
        for (const id of await deleteRoomWithSeats(resource)) deletedIds.add(id);
      } else {
        await deleteResource(resource);
      }
      const layoutKey = floorLayoutOptions(actorId, workspaceId, floorId).queryKey;
      // Cancel older reads so a late response cannot restore the deleted resource on the canvas.
      await queryClient.cancelQueries({ queryKey: layoutKey, exact: true });
      queryClient.setQueryData<FloorLayout>(layoutKey, (current) =>
        current
          ? {
              ...current,
              resources: current.resources.filter((item) => !deletedIds.has(item.id)),
              decorations: current.decorations?.filter((item) => !roomObjectIds.has(item.id))
            }
          : current
      );
      // Deletion is blocked while dirty; this clean staged snapshot must not mask refreshed server data.
      setSceneDraft(null);
      clearSelection();
      setGroupSelection([]);
      setRemove(false);
      await onSaved();
      toast.success(c('Resource deleted.', 'Đã xóa ghế/phòng.'));
    } catch (failure) {
      setDeleteError(
        failure instanceof Error ? failure.message : c('Could not delete.', 'Không thể xóa.')
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeObject() {
    if (!selection?.object || !layout || busy || !editable) return;
    if (!query.data?.decorations?.some((item) => item.id === selection.object!.id)) {
      const id = selection.object.id;
      setPendingObjects((items) => items.filter((item) => item.id !== id));
      clearSelection();
      setRemove(false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveFloorDecorations(
        workspaceId,
        layout,
        (layout.decorations ?? []).filter((item) => item.id !== selection.object!.id),
        width,
        height
      );
      clearSelection();
      setRemove(false);
      await onSaved();
      toast.success(c('Layout object removed from the draft.', 'Đã xóa đồ bố trí khỏi bản nháp.'));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not remove object');
    } finally {
      setBusy(false);
    }
  }
  function exportSvg() {
    const source = container.current?.querySelector<SVGSVGElement>('svg[data-floor-canvas]');
    if (!source) return;
    const clone = source.cloneNode(true) as SVGSVGElement;
    const originals = [source, ...source.querySelectorAll('*')],
      clones = [clone, ...clone.querySelectorAll('*')];
    originals.forEach((node, i) => {
      const style = getComputedStyle(node);
      for (const property of [
        'fill',
        'stroke',
        'stroke-width',
        'opacity',
        'font-size',
        'font-family',
        'font-weight',
        'color'
      ])
        (clones[i] as SVGElement).style.setProperty(property, style.getPropertyValue(property));
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1600');
    clone.setAttribute('height', '1000');
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexspace-floor-${floorId}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const resources = layout?.resources ?? [],
    objects = layout?.decorations ?? [];
  const roomToDelete = selection?.resource?.category === 'ROOM' ? selection.resource : null;
  const roomToDeletePose = roomToDelete && layoutGeometry(roomToDelete);
  const roomSeats = roomToDelete
    ? resources.filter((item) => item.parentRoomId === roomToDelete.id)
    : [];
  const roomObjectIds = new Set(
    roomToDeletePose
      ? objects
          .filter((item) => {
            const pose = layoutGeometry(item);
            return pose && decorationBelongsToRoom(item, roomToDeletePose, insideRoom);
          })
          .map((item) => item.id)
      : []
  );
  const entries = [
    ...resources.map((item) => ({
      key: `resource:${item.id}`,
      label: item.name,
      sub: item.code,
      category: item.category,
      object: undefined as FloorDecoration | undefined
    })),
    ...objects.map((object) => ({
      key: `decoration:${object.id}`,
      label: object.label,
      sub: object.kind,
      category: undefined,
      object
    }))
  ];
  const visible = entries.filter(
    (item) =>
      (filter === 'all' || (filter === 'objects' ? !!item.object : !item.object)) &&
      `${item.label} ${item.sub}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  const missing = resources.filter(
    (item) => item.posX === null || item.posY === null || !item.width || !item.height
  ).length;
  const publishIssue =
    !layout || aiOpen || availabilityMode
      ? null
      : dirty
        ? c(
            'Save or finish the current draft before publishing.',
            'Lưu hoặc hoàn tất bản nháp trước khi xuất bản.'
          )
        : missing > 0
          ? c(
              'Place all seats and rooms before publishing.',
              'Đặt vị trí cho tất cả ghế/phòng trước khi xuất bản.'
            )
          : null;
  const name = selection?.resource?.name ?? selection?.object?.label;
  const selectedSeat = layout?.resources.find((item) => item.id === selection?.resource?.id);
  const selectedRoom = layout?.resources.find((item) => item.id === selectedSeat?.parentRoomId);

  const aiLayout =
    layout && aiProposal && !aiProposal.design.question
      ? aiDesignPreview(layout, aiProposal, options)
      : undefined;
  const aiResource = aiLayout?.resources.find((item) => `resource:${item.id}` === focus.key);
  const aiObject = aiLayout?.decorations?.find((item) => `decoration:${item.id}` === focus.key);
  const aiShape = (aiResource || aiObject) && layoutGeometry((aiResource || aiObject)!);
  const scopeRoomId = aiProposal?.selectedKey?.startsWith('resource:')
    ? Number(aiProposal.selectedKey.slice(9))
    : undefined;
  const aiScopeRoom = aiLayout?.resources.find((item) => item.id === scopeRoomId);
  const aiScopePose = aiScopeRoom && layoutGeometry(aiScopeRoom);
  const aiCanEditSelection =
    aiProposal?.scope === 'WORKSPACE' ||
    (aiProposal?.scope === 'OBJECT' && aiProposal.selectedKey === focus.key) ||
    (aiProposal?.scope === 'ROOM' &&
      (aiResource?.id === scopeRoomId ||
        aiResource?.parentRoomId === scopeRoomId ||
        (!!aiObject &&
          !!aiScopePose &&
          decorationBelongsToRoom(aiObject, aiScopePose, insideRoom))));
  const aiGeometry = aiLayout ? aiPreviewGeometry(aiLayout) : undefined;
  const aiGeometryIssues =
    !aiGeometry || aiGeometry.valid
      ? []
      : [
          !aiGeometry.fits
            ? c(
                'An object is outside its area or containing room.',
                'Có đồ vật nằm ngoài vùng hoặc phòng chứa.'
              )
            : '',
          aiGeometry.roomEdgeCollisions.size
            ? c('Seats crossing a room edge: ', 'Ghế đang đè qua mép phòng: ') +
              [...aiGeometry.roomEdgeCollisions].slice(0, 5).join(', ')
            : aiGeometry.collisions.size
              ? c('Overlapping objects: ', 'Đồ vật chồng lấn: ') +
                [...aiGeometry.collisions].slice(0, 5).join(', ')
              : ''
        ].filter(Boolean);
  function aiKeyEditable(key: string) {
    if (!aiProposal || !aiLayout) return false;
    if (aiProposal.scope === 'WORKSPACE') return true;
    if (aiProposal.scope === 'OBJECT') return aiProposal.selectedKey === key;
    const resource = aiLayout.resources.find((item) => 'resource:' + item.id === key);
    const object = aiLayout.decorations?.find((item) => 'decoration:' + item.id === key);
    return (
      !!aiScopePose &&
      (resource?.id === scopeRoomId ||
        resource?.parentRoomId === scopeRoomId ||
        (!!object && decorationBelongsToRoom(object, aiScopePose, insideRoom)))
    );
  }
  function dragAiPreview(
    key: string,
    fields: PlacementFields,
    phase: 'start' | 'move' | 'end' | 'cancel'
  ) {
    if (!layout || !aiProposal || !writable || aiWorking || !aiKeyEditable(key)) return;
    if (phase === 'start') {
      aiDrag.current = { key, proposal: aiProposal };
      rememberAi();
      setFocus((previous) => ({ ...previous, key }));
      return;
    }
    const current = aiDrag.current;
    if (!current || current.key !== key) return;
    if (phase === 'cancel') {
      setAiProposal(current.proposal);
      aiDrag.current = null;
      return;
    }
    try {
      const next = adjustAiProposal(layout, current.proposal, options, key, {
        x: Number(fields.posX),
        y: Number(fields.posY),
        width: Number(fields.width),
        height: Number(fields.height),
        rotation: Number(fields.rotation)
      });
      setAiProposal(next);
      if (phase === 'end') aiDrag.current = null;
    } catch (error) {
      if (phase === 'end') {
        aiDrag.current = null;
        toast.error(error instanceof Error ? error.message : 'Cannot adjust preview');
      }
    }
  }
  const rememberAi = () => {
    if (aiProposal) setAiUndo((items) => [...items.slice(-19), aiProposal]);
    setAiRedo([]);
  };
  const changeAi = (fields: PlacementFields, record = true) => {
    if (!layout || !aiProposal || !focus.key) return;
    try {
      if (record) rememberAi();
      setAiProposal(
        adjustAiProposal(layout, aiProposal, options, focus.key, {
          x: Number(fields.posX),
          y: Number(fields.posY),
          width: Number(fields.width),
          height: Number(fields.height),
          rotation: Number(fields.rotation)
        })
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not adjust the AI preview');
    }
  };
  return (
    <div
      ref={container}
      data-canvas-expanded={canvasFullscreen ? 'true' : undefined}
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          !(event.target instanceof SVGElement) ||
          !editable ||
          !selection ||
          busy ||
          overviewDragging ||
          resourceEditor ||
          !(event.ctrlKey || event.metaKey) ||
          event.key.toLowerCase() !== 'z'
        )
          return;
        event.preventDefault();
        history(event.shiftKey ? 'redo' : 'undo');
      }}
      className={`flex flex-col overflow-hidden border border-border bg-card shadow-sm ${canvasFullscreen ? 'fixed inset-0 z-50 h-dvh min-h-0 rounded-none' : 'min-h-[720px] rounded-2xl xl:h-[calc(100dvh-8.5rem)]'} [&:fullscreen]:h-screen [&:fullscreen]:rounded-none`}
    >
      <div inert={!!resourceEditor} className={canvasFullscreen ? 'hidden' : 'shrink-0'}>
        <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/[0.07] to-card px-4 py-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 shrink-0 rounded-xl'
              aria-label={c('Back to 3D building', 'Về tòa nhà 3D')}
              title={c('Back to 3D building', 'Về tòa nhà 3D')}
              disabled={busy || loadingSelection}
              onClick={() => act(onBack)}
            >
              <ChevronLeft className='size-4' />
            </Button>
            <span className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary'>
              <Layers3 className='size-5' />
            </span>
            <div>
              <h1 className='text-lg font-semibold tracking-tight'>
                {c('Floor Studio', 'Thiết kế sơ đồ tầng')}
              </h1>
              <p className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                <span
                  className={`size-1.5 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
                {dirty
                  ? c('Unsaved changes', 'Có thay đổi chưa lưu')
                  : c('Shared with Seats & Rooms', 'Đồng bộ với Quản lý ghế & phòng')}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='flex rounded-xl border border-border bg-muted/40 p-1'>
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type='button'
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] ${availabilityMode === value ? 'bg-background font-semibold text-primary shadow-sm' : 'text-muted-foreground'}`}
                  disabled={busy || loadingSelection}
                  onClick={() =>
                    act(() => {
                      clearSelection();
                      setDimensions(null);
                      setSettings(false);
                      setAvailabilityMode(value);
                    })
                  }
                >
                  {value ? c('Availability', 'Theo lịch') : c('Design', 'Thiết kế')}
                </button>
              ))}
            </div>
            {layout && (
              <Button
                variant={aiOpen ? 'default' : 'outline'}
                className='rounded-xl'
                disabled={busy || aiWorking || availabilityMode}
                onClick={() => {
                  if (aiOpen && aiCollapsed) {
                    setAiCollapsed(false);
                    return;
                  }
                  setAiCollapsed(false);
                  if (aiOpen || aiProposal) setAiOpen(!aiOpen);
                  else act(() => setAiOpen(true));
                }}
              >
                <Sparkles className='size-4' />
                {aiProposal && !aiOpen
                  ? c('Review AI proposal', 'Xem lại đề xuất AI')
                  : c('AI assistant', 'Trợ lý AI')}
              </Button>
            )}
            {layout && (
              <FloorActions
                workspaceId={workspaceId}
                floor={layout.floor}
                floors={options.floors}
                disabled={!writable || dirty || busy || loadingSelection}
                onSaved={onSaved}
                onDeleted={onBack}
                onCopied={(floor) => onFloorChange(floor.id)}
              />
            )}
            <Button
              size='icon'
              variant='ghost'
              title={c('Refresh layout', 'Tải lại sơ đồ')}
              aria-label={c('Refresh layout', 'Tải lại sơ đồ')}
              disabled={busy || loadingSelection}
              onClick={() =>
                act(() => {
                  clearSelection();
                  setDimensions(null);
                  void onSaved();
                })
              }
            >
              <RefreshCw className='size-4' />
            </Button>
            <Button
              size='icon'
              variant='ghost'
              title={c('Export current view as SVG', 'Xuất vùng xem dạng SVG')}
              aria-label={c('Export SVG', 'Xuất SVG')}
              disabled={!layout}
              onClick={exportSvg}
            >
              <Download className='size-4' />
            </Button>
            <Button
              size='icon'
              variant='ghost'
              title={c('Fullscreen', 'Toàn màn hình')}
              aria-label={c('Fullscreen', 'Toàn màn hình')}
              onClick={() => void toggleCanvasFullscreen()}
            >
              <Maximize2 className='size-4' />
            </Button>
            <Button
              size='sm'
              variant='outline'
              disabled={!layout || busy}
              onClick={() =>
                act(() => {
                  clearSelection();
                  setDimensions(null);
                  setSettings(!settings);
                })
              }
            >
              <SlidersHorizontal className='size-4' />
              {c('Canvas', 'Canvas')}
            </Button>
            <Button
              size='sm'
              disabled={busy || !editable || dirty || !!missing || loadingSelection}
              aria-describedby={publishIssue ? 'floor-publish-issue' : undefined}
              onClick={() => {
                setConfirmed(false);
                setPublishing(true);
              }}
            >
              <Upload className='size-4' />
              {c('Publish', 'Xuất bản')}
            </Button>
          </div>
        </header>
        {publishIssue && (
          <p
            id='floor-publish-issue'
            className='border-b border-border px-4 py-2 text-xs text-muted-foreground'
          >
            {publishIssue}
          </p>
        )}
        {layout && <FloorLocationBanner floor={layout.floor} />}
        <div className='flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/20 px-4 py-2.5'>
          <select
            aria-label={c('Workspace', 'Không gian')}
            value={workspaceId}
            disabled={busy || loadingSelection}
            className='h-9 min-w-0 max-w-full flex-1 rounded-lg border border-input bg-background px-3 text-xs sm:max-w-[320px]'
            onChange={(event) => {
              const id = Number(event.target.value);
              act(() => onWorkspaceChange(id));
            }}
          >
            {workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.status}
              </option>
            ))}
          </select>
          <span className='hidden h-4 border-l border-border sm:block' />
          <select
            aria-label={c('Floor', 'Tầng')}
            value={floorId}
            disabled={busy || loadingSelection}
            className='h-9 min-w-0 max-w-full rounded-lg border border-input bg-background px-3 text-xs'
            onChange={(event) => {
              const id = Number(event.target.value);
              act(() => {
                clearSelection();
                setDimensions(null);
                onFloorChange(id);
                setFocus({ key: null, sequence: 0 });
              });
            }}
          >
            {options.floors.map((item) => (
              <option key={item.id} value={item.id}>
                {c('Floor', 'Tầng')} {item.floorNumber} · {item.status}
              </option>
            ))}
          </select>
          <div className='ml-auto flex items-center gap-2'>
            <Badge variant='secondary' className='text-[10px]'>
              {layout?.draftChanges
                ? c('Unpublished layout', 'Bố trí chưa xuất bản')
                : (layout?.floor.status ?? '—')}
            </Badge>
            {!writable && (
              <Badge variant='outline'>
                <LockKeyhole className='mr-1 size-3' />
                {c('Read only', 'Chỉ xem')}
              </Badge>
            )}
          </div>
        </div>
        {error && (
          <div
            role='alert'
            className='flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive'
          >
            <AlertTriangle className='mt-0.5 size-4 shrink-0' />
            <span className='flex-1'>{error}</span>
            <button
              type='button'
              aria-label={c('Dismiss error', 'Đóng lỗi')}
              onClick={() => setError('')}
            >
              <X className='size-4' />
            </button>
          </div>
        )}
        <div className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/15 px-4 py-2'>
          <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              <DoorOpen className='size-3.5 text-primary' />
              {resources.filter((item) => item.category === 'ROOM').length} {c('rooms', 'phòng')}
            </span>
            <span className='flex items-center gap-1.5'>
              <Armchair className='size-3.5 text-primary' />
              {resources.filter((item) => item.category !== 'ROOM').length} {c('seats', 'ghế')}
            </span>
            <span>
              {objects.length} {c('furnishings', 'đồ bố trí')}
            </span>
            <span className='hidden tabular-nums sm:inline'>
              {layout?.geometryVersion === 2
                ? `${geometryDisplay(String(layout.width ?? 0), true)} × ${geometryDisplay(String(layout.height ?? 0), true)} m`
                : `${layout?.width ?? 1200} × ${layout?.height ?? 800} px`}
            </span>
          </div>
          <Button
            size='sm'
            variant={infoOpen ? 'secondary' : 'ghost'}
            className='h-7 rounded-lg text-xs'
            aria-expanded={infoOpen}
            onClick={() =>
              act(() => {
                clearSelection();
                setSettings(false);
                setInfoOpen((value) => !value);
              })
            }
          >
            <SlidersHorizontal className='size-3.5' />
            {infoOpen
              ? c('Hide information', 'Thu gọn thông tin')
              : c('Floor details & shortcuts', 'Thông tin tầng & phím tắt')}
          </Button>
        </div>
      </div>
      <div
        className={`grid min-h-0 flex-1 xl:grid-rows-[minmax(0,1fr)] ${canvasFullscreen ? (resourceEditor || (aiOpen && !aiCollapsed) || (!aiOpen && (selection || settings || infoOpen)) ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]' : 'grid-cols-1') : `lg:grid-cols-[190px_minmax(0,1fr)] ${resourceEditor ? 'xl:grid-cols-[190px_minmax(0,1fr)_340px] 2xl:grid-cols-[210px_minmax(0,1fr)_380px]' : aiOpen && !aiCollapsed ? 'xl:grid-cols-[150px_minmax(0,1fr)_440px] 2xl:grid-cols-[170px_minmax(0,1fr)_500px]' : !aiProposal && !aiOpen && (selection || settings || availabilityMode || infoOpen) ? 'xl:grid-cols-[210px_minmax(0,1fr)_260px] 2xl:grid-cols-[230px_minmax(0,1fr)_280px]' : 'xl:grid-cols-[210px_minmax(0,1fr)] 2xl:grid-cols-[230px_minmax(0,1fr)]'}`}`}
      >
        <aside
          inert={!!resourceEditor}
          className={
            canvasFullscreen
              ? 'hidden'
              : 'flex min-h-0 flex-col overflow-hidden border-b border-border bg-muted/10 lg:border-b-0 lg:border-r'
          }
        >
          <div className='shrink-0 space-y-3 border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-3'>
            <div className='flex items-center justify-between text-xs font-semibold'>
              <span>{c('Layers & objects', 'Lớp & đối tượng')}</span>
              <span className='rounded-md bg-muted px-1.5 py-0.5 text-[10px] tabular-nums'>
                {entries.length}
              </span>
            </div>
            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
              <Input
                className='h-8 rounded-lg pl-8 text-xs'
                placeholder={c('Search objects…', 'Tìm đối tượng…')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='flex rounded-lg bg-muted p-1'>
              {(['all', 'resources', 'objects'] as const).map((value) => (
                <button
                  key={value}
                  type='button'
                  className={`flex-1 rounded-md py-1 text-[10px] transition-colors ${filter === value ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'}`}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all'
                    ? c('All', 'Tất cả')
                    : value === 'resources'
                      ? c('Seats', 'Chỗ')
                      : c('Objects', 'Đồ vật')}
                </button>
              ))}
            </div>
          </div>
          <div className='flex max-h-40 min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3 lg:max-h-none'>
            {visible.map((entry) => (
              <button
                type='button'
                key={entry.key}
                disabled={busy || loadingSelection}
                onClick={() => select(entry.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${(availabilityMode ? calendarFocus.key : selection?.key) === entry.key ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent hover:bg-muted'}`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${entry.object ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
                >
                  {entry.object ? (
                    <DecorationIcon
                      kind={entry.object.kind}
                      icon={furnishingIcon(
                        entry.object.kind,
                        entry.object.label,
                        entry.object.icon
                      )}
                      className='size-4'
                    />
                  ) : entry.category === 'ROOM' ? (
                    <DoorOpen className='size-4' />
                  ) : (
                    <Armchair className='size-4' />
                  )}
                </span>
                <span className='min-w-0'>
                  <span className='block truncate text-xs font-medium'>{entry.label}</span>
                  <span className='block truncate text-[10px] text-muted-foreground'>
                    {entry.sub}
                  </span>
                  {availabilityMode && !entry.object && availabilityStatus(entry.key)}
                </span>
              </button>
            ))}
            {!visible.length && (
              <p className='p-4 text-center text-xs text-muted-foreground'>
                {c('No matching objects.', 'Chưa có đối tượng phù hợp.')}
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={() => setAllObjectsOpen(true)}
            className='mx-3 mb-3 flex shrink-0 items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-medium hover:bg-muted'
          >
            {c('View all objects', 'Xem tất cả đối tượng')}
            <Maximize2 className='size-3.5 text-primary' />
          </button>
          <div className='shrink-0 space-y-2 border-t border-border bg-card p-3'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              {c('Add to floor', 'Thêm vào sơ đồ')}
            </p>
            <FurnishingPalette
              actorId={actorId}
              workspaceId={workspaceId}
              floorId={floorId}
              layout={layout}
              disabled={!editable || busy || loadingSelection}
              onPlace={(object) => {
                if ((layout?.decorations?.length ?? 0) >= 500) {
                  toast.error(
                    c('A floor supports up to 500 furnishings.', 'Mỗi sơ đồ tối đa 500 đồ bố trí.')
                  );
                  return;
                }
                if (selection) stage(selection.key, selection.fields, selection.object);
                setPendingObjects((items) => [...items, object]);
                const fields = canvasPosition(object);
                setSelection({ key: 'decoration:' + object.id, object, initial: fields, fields });
                setUndo([]);
                setRedo([]);
                setSettings(false);
                setDimensions(null);
                setError('');
              }}
            />
            <Button
              className='w-full rounded-lg text-xs'
              size='sm'
              variant='outline'
              disabled={!editable || busy || loadingSelection}
              onClick={() =>
                act(() => {
                  clearSelection();
                  setResourceEditor({});
                })
              }
            >
              <Plus className='size-3.5' />
              {c('Seat / room', 'Ghế / phòng')}
            </Button>
          </div>
        </aside>
        <section
          aria-label={c('Floor canvas', 'Canvas sơ đồ tầng')}
          className='relative flex min-h-[360px] min-w-0 flex-col overflow-hidden bg-muted/20 xl:min-h-0'
        >
          {(canvasFullscreen || (aiOpen && aiCollapsed)) && (
            <div className='flex shrink-0 items-center justify-between gap-2 border-b bg-card px-3 py-2 text-xs'>
              <span className='font-medium'>{c('Floor canvas', 'Canvas sơ đồ tầng')}</span>
              <div className='flex gap-2'>
                {!resourceEditor && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 text-xs'
                    onClick={() => {
                      if (!aiOpen) {
                        setAiOpen(true);
                        setAiCollapsed(false);
                      } else setAiCollapsed((value) => !value);
                    }}
                    aria-expanded={aiOpen && !aiCollapsed}
                  >
                    <Sparkles className='size-3.5' />
                    {aiOpen && !aiCollapsed
                      ? c('Minimize AI', 'Thu gọn AI')
                      : c('Open AI', 'Mở AI')}
                  </Button>
                )}
                {canvasFullscreen && (
                  <>
                    {!nativeFullscreen && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 text-xs'
                        onClick={() =>
                          void document.documentElement.requestFullscreen().catch(() => {
                            toast.error(
                              c(
                                'Browser fullscreen is unavailable.',
                                'Trình duyệt không cho phép toàn màn hình.'
                              )
                            );
                          })
                        }
                      >
                        {c('Restore fullscreen', 'Mở lại toàn màn hình')}
                      </Button>
                    )}
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 text-xs'
                      onClick={() => void toggleCanvasFullscreen()}
                    >
                      {c('Exit fullscreen', 'Thoát toàn màn hình')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          {loadingSelection && !overviewDragging && (
            <div
              role='status'
              className='absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm'
            >
              <LoaderCircle className='size-6 animate-spin text-primary' />
            </div>
          )}
          <div
            ref={setEditorCanvas}
            className={resourceEditor ? 'flex min-h-[480px] min-w-0 flex-1 flex-col' : 'hidden'}
          />
          <div className={resourceEditor ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
            {!floorId ? (
              <div className='m-auto space-y-3 p-10 text-center'>
                <Layers3 className='mx-auto size-10 text-primary/50' />
                <h2 className='font-semibold'>{c('Start with a floor', 'Bắt đầu với một tầng')}</h2>
                <Button disabled={!writable} onClick={() => onAdd('floor', 0)}>
                  <Plus className='size-4' />
                  {c('Location & floors', 'Địa điểm & tầng')}
                </Button>
              </div>
            ) : query.isPending ? (
              <div className='m-auto flex items-center gap-2 text-sm text-muted-foreground'>
                <LoaderCircle className='size-4 animate-spin' />
                {c('Loading floor…', 'Đang tải sơ đồ…')}
              </div>
            ) : query.isError ? (
              <div className='m-auto p-8 text-center'>
                <p role='alert' className='mb-3 text-sm text-destructive'>
                  {query.error.message}
                </p>
                <Button variant='outline' onClick={() => void query.refetch()}>
                  {c('Retry', 'Thử lại')}
                </Button>
              </div>
            ) : (
              layout &&
              (aiOpen && aiPrecisionEdit && aiLayout && aiShape && aiCanEditSelection ? (
                <ResourcePlacementEditor
                  onToggleFullscreen={() => void toggleCanvasFullscreen()}
                  fullscreenActive={canvasFullscreen}
                  presentation='workspace'
                  onGroupChange={
                    (editable && !busy) || (!!aiProposal && !aiWorking && !busy)
                      ? changeGroupScene
                      : undefined
                  }
                  onGroupDelete={(keys) => void deleteSceneGroup(keys)}
                  onGroupCopy={(keys) => {
                    copySceneGroup(keys);
                  }}
                  onGroupDuplicate={(keys) => void duplicateSceneGroup(keys)}
                  onPaste={() => void pasteSceneGroup()}
                  groupSelection={groupSelection}
                  actions={
                    <Button variant='outline' size='sm' onClick={() => setAiPrecisionEdit(false)}>
                      <ChevronLeft className='size-4' />
                      {c('Back to direct dragging', 'Về kéo thả trực tiếp')}
                    </Button>
                  }
                  workspaceId={workspaceId}
                  floorId={floorId}
                  resourceId={aiResource?.id}
                  parentRoomId={aiResource?.parentRoomId ?? undefined}
                  category={aiResource?.category}
                  decoration={aiObject}
                  draftLayout={aiLayout}
                  value={{
                    posX: String(aiShape.x),
                    posY: String(aiShape.y),
                    width: String(aiShape.width),
                    height: String(aiShape.height),
                    rotation: String(aiShape.rotation)
                  }}
                  disabled={!writable || aiWorking}
                  onBegin={rememberAi}
                  onChange={changeAi}
                  onUndo={() => {
                    const previous = aiUndo.at(-1);
                    if (previous && aiProposal) {
                      setAiRedo((items) => [...items, aiProposal]);
                      setAiUndo((items) => items.slice(0, -1));
                      setAiProposal(previous);
                    }
                  }}
                  onRedo={() => {
                    const next = aiRedo.at(-1);
                    if (next && aiProposal) {
                      setAiUndo((items) => [...items, aiProposal]);
                      setAiRedo((items) => items.slice(0, -1));
                      setAiProposal(next);
                    }
                  }}
                  onReset={() => {
                    if (aiUndo[0]) {
                      setAiProposal(aiUndo[0]);
                      setAiUndo([]);
                      setAiRedo([]);
                    }
                  }}
                  canUndo={aiUndo.length > 0}
                  canRedo={aiRedo.length > 0}
                  onSelect={(key) =>
                    setFocus((previous) => ({ key, sequence: previous.sequence + 1 }))
                  }
                />
              ) : availabilityMode ? (
                <FloorAvailabilityPanel
                  calendar={calendar}
                  layout={layout}
                  focus={calendarFocus}
                  onFocus={focusCalendar}
                />
              ) : (
                <FloorLayoutPreview
                  onGroupChange={
                    (editable || (!!aiProposal && !aiWorking)) && !busy
                      ? changeGroupScene
                      : undefined
                  }
                  onGroupDelete={(keys) => void deleteSceneGroup(keys)}
                  onGroupCopy={(keys) => {
                    copySceneGroup(keys);
                  }}
                  onGroupDuplicate={(keys) => void duplicateSceneGroup(keys)}
                  onGroupPaste={() => void pasteSceneGroup()}
                  groupCanPaste={!!groupClipboard}
                  groupSelection={groupSelection}
                  onToggleFullscreen={() => void toggleCanvasFullscreen()}
                  fullscreenActive={canvasFullscreen}
                  presentation='workspace'
                  actions={
                    aiOpen && aiProposal ? (
                      <>
                        <span className='text-xs text-muted-foreground'>
                          {c(
                            'Drag any object directly. Changes remain in this proposal until Apply.',
                            'Kéo trực tiếp đồ vật bất kỳ. Chỉ lưu khi nhấn Áp dụng.'
                          )}
                        </span>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={aiWorking || !aiUndo.length}
                          onClick={() => {
                            const previous = aiUndo.at(-1);
                            if (previous) {
                              setAiRedo((items) => [...items, aiProposal]);
                              setAiUndo((items) => items.slice(0, -1));
                              setAiProposal(previous);
                            }
                          }}
                        >
                          {c('Undo', 'Hoàn tác')}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={aiWorking || !aiRedo.length}
                          onClick={() => {
                            const next = aiRedo.at(-1);
                            if (next) {
                              setAiUndo((items) => [...items, aiProposal]);
                              setAiRedo((items) => items.slice(0, -1));
                              setAiProposal(next);
                            }
                          }}
                        >
                          {c('Redo', 'Làm lại')}
                        </Button>
                        {aiShape && aiCanEditSelection && (
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={aiWorking}
                            onClick={() => setAiPrecisionEdit(true)}
                          >
                            {c('Resize / rotate', 'Đổi kích thước / xoay')}
                          </Button>
                        )}
                      </>
                    ) : undefined
                  }
                  onObjectDrag={
                    aiProposal && !availabilityMode && !aiWorking && writable
                      ? dragAiPreview
                      : editable && !busy && (!loadingSelection || overviewDragging)
                        ? (key, fields, phase) => {
                            void dragOverview(key, fields, phase);
                          }
                        : undefined
                  }
                  previewChanges={aiProposal ? aiPreviewChanges(layout, aiProposal) : undefined}
                  collisionKeys={
                    aiGeometry?.collisionKeys ??
                    validation.result?.collisionKeys ??
                    groupGeometry?.collisionKeys
                  }
                  layout={aiLayout ?? layout}
                  width={layout.width ?? 1200}
                  height={layout.height ?? 800}
                  focus={{ ...focus, key: focus.key ?? selection?.key ?? null }}
                  onFocus={(key) => {
                    if (key && aiProposal)
                      setFocus((previous) => ({ key, sequence: previous.sequence + 1 }));
                    else if (key) select(key);
                    else setFocus((previous) => ({ key: null, sequence: previous.sequence + 1 }));
                  }}
                />
              ))
            )}
          </div>
        </section>
        {resourceEditor && (
          <aside
            className={`flex min-h-0 flex-col border-t bg-card xl:border-l xl:border-t-0 ${canvasFullscreen ? 'md:border-l md:border-t-0' : 'lg:col-span-2 xl:col-span-1'}`}
          >
            <ResourceEditor
              workspaceId={workspaceId}
              options={{
                ...options,
                floors: options.floors.filter((floor) => floor.id === floorId)
              }}
              current={resourceEditor.resource}
              studio={{
                onToggleFullscreen: () => void toggleCanvasFullscreen(),
                fullscreenActive: canvasFullscreen,
                canvasTarget: editorCanvas,
                initialTypeId: resourceEditor.typeId,
                existingCodes: layout?.resources.map((item) => item.code)
              }}
              onSaved={async () => {
                await onSaved();
                await query.refetch();
              }}
              onClose={() => setResourceEditor(null)}
            />
          </aside>
        )}
        {!resourceEditor &&
          (aiOpen || selection || settings || availabilityMode || infoOpen || aiProposal) && (
            <aside
              hidden={!aiOpen && !!aiProposal}
              className={
                aiOpen && aiCollapsed
                  ? 'hidden'
                  : aiOpen || !aiProposal
                    ? `flex min-h-0 flex-col border-t border-border bg-card p-4 xl:border-l xl:border-t-0 ${canvasFullscreen ? 'md:border-l md:border-t-0' : 'lg:col-span-2 xl:col-span-1'}`
                    : 'hidden'
              }
            >
              {(aiOpen || aiProposal) && layout ? (
                <FloorAiAssistant
                  key={actorId + ':' + workspaceId + ':' + floorId}
                  previewIssues={aiGeometryIssues}
                  actorId={actorId}
                  workspaceId={workspaceId}
                  resourceTypes={options.types}
                  layout={layout}
                  selectedKey={selection?.key ?? focus.key}
                  writable={writable && layout.editableLayout}
                  blocked={busy || dirtyManual}
                  proposal={aiProposal}
                  onProposal={(value) => {
                    setAiProposal(value);
                    setAiPrecisionEdit(false);
                    setAiUndo([]);
                    setAiRedo([]);
                  }}
                  onBusy={setAiWorking}
                  onFocus={(key) =>
                    setFocus((previous) => ({ key, sequence: previous.sequence + 1 }))
                  }
                  onClose={() => setAiOpen(false)}
                  onMinimize={() => setAiCollapsed(true)}
                  onSaved={async () => {
                    setSelection(null);
                    await onSaved();
                    await query.refetch();
                  }}
                  onApplied={(saved) => {
                    queryClient.setQueryData(
                      floorLayoutOptions(actorId, workspaceId, floorId).queryKey,
                      saved
                    );
                    setSceneDraft(null);
                    setPendingObjects([]);
                    setSelection(null);
                    setGroupSelection([]);
                    setAiProposal(null);
                    setAiOpen(false);
                    setAiUndo([]);
                    setAiRedo([]);
                    setFocus((previous) => ({ key: null, sequence: previous.sequence + 1 }));
                  }}
                  onPlace={(object) => {
                    setAiProposal(null);
                    setAiOpen(false);
                    setPendingObjects((items) => [...items, object]);
                    const fields = canvasPosition(object);
                    setSelection({
                      key: `decoration:${object.id}`,
                      object,
                      initial: fields,
                      fields
                    });
                    setUndo([]);
                    setRedo([]);
                  }}
                />
              ) : (
                <>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-xs font-semibold'>
                      {availabilityMode
                        ? c('Availability & calendar', 'Trạng thái & lịch đặt')
                        : settings
                          ? c('Canvas settings', 'Thiết lập canvas')
                          : selection
                            ? c('Object properties', 'Thuộc tính đối tượng')
                            : c('Floor inspector', 'Thông tin sơ đồ')}
                    </h2>
                    {selection && (
                      <Button
                        size='icon'
                        variant='ghost'
                        className='size-7'
                        aria-label={c('Deselect', 'Bỏ chọn')}
                        disabled={busy}
                        onClick={() => {
                          if (selection) stage(selection.key, selection.fields, selection.object);
                          clearSelection();
                        }}
                      >
                        <X className='size-3.5' />
                      </Button>
                    )}
                  </div>
                  <div className='min-h-0 flex-1 space-y-5 overflow-y-auto pr-1'>
                    {availabilityMode && layout ? (
                      <FloorAvailabilityInspector
                        calendar={calendar}
                        layout={layout}
                        focus={calendarFocus}
                        workspaceStatus={options.workspaceStatus}
                      />
                    ) : selection ? (
                      <>
                        <div className='rounded-xl border border-primary/15 bg-primary/5 p-3'>
                          <p className='text-sm font-semibold'>{name}</p>
                          <p className='mt-1 text-[11px] text-muted-foreground'>
                            {selection.resource?.code ??
                              c('Layout only · not bookable', 'Chỉ bố trí · không đặt chỗ')}
                          </p>
                          {selectedSeat?.category === 'DESK' && (
                            <p className='mt-1 text-xs text-muted-foreground'>
                              {selectedRoom
                                ? c(
                                    `Room · ${selectedRoom.name}`,
                                    `Trong phòng · ${selectedRoom.name}`
                                  )
                                : c('Open area', 'Khu mở')}
                            </p>
                          )}
                        </div>
                        {selection.object && (
                          <>
                            <label className='block space-y-1.5 text-[11px] font-medium'>
                              {c('Name', 'Tên đồ vật')}
                              <Input
                                maxLength={100}
                                value={selection.object.label}
                                disabled={!editable || busy || loadingSelection}
                                onChange={(event) =>
                                  setSelection((previous) =>
                                    previous?.object
                                      ? {
                                          ...previous,
                                          object: { ...previous.object, label: event.target.value }
                                        }
                                      : previous
                                  )
                                }
                                className='h-9 text-xs'
                              />
                            </label>
                            <label className='flex items-center justify-between text-[11px] font-medium'>
                              {c('Display color', 'Màu hiển thị')}
                              <input
                                type='color'
                                aria-label={c('Display color', 'Màu hiển thị')}
                                value={selection.object.color}
                                disabled={!editable || busy || loadingSelection}
                                onChange={(event) =>
                                  setSelection((previous) =>
                                    previous?.object
                                      ? {
                                          ...previous,
                                          object: { ...previous.object, color: event.target.value }
                                        }
                                      : previous
                                  )
                                }
                                className='h-8 w-12 cursor-pointer rounded-lg border border-input bg-background p-1'
                              />
                            </label>
                          </>
                        )}
                        <details className='rounded-xl border border-border p-3'>
                          <summary className='cursor-pointer text-xs font-medium'>
                            {c('Advanced position & dimensions', 'Vị trí & kích thước nâng cao')}
                          </summary>
                          <div className='mt-3 grid grid-cols-2 gap-3'>
                            {(['posX', 'posY', 'width', 'height', 'rotation'] as const).map(
                              (key) => (
                                <label
                                  key={key}
                                  className={`space-y-1.5 text-[11px] text-muted-foreground ${key === 'rotation' ? 'col-span-2' : ''}`}
                                >
                                  <span>
                                    {key === 'posX'
                                      ? layout?.geometryVersion === 2
                                        ? 'X (m)'
                                        : 'X (px)'
                                      : key === 'posY'
                                        ? layout?.geometryVersion === 2
                                          ? 'Y (m)'
                                          : 'Y (px)'
                                        : key === 'width'
                                          ? layout?.geometryVersion === 2
                                            ? c('Width (m)', 'Dài — ngang (m)')
                                            : c('Width (px)', 'Dài — ngang (px)')
                                          : key === 'height'
                                            ? layout?.geometryVersion === 2
                                              ? c('Length (m)', 'Rộng — dọc (m)')
                                              : c('Height (px)', 'Rộng — dọc (px)')
                                            : c('Rotation (°)', 'Góc xoay (°)')}
                                  </span>
                                  <Input
                                    type='number'
                                    step='0.01'
                                    min='0'
                                    max={key === 'rotation' ? 359.99 : undefined}
                                    className='h-9 text-xs tabular-nums'
                                    value={geometryDisplay(
                                      selection.fields[key],
                                      layout?.geometryVersion === 2,
                                      key === 'rotation'
                                    )}
                                    disabled={!editable || busy || loadingSelection}
                                    readOnly={
                                      selectedSizeLocked && (key === 'width' || key === 'height')
                                    }
                                    onChange={(event) =>
                                      change({
                                        ...selection.fields,
                                        [key]: geometryInput(
                                          event.target.value,
                                          layout?.geometryVersion === 2,
                                          key === 'rotation'
                                        )
                                      })
                                    }
                                  />
                                </label>
                              )
                            )}
                          </div>
                          {selectedSizeLocked && (
                            <p className='mt-2 text-xs text-muted-foreground'>
                              {c(
                                'Size follows the resource type. Open resource details to change the type.',
                                'Kích thước theo loại chỗ. Mở thông tin ghế/phòng để chọn loại khác.'
                              )}
                            </p>
                          )}
                        </details>
                        {selection.resource?.category === 'ROOM' && (
                          <p className='rounded-lg bg-muted p-2.5 text-[11px] leading-relaxed text-muted-foreground'>
                            {c(
                              'Moving this room carries its assigned seats and fully contained furniture. Prices and availability do not change.',
                              'Di chuyển phòng kéo theo ghế thuộc phòng và đồ bố trí nằm trọn bên trong. Không đổi giá hay trạng thái nhận đặt.'
                            )}
                          </p>
                        )}
                        {validation.result && !validation.result.valid && (
                          <p
                            role='alert'
                            className='rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive'
                          >
                            {validation.result.roomEdgeCollisions.size
                              ? c('Seats crossing a room edge: ', 'Ghế đang đè qua mép phòng: ') +
                                [...validation.result.roomEdgeCollisions].join(', ')
                              : validation.result.collisions.size
                                ? `${c('Overlapping objects', 'Đối tượng chồng lấn')}: ${[...validation.result.collisions].join(', ')}`
                                : c(
                                    'Objects must fit inside the floor and their room.',
                                    'Đối tượng phải nằm trọn trong tầng/phòng.'
                                  )}
                          </p>
                        )}
                        {!!validation.result?.collisionKeys.size && (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                              const key =
                                [...validation.result!.collisionKeys].find(
                                  (item) => item !== selection.key
                                ) ?? selection.key;
                              setFocus((previous) => ({ key, sequence: previous.sequence + 1 }));
                            }}
                          >
                            {c('Show collision', 'Xem vị trí chồng lấn')}
                          </Button>
                        )}
                        {selection.resource && (
                          <Button
                            variant='outline'
                            className='w-full text-xs'
                            size='sm'
                            disabled={busy || !editable || selection.resource.id < 0}
                            title={
                              selection.resource.id < 0
                                ? c(
                                    'Save the copy before editing its properties.',
                                    'Lưu bản sao trước khi chỉnh thông tin.'
                                  )
                                : undefined
                            }
                            onClick={() =>
                              act(() => {
                                const resource = selection.resource!;
                                clearSelection();
                                setResourceEditor({ resource });
                              })
                            }
                          >
                            <SlidersHorizontal className='size-3.5' />
                            {c('Business properties', 'Thông tin ghế/phòng')}
                          </Button>
                        )}
                        {selection.resource && editable && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='w-full text-destructive'
                            disabled={busy || dirty}
                            onClick={() => {
                              setDeleteError('');
                              setRemove(true);
                            }}
                          >
                            <Trash2 className='size-3.5' />
                            {c('Delete seat or room', 'Xóa ghế/phòng')}
                          </Button>
                        )}
                        {selection.object && (
                          <div className='flex gap-2'>
                            <Button
                              size='icon'
                              variant='outline'
                              className='size-8 text-destructive'
                              aria-label={c('Remove decoration', 'Xóa đồ bố trí')}
                              disabled={busy || !editable}
                              onClick={() => setRemove(true)}
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        )}
                      </>
                    ) : settings ? (
                      <>
                        <p className='text-xs leading-relaxed text-muted-foreground'>
                          {c(
                            'Canvas dimensions are in pixels. Resizing never scales your objects. All objects must stay inside.',
                            'Kích thước theo pixel. Đổi kích thước không tự co giãn đồ vật. Mọi đối tượng phải nằm trong canvas.'
                          )}
                        </p>
                        {(['width', 'height'] as const).map((key) => (
                          <label key={key} className='block space-y-2 text-xs'>
                            {key === 'width'
                              ? c('Width (px)', 'Dài — ngang (px)')
                              : c('Height (px)', 'Rộng — dọc (px)')}
                            <Input
                              inputMode='decimal'
                              value={key === 'width' ? width : height}
                              disabled={busy || !editable || !!layout?.floor.location}
                              onChange={(event) =>
                                setDimensions({ width, height, [key]: event.target.value })
                              }
                            />
                          </label>
                        ))}
                        <Button
                          className='w-full text-xs'
                          size='sm'
                          disabled={busy || !editable || !dirtyDimensions}
                          onClick={() => void saveCanvas()}
                        >
                          {busy ? (
                            <LoaderCircle className='size-4 animate-spin' />
                          ) : (
                            <Save className='size-4' />
                          )}
                          {c('Save canvas draft', 'Lưu canvas nháp')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className='space-y-2 rounded-xl border bg-muted/20 p-3 text-xs'>
                          <p className='font-semibold'>
                            {layout?.floor.location?.buildingName ??
                              c('Building not linked', 'Chưa liên kết tòa nhà')}
                          </p>
                          <p>
                            {c('Floor', 'Tầng')} {layout?.floor.floorNumber}
                          </p>
                          {metrics.isPending ? (
                            <p role='status'>{c('Loading dimensions…', 'Đang tải kích thước…')}</p>
                          ) : metrics.isError ? (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => void metrics.refetch()}
                            >
                              {c('Reload dimensions', 'Tải lại kích thước')}
                            </Button>
                          ) : (
                            metrics.data && (
                              <>
                                <p>
                                  {c('Whole floor', 'Toàn tầng')}:{' '}
                                  {metrics.data.physicalWidthM ?? '—'} ×{' '}
                                  {metrics.data.physicalLengthM ?? '—'} m
                                </p>
                                <p>
                                  {c('Workspace region', 'Vùng workspace')}:{' '}
                                  {metrics.data.widthM ?? '—'} × {metrics.data.lengthM ?? '—'} m
                                </p>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='w-full text-xs'
                                  disabled={!editable || busy}
                                  onClick={() => act(() => setEditingFloorDimensions(true))}
                                >
                                  {c('Edit floor dimensions', 'Sửa kích thước tầng')}
                                </Button>
                              </>
                            )
                          )}
                        </div>
                        <div className='rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 text-center'>
                          <MousePointer2 className='mx-auto mb-3 size-7 text-primary/60' />
                          <h3 className='text-xs font-semibold'>
                            {c('Select an object', 'Chọn một đối tượng')}
                          </h3>
                          <p className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>
                            {c(
                              'Click the map or choose a layer to move, resize and rotate it directly.',
                              'Bấm trên sơ đồ hoặc chọn trong danh sách để kéo thả, đổi kích thước và xoay trực tiếp.'
                            )}
                          </p>
                        </div>
                        <div className='grid grid-cols-2 gap-2'>
                          {[
                            [
                              c('Rooms', 'Phòng'),
                              resources.filter((item) => item.category === 'ROOM').length
                            ],
                            [
                              c('Seats', 'Ghế'),
                              resources.filter((item) => item.category !== 'ROOM').length
                            ],
                            [c('Furniture', 'Đồ bố trí'), objects.length],
                            ['Canvas', `${layout?.width ?? 1200} × ${layout?.height ?? 800}`]
                          ].map(([label, value]) => (
                            <div
                              key={String(label)}
                              className='rounded-xl border border-border bg-muted/10 p-3'
                            >
                              <p className='text-[10px] text-muted-foreground'>{label}</p>
                              <p className='mt-1 text-sm font-semibold tabular-nums'>{value}</p>
                            </div>
                          ))}
                        </div>
                        <details className='space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground'>
                          <summary className='cursor-pointer font-medium text-foreground'>
                            {c('Keyboard & navigation', 'Phím tắt & điều hướng')}
                          </summary>
                          <p>
                            Ctrl / ⌘ + {c('scroll', 'cuộn chuột')} · {c('Zoom', 'Thu/phóng')}
                          </p>
                          <p>↑ ↓ ← → · 1 px / Shift · 10 px</p>
                          <p>Ctrl / ⌘ + Z · {c('Undo', 'Hoàn tác')}</p>
                          <p>
                            {c(
                              'Drag handles · Resize & rotate',
                              'Kéo tay nắm · Đổi kích thước & xoay'
                            )}
                          </p>
                        </details>
                        {!!missing && (
                          <p
                            role='alert'
                            className='rounded-lg bg-destructive/5 p-2.5 text-xs text-destructive'
                          >
                            {missing}{' '}
                            {c(
                              'resources need geometry before publishing.',
                              'chỗ cần tọa độ/kích thước trước khi xuất bản.'
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {selection && (
                    <div className='mt-4 space-y-2 border-t border-border pt-4'>
                      <Button
                        className='w-full rounded-xl'
                        size='sm'
                        disabled={
                          busy ||
                          !editable ||
                          (!dirtySelection && !pendingObjects.length && !dirtyScene) ||
                          validation.blocked ||
                          loadingSelection ||
                          overviewDragging
                        }
                        onClick={() => void save()}
                      >
                        {busy ? (
                          <LoaderCircle className='size-4 animate-spin' />
                        ) : (
                          <Save className='size-4' />
                        )}
                        {c('Save all changes', 'Lưu tất cả thay đổi')}
                      </Button>
                      <Button
                        variant='ghost'
                        className='w-full text-xs'
                        size='sm'
                        disabled={busy}
                        onClick={clearSelection}
                      >
                        <ChevronLeft className='size-3.5' />
                        {c('Back to overview', 'Về toàn cảnh')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </aside>
          )}
      </div>
      <footer className='relative flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2 text-[10px] text-muted-foreground'>
        {!!groupGeometry?.roomEdgeCollisions.size && (
          <p role='status' className='basis-full text-xs text-destructive'>
            {c('Seats crossing a room edge: ', 'Ghế đang đè qua mép phòng: ')}
            {[...groupGeometry.roomEdgeCollisions].slice(0, 5).join(', ')}
          </p>
        )}
        {layout?.floor.status === 'PUBLISHED' &&
          !layout.draftChanges &&
          resources.length > 0 &&
          !dirty && (
            <Button size='sm' variant='ghost' asChild>
              <Link to='/dashboard/organizer/resources' search={{ workspaceId, floorId }}>
                {c('Check booking readiness', 'Kiểm tra điều kiện nhận đặt')}
              </Link>
            </Button>
          )}
        {dirtyManual && !selection && (
          <Button
            size='sm'
            disabled={
              busy ||
              loadingSelection ||
              overviewDragging ||
              !editable ||
              !!groupGeometry?.roomEdgeCollisions.size
            }
            onClick={() => void save()}
          >
            <Save className='size-4' />
            {c('Save all changes', 'Lưu tất cả thay đổi')}
          </Button>
        )}
        <span className='flex items-center gap-1.5'>
          <CheckCircle2 className='size-3.5 text-primary' />
          {c('Synced with Seats & Rooms.', 'Đồng bộ với Quản lý ghế & phòng.')}
        </span>
        <span>
          {c(
            'Furniture changes reach customers after publishing.',
            'Đồ bố trí cập nhật cho khách sau khi xuất bản.'
          )}
        </span>
      </footer>
      <Dialog open={allObjectsOpen} onOpenChange={setAllObjectsOpen}>
        <DialogContent className='flex max-h-[85dvh] flex-col rounded-2xl sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              {c('All floor objects', 'Tất cả đối tượng trên tầng')} · {entries.length}
            </DialogTitle>
            <DialogDescription>
              {c(
                'Choose an object to locate it on the canvas and view its properties.',
                'Chọn đối tượng để tìm trên sơ đồ và xem thuộc tính.'
              )}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={c('Search objects…', 'Tìm đối tượng…')}
            className='shrink-0 rounded-xl'
          />
          <div className='grid min-h-0 grid-cols-1 gap-2 overflow-y-auto p-1 sm:grid-cols-2'>
            {visible.map((entry) => (
              <button
                key={entry.key}
                type='button'
                disabled={busy || loadingSelection}
                onClick={() => {
                  setAllObjectsOpen(false);
                  void select(entry.key);
                }}
                className='flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-primary/5'
              >
                <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                  {entry.object ? (
                    <DecorationIcon
                      kind={entry.object.kind}
                      icon={furnishingIcon(
                        entry.object.kind,
                        entry.object.label,
                        entry.object.icon
                      )}
                      className='size-5'
                    />
                  ) : entry.category === 'ROOM' ? (
                    <DoorOpen className='size-5' />
                  ) : (
                    <Armchair className='size-5' />
                  )}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-semibold'>{entry.label}</span>
                  <span className='block truncate text-xs text-muted-foreground'>{entry.sub}</span>
                  {availabilityMode && !entry.object && availabilityStatus(entry.key)}
                </span>
                <MousePointer2 className='size-4 shrink-0 text-muted-foreground' />
              </button>
            ))}
            {!visible.length && (
              <p className='col-span-full py-10 text-center text-sm text-muted-foreground'>
                {c('No matching objects.', 'Không tìm thấy đối tượng.')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pending || navigation.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPending(null);
            navigation.reset?.();
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{c('Discard unsaved changes?', 'Bỏ thay đổi chưa lưu?')}</DialogTitle>
            <DialogDescription>
              {c(
                'Your changes have not been saved. Stay to save them, or discard and continue.',
                'Thay đổi chưa được lưu. Ở lại để lưu hoặc bỏ thay đổi và tiếp tục.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => {
                setPending(null);
                navigation.reset?.();
              }}
            >
              {c('Stay', 'Ở lại')}
            </Button>
            <Button
              variant='destructive'
              disabled={busy}
              onClick={() => {
                const action = pending;
                setPending(null);
                clearSelection();
                setPendingObjects([]);
                setSceneDraft(null);
                setAiProposal(null);
                setDimensions(null);
                if (navigation.status === 'blocked') navigation.proceed();
                else action?.();
              }}
            >
              {c('Discard & continue', 'Bỏ thay đổi & tiếp tục')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={remove}
        onOpenChange={(open) => {
          if (!busy) setRemove(open);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {selection?.resource
                ? c('Delete seat or room?', 'Xóa ghế/phòng?')
                : c('Remove layout object?', 'Xóa đồ bố trí?')}
            </DialogTitle>
            <DialogDescription>
              {selection?.resource
                ? selection.resource.name
                : c(
                    'This removes furniture from the draft only. Seats and bookings are preserved. Publish to update the customer map.',
                    'Xóa đồ vật khỏi bản nháp, không xóa ghế hay booking. Xuất bản để cập nhật bản đồ khách hàng.'
                  )}
            </DialogDescription>
          </DialogHeader>
          {selection?.resource && deleteError && (
            <p role='alert' className='text-sm text-destructive'>
              {deleteError}
            </p>
          )}
          {(roomSeats.length > 0 || roomObjectIds.size > 0) && (
            <p className='text-sm text-muted-foreground'>
              {c(
                `This will delete the room, its ${roomSeats.length} seats and ${roomObjectIds.size} furnishings inside it.`,
                `Thao tác này sẽ xóa phòng cùng ${roomSeats.length} ghế và ${roomObjectIds.size} đồ bố trí bên trong.`
              )}
            </p>
          )}
          <div className='flex justify-end gap-2'>
            <Button variant='outline' disabled={busy} onClick={() => setRemove(false)}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button
              variant='destructive'
              disabled={busy}
              onClick={() => void (selection?.resource ? removeResource() : removeObject())}
            >
              {busy && <LoaderCircle className='size-4 animate-spin' />}
              {c('Delete', 'Xóa')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {editingFloorDimensions && metrics.data && (
        <FloorDimensionsDialog
          actorId={actorId}
          workspaceId={workspaceId}
          floorId={floorId}
          metrics={metrics.data}
          onClose={() => setEditingFloorDimensions(false)}
          onConverted={async () => {
            await onSaved();
            await query.refetch();
            await metrics.refetch();
            setEditingFloorDimensions(false);
          }}
        />
      )}
      <Dialog
        open={publishing}
        onOpenChange={(open) => {
          if (!busy) setPublishing(open);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{c('Publish this floor?', 'Xuất bản sơ đồ tầng?')}</DialogTitle>
            <DialogDescription>
              {c(
                'The saved furniture layout becomes visible to customers. This does not activate resources or change bookings or pricing.',
                'Bố trí đã lưu sẽ hiển thị cho khách hàng. Không tự bật nhận đặt, không thay đổi booking hoặc giá.'
              )}
            </DialogDescription>
          </DialogHeader>
          <label className='flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 text-xs'>
            <input
              type='checkbox'
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
              className='mt-0.5 accent-primary'
            />
            {c(
              'I reviewed all current positions and confirm that the floor is ready.',
              'Tôi đã kiểm tra vị trí các đối tượng và xác nhận sơ đồ đã sẵn sàng.'
            )}
          </label>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' disabled={busy} onClick={() => setPublishing(false)}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button disabled={!confirmed || busy || dirty} onClick={() => void publish()}>
              {busy ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <Upload className='size-4' />
              )}
              {c('Publish floor', 'Xuất bản tầng')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
