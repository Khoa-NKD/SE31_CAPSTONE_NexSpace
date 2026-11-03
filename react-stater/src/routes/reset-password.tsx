import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordViewPage from '@/features/auth/components/reset-password-view';
import { z } from 'zod';

const resetPasswordSearchSchema = z.object({
  token: z.string().optional()
});

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search) => resetPasswordSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: 'Đặt lại mật khẩu | NexSpace' },
      { name: 'description', content: 'Đặt lại mật khẩu tài khoản NexSpace' }
    ]
  }),
  component: ResetPasswordViewPage
});

