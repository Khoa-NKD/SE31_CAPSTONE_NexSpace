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
        title: 'Platform Analytics',
        url: '/dashboard/admin/analytics',
        icon: 'trendingUp',
        isActive: false,
        label: 'Live'
      },
      {
        title: 'Organizer Verification',
        url: '/dashboard/admin/organizers',
        icon: 'badgeCheck',
        label: '17',
        isActive: false,
        items: [
          {
            title: 'Overview',
            url: '/dashboard/admin/organizers',
            icon: 'badgeCheck'
          },
          {
            title: 'Verification Queue',
            url: '/dashboard/admin/organizers/queue',
            icon: 'clock'
          }
        ]
      },
      {
        title: 'Workspaces',
        url: '/dashboard/admin/workspaces',
        icon: 'workspace',
        isActive: false,
        items: [
          {
            title: 'Overview',
            url: '/dashboard/admin/workspaces',
            icon: 'workspace'
          },
          {
            title: 'Directory & Moderation',
            url: '/dashboard/admin/workspaces/directory',
            icon: 'workspace'
          }
        ]
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
        title: 'Bookings Ledger',
        url: '/dashboard/admin/bookings',
        icon: 'calendar',
        isActive: false,
        label: '12 Active'
      },
      {
        title: 'Reconciliation',
        url: '/dashboard/admin/reconciliation',
        icon: 'billing',
        isActive: false,
        label: 'Reconciled'
      },
      {
        title: 'Refunds & Claims',
        url: '/dashboard/admin/refunds',
        icon: 'creditCard',
        isActive: false,
        label: '3'
      },
      {
        title: 'Commission & Fees',
        url: '/dashboard/admin/commissions',
        icon: 'adjustments',
        isActive: false,
        items: [
          {
            title: 'Fee Structure Overview',
            url: '/dashboard/admin/commissions',
            icon: 'billing'
          },
          {
            title: 'Rules Configuration',
            url: '/dashboard/admin/commissions/rules',
            icon: 'adjustments'
          }
        ]
      }
    ]
  },
  {
    label: 'Governance & Moderation',
    items: [
      {
        title: 'Reports Overview',
        url: '/dashboard/admin/reports',
        icon: 'warning',
        isActive: false,
        label: '5 Open'
      },
      {
        title: 'Dispute Cases',
        url: '/dashboard/admin/disputes',
        icon: 'badgeCheck',
        isActive: false,
        label: '5'
      },
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

/**
 * Navigation configuration for NexSpace Organizer Console
 * Aligned with Stitch Project 15215263515213658245.
 */
export const organizerNavGroups: NavGroup[] = [
  {
    label: 'Organizer Console',
    items: [
      {
        title: 'My Workspaces',
        url: '/dashboard/organizer/workspaces',
        icon: 'workspace',
        shortcut: ['w', 'w'],
        isActive: false
      },
      {
        title: 'Floor Plan & Zones',
        url: '/dashboard/organizer/floorplan',
        icon: 'forms',
        isActive: false
      },
      {
        title: 'Resource Table',
        url: '/dashboard/organizer/resources',
        icon: 'galleryVerticalEnd',
        isActive: false
      },
      {
        title: 'Create Resource',
        url: '/dashboard/organizer/resources/create',
        icon: 'plusCircle',
        isActive: false,
        label: 'New'
      },
      {
        title: 'Pricing Matrix',
        url: '/dashboard/organizer/pricing',
        icon: 'billing',
        isActive: false
      },
      {
        title: 'Blockout Hours',
        url: '/dashboard/organizer/blockout',
        icon: 'calendar',
        isActive: false
      },
      {
        title: 'Bookings',
        url: '/dashboard/organizer/bookings',
        icon: 'calendar',
        shortcut: ['b', 'b'],
        isActive: false,
        label: '8 Active'
      },
      {
        title: 'Schedule (Gantt)',
        url: '/dashboard/organizer/schedule',
        icon: 'clock',
        shortcut: ['s', 's'],
        isActive: false,
        label: 'Live'
      },
      {
        title: 'Analytics',
        url: '#analytics',
        icon: 'trendingUp',
        disabled: true,
        label: 'Planned'
      }
    ]
  }
];
