export type WorkspaceType = 'hot-desk' | 'dedicated-desk' | 'private-office' | 'meeting-room';

export type WorkspaceCity = 'hanoi' | 'hcm' | 'danang';

export interface WorkspaceItem {
  id: string;
  title: string;
  location: string;
  city: WorkspaceCity;
  type: WorkspaceType;
  hourlyPrice: number;
  dailyPrice?: number;
  rating: number;
  reviewCount: number;
  badgeText: string;
  badgeVariant: 'success' | 'warning' | 'default';
  amenities: string[];
  imageUrl: string;
  imageAlt: string;
}

export interface PlatformLayer {
  layerNumber: string;
  subtitle: string;
  title: string;
  description: string;
  iconName: string;
  href: string;
  ctaText: string;
  highlights: string[];
  metricLabel: string;
  metricValue: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  teamSize: string;
  location: string;
  avatarInitials: string;
  rating: number;
  category?: 'people' | 'operations' | 'cre';
}

export interface ResourceArticle {
  id: string;
  title: string;
  summary: string;
  readTime: string;
  category: string;
  date: string;
  href: string;
}

export interface PlatformStat {
  value: string;
  label: string;
  description: string;
}

export interface SearchFilters {
  mode: WorkspaceType;
  location: string;
  dateTime: string;
  capacity: string;
}
