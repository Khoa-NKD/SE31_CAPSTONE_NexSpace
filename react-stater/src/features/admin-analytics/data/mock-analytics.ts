export interface WorkspaceLeaderboardItem {
  rank: number;
  id: string;
  name: string;
  address: string;
  city: 'HCMC' | 'Hanoi' | 'Da Nang' | 'Singapore';
  district: string;
  totalBookings30d: number;
  grossRevenueUsd: number;
  grossRevenueVnd: number;
  grossRevenueDisplay: string;
  localCurrencyDisplay: string;
  averageOccupancyPercent: number;
  occupancyStatus: 'Optimal' | 'Steady' | 'Standard';
  satisfactionRating: number;
  reviewsCount: number;
  iconType: 'domain' | 'corporate' | 'apartment' | 'hub' | 'beach';
}

export interface MacroTrendPoint {
  month: string;
  gmvUsd: number;
  netRevenueUsd: number;
}

export interface ResourceWeekPoint {
  week: string;
  hotDesks: number;
  meetingSuites: number;
  dedicatedPods: number;
}

export const MOCK_LEADERBOARD_ITEMS: WorkspaceLeaderboardItem[] = [
  {
    rank: 1,
    id: 'hub-01',
    name: 'NexSpace Saigon Prime Hub',
    address: 'Level 14-16, Friendship Tower, Le Duan Blvd',
    city: 'HCMC',
    district: 'District 1, HCMC',
    totalBookings30d: 1240,
    grossRevenueUsd: 38420,
    grossRevenueVnd: 960500000,
    grossRevenueDisplay: '$38,420 USD',
    localCurrencyDisplay: '960,500,000 VND',
    averageOccupancyPercent: 88.6,
    occupancyStatus: 'Optimal',
    satisfactionRating: 4.95,
    reviewsCount: 412,
    iconType: 'domain'
  },
  {
    rank: 2,
    id: 'hub-02',
    name: 'Landmark 81 Innovation Center',
    address: 'Floor 42, Vinhomes Central Park',
    city: 'HCMC',
    district: 'Binh Thanh, HCMC',
    totalBookings30d: 985,
    grossRevenueUsd: 31150,
    grossRevenueVnd: 778750000,
    grossRevenueDisplay: '$31,150 USD',
    localCurrencyDisplay: '778,750,000 VND',
    averageOccupancyPercent: 84.2,
    occupancyStatus: 'Steady',
    satisfactionRating: 4.91,
    reviewsCount: 289,
    iconType: 'corporate'
  },
  {
    rank: 3,
    id: 'hub-03',
    name: 'Westlake Executive Suites',
    address: '58 Xuan Dieu Promenade',
    city: 'Hanoi',
    district: 'Tay Ho, Hanoi',
    totalBookings30d: 780,
    grossRevenueUsd: 24800,
    grossRevenueVnd: 620000000,
    grossRevenueDisplay: '$24,800 USD',
    localCurrencyDisplay: '620,000,000 VND',
    averageOccupancyPercent: 79.5,
    occupancyStatus: 'Standard',
    satisfactionRating: 4.88,
    reviewsCount: 215,
    iconType: 'apartment'
  },
  {
    rank: 4,
    id: 'hub-04',
    name: 'Marina Bay FinTech Pods',
    address: 'Tower 2, 10 Marina Boulevard',
    city: 'Singapore',
    district: 'Downtown Core, SG',
    totalBookings30d: 650,
    grossRevenueUsd: 22400,
    grossRevenueVnd: 560000000,
    grossRevenueDisplay: '$22,400 USD',
    localCurrencyDisplay: '30,240 SGD',
    averageOccupancyPercent: 76.8,
    occupancyStatus: 'Standard',
    satisfactionRating: 4.94,
    reviewsCount: 198,
    iconType: 'hub'
  },
  {
    rank: 5,
    id: 'hub-05',
    name: 'Da Nang Coastal Innovation Hub',
    address: 'Vo Nguyen Giap Beachfront Complex',
    city: 'Da Nang',
    district: 'Son Tra, Da Nang',
    totalBookings30d: 540,
    grossRevenueUsd: 16920,
    grossRevenueVnd: 423000000,
    grossRevenueDisplay: '$16,920 USD',
    localCurrencyDisplay: '423,000,000 VND',
    averageOccupancyPercent: 73.1,
    occupancyStatus: 'Standard',
    satisfactionRating: 4.86,
    reviewsCount: 164,
    iconType: 'beach'
  }
];

export const MOCK_GMV_REVENUE_TRENDS: MacroTrendPoint[] = [
  { month: 'Aug 25', gmvUsd: 72000, netRevenueUsd: 8640 },
  { month: 'Sep 25', gmvUsd: 84000, netRevenueUsd: 10080 },
  { month: 'Oct 25', gmvUsd: 96000, netRevenueUsd: 11520 },
  { month: 'Nov 25', gmvUsd: 115000, netRevenueUsd: 13800 },
  { month: 'Dec 25', gmvUsd: 128000, netRevenueUsd: 15360 },
  { month: 'Jan 26', gmvUsd: 142500, netRevenueUsd: 17100 }
];

export const MOCK_RESOURCE_WEEK_BREAKDOWN: ResourceWeekPoint[] = [
  { week: 'Wk 48', hotDesks: 420, meetingSuites: 230, dedicatedPods: 110 },
  { week: 'Wk 49', hotDesks: 460, meetingSuites: 260, dedicatedPods: 130 },
  { week: 'Wk 50', hotDesks: 490, meetingSuites: 280, dedicatedPods: 140 },
  { week: 'Wk 51', hotDesks: 530, meetingSuites: 310, dedicatedPods: 150 },
  { week: 'Wk 52', hotDesks: 560, meetingSuites: 340, dedicatedPods: 165 },
  { week: 'Wk 01', hotDesks: 600, meetingSuites: 380, dedicatedPods: 185 }
];
