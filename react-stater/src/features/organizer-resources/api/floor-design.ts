import { queryOptions } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session';
import type {
  DecorationKind,
  DecorationIconName,
  FloorDecoration,
  FloorLayout,
  ResourceUsageKind
} from './resources';

export interface DesignMetrics {
  revision: string;
  physicalWidthM: number | null;
  physicalLengthM: number | null;
  widthM: number | null;
  lengthM: number | null;
  areaSqm: number | null;
  maxOccupancy: number | null;
  occupancyLimit: number | null;
  designOccupancy: number;
  workspaceDeclaredAreaSqm: number | null;
  workspaceMappedAreaSqm: number;
  allAreasMeasured: boolean;
}
export interface LayoutTemplateInput {
  name: string;
  kind: DecorationKind;
  widthM: number;
  lengthM: number;
  color: string;
  icon?: DecorationIconName | null;
  expectedRevision?: string | null;
}
export interface LayoutTemplate extends LayoutTemplateInput {
  id: number;
  active: boolean;
  revision: string;
}
export type DesignScope = 'WORKSPACE' | 'ROOM' | 'OBJECT';
export interface AiResourceChange {
  key: string;
  id: number | null;
  resourceTypeId: number;
  name: string;
  parentKey: string | null;
  usageKind?: ResourceUsageKind | null;
  capacity: number | null;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
}
export interface AiProposal {
  proposalId: string;
  expiresAt: string;
  expectedRevision: string;
  scope: DesignScope;
  selectedKey?: string | null;
  applicable: boolean;
  issues: string[];
  design: {
    message: string;
    question: string | null;
    resources: AiResourceChange[];
    removeResourceIds: number[];
    decorations: FloorDecoration[];
    templates: LayoutTemplateInput[];
    newTypes?: AiNewType[];
  };
}
export interface AiNewType {
  usageKind: ResourceUsageKind;
  standardWidthM: number;
  standardLengthM: number;
  tempId: number;
  name: string;
  category: 'DESK' | 'ROOM';
  currency: 'VND' | 'USD';
  capacity: number;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerMonth: number | null;
}
const path = (workspace: number, floor: number) =>
  `/organizer/workspaces/${workspace}/resource-floors/${floor}`;
export const designMetricsOptions = (actor: number, workspace: number, floor: number) =>
  queryOptions({
    queryKey: ['organizer-resources', actor, workspace, 'design-metrics', floor],
    queryFn: ({ signal }) =>
      backendRequest<DesignMetrics>(
        `${path(workspace, floor)}/design-metrics`,
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
export const saveDesignMetrics = (
  workspace: number,
  floor: number,
  input: {
    expectedRevision: string;
    widthM: number;
    lengthM: number;
    maxOccupancy: number | null;
    occupancyLimit: number | null;
  }
) => backendRequest<DesignMetrics>(`${path(workspace, floor)}/design-metrics`, 'PUT', input);
export const templateOptions = (actor: number) =>
  queryOptions({
    queryKey: ['organizer-resources', actor, 'layout-templates'],
    queryFn: ({ signal }) =>
      backendRequest<LayoutTemplate[]>(
        '/organizer/layout-templates',
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });
export const saveLayoutTemplate = (input: LayoutTemplateInput, current?: LayoutTemplate) =>
  backendRequest<LayoutTemplate>(
    `/organizer/layout-templates${current ? `/${current.id}` : ''}`,
    current ? 'PUT' : 'POST',
    {
      name: input.name,
      kind: input.kind,
      widthM: input.widthM,
      lengthM: input.lengthM,
      color: input.color,
      icon: input.icon ?? null,
      ...(current ? { expectedRevision: current.revision } : {})
    }
  );
export const archiveLayoutTemplate = (item: LayoutTemplate) =>
  backendRequest<void>(
    `/organizer/layout-templates/${item.id}?${new URLSearchParams({ expectedRevision: item.revision })}`,
    'DELETE'
  );
export interface GeminiModelOption {
  id: string;
  displayName: string;
  availability: 'AVAILABLE' | 'RETIRED' | 'UNAVAILABLE';
  shutdownDate: string | null;
}

export const aiStatusOptions = (actor: number, workspace: number, floor: number) =>
  queryOptions({
    queryKey: ['organizer-resources', actor, workspace, 'ai-status', floor],
    queryFn: ({ signal }) =>
      backendRequest<{ configured: boolean; model: string; models: GeminiModelOption[] }>(
        `${path(workspace, floor)}/ai/status`,
        'GET',
        undefined,
        true,
        signal
      ),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 300_000
  });
export const proposeFloorDesign = (
  workspace: number,
  floor: number,
  input: {
    prompt: string;
    expectedRevision: string;
    scope: DesignScope;
    selectedKey: string | null;
    language: 'vi' | 'en';
    model?: string;
    previousProposalId?: string;
    draft?: AiProposal['design'];
    image?: { mimeType: string; base64: string };
  },
  signal: AbortSignal
) =>
  backendRequest<AiProposal>(`${path(workspace, floor)}/ai/proposals`, 'POST', input, true, signal);
export const applyFloorDesign = (
  workspace: number,
  floor: number,
  proposalId: string,
  saveTemplates: boolean,
  design?: AiProposal['design'],
  confirmNewTypes = false
) =>
  backendRequest<FloorLayout>(`${path(workspace, floor)}/ai/apply`, 'POST', {
    proposalId,
    saveTemplates,
    design,
    confirmNewTypes
  });
