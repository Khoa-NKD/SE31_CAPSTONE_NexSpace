import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_HEIGHTS = [45, 72, 58, 86, 40, 92, 65, 50, 78, 62, 84, 54];

export function BarGraphSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-6 w-[160px]' />
          <Skeleton className='h-5 w-[60px] rounded-full' />
        </div>
        <Skeleton className='h-4 w-[150px]' />
      </CardHeader>
      <CardContent>
        <div className='flex aspect-auto h-[280px] w-full items-end justify-around gap-2 pt-8'>
          {SKELETON_HEIGHTS.map((height, i) => (
            <Skeleton
              key={i}
              className='w-full rounded-t-sm'
              style={{
                height: `${height}%`
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
