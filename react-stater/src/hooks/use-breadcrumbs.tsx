import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// Route mappings for accurate navigation hierarchies
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/overview': [
    { title: 'Platform Ops', link: '/dashboard/overview' },
    { title: 'Overview', link: '/dashboard/overview' },
    { title: 'Administrator Dashboard', link: '' }
  ],
  '/dashboard/admin/roles': [
    { title: 'Platform Ops', link: '/dashboard/overview' },
    { title: 'Access & Identity', link: '' },
    { title: 'Users & Role Permissions', link: '' }
  ],
  '/dashboard/admin/users': [
    { title: 'Platform Ops', link: '/dashboard/overview' },
    { title: 'Access & Identity', link: '' },
    { title: 'Users List & Details', link: '' }
  ],
  '/dashboard/users': [
    { title: 'Platform Ops', link: '/dashboard/overview' },
    { title: 'Access & Identity', link: '' },
    { title: 'Users List & Details', link: '' }
  ],
  '/dashboard/employee': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Employee', link: '/dashboard/employee' }
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Product', link: '/dashboard/product' }
  ]
};

export function useBreadcrumbs() {
  const { pathname } = useLocation();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
