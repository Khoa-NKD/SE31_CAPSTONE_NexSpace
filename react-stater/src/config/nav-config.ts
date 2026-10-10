import { NavGroup } from '@/types';

/**
 * Navigation configuration for NexSpace Admin Console
 * Aligned with Stitch Project 6390451165421541093.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Operational Console',
    items: [
      {
        title: 'Overview',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Triage & Audits',
        url: '#triage',
        icon: 'warning',
        label: '20',
        disabled: true,
        description: 'Scheduled for Batch 2'
      },
      {
        title: 'Users List',
        url: '/dashboard/admin/users',
        icon: 'user',
        shortcut: ['u', 'u'],
        isActive: false
      },
      {
        title: 'Role Permissions',
        url: '/dashboard/admin/roles',
        icon: 'lock',
        shortcut: ['r', 'r'],
        isActive: false
      },
      {
        title: 'Workspaces',
        url: '#workspaces',
        icon: 'workspace',
        disabled: true,
        label: 'Planned'
      },
      {
        title: 'Bookings Ledger',
        url: '#bookings',
        icon: 'calendar',
        disabled: true,
        label: 'Planned'
      },
      {
        title: 'Reconciliation',
        url: '#reconciliation',
        icon: 'billing',
        disabled: true,
        label: 'Planned'
      }
    ]
  },
  {
    label: 'Governance & System',
    items: [
      {
        title: 'Audit Logs',
        url: '#audit-logs',
        icon: 'page',
        disabled: true,
        label: 'Planned'
      },
      {
        title: 'Settings',
        url: '#settings',
        icon: 'settings',
        disabled: true,
        label: 'Planned'
      }
    ]
  },
  {
    label: 'Reference Elements',
    items: [
      {
        title: 'Forms',
        url: '#',
        icon: 'forms',
        isActive: false,
        items: [
          {
            title: 'Basic Form',
            url: '/dashboard/forms/basic',
            icon: 'forms',
            shortcut: ['f', 'f']
          },
          {
            title: 'Multi-Step Form',
            url: '/dashboard/forms/multi-step',
            icon: 'forms'
          },
          {
            title: 'Sheet & Dialog',
            url: '/dashboard/forms/sheet-form',
            icon: 'forms'
          },
          {
            title: 'Advanced Patterns',
            url: '/dashboard/forms/advanced',
            icon: 'forms'
          }
        ]
      },
      {
        title: 'React Query',
        url: '/dashboard/react-query',
        icon: 'code',
        isActive: false,
        items: []
      },
      {
        title: 'Kanban',
        url: '/dashboard/kanban',
        icon: 'kanban',
        isActive: false,
        items: []
      },
      {
        title: 'Chat',
        url: '/dashboard/chat',
        icon: 'chat',
        isActive: false,
        items: []
      }
    ]
  }
];
