import { createFileRoute, Link } from '@tanstack/react-router';
import { NexSpaceLogo } from '@/components/brand/logo';
import { ApplicationStatusView } from '@/features/organizer-application-status/components/application-status-view';

export const Route = createFileRoute('/organizer/status')({
  head: () => ({
    meta: [
      { title: 'Organizer Application Status | NexSpace' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: () => (
    <div className='landing-scope min-h-screen bg-background text-foreground'>
      <header className='border-b bg-background'>
        <div className='mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4'>
          <Link to='/' aria-label='NexSpace home'>
            <NexSpaceLogo className='h-9 w-auto' />
          </Link>
          <Link to='/organizer/apply' className='text-sm text-primary underline'>
            Organizer application
          </Link>
        </div>
      </header>
      <main className='mx-auto max-w-3xl space-y-6 px-6 py-10'>
        <h1 className='text-3xl font-semibold'>Organizer application status</h1>
        <ApplicationStatusView />
      </main>
    </div>
  )
});
