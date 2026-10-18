import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { CreateResourceView } from '@/features/organizer-resource-create';

export const Route = createFileRoute('/dashboard/organizer/resources/create')({
  head: () => ({
    meta: [
      { title: 'O11 — Create & Publish Resource | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'List a new bookable seat, pod, or meeting room directly onto the marketplace like an Agoda room listing.'
      }
    ]
  }),
  component: CreateResourcePage
});

function CreateResourcePage() {
  return (
    <PageContainer>
      <CreateResourceView />
    </PageContainer>
  );
}

