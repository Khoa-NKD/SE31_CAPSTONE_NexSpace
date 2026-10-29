import { createFileRoute } from '@tanstack/react-router';
import { seo } from '@/lib/seo';
import LandingPage from '@/features/landing/components/landing-page';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: seo({
      title: 'NexSpace — Beyond Flexible Office Space | Workplace Cloud & Marketplace',
      description:
        'Access on-demand workspace, manage hybrid teams, and continuously optimize your workplace strategy—all on one unified platform.',
      path: '/'
    })
  }),
  component: LandingPage
});
