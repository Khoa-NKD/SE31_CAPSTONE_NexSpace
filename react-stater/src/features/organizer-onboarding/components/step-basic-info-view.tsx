import { useState } from 'react';
import { useRouter, useLocation } from '@tanstack/react-router';
import { Building2, ArrowRight, Save, Eye } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { basicInfoSchema } from '../schemas/wizard-schemas';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { WizardStepIntro } from './wizard-step-intro';
export function StepBasicInfoView(_props: { routeWorkspaceId?: string } = {}) {
  const router = useRouter();
  const editing = (useLocation().search as Record<string, unknown>).mode === 'edit';
  const basic = useWizardStore((s) => s.basicInfo);
  const setBasic = useWizardStore((s) => s.setBasicInfo);
  const { saveDraftToServer, isSaving } = useWizardDraftSync();
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = basicInfoSchema.safeParse(basic);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError('');
    const saved = await saveDraftToServer({ silent: !editing, commitEdit: editing });
    if (saved && !editing)
      void router.navigate({
        to: '/dashboard/organizer/workspaces/create/location',
        search: (prev) => ({ ...prev, id: String(saved.id) })
      });
  }
  return (
    <div className='wizard-shell'>
      <WizardHeader currentStep={1} />
      <WizardStepper currentStep={1} />
      <WizardStepIntro
        icon={Building2}
        title='Thông tin cơ bản'
        description='Một cái tên dễ nhớ và phần giới thiệu súc tích cho không gian của bạn.'
      />
      <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(250px,1fr)]'>
        <form onSubmit={submit} className='wizard-panel space-y-6'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between gap-3'>
              <label htmlFor='workspace-name' className='text-sm font-medium'>
                Tên công khai <span className='text-primary'>*</span>
              </label>
              <span className='text-[11px] tabular-nums text-muted-foreground'>
                {basic.name.length}/100
              </span>
            </div>
            <Input
              id='workspace-name'
              required
              minLength={3}
              maxLength={100}
              value={basic.name}
              placeholder='VD: NexSpace Lý Tự Trọng'
              aria-describedby='name-help'
              onChange={(e) => {
                setBasic({ name: e.target.value });
                setError('');
              }}
            />
            <p id='name-help' className='text-xs text-muted-foreground'>
              Từ 3–100 ký tự. Dùng tên để khách dễ tìm và nhận biết.
            </p>
          </div>
          <div className='space-y-2'>
            <div className='flex items-center justify-between gap-3'>
              <label htmlFor='workspace-description' className='text-sm font-medium'>
                Giới thiệu ngắn{' '}
                <span className='font-normal text-muted-foreground'>(tùy chọn)</span>
              </label>
            </div>
            <Textarea
              id='workspace-description'
              rows={4}
              value={basic.description}
              placeholder='Điểm nổi bật, không khí làm việc hoặc vị trí thuận tiện…'
              onChange={(e) => setBasic({ description: e.target.value })}
            />
            <p className='text-xs text-muted-foreground'>
              1–2 câu ngắn, tập trung vào điều khách sẽ trải nghiệm.
            </p>
          </div>
          {error && (
            <p role='alert' className='rounded-lg bg-destructive/5 p-3 text-xs text-destructive'>
              {error}
            </p>
          )}
          <div className='wizard-actions'>
            {!editing && (
              <Button
                type='button'
                variant='outline'
                disabled={isSaving}
                onClick={() => void saveDraftToServer()}
              >
                Lưu bản nháp
              </Button>
            )}
            <Button type='submit' disabled={isSaving}>
              {editing ? <Save className='size-4' /> : <ArrowRight className='size-4' />}
              {isSaving ? 'Đang lưu…' : editing ? 'Xem lại thay đổi' : 'Tiếp tục'}
            </Button>
          </div>
        </form>
        <aside className='space-y-4'>
          <div className='wizard-panel'>
            <div className='mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground'>
              <Eye className='size-4' />
              Khách sẽ thấy
            </div>
            <div className='mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary'>
              <Building2 className='size-6' />
            </div>
            <p className='break-words text-base font-semibold'>
              {basic.name.trim() || 'Tên không gian của bạn'}
            </p>
            <p className='mt-2 break-words text-sm leading-relaxed text-muted-foreground'>
              {basic.description.trim() || 'Phần giới thiệu ngắn sẽ hiển thị ở đây.'}
            </p>
          </div>
          <p className='wizard-hint'>
            Tên và giới thiệu sẽ xuất hiện trên trang không gian. Bạn có thể cập nhật lại bất cứ lúc
            nào.
          </p>
        </aside>
      </div>
    </div>
  );
}
