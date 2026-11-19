import { apiClient } from '@/lib/api-client';
import type { Currency, ResourceStatus } from '@/features/organizer-resources/api/resources';

export interface OperationResource {
  id: number;
  code: string;
  name: string | null;
  typeId: number;
  typeName: string;
  category: 'DESK' | 'ROOM';
  floorNumber: number;
  status: ResourceStatus;
  parentRoomId: number | null;
  currency: Currency;
  hourlyPrice: string | null;
  dailyPrice: string | null;
}
export interface RateType {
  id: number;
  name: string;
  category: 'DESK' | 'ROOM';
  currency: Currency;
  hourlyPrice: string | null;
  dailyPrice: string | null;
  monthlyPrice: string | null;
  active: boolean;
}
export interface PricingRuleInput {
  name: string;
  resourceTypeId: number | null;
  resourceId: number | null;
  modifierType: 'CUSTOM' | 'WEEKEND' | 'PEAK_HOUR' | 'HOLIDAY';
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  multiplier: string;
  fixedAmount: string;
  priority: number;
  active: boolean;
}
export interface PricingRule extends PricingRuleInput {
  id: number;
}
export interface PricingConfig {
  types: RateType[];
  resources: OperationResource[];
  rules: PricingRule[];
}
export interface BlockedSlot {
  id: number;
  resourceId: number;
  resourceName: string;
  floorNumber: number;
  parentRoomId: number | null;
  blockType: 'BLOCKED' | 'MAINTENANCE';
  startTime: string;
  endTime: string;
  reason: string;
}
export interface BlockInput {
  resourceIds: number[];
  startTime: string;
  endTime: string;
  blockType: BlockedSlot['blockType'];
  reason: string;
}
const path = (workspaceId: number) => `/organizer/workspaces/${workspaceId}`;
export const operationsApi = {
  pricing: (workspaceId: number, signal?: AbortSignal) =>
    apiClient.get<PricingConfig>(`${path(workspaceId)}/pricing`, { signal }),
  saveRule: (workspaceId: number, input: PricingRuleInput, id?: number) =>
    id
      ? apiClient.put<PricingRule>(`${path(workspaceId)}/pricing-rules/${id}`, input)
      : apiClient.post<PricingRule>(`${path(workspaceId)}/pricing-rules`, input),
  deleteRule: (workspaceId: number, id: number) =>
    apiClient.delete(`${path(workspaceId)}/pricing-rules/${id}`),
  blocks: (workspaceId: number, from: string, to: string, signal?: AbortSignal) =>
    apiClient.get<BlockedSlot[]>(`${path(workspaceId)}/blocked-slots`, {
      params: { from, to },
      signal
    }),
  createBlocks: (workspaceId: number, input: BlockInput) =>
    apiClient.post<BlockedSlot[]>(`${path(workspaceId)}/blocked-slots`, input),
  deleteBlock: (workspaceId: number, id: number) =>
    apiClient.delete(`${path(workspaceId)}/blocked-slots/${id}`)
};
