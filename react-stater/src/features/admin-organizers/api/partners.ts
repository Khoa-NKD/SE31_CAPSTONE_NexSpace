import { backendRequest } from '@/features/auth/api/session';

export interface OrganizerPartner {
  organizerId: number;
  applicationId: number;
  legalName: string | null;
  username: string;
  email: string;
  suspended: boolean;
}

export interface OrganizerPartnerDetail {
  partner: OrganizerPartner;
  revision: number;
  reason: string | null;
  workspaces: { id: number; name: string; status: string }[];
  upcomingBookings: number;
}

export interface OrganizerOperationalStatus {
  suspended: boolean;
  reason: string | null;
}

export interface OrganizerPartnerPage {
  listObjects: OrganizerPartner[];
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const organizerPartnersEndpoint = '/admin/organizer-partners';
export const organizerOperationalStatusEndpoint = '/organizer/operational-status';
export const organizerOperationalStatusKey = (userId: number) =>
  ['organizer-operational-status', userId] as const;

export function getOrganizerOperationalStatus(signal: AbortSignal) {
  return backendRequest<OrganizerOperationalStatus>(
    organizerOperationalStatusEndpoint, 'GET', undefined, true, signal
  );
}
