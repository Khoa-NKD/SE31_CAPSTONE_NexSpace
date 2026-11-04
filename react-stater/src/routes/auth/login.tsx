import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/login')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/auth/sign-in',
      search: search as Record<string, unknown>
    });
  }
});

