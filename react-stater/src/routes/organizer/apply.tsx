import { createFileRoute, Link } from '@tanstack/react-router';
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
  return (
    <div className='landing-scope min-h-screen bg-background text-foreground'>
      <Navbar />
      <main className='mx-auto max-w-3xl space-y-6 px-6 py-10'>
        <header className='space-y-2'>
          <h1 className='text-3xl font-semibold'>Become an Organizer</h1>
          <p className='text-muted-foreground'>
            Submit your business details and verification document for administrator review.
          </p>
          <Link to='/organizer/documents' className='text-primary underline'>
            Manage verification documents for an existing application
          </Link>
        </header>
        <div className='rounded-xl border bg-card p-5 shadow-sm sm:p-8'>
          <ApplicationForm />
        </div>
      </main>
    </div>
  );
}
