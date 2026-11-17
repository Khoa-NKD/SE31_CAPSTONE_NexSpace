import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordViewPage from '@/features/auth/components/reset-password-view';
import { z } from 'zod';

const resetPasswordSearchSchema = z.object({
  token: z.string().optional()
});

export const Route = createFileRoute('/auth/reset-password/')({
  validateSearch: (search) => resetPasswordSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: 'Forgot & Reset Password | NexSpace' },
      { name: 'description', content: 'Reset your NexSpace account password.' }
    ]
  }),
  component: ResetPasswordViewPage
});
