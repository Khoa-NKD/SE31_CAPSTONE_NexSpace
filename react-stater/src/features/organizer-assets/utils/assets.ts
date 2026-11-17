import type { AssetStatus, MaintenanceStatus, WorkspaceAssetDto } from '../../workspaces/api/types';

export interface AssetMetrics {
  total: number;
  inUse: number;
  underMaintenance: number;
  broken: number;
  retired: number;
}

/**
 * Calculates summary metrics for workspace assets.
 */
export function calculateAssetMetrics(assets: WorkspaceAssetDto[]): AssetMetrics {
  const total = assets.length;
  const inUse = assets.filter((a) => a.status === 'IN_USE').length;
  const underMaintenance = assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length;
  const broken = assets.filter((a) => a.status === 'BROKEN').length;
  const retired = assets.filter((a) => a.status === 'RETIRED').length;
  return { total, inUse, underMaintenance, broken, retired };
}

/**
 * Filters assets in memory by status and case-insensitive search string.
 */
export function filterAssets(
  assets: WorkspaceAssetDto[],
  filterStatus?: AssetStatus | 'ALL',
  searchQuery?: string
): WorkspaceAssetDto[] {
  return assets.filter((asset) => {
    if (filterStatus && filterStatus !== 'ALL' && asset.status !== filterStatus) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = asset.assetCode.toLowerCase().includes(q);
      const nameMatch = asset.name.toLowerCase().includes(q);
      const resourceMatch = asset.resourceName ? asset.resourceName.toLowerCase().includes(q) : false;
      const noteMatch = asset.note ? asset.note.toLowerCase().includes(q) : false;
      return codeMatch || nameMatch || resourceMatch || noteMatch;
    }
    return true;
  });
}

/**
 * Client-side pagination helper.
 */
export function paginateAssets(
  assets: WorkspaceAssetDto[],
  page: number,
  pageSize: number
): {
  paginatedList: WorkspaceAssetDto[];
  totalPages: number;
  currentPage: number;
  totalRecords: number;
  startIndex: number;
  endIndex: number;
} {
  const totalRecords = assets.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedList = assets.slice(startIndex, endIndex);

  return {
    paginatedList,
    totalPages,
    currentPage,
    totalRecords,
    startIndex,
    endIndex
  };
}

/**
 * Derives the resulting asset status when a maintenance log status is set.
 */
export function deriveNextAssetStatusOnMaintenance(
  currentStatus: AssetStatus,
  maintenanceStatus: MaintenanceStatus
): AssetStatus {
  if (maintenanceStatus === 'IN_PROGRESS') {
    return 'UNDER_MAINTENANCE';
  }
  if (maintenanceStatus === 'COMPLETED') {
    return 'IN_USE';
  }
  if (maintenanceStatus === 'CANCELLED' && currentStatus === 'UNDER_MAINTENANCE') {
    return 'IN_USE';
  }
  return currentStatus;
}
