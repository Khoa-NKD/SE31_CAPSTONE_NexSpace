import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { useLanguage } from '@/features/landing/context/language-context';
import { adminApplicationSearchSchema } from '@/features/admin-organizers/api/applications';
import { ApplicationsListView } from '@/features/admin-organizers/components/applications-list-view';

export const Route = createFileRoute('/dashboard/admin/organizers/queue')({
  head: () => ({
    meta: [
      { title: 'Duyệt hồ sơ đối tác | NexSpace Admin Console' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  validateSearch: zodValidator(adminApplicationSearchSchema),
  component: AdminOrganizerApplicationsPage
});

function AdminOrganizerApplicationsPage() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const { language } = useLanguage();

  return (
    <PageContainer
      pageTitle={language === 'vi' ? 'Duyệt hồ sơ đối tác' : 'Organizer Applications'}
      pageDescription={
        language === 'vi'
          ? 'Hàng đợi thẩm định hồ sơ đăng ký đối tác vận hành không gian làm việc trên sàn NexSpace.'
          : 'Review and audit onboarding applications submitted by workspace organizers.'
      }
    >
      <ApplicationsListView
        filters={filters}
        onChange={(patch) =>
          void navigate({
            search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }),
            resetScroll: false
          })
        }
      />
    </PageContainer>
  );
}
