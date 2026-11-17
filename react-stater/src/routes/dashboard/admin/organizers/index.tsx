import { createFileRoute, redirect } from '@tanstack/react-router';

/** Preserve old bookmarks while the sidebar links directly to the application list. */
export const Route = createFileRoute('/dashboard/admin/organizers/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/admin/organizers/queue',
      search: {
        page: 1,
        size: 20,
        search: '',
        status: 'all',
        sortBy: 'submittedAt',
        sortDir: 'desc'
      }
    });
  }
});
