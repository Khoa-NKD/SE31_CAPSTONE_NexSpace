import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/organizer/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/organizer/workspaces'
    });
  }
});
