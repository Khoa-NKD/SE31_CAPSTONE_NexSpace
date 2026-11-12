import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/organizer/workspaces/create/location')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/organizer/workspaces/create/hours',
      search: (previous) => previous,
      replace: true
    });
  }
});
