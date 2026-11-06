import type { ResourceDetail, ResourceForm } from '../api/resources';
import type { PlacementFields } from './placement';

/** Geometry edits retain pricing, resource identity and the existing room relationship. */
export function canvasResourceForm(
  resource: ResourceDetail,
  position: PlacementFields
): ResourceForm {
  return {
    floorPlanId: resource.floorPlanId,
    resourceTypeId: resource.resourceTypeId,
    parentRoomId: resource.parentRoomId ? String(resource.parentRoomId) : '',
    code: resource.code,
    name: resource.name,
    zoneName: resource.zoneName ?? '',
    noiseLevel: resource.noiseLevel ?? '',
    capacityOverride: resource.capacityOverride?.toString() ?? '',
    pricePerHour: resource.pricePerHour ?? '',
    description: resource.description ?? '',
    ...position
  };
}

export function canvasPosition(object: {
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number;
}): PlacementFields {
  return {
    posX: object.posX?.toString() ?? '100',
    posY: object.posY?.toString() ?? '100',
    width: object.width?.toString() ?? '40',
    height: object.height?.toString() ?? '40',
    rotation: String(object.rotation)
  };
}
