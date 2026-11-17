import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { createFileRoute } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { Navbar } from '@/features/landing/components/navbar';
import { ApplicationForm } from '@/features/organizer-application/components/application-form';

export const Route = createFileRoute('/organizer/apply')({
  head: () => ({
    meta: [
      { title: 'Become an Organizer | NexSpace' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: OrganizerApplicationPage
});

function OrganizerApplicationPage() {
  const tr = useOrganizerTranslation();
  return (
    <div className='landing-scope min-h-screen bg-background text-foreground'>
      <Navbar />
      <main className='mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-9'>
        <header className='relative isolate overflow-hidden rounded-3xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/10 via-card to-violet-500/10 p-5 sm:p-8'>
          <div aria-hidden='true' className='pointer-events-none absolute -top-24 right-0 -z-10 size-72 rounded-full bg-indigo-500/15 blur-3xl' />
          <div className='mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300'>
            <span className='grid size-8 place-items-center rounded-lg bg-indigo-500/10'>
              <Building2 className='size-4' aria-hidden='true' />
            </span>
            {tr('NexSpace Partners')}
          </div>
          <h1 className='text-2xl font-semibold tracking-tight sm:text-4xl'>
            {tr('Become an Organizer')}
          </h1>
          <p className='mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base'>
            {tr(
              'Everything for your application in one place. Save your business details, upload documents and follow your review progress below.'
            )}{' '}
          </p>
        </header>
        <ApplicationForm />
      </main>
    </div>
  );
}
