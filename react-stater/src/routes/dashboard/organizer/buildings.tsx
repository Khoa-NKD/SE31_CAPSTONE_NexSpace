import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/organizer/buildings')({
  beforeLoad: () => { throw redirect({ to: '/dashboard/organizer/workspaces', replace: true }); }
});
