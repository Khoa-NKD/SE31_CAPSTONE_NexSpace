import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { toast } from 'sonner';
import {
  INITIAL_DISPUTES_DATA,
  MOCK_DISPUTES_KPIS,
  DisputeCase,
  DisputeSeverity,
  DisputeStatus
} from '@/features/admin-disputes/data/mock-disputes';
import { DisputesFilterBar } from '@/features/admin-disputes/components/disputes-filter-bar';
import { DisputesTable } from '@/features/admin-disputes/components/disputes-table';
import { DisputeInvestigationDrawer } from '@/features/admin-disputes/components/dispute-investigation-drawer';

const disputesSearchSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional().default('all'),
  severity: z.enum(['all', 'critical', 'high', 'normal']).optional().default('all'),
  status: z
    .enum(['all', 'open', 'under_investigation', 'under_review', 'evidence_attached', 'resolved', 'dismissed'])
    .optional()
    .default('all'),
  timeRange: z.string().optional().default('7d'),
  caseId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/disputes')({
  head: () => ({
    meta: [
      { title: 'A12 — Reports List & Dispute Investigation Panel | NexSpace Console' },
      {
        name: 'description',
        content:
          'Investigate evidence, evaluate terms of service violations, and resolve disputes across hubs.'
      }
    ]
  }),
  validateSearch: zodValidator(disputesSearchSchema),
  component: DisputeManagementPage
});

function DisputeManagementPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const [disputeCases, setDisputeCases] = useState<DisputeCase[]>(INITIAL_DISPUTES_DATA);
  const [selectedCase, setSelectedCase] = useState<DisputeCase | null>(() => {
    if (searchParams.caseId) {
      return (
        INITIAL_DISPUTES_DATA.find(
          (c) => c.id === searchParams.caseId || c.caseNumber === `#${searchParams.caseId}`
        ) || null
      );
    }
    return null;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(
    () => Boolean(searchParams.caseId)
  );
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Filter state from search params
  const searchQuery = searchParams.search || '';
  const categoryFilter = searchParams.category || 'all';
  const severityFilter = searchParams.severity || 'all';
  const statusFilter = searchParams.status || 'all';
  const timeRange = searchParams.timeRange || '7d';

  const handleSearchChange = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: value || undefined }),
      replace: true
    });
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    navigate({
      search: (prev) => ({ ...prev, category }),
      replace: true
    });
    setPage(1);
  };

  const handleSeverityChange = (severity: 'all' | DisputeSeverity) => {
    navigate({
      search: (prev) => ({ ...prev, severity }),
      replace: true
    });
    setPage(1);
  };

  const handleStatusChange = (status: 'all' | DisputeStatus) => {
    navigate({
      search: (prev) => ({ ...prev, status }),
      replace: true
    });
    setPage(1);
  };

  const handleTimeRangeChange = (range: string) => {
    navigate({
      search: (prev) => ({ ...prev, timeRange: range }),
      replace: true
    });
  };

  const handleSelectCase = (c: DisputeCase) => {
    setSelectedCase(c);
    setIsDrawerOpen(true);
    navigate({
      search: (prev) => ({ ...prev, caseId: c.id }),
      replace: true
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCase(null);
    navigate({
      search: (prev) => ({ ...prev, caseId: undefined }),
      replace: true
    });
  };

  // Filter logic
  const filteredCases = useMemo(() => {
    return disputeCases.filter((c) => {
      // Category filter
      if (categoryFilter !== 'all' && c.caseCategoryFilter !== categoryFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== 'all' && c.severity !== severityFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = c.id.toLowerCase().includes(query) || c.caseNumber.toLowerCase().includes(query);
        const matchesTitle = c.title.toLowerCase().includes(query);
        const matchesReporter = c.reporterName.toLowerCase().includes(query) || c.reporterEmail.toLowerCase().includes(query);
        const matchesHub = c.relatedWorkspace.toLowerCase().includes(query);
        return matchesId || matchesTitle || matchesReporter || matchesHub;
      }
      return true;
    });
  }, [disputeCases, categoryFilter, severityFilter, statusFilter, searchQuery]);

  // Handle adjudication resolution
  const handleSubmitResolution = (
    targetCase: DisputeCase,
    decision: string,
    justificationText: string
  ) => {
    setDisputeCases((prev) =>
      prev.map((item) =>
        item.id === targetCase.id
          ? {
              ...item,
              status: decision === 'dismiss' ? 'dismissed' : 'resolved',
              statusLabel: decision === 'dismiss' ? 'Dismissed' : 'Resolved',
              adjudicationDecision: decision,
              resolutionJustification: justificationText
            }
          : item
      )
    );

    setSelectedCase((prev) =>
      prev && prev.id === targetCase.id
        ? {
            ...prev,
            status: decision === 'dismiss' ? 'dismissed' : 'resolved',
            statusLabel: decision === 'dismiss' ? 'Dismissed' : 'Resolved',
            adjudicationDecision: decision,
            resolutionJustification: justificationText
          }
        : prev
    );

    toast.success(`Dispute ${targetCase.caseNumber} Adjudicated (Simulated)`, {
      description: `Formal resolution signed with cryptographic SHA-256 ledger token and archived.`
    });
  };

  return (
    <PageContainer
      pageTitle='Dispute & Moderation Cases'
      pageDescription='Investigate evidence, evaluate terms of service violations, and resolve disputes.'
    >
      {/* Filter and Top Status Area */}
      <DisputesFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        categoryFilter={categoryFilter}
        onCategoryChange={handleCategoryChange}
        severityFilter={severityFilter}
        onSeverityChange={handleSeverityChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        kpis={MOCK_DISPUTES_KPIS}
        onRefresh={() => setDisputeCases([...INITIAL_DISPUTES_DATA])}
      />

      {/* Main Table */}
      <DisputesTable
        cases={filteredCases}
        selectedCaseId={isDrawerOpen ? selectedCase?.id : undefined}
        onSelectCase={handleSelectCase}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalRecordsCount={filteredCases.length}
      />

      {/* 640px Investigation Drawer */}
      <DisputeInvestigationDrawer
        disputeCase={selectedCase}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSubmitResolution={handleSubmitResolution}
      />
    </PageContainer>
  );
}
