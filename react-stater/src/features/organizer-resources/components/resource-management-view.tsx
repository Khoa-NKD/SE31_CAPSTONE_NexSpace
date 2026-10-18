import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ResourceItem,
  ResourceKpiSummary,
  ResourceTypeFilter,
  ResourceZoneFilter,
  ResourceStatusFilter
} from '../types';
import { INITIAL_MOCK_RESOURCES } from '../data/mock-resources';
import { ResourceHeaderBar } from './resource-header-bar';
import { ResourceKpiGrid } from './resource-kpi-grid';
import { ResourceFilterBar } from './resource-filter-bar';
import { ResourceTable } from './resource-table';
import { ResourcePagination } from './resource-pagination';
import { ResourceFormDialog } from './resource-form-dialog';
import { ResourceBulkImportDialog } from './resource-bulk-import-dialog';
import { ResourcePricingDialog } from './resource-pricing-dialog';

export function ResourceManagementView() {
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_MOCK_RESOURCES);
  const [currentFloor, setCurrentFloor] = useState('Floor 12 — Main Coworking Floor');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceTypeFilter>('all');
  const [zoneFilter, setZoneFilter] = useState<ResourceZoneFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ResourceStatusFilter>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<ResourceItem | null>(null);

  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingResource, setPricingResource] = useState<ResourceItem | null>(null);

  // Dynamically computed KPIs from current inventory
  const kpis: ResourceKpiSummary = useMemo(() => {
    const total = resources.length;
    const active = resources.filter((r) => r.status === 'BOOKABLE').length;
    const maintenance = resources.filter((r) => r.status === 'DISABLED').length;
    const totalRate = resources.reduce((acc, r) => acc + r.hourlyRate, 0);
    const avgRate = total > 0 ? totalRate / total : 0;
    const uptime = total > 0 ? (active / total) * 100 : 0;

    return {
      totalUnits: total,
      activeBookable: active,
      uptimePercent: Number(uptime.toFixed(1)),
      maintenanceCount: maintenance,
      maintenanceNote: maintenance > 0 ? 'Pending hardware check' : 'All units online',
      averageHourlyRate: Number(avgRate.toFixed(2)),
      occupancyPercent: 68
    };
  }, [resources]);

  // Compute category pill counts across all resources
  const counts = useMemo(
    () => ({
      all: resources.length,
      hotDesk: resources.filter((r) => r.type === 'HOT_DESK').length,
      dedicatedDesk: resources.filter((r) => r.type === 'DEDICATED_DESK').length,
      meetingRoom: resources.filter((r) => r.type === 'MEETING_ROOM').length
    }),
    [resources]
  );

  // Filtered & Sorted resources
  const filteredResources = useMemo(() => {
    let result = resources.filter((item) => {
      // 1. Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // 2. Zone filter
      if (zoneFilter !== 'all' && item.zone !== zoneFilter) return false;

      // 3. Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCode = item.code.toLowerCase().includes(query);
        const matchesSubLabel = item.subLabel?.toLowerCase().includes(query);
        const matchesZone = item.zoneLabel.toLowerCase().includes(query);
        const matchesRfid = item.rfidCode?.toLowerCase().includes(query);
        const matchesAmenities = item.amenities.some((a) =>
          a.name.toLowerCase().includes(query)
        );
        return (
          matchesCode ||
          matchesSubLabel ||
          matchesZone ||
          matchesRfid ||
          matchesAmenities
        );
      }

      return true;
    });

    // Sort by code
    result.sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.code.localeCompare(b.code);
      }
      return b.code.localeCompare(a.code);
    });

    return result;
  }, [resources, typeFilter, zoneFilter, statusFilter, searchQuery, sortDirection]);

  // Paginated slice
  const paginatedResources = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResources.slice(start, start + pageSize);
  }, [filteredResources, page, pageSize]);

  // Selection handlers
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedResources.map((r) => r.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIdSet = new Set(paginatedResources.map((r) => r.id));
      setSelectedIds(selectedIds.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Toggle single status
  const handleToggleStatus = (id: string) => {
    setResources((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStatus = item.status === 'BOOKABLE' ? 'DISABLED' : 'BOOKABLE';
          toast.success(
            `Resource Status Updated: ${item.code}`,
            {
              description:
                newStatus === 'BOOKABLE'
                  ? 'Activated and open for instant member bookings.'
                  : 'Disabled and flagged for maintenance check.'
            }
          );
          return {
            ...item,
            status: newStatus,
            warningNote: newStatus === 'DISABLED' ? (item.warningNote || 'Manual maintenance flag') : undefined
          };
        }
        return item;
      })
    );
  };

  // Bulk actions
  const handleBulkEnable = () => {
    if (selectedIds.length === 0) return;
    setResources((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? { ...item, status: 'BOOKABLE', warningNote: undefined }
          : item
      )
    );
    toast.success(`Activated ${selectedIds.length} Resources`, {
      description: 'Selected resources are now live and bookable.'
    });
    setSelectedIds([]);
  };

  const handleBulkDisable = () => {
    if (selectedIds.length === 0) return;
    setResources((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? { ...item, status: 'DISABLED', warningNote: 'Batch maintenance flag' }
          : item
      )
    );
    toast.warning(`Disabled ${selectedIds.length} Resources`, {
      description: 'Selected resources are disabled for maintenance triage.'
    });
    setSelectedIds([]);
  };

  const handleBulkExport = () => {
    toast.success('Inventory Export Initiated', {
      description: `Exported ${selectedIds.length > 0 ? selectedIds.length : resources.length} items to CSV.`
    });
  };

  // Add & Edit actions
  const handleOpenAddResource = () => {
    setResourceToEdit(null);
    setFormDialogOpen(true);
  };

  const handleOpenQuickEdit = (resource: ResourceItem) => {
    setResourceToEdit(resource);
    setFormDialogOpen(true);
  };

  const handleSaveResource = (saved: ResourceItem) => {
    if (resourceToEdit) {
      setResources((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      toast.success(`Resource Updated: ${saved.code}`);
    } else {
      setResources((prev) => [saved, ...prev]);
      toast.success(`Resource Created: ${saved.code}`, {
        description: 'New inventory item provisioned onto Floor 12.'
      });
    }
  };

  // Pricing actions
  const handleOpenPricing = (resource: ResourceItem) => {
    setPricingResource(resource);
    setPricingDialogOpen(true);
  };

  const handleSavePricing = (id: string, hourly: number, daily: number) => {
    setResources((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hourlyRate: hourly, dailyRate: daily } : item
      )
    );
  };

  // Delete action
  const handleDelete = (id: string) => {
    const item = resources.find((r) => r.id === id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    toast.error(`Resource Deleted: ${item?.code || id}`);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setZoneFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className='w-full max-w-[1360px] mx-auto py-2 sm:py-4 flex flex-col gap-6'>
      {/* 1. Header Bar with Breadcrumb and Top Operational Summary */}
      <ResourceHeaderBar
        currentFloor={currentFloor}
        onFloorChange={setCurrentFloor}
        onOpenBulkImport={() => setBulkImportOpen(true)}
        totalCount={resources.length}
        activeCount={resources.filter((r) => r.status === 'BOOKABLE').length}
        occupancyPercent={kpis.occupancyPercent}
      />

      {/* 2. 4-Column KPI Grid */}
      <ResourceKpiGrid kpis={kpis} />

      {/* 3. Control & Filter Bar */}
      <ResourceFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        typeFilter={typeFilter}
        onTypeFilterChange={(t) => {
          setTypeFilter(t);
          setPage(1);
        }}
        zoneFilter={zoneFilter}
        onZoneFilterChange={(z) => {
          setZoneFilter(z);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        counts={counts}
        selectedCount={selectedIds.length}
        onBulkEnable={handleBulkEnable}
        onBulkDisable={handleBulkDisable}
        onBulkExport={handleBulkExport}
        onOpenAddResource={handleOpenAddResource}
      />

      {/* 4. Main Data Grid Table with Pagination */}
      <div className='flex flex-col'>
        <ResourceTable
          resources={paginatedResources}
          selectedIds={selectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelectRow={handleToggleSelectRow}
          onToggleStatus={handleToggleStatus}
          onQuickEdit={handleOpenQuickEdit}
          onOpenPricing={handleOpenPricing}
          onDelete={handleDelete}
          onResetFilters={handleResetFilters}
          onOpenAddResource={handleOpenAddResource}
          sortDirection={sortDirection}
          onToggleSort={() =>
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
          }
        />

        {filteredResources.length > 0 && (
          <ResourcePagination
            currentPage={page}
            totalItems={filteredResources.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Modals & Dialogs */}
      <ResourceFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        resourceToEdit={resourceToEdit}
        onSave={handleSaveResource}
      />

      <ResourceBulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImportSuccess={() => {
          // Re-sync items if needed
        }}
      />

      <ResourcePricingDialog
        open={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
        resource={pricingResource}
        onSavePricing={handleSavePricing}
      />
    </div>
  );
}

