import type { ReactNode } from 'react';
import type { AppIcon } from '@/components/ui/hugeicons';
import { CheckCircle2, Clock } from '@/components/ui/hugeicons';
import { Spinner } from '@/components/ui/spinner';
import { useWizardStore } from '../store/wizard-store';

export function WizardStepIntro({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: AppIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const saved = useWizardStore((s) => s.isDraftSynced && !!s.canonicalWorkspaceId);
  const saving = useWizardStore((s) => s.isSavingToServer);
  return (
    <header className='wizard-intro'>
      <div className='flex min-w-0 items-start gap-3'>
        <span className='wizard-intro-icon'>
          <Icon className='size-5' aria-hidden='true' />
        </span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-3'>
        {children}
        <span
          className='wizard-save-state'
          data-state={saving ? 'saving' : saved ? 'saved' : 'dirty'}
          aria-live='polite'
        >
          {saving ? (
            <Spinner className='size-3.5' />
          ) : saved ? (
            <CheckCircle2 className='size-3.5' />
          ) : (
            <Clock className='size-3.5' />
          )}
          {saving ? 'Đang lưu…' : saved ? 'Đã lưu' : 'Chưa lưu thay đổi'}
        </span>
      </div>
    </header>
  );
}
