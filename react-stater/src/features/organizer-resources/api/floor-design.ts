import { queryOptions } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session';
import { resourceTypePhotoBody } from './resource-type-photos';
import type {
  DecorationKind,
  DecorationIconName,
  FloorDecoration,
  FloorLayout,
  ResourceUsageKind
} from './resources';

export interface DesignMetrics {
  geometryVersion?: number;
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
export interface MetricsInput {
  measurementMode?: MeasurementMode;
  expectedRevision: string;
  widthM: number;
  lengthM: number;
  maxOccupancy: number | null;
  occupancyLimit: number | null;
  confirmGeometryConversion?: boolean;
}
export interface GeometryReview {
  measurementMode?: MeasurementMode;
  physicalWidthM?: number;
  physicalLengthM?: number;
  conversionRequired: boolean;
  applicable: boolean;
  workspaceAreas: number;
  resources: number;
  issues: string[];
  unit: 'm';
  pixelsPerMetre: number;
  previews?: Array<{
    floorId: number;
    name: string;
    beforeFloorWidth: number;
    beforeFloorHeight: number;
    afterFloorWidth: number;
    afterFloorHeight: number;
    beforeX: number;
    beforeY: number;
    afterX: number;
    afterY: number;
    beforeWidth: number;
    beforeHeight: number;
    afterWidth: number;
    afterHeight: number;
    before: GeometryPreviewShape[];
    after: GeometryPreviewShape[];
    beforeWidthM?: number | null;
    beforeLengthM?: number | null;
    afterWidthM: number;
    afterLengthM: number;
  }>;
}
export type MeasurementMode = 'CALIBRATE' | 'RESIZE';
export interface GeometryPreviewShape {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
export const previewDesignMetrics = (workspace: number, floor: number, input: MetricsInput) =>
  backendRequest<GeometryReview>(`${path(workspace, floor)}/design-metrics/preview`, 'POST', input);
export const saveDesignMetrics = (
  workspace: number,
  floor: number,
  input: MetricsInput
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
  confirmNewTypes = false,
  photos: Record<number, File[]> = {}
) => {
  const input = { proposalId, saveTemplates, design, confirmNewTypes };
  return backendRequest<FloorLayout>(
    `${path(workspace, floor)}/ai/apply`,
    'POST',
    Object.keys(photos).length ? resourceTypePhotoBody(input, photos) : input
  );
};
export interface SavedAiDraft {
  version: number;
  design: AiProposal['design'];
  estimatedScale: boolean;
  widthM: number;
  lengthM: number;
  savedAt: string;
}
export const savedAiDraftOptions = (actor: number, workspace: number, floor: number) => queryOptions({
  queryKey: ['organizer-resources', actor, workspace, 'ai-draft', floor],
  queryFn: async ({ signal }) => {
    const draft = await backendRequest<SavedAiDraft | null>(`${path(workspace, floor)}/ai/draft`, 'GET', undefined, true, signal);
    // The API omits the envelope's data key when no draft exists.
    return draft?.version === 1 && draft.design ? draft : null;
  },
  retry: false
});
export const saveAiDraft = (workspace: number, floor: number, proposal: AiProposal) =>
  backendRequest<SavedAiDraft>(`${path(workspace, floor)}/ai/draft`, 'PUT', {
    proposalId: proposal.proposalId, saveTemplates: false, design: proposal.design, confirmNewTypes: false
  });
