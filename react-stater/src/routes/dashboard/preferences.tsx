import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { CustomerPreferenceView } from '@/features/customer-preferences';

export const Route = createFileRoute('/dashboard/preferences')({
  head: () => ({
    meta: [
      { title: 'Sở thích không gian cá nhân | NexSpace' },
      {
        name: 'description',
        content:
          'Thiết lập tiêu chí không gian, loại chỗ ngồi, khoảng giá và tiện ích mong muốn để nhận đề xuất chính xác từ hệ thống.'
      }
    ]
  }),
  component: PreferencesPage
});

function PreferencesPage() {
  return (
    <PageContainer
      pageTitle='Sở thích không gian'
      pageDescription='Tùy chỉnh tiêu chí không gian làm việc mong muốn để nhận gợi ý chính xác nhất từ hệ thống AI NexSpace.'
    >
      <div className='max-w-5xl mx-auto pb-12'>
        <CustomerPreferenceView />
      </div>
    </PageContainer>
  );
}

