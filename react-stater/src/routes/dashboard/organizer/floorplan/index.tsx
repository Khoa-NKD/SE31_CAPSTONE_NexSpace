import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { FloorplanEditorView } from '@/features/organizer-floorplan/components/floorplan-editor-view';

export const Route = createFileRoute('/dashboard/organizer/floorplan/')({
  head: () => ({
    meta: [
      { title: 'Interactive 2D Floor Plan Editor | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Full-featured CAD canvas editor for workspace spatial planning, zone demarcation, RFID assignment, and monetization bounds.'
      }
    ]
  }),
  component: OrganizerFloorplanPage
});

function OrganizerFloorplanPage() {
  return (
    <PageContainer>
      <FloorplanEditorView />
    </PageContainer>
  );
}

