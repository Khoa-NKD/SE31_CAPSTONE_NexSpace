/**
 * Mock Data for Screen A03 — Users List & User Details Drawer
 * Strictly deterministic sample data aligned with Stitch Project 6390451165421541093.
 *
 * NOTE: This file represents 10 concrete sample accounts used for UI verification.
 * The total simulated platform-wide user count is 18,420 accounts.
 */

export type UserRole = 'Customer' | 'Organizer' | 'Administrator';
export type UserAccountStatus = 'Active' | 'Locked' | 'Inactive';
export type UserKycStatus = 'Verified KYC' | 'Pending KYC' | 'Unverified';

export interface UserActivityLog {
  id: string;
  title: string;
  timestamp: string;
  detail: string;
  type: 'booking' | 'payment' | 'security' | 'moderation';
}

export interface AdminUserRecord {
  id: string; // e.g. USR-8821
  name: string;
  legalName: string;
  email: string;
  phone: string;
  company: string;
  role: UserRole;
  status: UserAccountStatus;
  kycStatus: UserKycStatus;
  registeredDate: string;
  registeredTimeUtc: string;
  avatarUrl: string;
  registrationIp: string;
  timezone: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  lastLogin: string;
  clientFingerprint: string;
  consecutiveFailedLogins: number;
  sessionRootKey: string;
  passwordLastChanged: string;
  stats: {
    totalBookings: number;
    gmvAmount: string;
    activeEscrows: number;
    escrowHoldAmount: string;
    disputesCount: number;
  };
  activityLogs: UserActivityLog[];
}

export const PLATFORM_TOTAL_ACCOUNTS = 18420;

