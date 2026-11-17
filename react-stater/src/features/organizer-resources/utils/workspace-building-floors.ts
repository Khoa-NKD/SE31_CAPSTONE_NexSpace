import type { Building } from '../api/buildings';
import type { FloorOption } from '../api/resources';

export interface WorkspaceBuildingFloor extends FloorOption {
  outline?: 'RECTANGULAR' | 'ROUNDED';
  physicalWidth?: number;
  physicalHeight?: number;
  cornerRadiusPx?: number;
  workspaceId?: number;
  displayName?: string;
  linked: boolean;
}

/** Keep the physical building intact while exposing only the selected workspace's layouts. */
export function workspaceBuildingFloors(
  building: Building | undefined,
  floors: FloorOption[],
  workspaceId: number
): WorkspaceBuildingFloor[] {
  if (!building) return floors.map((floor) => ({ ...floor, workspaceId, linked: true }));

  return building.floors.map((physical) => {
    const own = floors.find((floor) => floor.location?.buildingFloorId === physical.id);
    const occupants = physical.occupants.filter((occupant) => occupant.workspaceId === workspaceId);
    const occupant = occupants[0];
    const linked = !!own || !!occupant;
    const names = [
      ...new Set(
        (occupants.length ? occupants.map((item) => item.layoutName) : own ? [own.name] : [])
          .map((name) =>
            name.trim().replace(new RegExp(` – (?:Tầng|Floor) ${physical.floorNumber}$`), '')
          )
          .filter(Boolean)
      )
    ];

    return {
      ...(own ?? {
        // Negative physical IDs are display-only and cannot open a foreign workspace's layout.
        id: occupant?.floorPlanId ?? -physical.id,
        floorNumber: physical.floorNumber,
        status: occupant?.status ?? 'DRAFT',
        revision: ''
      }),
      name: physical.name,
      ...(physical.outline ? { outline: physical.outline, physicalWidth: physical.width, physicalHeight: physical.height, cornerRadiusPx: (physical.cornerRadiusM ?? 0) * 60 } : {}),
      displayName: names.length ? `${physical.name} (${names.join(', ')})` : physical.name,
      workspaceId: linked ? workspaceId : undefined,
      linked
    };
  });
}
