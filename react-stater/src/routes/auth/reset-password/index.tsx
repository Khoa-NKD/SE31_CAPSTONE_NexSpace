import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordViewPage from '@/features/auth/components/reset-password-view';

export const Route = createFileRoute('/auth/reset-password/')({
  head: () => ({
    meta: [
      { title: 'Forgot & Reset Password | NexSpace' },
      { name: 'description', content: 'Reset your NexSpace account password.' }
    ]
  }),
  component: ResetPasswordViewPage
});
