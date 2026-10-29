import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';

export function Breadcrumbs() {
  const items = useBreadcrumbs();
  if (items.length === 0) return null;

  return (
    <Breadcrumb aria-label='Hierarchy Navigation'>
      <BreadcrumbList className='text-xs font-medium gap-1.5 sm:gap-1.5 flex-nowrap overflow-hidden'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasNavigableLink = !!item.link && item.link !== '#' && item.link !== '';

          return (
            <Fragment key={item.title}>
              {!isLast ? (
                <BreadcrumbItem className='hidden sm:inline-flex items-center shrink-0'>
                  {hasNavigableLink ? (
                    <BreadcrumbLink asChild className='text-muted-foreground hover:text-foreground transition-colors'>
                      <Link to={item.link}>{item.title}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className='text-muted-foreground/80 font-normal select-none cursor-default'>
                      {item.title}
                    </span>
                  )}
                </BreadcrumbItem>
              ) : (
                <BreadcrumbPage className='font-semibold text-foreground truncate max-w-[200px] sm:max-w-[260px]'>
                  {item.title}
                </BreadcrumbPage>
              )}

              {!isLast && (
                <BreadcrumbSeparator className='hidden sm:inline-flex shrink-0' />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
