import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { backendRequest } from '../../auth/api/session.ts';

export type Currency = 'VND' | 'USD';
export type ResourceStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type Category = 'DESK' | 'ROOM';

export function canConfigureWorkspaceResources(status: string | undefined): boolean {
  return status === 'DRAFT' || status === 'ACTIVE' || status === 'INACTIVE';
}
export interface WorkspaceOption {
  id: number;
  name: string | null;
  status: string;
}
export interface FloorOption {
  id: number;
  name: string;
  floorNumber: number;
  status: 'DRAFT' | 'PUBLISHED';
  revision: string;
}

export type AvailabilityState = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'DISABLED' | 'MAINTENANCE';
export interface FloorAvailability {
  from: string;
  to: string;
  asOf: string;
  resources: Array<{ id: number; state: AvailabilityState; reason: string }>;
}
const floorPath = (workspaceId: number, floorId: number) =>
  `/organizer/workspaces/${workspaceId}/resource-floors/${floorId}`;
export const renameResourceFloor = (workspaceId: number, floor: FloorOption, name: string) =>
  backendRequest<FloorOption>(floorPath(workspaceId, floor.id), 'PATCH', {
    name,
    expectedRevision: floor.revision
  });
export const deleteResourceFloor = (workspaceId: number, floor: FloorOption) =>
  backendRequest<void>(
    `${floorPath(workspaceId, floor.id)}?${new URLSearchParams({ expectedRevision: floor.revision })}`,
    'DELETE'
  );
export const copyResourceFloor = (
  workspaceId: number,
  floor: FloorOption,
  name: string,
  floorNumber: number
) =>
  backendRequest<FloorOption>(`${floorPath(workspaceId, floor.id)}/copy`, 'POST', {
    name,
    floorNumber,
    expectedRevision: floor.revision
  });
export function floorAvailabilityOptions(
  actorId: number,
  workspaceId: number,
  floorId: number,
  from: string,
  to: string
) {
  return queryOptions({
    queryKey: [
      'organizer-resources',
      actorId,
      workspaceId,
      'floor-availability',
      floorId,
      from,
      to
    ],
    queryFn: ({ signal }) =>
      backendRequest<FloorAvailability>(
        `${floorPath(workspaceId, floorId)}/availability?${new URLSearchParams({ from, to })}`,
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
}
export interface TypeOption {
  id: number;
  name: string;
  category: Category;
  currency: Currency | null;
  capacity: number;
  pricePerHour: string | null;
  pricePerDay: string | null;
  pricePerMonth: string | null;
  active: boolean;
  revision: string;
}
export interface ResourceOptions {
  workspaceId: number;
  workspaceStatus: string;
  floors: FloorOption[];
  types: TypeOption[];
  rooms?: RoomOption[];
}
export interface RoomOption {
  id: number;
  floorPlanId: number;
  code: string;
  name: string;
  capacity: number;
  status: ResourceStatus;
}
export interface ResourceDetail {
  parentRoomId?: number | null;
  parentRoomName?: string | null;
  id: number;
  workspaceId: number;
  floorPlanId: number;
  floorName: string;
  resourceTypeId: number;
  resourceTypeName: string;
  category: Category;
  code: string;
  name: string;
  zoneName: string | null;
  noiseLevel: 'QUIET' | 'MODERATE' | 'LIVELY' | null;
  capacityOverride: number | null;
  capacity: number;
  pricePerHour: string | null;
  effectivePricePerHour: string | null;
  pricePerDay: string | null;
  pricePerMonth: string | null;
  description: string | null;
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number;
  status: ResourceStatus;
  currency: Currency | null;
  revision: string;
}
export interface ResourcePage {
  listObjects: ResourceDetail[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
export interface ResourceFilters {
  page: number;
  size: number;
  search: string;
  category: Category | '';
  status: ResourceStatus | '';
  floorPlanId: number | '';
}
const price = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/, 'Enter a price with at most 2 decimal places')
  .refine((value) => /[1-9]/.test(value), 'Price must be positive');
export const optionalPrice = z.union([z.literal(''), price]);
const optionalNumber = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{1,8}(?:\.\d{1,2})?$/.test(value),
    'Enter a nonnegative number with at most 2 decimals'
  );
export const resourceFormSchema = z
  .object({
    floorPlanId: z.coerce.number().int().positive(),
    resourceTypeId: z.coerce.number().int().positive(),
    parentRoomId: z
      .string()
      .regex(/^(?:|[1-9]\d*)$/, 'Choose a valid room')
      .optional(),
    code: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/,
        'Use letters, digits, dots, underscores or hyphens (max 50)'
      ),
    name: z.string().trim().min(1, 'Name is required').max(150),
    zoneName: z.string().trim().max(100),
    description: z.string().trim().max(1000),
    capacityOverride: z
      .string()
      .trim()
      .refine(
        (value) => !value || /^[1-9]\d{0,3}$/.test(value) || value === '10000',
        'Capacity must be between 1 and 10000'
      ),
    pricePerHour: optionalPrice,
    posX: optionalNumber,
    posY: optionalNumber,
    width: optionalNumber,
    height: optionalNumber,
    rotation: optionalNumber.refine(
      (value) => !value || Number(value) < 360,
      'Rotation must be below 360'
    ),
    noiseLevel: z.enum(['', 'QUIET', 'MODERATE', 'LIVELY'])
  })
  .superRefine((value, context) => {
    if (!!value.posX !== !!value.posY)
      context.addIssue({ code: 'custom', path: ['posX'], message: 'Provide both coordinates' });
    if (
      !!value.width !== !!value.height ||
      (value.width && Number(value.width) <= 0) ||
      (value.height && Number(value.height) <= 0)
    )
      context.addIssue({
        code: 'custom',
        path: ['width'],
        message: 'Provide both positive dimensions'
      });
    for (const key of ['width', 'height'] as const)
      if (value[key] && Number(value[key]) > 999999.99)
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Dimension exceeds the supported range'
        });
  });
