import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, X } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useWizardStore } from '../store/wizard-store';
import '../styles/workspace-wizard.css';
import { WizardSaveFeedback } from './wizard-save-feedback';
export function WizardHeader({ currentStep }: { currentStep: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const c = useOrganizerCopy();
  const navigate = useNavigate();
  const editing = (useLocation().search as Record<string, unknown>).mode === 'edit';
  return (
    <>
      <WizardSaveFeedback finalStep={currentStep === 6} />
      <div className='wizard-topbar'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <Link
            to='/dashboard/organizer/workspaces'
            className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='size-3.5' />
            {c('Workspaces', 'Không gian')}
          </Link>
          <span className='h-4 border-l' />
          <span className='text-sm font-semibold'>
            {editing
              ? c('Edit workspace', 'Chỉnh sửa không gian')
              : c('Create workspace', 'Tạo không gian')}
          </span>
          <span className='rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary'>
            {currentStep}/6
          </span>
        </div>
        <Button
          size='sm'
          variant='ghost'
          className='shrink-0 gap-1.5 text-xs text-muted-foreground'
          onClick={() => {
            if (editing) useWizardStore.getState().resetDraft();
            else
              useWizardStore.setState({
                canonicalWorkspaceId: undefined,
                stagedSite: undefined,
                editAmenitiesDirty: false,
                editMediaDirty: false
              });
            void navigate({ to: '/dashboard/organizer/workspaces' });
          }}
        >
          <X className='size-3.5' />
          {editing ? c('Cancel editing', 'Hủy chỉnh sửa') : c('Exit setup', 'Thoát thiết lập')}
        </Button>
      </div>
    </>
  );
}
