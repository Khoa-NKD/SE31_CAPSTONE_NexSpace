import type { AiProposal } from '../api/floor-design';
import type { FloorLayout, ResourceOptions } from '../api/resources';
import { moveWithRoom, type Placement } from './placement.ts';
import { insideRoom, layoutGeometry } from './layout-placement.ts';

const poseFields = (p: Placement) => ({
  posX: p.x,
  posY: p.y,
  width: p.width,
  height: p.height,
  rotation: p.rotation
});

export function aiPreviewChanges(
  layout: FloorLayout,
  proposal: AiProposal
): Record<string, 'ADD' | 'UPDATE'> {
  const result: Record<string, 'ADD' | 'UPDATE'> = {};
  proposal.design.resources.forEach((item, index) => {
    result[`resource:${item.id ?? -(index + 1)}`] = item.id ? 'UPDATE' : 'ADD';
  });
  proposal.design.decorations.forEach((item) => {
    const previous = layout.decorations?.find((d) => d.id === item.id);
    if (!previous) result[`decoration:${item.id}`] = 'ADD';
    else if (JSON.stringify(previous) !== JSON.stringify(item))
      result[`decoration:${item.id}`] = 'UPDATE';
  });
  return result;
}

/** Preview-only negative IDs never leave the browser or enter a persistence request. */
export function aiDesignPreview(
  layout: FloorLayout,
  proposal: AiProposal,
  options: ResourceOptions
): FloorLayout {
  const changes = proposal.design.resources;
  const ids = new Map(changes.map((item, index) => [item.key, item.id ?? -(index + 1)]));
  const resources = layout.resources.filter(
    (item) =>
      !proposal.design.removeResourceIds.includes(item.id) &&
      !changes.some((change) => change.id === item.id)
  );
  return {
    ...layout,
    resources: [
      ...resources,
      ...changes.map((change) => {
        const old = layout.resources.find((item) => item.id === change.id);
        return {
          ...old,
          id: ids.get(change.key)!,
          name: change.name,
          resourceTypeId: change.resourceTypeId,
          capacity:
            change.capacity ??
            old?.capacity ??
            proposal.design.newTypes?.find((type) => type.tempId === change.resourceTypeId)
              ?.capacity,
          code: old?.code ?? 'AI',
          category:
            options.types.find((type) => type.id === change.resourceTypeId)?.category ??
            proposal.design.newTypes?.find((type) => type.tempId === change.resourceTypeId)
              ?.category,
          parentRoomId: change.parentKey
            ? (ids.get(change.parentKey) ?? Number(change.parentKey.slice(2)))
            : null,
          posX: change.posX,
          posY: change.posY,
          width: change.width,
          height: change.height,
          rotation: change.rotation,
          status: old?.status ?? 'DRAFT',
          revision: old?.revision ?? ''
        };
      })
    ],
    decorations: proposal.design.decorations
  };
}

/** Manual adjustments remain uncommitted and undergo the same server-side scope validation. */
export function adjustAiProposal(
  base: FloorLayout,
  proposal: AiProposal,
  options: ResourceOptions,
  key: string,
  pose: Placement
): AiProposal {
  const preview = aiDesignPreview(base, proposal, options);
  const changes = [...proposal.design.resources];
  let decorations = [...proposal.design.decorations];
  const resourceKey = (id: number) =>
    changes.find((item, index) => (item.id ?? -(index + 1)) === id)?.key ?? `r_${id}`;
  const update = (item: FloorLayout['resources'][number], position: Placement) => {
    const original = changes.find((change, index) => (change.id ?? -(index + 1)) === item.id);
    if (!item.resourceTypeId)
      throw new Error('Resource type is missing. Refresh the floor before editing.');
    const next = {
      ...(original ?? {
        key: `r_${item.id}`,
        id: item.id,
        resourceTypeId: item.resourceTypeId,
        name: item.name,
        capacity: item.capacity ?? null,
        parentKey: item.parentRoomId ? resourceKey(item.parentRoomId) : null
      }),
      ...poseFields(position)
    };
    const index = changes.findIndex((change) => change.key === next.key);
    if (index < 0) changes.push(next);
    else changes[index] = next;
  };
  if (key.startsWith('decoration:')) {
    const id = key.slice(11);
    decorations = decorations.map((item) =>
      item.id === id ? { ...item, ...poseFields(pose) } : item
    );
  } else {
    const item = preview.resources.find((item) => `resource:${item.id}` === key);
    const before = item && layoutGeometry(item);
    if (!item || !before) throw new Error('Select an existing preview object.');
    update(item, pose);
    if (item.category === 'ROOM') {
      preview.resources
        .filter((child) => child.parentRoomId === item.id)
        .forEach((child) => {
          const position = layoutGeometry(child);
          if (position) update(child, moveWithRoom(position, before, pose));
        });
      decorations = decorations.map((object) => {
        const position = layoutGeometry(object)!;
        return insideRoom(position, before)
          ? { ...object, ...poseFields(moveWithRoom(position, before, pose)) }
          : object;
      });
    }
  }
  const issues = proposal.issues.filter(
    (issue) =>
      !issue.endsWith(' is outside the floor canvas, including its rotation') &&
      !issue.endsWith(' must fit entirely inside its containing room, including rotation')
  );
  return {
    ...proposal,
    applicable: !proposal.design.question && issues.length === 0,
    issues,
    design: { ...proposal.design, resources: changes, decorations }
  };
}
