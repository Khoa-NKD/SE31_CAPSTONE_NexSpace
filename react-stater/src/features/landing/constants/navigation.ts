export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export interface SolutionItem {
  title: string;
  description: string;
  href: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Workspaces', href: '#workspaces' },
  { label: 'Platform', href: '#platform' },
  { label: 'Enterprise', href: '#enterprise' },
  { label: 'Resources', href: '#resources' }
];

export const SOLUTIONS_ITEMS: SolutionItem[] = [
  {
    title: 'For Individuals',
    description: 'Hot desks & nomad passes',
    href: '#individuals'
  },
  {
    title: 'For Hybrid Teams',
    description: 'Shared credits & desk booking',
    href: '#teams'
  },
  {
    title: 'For Enterprise',
    description: 'Private suites & multi-hub leases',
    href: '#enterprise'
  }
];

export const FOOTER_COLUMNS = [
  {
    title: 'Workspaces',
    links: [
      { label: 'Hot Desks', href: '#workspaces' },
      { label: 'Dedicated Suites', href: '#workspaces' },
      { label: 'Meeting Rooms', href: '#workspaces' },
      { label: 'Enterprise Hybrid', href: '#enterprise' },
      { label: 'Day Passes', href: '#workspaces' }
    ]
  },
  {
    title: 'Platform & Solutions',
    links: [
      { label: 'Individuals', href: '#individuals' },
      { label: 'Hybrid Teams', href: '#teams' },
      { label: 'Space Management OS', href: '#space-os' },
      { label: 'Security & SOC-2', href: '#security' },
      { label: 'API Documentation', href: '#api' }
    ]
  },
  {
    title: 'For Space Organizers',
    links: [
      { label: 'List Your Building', href: '#list-space' },
      { label: '2D Floor Plan Builder', href: '#floorplan' },
      { label: 'Instant PayOS Payouts', href: '#payouts' },
      { label: 'Partner Directory', href: '#partners' },
      { label: 'System Status', href: '#status' }
    ]
  },
  {
    title: 'Company & Trust',
    links: [
      { label: 'About NexSpace', href: '/about' },
      { label: 'Privacy Notice', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Compliance Center', href: '#compliance' },
      { label: 'Press Kit', href: '#press' }
    ]
  }
];

export const COMPLIANCE_BADGES = [
  { label: 'SOC-2 Type II Certified', icon: 'ShieldCheck' },
  { label: 'ISO 27001', icon: 'Shield' },
  { label: 'WCAG 2.1 AA', icon: 'Accessibility' }
];

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'VND', symbol: '₫', label: 'VND (₫)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$)' }
];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'vi', label: 'Tiếng Việt' }
];
