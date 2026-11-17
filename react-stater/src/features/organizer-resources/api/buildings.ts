import { queryOptions } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session.ts';
import type { FloorOption } from './resources';

export interface AllocationInput {
  buildingFloorId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  expectedRevision?: string;
}
export interface FloorOccupant {
  workspaceId: number;
  workspaceName: string | null;
  floorPlanId: number;
  layoutName: string;
  status: 'DRAFT' | 'PUBLISHED';
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PhysicalFloor {
  areaM2?: number;
  outline?: FloorOutline;
  cornerRadiusM?: number;
  realWidthM?: number | null;
  realLengthM?: number | null;
  geometryVersion?: number;
  id: number;
  name: string;
  floorNumber: number;
  width: number;
  height: number;
  revision: string;
  occupants: FloorOccupant[];
}
export interface Building {
  workspaceId?: number | null;
  id: number;
  name: string;
  address: string;
  city?: string | null;
  ward?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  revision: string;
  floors: PhysicalFloor[];
}
export interface FloorLocation {
  outline?: FloorOutline;
  cornerRadiusM?: number;
  buildingId: number;
  buildingName: string;
  buildingAddress: string;
  buildingFloorId: number;
  physicalFloorName: string;
  floorNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
export type FloorOutline = 'RECTANGULAR' | 'ROUNDED';
export interface WorkspaceSiteInput {
  address: string;
  city: string;
  ward: string;
  latitude: number;
  longitude: number;
  expectedRevision?: string;
  floors: { floorNumber: number; widthM: number; lengthM: number; outline: FloorOutline; cornerRadiusM?: number }[];
}
export const workspaceSiteOptions = (actorId: number, workspaceId: number) =>
  queryOptions({
    queryKey: ['organizer-resources', actorId, 'workspace-site', workspaceId],
    queryFn: async ({ signal }) => {
      const result = await backendRequest<Building | null>(`/organizer/workspaces/${workspaceId}/site`, 'GET', undefined, true, signal);
      return result?.id ? result : null;
    },
    retry: false
  });
export const saveWorkspaceSite = (workspaceId: number, input: WorkspaceSiteInput) =>
  backendRequest<Building>(`/organizer/workspaces/${workspaceId}/site`, 'PUT', input);
export const buildingsOptions = (actorId: number) =>
  queryOptions({
    queryKey: ['organizer-resources', actorId, 'buildings'],
    queryFn: ({ signal }) =>
      backendRequest<Building[]>('/organizer/buildings', 'GET', undefined, true, signal),
    retry: false,
    refetchOnWindowFocus: false
  });
export const saveBuilding = (
  body: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    floorCount?: number;
    city?: string;
    ward?: string;
  },
  current?: Building
) =>
  backendRequest<number | void>(
    `/organizer/buildings${current ? `/${current.id}` : ''}`,
    current ? 'PUT' : 'POST',
    {
      name: body.name,
      address: body.address,
      latitude: body.latitude === undefined ? undefined : Number(body.latitude.toFixed(8)),
      longitude: body.longitude === undefined ? undefined : Number(body.longitude.toFixed(8)),
      city: body.city,
      ward: body.ward,
      floorCount: body.floorCount,
      ...(current ? { expectedRevision: current.revision } : {})
    }
  );
export const savePhysicalFloor = (
  buildingId: number,
  body: { name: string; floorNumber: number; width: number; height: number; widthM?: number; lengthM?: number },
  current?: PhysicalFloor
) =>
  backendRequest<number | void>(
    current
      ? `/organizer/building-floors/${current.id}`
      : `/organizer/buildings/${buildingId}/floors`,
    current ? 'PUT' : 'POST',
    { ...body, ...(current ? { expectedRevision: current.revision } : {}) }
  );
export const removeLocation = (kind: 'building' | 'floor', value: Building | PhysicalFloor) =>
  backendRequest<void>(
    `/organizer/${kind === 'building' ? 'buildings' : 'building-floors'}/${value.id}?${new URLSearchParams({ expectedRevision: value.revision })}`,
    'DELETE'
  );
export const attachWorkspaceFloor = (
  workspaceId: number,
  value: AllocationInput,
  current?: FloorOption
) =>
  backendRequest<FloorOption>(
    current
      ? `/organizer/workspaces/${workspaceId}/resource-floors/${current.id}/${current.location ? 'allocation' : 'location'}`
      : `/organizer/workspaces/${workspaceId}/floor-allocations`,
    current ? 'PUT' : 'POST',
    { ...value, ...(current ? { expectedRevision: current.revision } : {}) }
  );

export const attachWorkspaceFloors = (workspaceId: number, allocations: AllocationInput[]) =>
  backendRequest<FloorOption[]>(
    `/organizer/workspaces/${workspaceId}/floor-allocations/batch`,
    'POST',
    { allocations }
  );

export { allocationError } from '../utils/building-allocation.ts';
