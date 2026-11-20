import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { AdminPayoutsView } from '@/features/admin-payouts/components/admin-payouts-view';

export const Route = createFileRoute('/dashboard/admin/payouts')({
  head: () => ({
    meta: [
      { title: 'Quản lý Payout & Sổ cái Chi tiền | NexSpace Admin' },
      {
        name: 'description',
        content: 'Phê duyệt yêu cầu Auto Payout của Organizer và giám sát sổ cái chi tiền qua PayOS'
      }
    ]
  }),
  component: () => (
    <PageContainer>
      <AdminPayoutsView />
    </PageContainer>
  )
});
