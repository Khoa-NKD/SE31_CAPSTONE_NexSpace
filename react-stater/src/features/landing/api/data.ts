import type {
  PlatformLayer,
  PlatformStat,
  ResourceArticle,
  TestimonialItem,
  WorkspaceItem
} from './types';

export const WORKSPACE_ITEMS: WorkspaceItem[] = [
  {
    id: 'hive-central-hcm',
    title: 'The Hive Central - Sky Tower',
    location: 'District 1, Ho Chi Minh City',
    city: 'hcm',
    type: 'hot-desk',
    hourlyPrice: 3,
    dailyPrice: 18,
    rating: 4.9,
    reviewCount: 128,
    badgeText: 'Instant Book',
    badgeVariant: 'success',
    amenities: ['Herman Miller Chairs', 'Fiber 500Mbps', 'Barista on-site'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDlRq-1jYuWUSER-XhFXvkOgpiFdNy2GbybP6UJcu7yPwgYn_Ph7mrbbTjc_y8f-oahDdmdnm9sYyylx3TvoJ0HEUaEEjEVgMzn-GCzi6w0XBIrnGaVQk_VapdNxaPbCPoJP5RBryaGDv_VUHtDN20WGgyQ6_dpx1jO6zCMlhFMvBvMNP7oBeKtCnLOCrW9xVCB3uSAeGwwyvsqoQwrlIaqBs9MjxQ6kkffDUJ9nHQCTMYum1XGk2z2dw',
    imageAlt:
      'A modern sunlit commercial coworking hub located inside a high-rise office building with ergonomic task chairs and polished concrete floors.'
  },
  {
    id: 'komorebi-executive-hcm',
    title: 'Komorebi Executive Hub',
    location: 'Thao Dien, Thu Duc City',
    city: 'hcm',
    type: 'dedicated-desk',
    hourlyPrice: 5,
    dailyPrice: 32,
    rating: 4.95,
    reviewCount: 84,
    badgeText: '10-Min Hold Available',
    badgeVariant: 'warning',
    amenities: ['Acoustic phone booths', '4K Dual Display', 'Free Espresso'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCcFQY-GS37zcb1aqHaGo088a6cbxtVxgz9Q_GfxTKhAwWWPJys0tIslSLhFyka4AX8Tq-DdwIab8SI013JwSNj3zcQ3Tz8gUpp31GHAQ_Zi6pcjnwcJqnP-Il3uUrTrqU8SzZpdwis0ZVKPBEi1IJmT5N9X6-CIPzyfwMS0cGlFg1fAbhjJl_FN6n9qEm3GR-I0rXe1CC8rfWWnxI5TfrwkXUh9mxIq0OwdqzFx7M4ytQJGGZkTBTQOA',
    imageAlt:
      'Executive minimalist private team office suite featuring glass walls, acoustic slat wood panelling, and warm ambient lighting.'
  },
  {
    id: 'nexus-innovation-hcm',
    title: 'Nexus Innovation Lounge',
    location: 'Binh Thanh District, Ho Chi Minh City',
    city: 'hcm',
    type: 'meeting-room',
    hourlyPrice: 12,
    dailyPrice: 85,
    rating: 4.88,
    reviewCount: 62,
    badgeText: 'Instant Confirmation',
    badgeVariant: 'success',
    amenities: ['Video conferencing', 'Smart Whiteboards', 'Concierge Service'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAhwE9dCLnLyJUsBHuD0TfFd3T8vpWcRXPJHnPL5QF-cip384NVdvQ2ph-g-CcLyTHDnVWRGLDCTSXcZMLPNo34LKttrbnWIGns9QdWs6gqfQaOBJKKRKaH7OQR9SoBtZ8KP8x2JyNBfthvpzePA8ddjGVmu3WrDYD-RzcVFfzwA-dQBeQnGz5PdVl5LV_5LmGLhnWKV7YEmqJQ_XEvs3SR1CIYhuD67huoXyQEag5zJ442Csr5U-eJDA',
    imageAlt:
      'Modern enterprise boardroom and collaborative meeting space with telepresence video conference monitor.'
  },
  {
    id: 'westlake-loft-hanoi',
    title: 'Westlake Creative Loft',
    location: 'Tay Ho District, Hanoi',
    city: 'hanoi',
    type: 'hot-desk',
    hourlyPrice: 3.5,
    dailyPrice: 20,
    rating: 4.92,
    reviewCount: 95,
    badgeText: 'Instant Book',
    badgeVariant: 'success',
    amenities: ['Lake View Terrace', 'Gigabit WiFi', 'Artisan Coffee'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDlRq-1jYuWUSER-XhFXvkOgpiFdNy2GbybP6UJcu7yPwgYn_Ph7mrbbTjc_y8f-oahDdmdnm9sYyylx3TvoJ0HEUaEEjEVgMzn-GCzi6w0XBIrnGaVQk_VapdNxaPbCPoJP5RBryaGDv_VUHtDN20WGgyQ6_dpx1jO6zCMlhFMvBvMNP7oBeKtCnLOCrW9xVCB3uSAeGwwyvsqoQwrlIaqBs9MjxQ6kkffDUJ9nHQCTMYum1XGk2z2dw',
    imageAlt: 'Sunlit loft overlooking West Lake in Hanoi with minimalist wood desks.'
  },
  {
    id: 'ba-dinh-boardroom-hanoi',
    title: 'Ba Dinh Executive Center',
    location: 'Ba Dinh District, Hanoi',
    city: 'hanoi',
    type: 'private-office',
    hourlyPrice: 8,
    dailyPrice: 55,
    rating: 4.89,
    reviewCount: 47,
    badgeText: 'Instant Confirmation',
    badgeVariant: 'success',
    amenities: ['Private Server Racks', 'Soundproof Booths', 'Receptionist'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCcFQY-GS37zcb1aqHaGo088a6cbxtVxgz9Q_GfxTKhAwWWPJys0tIslSLhFyka4AX8Tq-DdwIab8SI013JwSNj3zcQ3Tz8gUpp31GHAQ_Zi6pcjnwcJqnP-Il3uUrTrqU8SzZpdwis0ZVKPBEi1IJmT5N9X6-CIPzyfwMS0cGlFg1fAbhjJl_FN6n9qEm3GR-I0rXe1CC8rfWWnxI5TfrwkXUh9mxIq0OwdqzFx7M4ytQJGGZkTBTQOA',
    imageAlt: 'Premium executive center in Hanoi with conference room facilities.'
  },
  {
    id: 'mykhe-coastal-danang',
    title: 'My Khe Beachside Lab',
    location: 'Son Tra, Da Nang',
    city: 'danang',
    type: 'hot-desk',
    hourlyPrice: 2.5,
    dailyPrice: 15,
    rating: 4.96,
    reviewCount: 110,
    badgeText: 'Instant Book',
    badgeVariant: 'success',
    amenities: ['Oceanfront Balcony', 'Standing Desks', 'Surfboard Storage'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAhwE9dCLnLyJUsBHuD0TfFd3T8vpWcRXPJHnPL5QF-cip384NVdvQ2ph-g-CcLyTHDnVWRGLDCTSXcZMLPNo34LKttrbnWIGns9QdWs6gqfQaOBJKKRKaH7OQR9SoBtZ8KP8x2JyNBfthvpzePA8ddjGVmu3WrDYD-RzcVFfzwA-dQBeQnGz5PdVl5LV_5LmGLhnWKV7YEmqJQ_XEvs3SR1CIYhuD67huoXyQEag5zJ442Csr5U-eJDA',
    imageAlt: 'Beachfront creative tech space in Da Nang with breezy natural light.'
  }
];

export const PLATFORM_LAYERS: PlatformLayer[] = [
  {
    layerNumber: 'LAYER 01',
    subtitle: 'FLEXIBLE WORKSPACE',
    title: 'Global workspace access—on demand.',
    description:
      'Book private suites, quiet focus pods, and high-spec meeting rooms by the hour, day, month—or longer. Empower individuals, distributed teams, or your full enterprise workforce across 500+ curated premium hubs.',
    iconName: 'Compass',
    href: '#workspaces',
    ctaText: 'Explore Spaces',
    highlights: [
      'Instant On-Demand Booking',
      'Over 100,000 Spaces Globally',
      'Single Consolidated Corporate Account',
      'Integrated Digital Keycard Telemetry'
    ],
    metricLabel: 'Live Network Uptime',
    metricValue: '99.8%'
  },
  {
    layerNumber: 'LAYER 02',
    subtitle: 'WORKPLACE OPERATIONS',
    title: 'Simplify control. Maximize efficiency.',
    description:
      'Gain complete control over every moving part—from permissions, multi-tier approval policies, and dynamic team budgets to automated PayOS settlements and digital keycard authorizations.',
    iconName: 'SlidersHorizontal',
    href: '#enterprise',
    ctaText: 'Explore Operations',
    highlights: [
      'Multi-Level Corporate Governance',
      'Automated Team Credit Allocations',
      'Instant PayOS & Bank Reconciliation',
      'No More Manual Expense Reports'
    ],
    metricLabel: 'Admin Time Saved',
    metricValue: '85%'
  },
  {
    layerNumber: 'LAYER 03',
    subtitle: 'CORPORATE REAL ESTATE STRATEGY',
    title: 'Plan with confidence. Optimize with data.',
    description:
      'Leverage behavioral insights, real-time occupancy telemetry, and live market benchmarks to model lease ROI, simulate workforce scenarios, and eliminate underutilized square footage.',
    iconName: 'BarChart3',
    href: '#list-space',
    ctaText: 'Model Portfolio ROI',
    highlights: [
      'Real-Time Space Utilization Metrics',
      'Interactive 2D Spatial Floor Plans',
      'Dynamic Pricing & Monetization Engine',
      'ESG Carbon Footprint Telemetry'
    ],
    metricLabel: 'Average Lease Savings',
    metricValue: '38%'
  }
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'testimonial-softchoice',
    rating: 5,
    quote:
      'It’s not lease or flex—it’s lease plus flex. That helped us get the best of both worlds. And with NexSpace, we can adapt in real time. We’re not guessing anymore. We’re watching what actually works.',
    name: 'Kat Cassin',
    role: 'Head of People Operations',
    company: 'Softchoice, a WWT company',
    teamSize: '10,000+ employees',
    location: 'Global Hubs',
    avatarInitials: 'KC',
    category: 'people'
  },
  {
    id: 'testimonial-gofundme',
    rating: 5,
    quote:
      'It wasn’t about eliminating offices — it was about unlocking choice and supporting employees. We use real usage patterns before making long-term decisions, and flexibility lets us ebb and flow as our teams evolve.',
    name: 'Giana Rodriguez',
    role: 'Director of Workplace Experience',
    company: 'GoFundMe',
    teamSize: '1,500+ distributed',
    location: 'San Francisco & SEA',
    avatarInitials: 'GR',
    category: 'people'
  },
  {
    id: 'testimonial-tmobile',
    rating: 5,
    quote:
      'Our overall real estate spend is down 38%. NexSpace allows teams in emerging markets where we don’t have permanent offices to gather on an on-demand basis with complete security compliance.',
    name: 'Marcus Vance',
    role: 'Corporate Real Estate Strategy Leader',
    company: 'T-Mobile Enterprise',
    teamSize: '70,000+ employees',
    location: 'North America & APAC',
    avatarInitials: 'MV',
    category: 'cre'
  },
  {
    id: 'testimonial-velo',
    rating: 5,
    quote:
      'NexSpace allowed our 140-person engineering team to transition seamlessly into a flexible hybrid model. We cut 38% off our commercial lease overhead while employee satisfaction with desk flexibility reached 96%.',
    name: 'Minh Tran',
    role: 'Head of People & Workplace',
    company: 'Fintech Velo',
    teamSize: '140+ employees',
    location: 'Ho Chi Minh City',
    avatarInitials: 'MT',
    category: 'operations'
  },
  {
    id: 'testimonial-seatech',
    rating: 5,
    quote:
      'Managing workspace credits across Hanoi, Da Nang, and Singapore used to be an administrative nightmare of expensing receipts. NexSpace unified our booking, billing, and team budget allocations into one clean dashboard.',
    name: 'Sarah Nguyen',
    role: 'Director of Remote Operations',
    company: 'SeaTech Global',
    teamSize: '300+ distributed',
    location: 'SEA Region',
    avatarInitials: 'SN',
    category: 'operations'
  },
  {
    id: 'testimonial-sae',
    rating: 5,
    quote:
      'NexSpace offers total flexibility. Hotels and rigid conference centers are increasingly expensive and have painful cancellation policies. This platform is a game-changer for our professional engineering cohorts.',
    name: 'Jeff Waltmire',
    role: 'Workplace Experience Manager',
    company: 'SAE Global Engineering',
    teamSize: '6,000+ employees',
    location: 'Global Hubs',
    avatarInitials: 'JW',
    category: 'cre'
  }
];

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    id: 'article-1',
    title: "The forecast is broken. Your commercial lease doesn't know that yet.",
    summary:
      'How do you responsibly make a 5-to-10 year commercial commitment when your hybrid headcount projections cannot predict 18 months ahead?',
    readTime: '4 min read',
    category: 'Workplace Strategy',
    date: 'Oct 2026',
    href: '#article-forecast'
  },
  {
    id: 'article-2',
    title: 'Operating today, building tomorrow: a Fortune 500 dual-space strategy.',
    summary:
      'How multinational technology leaders are coupling central brand flagships with agile satellite on-demand hubs to attract top regional engineering talent.',
    readTime: '2 min read',
    category: 'Enterprise Case Study',
    date: 'Sep 2026',
    href: '#article-dual-space'
  },
  {
    id: 'article-3',
    title: 'NexSpace License Administrator: the command center for flexible workspace.',
    summary:
      'Transforming flexible office license administration from a manual back-office afterthought into an automated corporate optimization engine.',
    readTime: '4 min read',
    category: 'Product Innovation',
    date: 'Aug 2026',
    href: '#article-license-os'
  }
];

export const PLATFORM_STATS: PlatformStat[] = [
  {
    value: '100,000+',
    label: 'Curated Spaces Worldwide',
    description: 'Instant on-demand desks, suites, and boardrooms across 3,500+ cities.'
  },
  {
    value: '38%',
    label: 'Lease Overhead Reduction',
    description: 'Average enterprise budget savings achieved through dynamic flex allocation.'
  },
  {
    value: '96%',
    label: 'Employee Flexibility Score',
    description: 'Reported satisfaction rating for teams with hybrid desk autonomy.'
  },
  {
    value: '< 15 min',
    label: 'Team Onboarding & Setup',
    description: 'Instant corporate credit disbursement and digital keycard provisioning.'
  }
];

export const PARTNER_LOGOS = [
  { name: 'T-Mobile', icon: 'Network', tag: 'Fortune 50' },
  { name: 'GoFundMe', icon: 'Sparkles', tag: 'Fintech' },
  { name: 'Allstate', icon: 'Shield', tag: 'Enterprise' },
  { name: 'GrabVentures', icon: 'Layers', tag: 'Unicorn' },
  { name: 'VNG Campus', icon: 'Hub', tag: 'Tech Giant' },
  { name: 'Smartsheet', icon: 'BarChart3', tag: 'SaaS Leader' },
  { name: 'Shopee Hub', icon: 'ShoppingBag', tag: 'E-commerce' },
  { name: 'VinAI Research', icon: 'Bot', tag: 'AI Institute' },
  { name: 'Techcombank Agile', icon: 'Landmark', tag: 'Tier-1 Bank' }
];
