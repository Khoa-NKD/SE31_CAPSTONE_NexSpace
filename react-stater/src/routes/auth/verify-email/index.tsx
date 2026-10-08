import { createFileRoute } from '@tanstack/react-router';
import EmailVerificationView from '@/features/auth/components/email-verification-view';

export const Route = createFileRoute('/auth/verify-email/')({
  head: () => ({
    meta: [{ title: 'Verify Email' }]
  }),
  component: EmailVerificationView
});
