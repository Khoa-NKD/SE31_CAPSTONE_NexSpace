export type WorkspaceStatus = 'ACTIVE' | 'DRAFT';

export interface OrganizerWorkspace {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  status: WorkspaceStatus;
  draftProgress?: number;
  draftWarningMessage?: string;
  imageUrl?: string;
  desksCount: number;
  meetingRoomsCount: number;
  rating: number;
  reviewsCount?: number;
  occupancyRate?: number;
}

export type WorkspaceFilter = 'all' | 'active' | 'draft';
