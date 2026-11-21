import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/organizer/messages')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/chat' });
  }
});
