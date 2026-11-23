'use client';
import { Spinner as Loader2Icon } from '@/components/ui/spinner';

import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from '@/components/ui/hugeicons';
import { useTheme } from '@/components/themes/theme-provider';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import './toast-motion.css';
/** Keep Sonner's queue, promises, focus handling and timers; apply Swipe Toast interaction styling. */
export function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position='top-right'
      closeButton
      swipeDirections={['bottom', 'right']}
      pauseWhenPageIsHidden
      className='ns-toaster'
      icons={{
        success: <CircleCheckIcon className='size-5' />,
        info: <InfoIcon className='size-5' />,
        warning: <TriangleAlertIcon className='size-5' />,
        error: <OctagonXIcon className='size-5' />,
        loading: <Loader2Icon className='size-5' />
      }}
      toastOptions={{
        classNames: {
          toast: 'ns-toast',
          title: 'ns-toast-title',
          description: 'ns-toast-description',
          closeButton: 'ns-toast-close',
          actionButton: 'ns-toast-action'
        }
      }}
      {...props}
    />
  );
}
