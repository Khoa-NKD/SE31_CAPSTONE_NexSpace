import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { BookingsManagementView } from '@/features/organizer-bookings';

export const Route = createFileRoute('/dashboard/organizer/bookings/')({
  validateSearch: (search: Record<string, unknown>): { workspaceId?: number } => {
    const workspaceId = Number(search.workspaceId);
    return {
      workspaceId: Number.isSafeInteger(workspaceId) && workspaceId > 0 ? workspaceId : undefined
    };
  },
  head: () => ({
    meta: [
      { title: 'Bookings Ledger & Reservations | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Track reservations, reconcile PayOS transactions, filter by resource zone, and manage real-time turnstile access logs.'
      }
    ]
  }),
  component: OrganizerBookingsPage
});

function OrganizerBookingsPage() {
  const { workspaceId } = Route.useSearch();
  return (
    <PageContainer>
      <BookingsManagementView key={workspaceId ?? 'all'} initialWorkspaceId={workspaceId} />
    </PageContainer>
  );
}
