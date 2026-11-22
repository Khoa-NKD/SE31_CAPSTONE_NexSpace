import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const subscribeToMount = () => () => {};

export function AlertModal({ isOpen, onClose, onConfirm, loading }: AlertModalProps) {
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false
  );

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title='Xác nhận xóa?'
      description='Thao tác này không thể hoàn tác.'
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className='flex w-full items-center justify-end space-x-2 pt-6'>
        <Button disabled={loading} variant='outline' onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={loading} onClick={onConfirm} variant='destructive' size='sm'>
          Xác nhận xóa
        </Button>
      </div>
    </Modal>
  );
}
