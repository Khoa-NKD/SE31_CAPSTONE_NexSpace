import { apiClient } from '@/lib/api-client';

export interface MaintenanceTarget {
  key: string;
  name: string;
  kind: 'ROOM' | 'DESK' | 'ASSET' | 'DECORATION';
  floorNumber: number | null;
  resourceId: number | null;
  parentRoomId: number | null;
}
export interface MaintenanceSchedule {
  key: string;
  targetKey: string;
  name: string;
  kind: MaintenanceTarget['kind'];
  floorNumber: number | null;
  startTime: string;
  endTime: string | null;
  reason: string;
}
export interface MaintenanceInput {
  targetKeys: string[];
  startTime: string;
  endTime: string;
  reason: string;
}
const path = (id: number) => '/organizer/workspaces/' + id + '/maintenance';
export const maintenanceApi = {
  targets: (id: number, signal?: AbortSignal) =>
    apiClient.get<MaintenanceTarget[]>(path(id) + '/targets', { signal }),
  list: (id: number, from: string, to: string, signal?: AbortSignal) =>
    apiClient.get<MaintenanceSchedule[]>(path(id), { params: { from, to }, signal }),
  create: (id: number, input: MaintenanceInput) =>
    apiClient.post<MaintenanceSchedule[]>(path(id), input),
  remove: (id: number, key: string) => apiClient.delete(path(id) + '/' + encodeURIComponent(key))
};
