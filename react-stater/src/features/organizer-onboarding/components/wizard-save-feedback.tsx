import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { create } from 'zustand';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from '@/components/ui/hugeicons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

// Save feedback is transient UI state and must not reopen after a page reload.
export const useWizardSaveFeedback = create<{ workspaceId: string | null }>(() => ({
  workspaceId: null
}));

export function WizardSaveFeedback({ finalStep }: { finalStep: boolean }) {
  const workspaceId = useWizardSaveFeedback((state) => state.workspaceId);
  const navigate = useNavigate();
  const close = () => useWizardSaveFeedback.setState({ workspaceId: null });
  const overview = () => {
    if (!workspaceId) return;
    close();
    void navigate({
      to: '/dashboard/organizer/workspaces/create/review',
      search: { id: workspaceId, mode: 'edit' }
    });
  };

  useEffect(() => {
    if (!finalStep || !workspaceId) return;
    useWizardSaveFeedback.setState({ workspaceId: null });
    void navigate({
      to: '/dashboard/organizer/workspaces/create/review',
      search: { id: workspaceId, mode: 'edit' }
    });
  }, [finalStep, workspaceId, navigate]);

  return (
    <Dialog
      open={!!workspaceId && !finalStep}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <span className='mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <CheckCircle2 className='size-5' />
          </span>
          <DialogTitle>Đã ghi nhận bản chỉnh sửa</DialogTitle>
          <DialogDescription>
            Bản sửa được giữ tạm. Xem lại tại tổng quan và bấm “Lưu thay đổi” để áp dụng vào hệ
            thống.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={close}>
            Tiếp tục chỉnh sửa
          </Button>
          <Button onClick={overview}>
            Đến tổng quan <ArrowRight className='size-4' />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
