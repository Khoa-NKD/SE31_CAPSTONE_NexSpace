import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { OrganizerPayoutsView } from '@/features/organizer-payouts/components/organizer-payouts-view';

export const Route = createFileRoute('/dashboard/organizer/payouts')({
  head: () => ({
    meta: [
      { title: 'Doanh thu & Chi trả | Payouts & Balance | NexSpace Organizer' },
      {
        name: 'description',
        content: 'Theo dõi số dư khả dụng, doanh thu tạm giữ HELD, rút tiền PayOS và cấu hình rút tiền tự động hàng ngày'
      }
    ]
  }),
  component: () => (
    <PageContainer>
      <OrganizerPayoutsView />
    </PageContainer>
  )
});