export type ResourceForm = z.output<typeof resourceFormSchema>;
export function resourcePayload(value: ResourceForm, current?: ResourceDetail) {
  return {
    ...value,
    ...(value.parentRoomId !== undefined
      ? { parentRoomId: value.parentRoomId ? Number(value.parentRoomId) : null }
      : {}),
    capacityOverride: value.capacityOverride ? Number(value.capacityOverride) : null,
    pricePerHour: value.pricePerHour || null,
    posX: value.posX || null,
    posY: value.posY || null,
    width: value.width || null,
    height: value.height || null,
    rotation: value.rotation || '0',
    noiseLevel: value.noiseLevel || null,
    ...(current ? { expectedRevision: current.revision } : {})
  };
}
export function resourceWorkspacesOptions(actorId: number) {
  return queryOptions({
    queryKey: ['organizer-resources', actorId, 'workspaces'],
    queryFn: ({ signal }) =>
      backendRequest<WorkspaceOption[]>(
        '/organizer/resource-workspaces',
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
}
export function resourceOptions(actorId: number, workspaceId: number) {
  return queryOptions({
    queryKey: ['organizer-resources', actorId, workspaceId, 'options'],
    queryFn: ({ signal }) =>
      backendRequest<ResourceOptions>(
        `/organizer/workspaces/${workspaceId}/resource-options`,
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
}
export function resourcesOptions(actorId: number, workspaceId: number, filters: ResourceFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: String(filters.size),
    search: filters.search
  });
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.floorPlanId) params.set('floorPlanId', String(filters.floorPlanId));
  return queryOptions({
    queryKey: ['organizer-resources', actorId, workspaceId, 'list', filters],
    queryFn: ({ signal }) =>
      backendRequest<ResourcePage>(
        `/organizer/workspaces/${workspaceId}/resources?${params}`,
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
}
export const saveResource = (workspaceId: number, value: ResourceForm, current?: ResourceDetail) =>
  backendRequest<ResourceDetail>(
    current
      ? `/organizer/resources/${current.id}`
      : `/organizer/workspaces/${workspaceId}/resources`,
    current ? 'PUT' : 'POST',
    resourcePayload(value, current)
  );
export const setResourceStatus = (resource: ResourceDetail, status: 'ACTIVE' | 'DISABLED') =>
  backendRequest<ResourceDetail>(`/organizer/resources/${resource.id}/status`, 'PATCH', {
    status,
    expectedRevision: resource.revision
  });
export const deleteResource = (resource: ResourceDetail) =>
  backendRequest<void>(
    `/organizer/resources/${resource.id}?${new URLSearchParams({ expectedRevision: resource.revision })}`,
    'DELETE'
  );
export const createResourceFloor = (
  workspaceId: number,
  value: { name: string; floorNumber: number }
) =>
  backendRequest<FloorOption>(
    `/organizer/workspaces/${workspaceId}/resource-floors`,
    'POST',
    value
  );
export interface TypeInput {
  name: string;
  category: Category;
  currency: Currency;
  capacity: number;
  pricePerHour: string | null;
  pricePerDay: string | null;
  pricePerMonth: string | null;
  expectedRevision?: string;
  legacyCurrencyConfirmed?: boolean;
}
export const saveResourceType = (workspaceId: number, value: TypeInput, current?: TypeOption) =>
  backendRequest<TypeOption>(
    current
      ? `/organizer/workspaces/${workspaceId}/resource-types/${current.id}`
      : `/organizer/workspaces/${workspaceId}/resource-types`,
    current ? 'PUT' : 'POST',
    { ...value, ...(current ? { expectedRevision: current.revision } : {}) }
  );
export const invalidateResources = (client: QueryClient, actorId: number) =>
  client.invalidateQueries({ queryKey: ['organizer-resources', actorId] });
/** Display the saved denomination; the site currency selector never reinterprets amounts. */
export function resourceMoney(value: string | null, currency: Currency | null, vi: boolean) {
  if (value === null) return '—';
  const [whole, fraction = ''] = value.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, vi ? '.' : ',')}${fraction ? `${vi ? ',' : '.'}${fraction.padEnd(2, '0')}` : ''} ${currency ?? (vi ? 'chưa rõ tiền tệ' : 'currency unconfirmed')}`;
}
export interface LayoutItem {
  category?: Category;
  parentRoomId?: number | null;
  id: number;
  code: string;
  name: string;
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number;
  status: ResourceStatus;
  revision: string;
}
export interface FloorLayout {
  floor: FloorOption;
  width: number | null;
  height: number | null;
  editableLayout: boolean;
  resources: LayoutItem[];
  decorations?: FloorDecoration[];
  draftChanges?: boolean;
}
export type DecorationKind = 'TABLE' | 'PLANT' | 'PARTITION' | 'OTHER';
export interface FloorDecoration {
  id: string;
  kind: DecorationKind;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}
export const saveFloorDecorations = (
  workspaceId: number,
  layout: FloorLayout,
  decorations: FloorDecoration[],
  width: string,
  height: string
) =>
  backendRequest<FloorLayout>(
    `/organizer/workspaces/${workspaceId}/resource-floors/${layout.floor.id}/decorations`,
    'PUT',
    {
      expectedRevision: layout.floor.revision,
      width,
      height,
      decorations
    }
  );
export function floorLayoutOptions(actorId: number, workspaceId: number, floorId: number) {
  return queryOptions({
    queryKey: ['organizer-resources', actorId, workspaceId, 'floor-layout', floorId],
    queryFn: ({ signal }) =>
      backendRequest<FloorLayout>(
        `/organizer/workspaces/${workspaceId}/resource-floors/${floorId}/layout`,
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
}
export const getResource = (id: number) =>
  backendRequest<ResourceDetail>(`/organizer/resources/${id}`, 'GET');
export const publishResourceFloor = (
  workspaceId: number,
  layout: FloorLayout,
  width: string,
  height: string
) =>
  backendRequest<FloorLayout>(
    `/organizer/workspaces/${workspaceId}/resource-floors/${layout.floor.id}/publish`,
    'POST',
    {
      expectedRevision: layout.floor.revision,
      width,
      height,
      resourcesConfirmed: true,
      resources: layout.resources.map((item) => ({ id: item.id, revision: item.revision }))
    }
  );