export const INITIAL_MOCK_USERS: AdminUserRecord[] = [
  {
    id: 'USR-8821',
    name: 'Alex Nguyen',
    legalName: 'Alex Quoc Nguyen',
    email: 'alex.nguyen@techcorp.io',
    phone: '+84 (0)90 412 8821',
    company: 'TechCorp Vietnam Ltd',
    role: 'Customer',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'Oct 12, 2025',
    registeredTimeUtc: '08:30 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    registrationIp: '14.161.42.19 (Ho Chi Minh City, VN)',
    timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
    twoFactorEnabled: true,
    twoFactorMethod: 'Hardware TOTP / App',
    lastLogin: 'Oct 24, 2025 • 09:14:22 UTC',
    clientFingerprint: 'Chrome 129 on macOS Sonoma',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 3b8f912c4e918821',
    passwordLastChanged: '14 days ago (Compliant)',
    stats: {
      totalBookings: 24,
      gmvAmount: '$480.00 GMV',
      activeEscrows: 1,
      escrowHoldAmount: '$45.00 hold',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-1',
        title: 'Booked Dedicated Desk @ WeWork Sonatus',
        timestamp: 'Yesterday at 14:00 UTC • Booking ID #BK-9912',
        detail: 'Hourly pass reservation in District 1 Hub',
        type: 'booking'
      },
      {
        id: 'act-2',
        title: 'Invoice #INV-2025-881 settled via PayOS',
        timestamp: 'Oct 20, 2025 • $45.00 Escrow Released',
        detail: 'Instant settlement to venue account',
        type: 'payment'
      }
    ]
  },
  {
    id: 'USR-9432',
    name: 'Sarah Jenkins',
    legalName: 'Sarah Marie Jenkins',
    email: 'sarah@loftspaces.vn',
    phone: '+84 (0)93 881 2290',
    company: 'LoftSpaces Hospitality Group',
    role: 'Organizer',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'Sep 28, 2025',
    registeredTimeUtc: '14:20 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    registrationIp: '118.69.182.10 (Da Nang, VN)',
    timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
    twoFactorEnabled: true,
    twoFactorMethod: 'SMS + Authenticator',
    lastLogin: 'Today • 02:40:11 UTC',
    clientFingerprint: 'Safari 18 on macOS Sequoia',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 77a1bc829e019432',
    passwordLastChanged: '30 days ago (Compliant)',
    stats: {
      totalBookings: 180,
      gmvAmount: '$12,450.00 GMV',
      activeEscrows: 4,
      escrowHoldAmount: '$380.00 hold',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-3',
        title: 'Published New Meeting Suite Listing',
        timestamp: 'Oct 22, 2025 • Da Nang Beach Hub',
        detail: 'Passed automated capacity compliance check',
        type: 'booking'
      }
    ]
  },
  {
    id: 'USR-7201',
    name: 'David Chen',
    legalName: 'David Wei Chen',
    email: 'david.chen@enterprise.sg',
    phone: '+65 8129 4402',
    company: 'SingaTech Pte Ltd',
    role: 'Customer',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'Sep 20, 2025',
    registeredTimeUtc: '10:15 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    registrationIp: '202.166.19.4 (Singapore)',
    timezone: 'Asia/Singapore (UTC+8)',
    twoFactorEnabled: true,
    twoFactorMethod: 'FIDO2 Security Key',
    lastLogin: 'Yesterday • 18:02:00 UTC',
    clientFingerprint: 'Edge 128 on Windows 11',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 9e44bc7712347201',
    passwordLastChanged: '60 days ago',
    stats: {
      totalBookings: 52,
      gmvAmount: '$3,800.00 GMV',
      activeEscrows: 2,
      escrowHoldAmount: '$120.00 hold',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-4',
        title: 'Team Workshop Pass Reserved',
        timestamp: 'Oct 23, 2025 • 20 Seats',
        detail: 'Multi-seat reservation confirmed via PayOS',
        type: 'booking'
      }
    ]
  },
  {
    id: 'USR-6844',
    name: 'Elena Rostova',
    legalName: 'Elena Rostova',
    email: 'elena.rostova@nomadlife.org',
    phone: '+7 916 230 4481',
    company: 'Nomad Collective',
    role: 'Customer',
    status: 'Locked',
    kycStatus: 'Pending KYC',
    registeredDate: 'Sep 14, 2025',
    registeredTimeUtc: '11:45 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    registrationIp: '194.85.12.9 (Moscow, RU)',
    timezone: 'Europe/Moscow (UTC+3)',
    twoFactorEnabled: false,
    twoFactorMethod: 'None',
    lastLogin: 'Oct 19, 2025 • 04:11:00 UTC',
    clientFingerprint: 'Firefox 130 on Linux Ubuntu',
    consecutiveFailedLogins: 4,
    sessionRootKey: 'SHA256: 1a88bb9900216844',
    passwordLastChanged: '45 days ago',
    stats: {
      totalBookings: 3,
      gmvAmount: '$90.00 GMV',
      activeEscrows: 0,
      escrowHoldAmount: '$0.00',
      disputesCount: 1
    },
    activityLogs: [
      {
        id: 'act-5',
        title: 'Account Locked by Security Rule',
        timestamp: 'Oct 19, 2025 • Consecutive Login Failures',
        detail: 'Triggered automated 24h lockout policy',
        type: 'security'
      }
    ]
  },
  {
    id: 'USR-5198',
    name: 'Marcus Thorne',
    legalName: 'Marcus Anthony Thorne',
    email: 'm.thorne@aerospace.io',
    phone: '+84 (0)91 772 3341',
    company: 'AeroSpace Ventures',
    role: 'Organizer',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'Aug 30, 2025',
    registeredTimeUtc: '17:10 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    registrationIp: '14.225.10.8 (Ho Chi Minh City, VN)',
    timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
    twoFactorEnabled: true,
    twoFactorMethod: 'Authenticator App',
    lastLogin: 'Today • 01:15:30 UTC',
    clientFingerprint: 'Chrome 129 on macOS Sonoma',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: c3881023ba5198a1',
    passwordLastChanged: '20 days ago (Compliant)',
    stats: {
      totalBookings: 310,
      gmvAmount: '$24,800.00 GMV',
      activeEscrows: 3,
      escrowHoldAmount: '$450.00 hold',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-6',
        title: 'Monthly Payout Reconciled',
        timestamp: 'Oct 15, 2025 • PayOS Net Yield $2,976',
        detail: 'Direct deposit completed',
        type: 'payment'
      }
    ]
  },
  {
    id: 'USR-4412',
    name: 'Clara Oswald',
    legalName: 'Clara Oswald',
    email: 'clara@studioforma.design',
    phone: '+44 7911 123456',
    company: 'Studio Forma',
    role: 'Customer',
    status: 'Inactive',
    kycStatus: 'Unverified',
    registeredDate: 'Aug 19, 2025',
    registeredTimeUtc: '06:40 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    registrationIp: '82.165.197.1 (London, UK)',
    timezone: 'Europe/London (UTC+1)',
    twoFactorEnabled: false,
    twoFactorMethod: 'None',
    lastLogin: 'Aug 25, 2025 • 14:00:00 UTC',
    clientFingerprint: 'Safari on iOS 17',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 4412aa88cc110022',
    passwordLastChanged: '60+ days ago',
    stats: {
      totalBookings: 1,
      gmvAmount: '$25.00 GMV',
      activeEscrows: 0,
      escrowHoldAmount: '$0.00',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-7',
        title: 'Account Inactive for 60+ Days',
        timestamp: 'Aug 25, 2025 • Session Terminated',
        detail: 'No activity detected',
        type: 'security'
      }
    ]
  },
  {
    id: 'USR-3209',
    name: 'Liam Vance',
    legalName: 'Liam Alexander Vance',
    email: 'liam.vance@apexcloud.co',
    phone: '+1 (415) 890 1209',
    company: 'Apex Cloud Systems',
    role: 'Customer',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'Jul 04, 2025',
    registeredTimeUtc: '13:19 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    registrationIp: '64.233.160.1 (San Francisco, US)',
    timezone: 'America/Los_Angeles (UTC-7)',
    twoFactorEnabled: true,
    twoFactorMethod: 'Hardware TOTP',
    lastLogin: 'Oct 23, 2025 • 22:10:00 UTC',
    clientFingerprint: 'Chrome 129 on macOS Sonoma',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 3209bb8877119933',
    passwordLastChanged: '10 days ago (Compliant)',
    stats: {
      totalBookings: 14,
      gmvAmount: '$560.00 GMV',
      activeEscrows: 0,
      escrowHoldAmount: '$0.00',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-8',
        title: 'Meeting Room Pass Booked',
        timestamp: 'Oct 21, 2025 • District 1 Hub',
        detail: 'Completed check-in',
        type: 'booking'
      }
    ]
  },
  {
    id: 'USR-2194',
    name: 'Nguyen Van Hai',
    legalName: 'Nguyen Van Hai',
    email: 'hai.nguyen@hanoihub.com',
    phone: '+84 (0)98 331 4455',
    company: 'Hanoi Coworking JSC',
    role: 'Organizer',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'Jun 12, 2025',
    registeredTimeUtc: '09:00 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    registrationIp: '113.160.22.4 (Hanoi, VN)',
    timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
    twoFactorEnabled: true,
    twoFactorMethod: 'SMS + Authenticator',
    lastLogin: 'Oct 24, 2025 • 03:22:15 UTC',
    clientFingerprint: 'Chrome on Windows 11',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 2194cc7766554433',
    passwordLastChanged: '25 days ago',
    stats: {
      totalBookings: 240,
      gmvAmount: '$18,900.00 GMV',
      activeEscrows: 2,
      escrowHoldAmount: '$240.00 hold',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-9',
        title: 'Updated Capacity for West Lake Hub',
        timestamp: 'Oct 22, 2025 • 40 desks live',
        detail: 'Floor plan verified',
        type: 'booking'
      }
    ]
  },
  {
    id: 'USR-1882',
    name: 'Rachel Adams',
    legalName: 'Rachel Adams',
    email: 'rachel.adams@nexspace.io',
    phone: '+84 (0)90 112 3344',
    company: 'NexSpace Platform Governance',
    role: 'Administrator',
    status: 'Active',
    kycStatus: 'Verified KYC',
    registeredDate: 'May 01, 2025',
    registeredTimeUtc: '08:00 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    registrationIp: '14.161.42.1 (Ho Chi Minh City, VN)',
    timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
    twoFactorEnabled: true,
    twoFactorMethod: 'Hardware Enclave Security Key',
    lastLogin: 'Today • 03:40:00 UTC',
    clientFingerprint: 'Safari on macOS Sonoma',
    consecutiveFailedLogins: 0,
    sessionRootKey: 'SHA256: 1882ee1122334455',
    passwordLastChanged: '7 days ago (Compliant)',
    stats: {
      totalBookings: 0,
      gmvAmount: '$0.00',
      activeEscrows: 0,
      escrowHoldAmount: '$0.00',
      disputesCount: 0
    },
    activityLogs: [
      {
        id: 'act-10',
        title: 'Performed SOC2 Key Rotation',
        timestamp: 'Oct 20, 2025 • Automated Enclave Sync',
        detail: 'Hardware enclave verified',
        type: 'security'
      }
    ]
  },
  {
    id: 'USR-1044',
    name: 'Brian Miller',
    legalName: 'Brian Scott Miller',
    email: 'brian.m@globalwork.org',
    phone: '+1 (212) 555 0192',
    company: 'Global Work Alliance',
    role: 'Customer',
    status: 'Locked',
    kycStatus: 'Pending KYC',
    registeredDate: 'Apr 18, 2025',
    registeredTimeUtc: '12:20 UTC',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    registrationIp: '198.51.100.42 (New York, US)',
    timezone: 'America/New_York (UTC-4)',
    twoFactorEnabled: false,
    twoFactorMethod: 'None',
    lastLogin: 'Oct 10, 2025 • 15:30:00 UTC',
    clientFingerprint: 'Chrome on Windows 10',
    consecutiveFailedLogins: 3,
    sessionRootKey: 'SHA256: 1044ff9988776655',
    passwordLastChanged: '90+ days ago',
    stats: {
      totalBookings: 5,
      gmvAmount: '$150.00 GMV',
      activeEscrows: 0,
      escrowHoldAmount: '$0.00',
      disputesCount: 1
    },
    activityLogs: [
      {
        id: 'act-11',
        title: 'Escalated Dispute Under Investigation',
        timestamp: 'Oct 12, 2025 • Case #DISP-4109',
        detail: 'Disputed charge under triage in Screen A10',
        type: 'moderation'
      }
    ]
  }
];
