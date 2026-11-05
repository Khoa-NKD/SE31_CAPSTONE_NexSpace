import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { createFileRoute } from '@tanstack/react-router';
import { Building2, FileCheck2, ShieldCheck } from 'lucide-react';
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
      <main className='mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12'>
        <header className='relative overflow-hidden rounded-3xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/10 via-background to-violet-500/5 p-6 sm:p-9'>
          <span className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-background px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300'>
            <Building2 className='size-3.5' aria-hidden='true' />
            {tr('NexSpace Partners')}{' '}
          </span>
          <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
            {tr('Become an Organizer')}
          </h1>
          <p className='mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base'>
            {tr(
              'Everything for your application in one place. Save your business details, upload documents and follow your review progress below.'
            )}{' '}
          </p>
          <div className='mt-6 flex flex-wrap gap-3 text-xs font-medium text-muted-foreground'>
            <span className='inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-2'>
              <FileCheck2 className='size-4 text-indigo-500' aria-hidden='true' />
              {tr('Save now, submit when ready')}{' '}
            </span>
            <span className='inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-2'>
              <ShieldCheck className='size-4 text-indigo-500' aria-hidden='true' />
              {tr('Documents stay private')}{' '}
            </span>
          </div>
        </header>
        <ApplicationForm />
      </main>
    </div>
  );
}
