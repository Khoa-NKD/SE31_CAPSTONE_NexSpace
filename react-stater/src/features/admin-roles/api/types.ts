export interface RoleSummaryKpi {
  id: string;
  title: string;
  value: string;
  badge?: string;
  subtext: string;
  icon: string;
}

export type PermissionModule =
  | 'Workspaces'
  | 'Bookings'
  | 'Financials'
  | 'Moderation'
  | 'Governance';

export interface PermissionDefinition {
  id?: string;
  key: string;
  name: string;
  description: string;
  module: PermissionModule;
  customer: boolean;
  organizer: boolean;
  administrator: boolean; // Always true by platform root policy
  organizerNotice?: string;
  icon: string;
}

export interface UpdateRolePermissionItem {
  key: string;
  customer?: boolean;
  organizer?: boolean;
  administrator?: boolean;
}

export interface UpdateRolePermissionsPayload {
  permissions: UpdateRolePermissionItem[];
}

export interface RolePermissionFilters {
  module?: string;
  search?: string;
}
