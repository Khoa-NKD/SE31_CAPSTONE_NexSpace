import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { AdminAmenitiesView } from '@/features/amenities';

export const Route = createFileRoute('/dashboard/admin/amenities')({
  head: () => ({
    meta: [
      { title: 'A19 — Amenities Catalog Management | NexSpace Console' },
      {
        name: 'description',
        content: 'Manage global workspace equipment, connectivity, and hospitality amenity definitions.'
      }
    ]
  }),
  component: AdminAmenitiesPage
});

function AdminAmenitiesPage() {
  return (
    <PageContainer>
      <AdminAmenitiesView />
    </PageContainer>
  );
}

