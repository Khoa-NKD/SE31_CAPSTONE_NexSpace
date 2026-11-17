import { createFileRoute } from '@tanstack/react-router';
import VerifyFailedViewPage from '@/features/auth/components/verify-failed-view';

export const Route = createFileRoute('/email/verify-failed')({
  head: () => ({
    meta: [
      { title: 'Xác thực không thành công | NexSpace' },
      { name: 'description', content: 'Liên kết xác thực tài khoản không hợp lệ hoặc đã hết hạn.' }
    ]
  }),
  component: VerifyFailedViewPage
});
