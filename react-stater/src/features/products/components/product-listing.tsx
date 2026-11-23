import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import { Suspense } from 'react';
import { ProductTable } from './product-tables';

export default function ProductListingPage() {
  return (
    <Suspense
      fallback={
        <LoadingPlaceholder className='flex flex-1 flex-col gap-4'>
          <div className='bg-muted h-10 w-full rounded' />
          <div className='bg-muted h-96 w-full rounded-lg' />
          <div className='bg-muted h-10 w-full rounded' />
        </LoadingPlaceholder>
      }
    >
      <ProductTable />
    </Suspense>
  );
}
