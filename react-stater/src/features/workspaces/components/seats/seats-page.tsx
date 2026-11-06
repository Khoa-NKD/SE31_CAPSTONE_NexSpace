import { Link } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { PublicFloorMap } from '../detail/public-floor-map';

/** A real workspace is required; never mix a published layout with prototype floor/seat data. */
export function SeatsPage({ workspaceId }: { workspaceId?: number } = {}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <WorkspaceHeader />
      <main className='mx-auto w-full max-w-6xl flex-1 px-6 py-8'>
        {workspaceId ? (
          <PublicFloorMap workspaceId={workspaceId} />
        ) : (
          <div className='rounded-2xl border border-border bg-card px-6 py-16 text-center'>
            <Building2 className='mx-auto mb-4 size-10 text-primary' />
            <h1 className='text-xl font-semibold'>
              {c('Choose a workspace first', 'Chọn không gian trước')}
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              {c(
                'Open a workspace to see its published floors and select a seat or room.',
                'Mở một không gian để xem sơ đồ đã publish và chọn ghế hoặc phòng.'
              )}
            </p>
            <Button asChild className='mt-5'>
              <Link to='/workspaces'>{c('Explore workspaces', 'Khám phá không gian')}</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
