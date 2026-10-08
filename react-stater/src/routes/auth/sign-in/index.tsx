import { createFileRoute } from '@tanstack/react-router';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const Route = createFileRoute('/auth/sign-in/')({
  head: () => ({
    meta: [
      { title: 'Sign In | NexSpace' },
      { name: 'description', content: 'Sign in to manage your spaces, reservations, and teams.' }
    ]
  }),
  component: SignInViewPage
});
