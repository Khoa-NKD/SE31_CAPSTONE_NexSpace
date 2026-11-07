import type { FloorLayout, ResourceDetail, ResourceForm, ResourceOptions } from '../api/resources';
import { layoutGeometry, insideRoom } from './layout-placement.ts';
import { moveWithRoom } from './placement.ts';

export type DraftForm = Omit<ResourceForm, 'floorPlanId' | 'resourceTypeId'> & {
  floorPlanId: string;
  resourceTypeId: string;
};
export interface ResourceDraft {
  key: number;
  form: DraftForm;
  current?: ResourceDetail;
}

/** Clipboard sources are not writes. Only new or explicitly edited resources belong in the batch. */
export function changedResourceDrafts(drafts: ResourceDraft[], options: ResourceOptions) {
  return drafts.filter(
    (draft) =>
      !draft.current ||
      JSON.stringify(draft.form) !== JSON.stringify(resourceDraftForm(options, draft.current))
  );
}

export function resourceDraftForm(options: ResourceOptions, current?: ResourceDetail): DraftForm {
  return {
    floorPlanId: String(current?.floorPlanId ?? options.floors[0]?.id ?? ''),
    parentRoomId: options.rooms ? String(current?.parentRoomId ?? '') : undefined,
    resourceTypeId: String(
      current?.resourceTypeId ?? options.types.find((t) => t.active && t.currency)?.id ?? ''
    ),
    code: current?.code ?? '',
    name: current?.name ?? '',
    zoneName: current?.zoneName ?? '',
    description: current?.description ?? '',
    noiseLevel: current?.noiseLevel ?? '',
    capacityOverride: current?.capacityOverride?.toString() ?? '',
    pricePerHour: current?.pricePerHour ?? '',
    posX: current?.posX?.toString() ?? '',
    posY: current?.posY?.toString() ?? '',
    width: current?.width?.toString() ?? '',
    height: current?.height?.toString() ?? '',
    rotation: current?.rotation?.toString() ?? '0'
  };
}

export function draftGeometry(form: DraftForm) {
  if (![form.posX, form.posY, form.width, form.height].every((value) => value.trim() !== ''))
    return;
  return {
    x: Number(form.posX),
    y: Number(form.posY),
    width: Number(form.width),
    height: Number(form.height),
    rotation: Number(form.rotation || 0)
  };
}

export function uniqueResourceCode(base: string, codes: string[]) {
  const taken = new Set(codes.map((code) => code.toUpperCase()));
  const stem = base.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40) || 'RESOURCE';
  let number = 1;
  while (taken.has(`${stem}-${number}`.toUpperCase())) number++;
  return `${stem}-${number}`.toUpperCase();
}

/** Persisted objects keep their IDs; negative draft keys only exist in the local canvas. */
export function resourceDraftLayout(
  base: FloorLayout,
  drafts: ResourceDraft[],
  options: ResourceOptions
): FloorLayout {
  let resources = base.resources.map((item) => ({ ...item }));
  let decorations = [...(base.decorations ?? [])];
  for (const draft of drafts) {
    if (options.types.find((t) => t.id === Number(draft.form.resourceTypeId))?.category !== 'ROOM')
      continue;
    const original = base.resources.find((item) => item.id === draft.key);
    const before = original && layoutGeometry(original);
    const after = draftGeometry(draft.form);
    if (!before || !after) continue;
    resources = resources.map((item) => {
      const shape = layoutGeometry(item);
      if (item.parentRoomId !== draft.key || !shape || drafts.some((d) => d.key === item.id))
        return item;
      const moved = moveWithRoom(shape, before, after);
      return { ...item, posX: moved.x, posY: moved.y, rotation: moved.rotation };
    });
    decorations = decorations.map((item) => {
      const shape = layoutGeometry(item)!;
      if (!insideRoom(shape, before)) return item;
      const moved = moveWithRoom(shape, before, after);
      return { ...item, posX: moved.x, posY: moved.y, rotation: moved.rotation };
    });
  }
  resources = resources.filter((item) => !drafts.some((draft) => draft.key === item.id));
  resources.push(
    ...drafts.map(({ key, form, current }) => ({
      id: key,
      name: form.name,
      code: form.code,
      category: options.types.find((t) => t.id === Number(form.resourceTypeId))?.category,
      parentRoomId: Number(form.parentRoomId) || null,
      posX: form.posX === '' ? null : Number(form.posX),
      posY: form.posY === '' ? null : Number(form.posY),
      width: form.width === '' ? null : Number(form.width),
      height: form.height === '' ? null : Number(form.height),
      rotation: Number(form.rotation || 0),
      status: current?.status ?? 'DRAFT',
      revision: current?.revision ?? 'draft'
    }))
  );
  return { ...base, resources, decorations };
}
