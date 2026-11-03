import { createFileRoute } from '@tanstack/react-router';
import VerifySuccessViewPage from '@/features/auth/components/verify-success-view';

export const Route = createFileRoute('/email/verify-success')({
  head: () => ({
    meta: [
      { title: 'Xác thực thành công | NexSpace' },
      { name: 'description', content: 'Tài khoản của bạn đã được kích hoạt thành công.' }
    ]
  }),
  component: VerifySuccessViewPage
});
