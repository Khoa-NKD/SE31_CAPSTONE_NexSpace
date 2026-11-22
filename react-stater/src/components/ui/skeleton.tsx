import { cn } from '@/lib/utils';
import { LoadingPlaceholder } from './loading-placeholder';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <LoadingPlaceholder
      data-slot='skeleton'
      className={cn('rounded-md bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
