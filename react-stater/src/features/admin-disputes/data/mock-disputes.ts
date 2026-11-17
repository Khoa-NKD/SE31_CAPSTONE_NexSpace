export type DisputeSeverity = 'critical' | 'high' | 'normal';
export type DisputeStatus =
  | 'open'
  | 'under_investigation'
  | 'under_review'
  | 'evidence_attached'
  | 'resolved'
  | 'dismissed';

export interface DisputeEvidenceItem {
  id: string;
  type: 'telemetry' | 'photo';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: 'red' | 'emerald' | 'amber';
  verifiedHash?: string;
  timestamp: string;
  imageUrl?: string;
  telemetryData?: {
    speedDown: string;
    speedUp: string;
    ping: string;
    statusNote: string;
  };
}

export interface DisputeLogItem {
  id: string;
  sender: string;
  senderRole?: string;
  timestamp: string;
  message: string;
  iconType: 'terminal' | 'person' | 'storefront';
  variant: 'default' | 'accent' | 'partner';
}

export interface DisputeCase {
  id: string; // e.g. "CASE-401"
  caseNumber: string; // "#CASE-401"
  title: string;
  caseType: 'Network Outage' | 'Noise Disturbance' | 'Access / NFC Lockout' | 'Booking Conflict' | 'Property Damage';
  caseCategoryFilter: 'facility' | 'noise' | 'damage' | 'other';
  reporterName: string;
  reporterEmail: string;
  reporterRole: string;
  reporterAvatarUrl: string;
  relatedWorkspace: string;
  severity: DisputeSeverity;
  severityLabel: string;
  status: DisputeStatus;
  statusLabel: string;
  submittedAtFormatted: string;
  relativeTime: string;
  customerStatement: string;
  assignedModerator: string;
  linkedBookingRef: string;
  linkedBookingAmountUsd: number;
  linkedBookingDetails: string;
  linkedBookingDate: string;
  linkedSpacePartner: string;
  partnerHistoricalUptime: string;
  partnerTier: string;
  partnerRating: number;
  evidenceFiles: DisputeEvidenceItem[];
  communicationLog: DisputeLogItem[];
  adjudicationDecision?: string;
  resolutionJustification?: string;
}

export interface DisputesSummaryKpis {
  openCases: number;
  underInvestigation: number;
  highPriority: number;
  resolved30d: number;
  dismissed: number;
  totalRecords: number;
}

export const MOCK_DISPUTES_KPIS: DisputesSummaryKpis = {
  openCases: 5,
  underInvestigation: 2,
  highPriority: 2,
  resolved30d: 38,
  dismissed: 4,
  totalRecords: 45
};

export const INITIAL_DISPUTES_DATA: DisputeCase[] = [
  {
    id: 'CASE-401',
    caseNumber: '#CASE-401',
    title: 'Critical WiFi Outage & Complete Presentation Interruption',
    caseType: 'Network Outage',
    caseCategoryFilter: 'facility',
    reporterName: 'David Pham',
    reporterEmail: 'david.p@enterprise.io',
    reporterRole: 'Enterprise Nomad',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    relatedWorkspace: 'NexSpace Saigon Prime Hub • Suite 4B',
    severity: 'critical',
    severityLabel: 'Urgent / Critical',
    status: 'under_investigation',
    statusLabel: 'Under Investigation',
    submittedAtFormatted: 'Jan 25, 2026 • 14:14 ICT',
    relativeTime: '28 mins ago',
    customerStatement:
      'During an executive investor board presentation at Saigon Prime Hub Suite 4B, the dedicated 1Gbps fiber completely dropped for 42 minutes. Router in room showed red failover light. Mobile hotspot was inadequate for screen share. We lost client meeting momentum.',
    assignedModerator: 'Marcus Vance',
    linkedBookingRef: 'NX-9750',
    linkedBookingAmountUsd: 45.0,
    linkedBookingDetails: 'Meeting Suite 4B • 8 Pax',
    linkedBookingDate: 'Jan 25, 2026 • 13:00 - 16:00',
    linkedSpacePartner: 'Acme Coworking VN',
    partnerHistoricalUptime: '99.2% Historical Uptime',
    partnerTier: 'Partner Tier: Gold Enterprise',
    partnerRating: 4.8,
    evidenceFiles: [
      {
        id: 'ev-1',
        type: 'telemetry',
        title: 'Speedtest Telemetry',
        subtitle: 'Gateway handshake timed out',
        badge: 'FAILED',
        badgeColor: 'red',
        verifiedHash: '#c4f9a',
        timestamp: '14:14 ICT',
        telemetryData: {
          speedDown: '0.18 Mbps Down',
          speedUp: '0.05 Mbps Up',
          ping: 'Ping 482ms',
          statusNote: 'Packet loss > 98% detected on gateway AP-SGN-4B'
        }
      },
      {
        id: 'ev-2',
        type: 'photo',
        title: 'Cisco Router WAN Link Failure',
        subtitle: 'EXIF Verified • Saigon Prime Hub Suite 4B',
        badge: 'EXIF OK',
        badgeColor: 'emerald',
        timestamp: '14:18 ICT',
        imageUrl:
          'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80'
      }
    ],
    communicationLog: [
      {
        id: 'log-1',
        sender: 'Automated NOC Ping Monitor',
        timestamp: '14:15 ICT',
        message: 'Automated ping monitor logged packet loss spike > 98% on AP-SGN-4B gateway node.',
        iconType: 'terminal',
        variant: 'default'
      },
      {
        id: 'log-2',
        sender: 'David Pham (Customer)',
        senderRole: 'Enterprise Nomad',
        timestamp: '14:18 ICT',
        message: 'Ticket escalated with Speedtest screenshot attached: "We need an urgent reset or SLA compensation credit."',
        iconType: 'person',
        variant: 'accent'
      },
      {
        id: 'log-3',
        sender: 'Organizer Front Desk (Acme VN)',
        timestamp: '14:35 ICT',
        message: 'Local building technician power-cycled main fiber ONT. Connection verified restored at 14:52 ICT.',
        iconType: 'storefront',
        variant: 'partner'
      }
    ],
    adjudicationDecision: 'partial_credit',
    resolutionJustification:
      'Verified SLA breach under Terms Clause 8.3 (Network reliability > 99.5%). 50% booking credit ($22.50) awarded to customer David Pham, funded via Acme Coworking monthly payout deduction.'
  },
  {
    id: 'CASE-402',
    caseNumber: '#CASE-402',
    title: 'Unauthorized Evening Gathering & Excessive Noise in Quiet Zone',
    caseType: 'Noise Disturbance',
    caseCategoryFilter: 'noise',
    reporterName: 'Elena Rostova',
    reporterEmail: 'elena.r@fintechnord.com',
    reporterRole: 'Team Lead (Fintech)',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    relatedWorkspace: 'Westlake Executive Suites • Zone A',
    severity: 'high',
    severityLabel: 'High',
    status: 'under_review',
    statusLabel: 'Under Review',
    submittedAtFormatted: 'Jan 25, 2026 • 13:10 ICT',
    relativeTime: '1.2h ago',
    customerStatement:
      'Neighboring tenant hosted an unapproved team celebration with loudspeakers in the designated quiet focus lounge after 17:00, disrupting our engineering sprint standup.',
    assignedModerator: 'Marcus Vance',
    linkedBookingRef: 'NX-9788',
    linkedBookingAmountUsd: 25.0,
    linkedBookingDetails: 'Quiet Focus Zone • Desk 4',
    linkedBookingDate: 'Jan 25, 2026 • 09:00 - 18:00',
    linkedSpacePartner: 'Westlake Spaces Hanoi',
    partnerHistoricalUptime: '98.5% Community Compliance',
    partnerTier: 'Partner Tier: Silver',
    partnerRating: 4.6,
    evidenceFiles: [
      {
        id: 'ev-3',
        type: 'photo',
        title: 'Decibel Audio Meter Sensor Log',
        subtitle: 'Decibel reading > 78 dB in quiet room',
        badge: 'SENSOR OK',
        badgeColor: 'amber',
        timestamp: '13:05 ICT',
        imageUrl:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
      }
    ],
    communicationLog: [
      {
        id: 'log-4',
        sender: 'Elena Rostova (Customer)',
        timestamp: '13:10 ICT',
        message: 'Reported excessive noise breach of Code of Conduct section 4.',
        iconType: 'person',
        variant: 'accent'
      },
      {
        id: 'log-5',
        sender: 'Floor Community Manager',
        timestamp: '13:22 ICT',
        message: 'Onsite staff dispatched to issue formal quiet-hours warning to offending group.',
        iconType: 'storefront',
        variant: 'partner'
      }
    ],
    adjudicationDecision: 'warning',
    resolutionJustification: 'Offending group issued formal noise warning under Community Conduct Clause 3.2.'
  },
  {
    id: 'CASE-403',
    caseNumber: '#CASE-403',
    title: 'Access Turnstile NFC Failure & Lockout at Main Entrance',
    caseType: 'Access / NFC Lockout',
    caseCategoryFilter: 'facility',
    reporterName: 'Alex Nguyen',
    reporterEmail: 'anguyen@devfoundry.io',
    reporterRole: 'Enterprise Member',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    relatedWorkspace: 'Landmark 81 Innovation Center • 46F',
    severity: 'high',
    severityLabel: 'High',
    status: 'evidence_attached',
    statusLabel: 'Evidence Attached',
    submittedAtFormatted: 'Jan 25, 2026 • 11:30 ICT',
    relativeTime: '2.8h ago',
    customerStatement:
      'Digital keycard on Apple Wallet failed on turnstile reader #03 with red invalid token code. Had to wait 25 minutes for security override.',
    assignedModerator: 'Marcus Vance',
    linkedBookingRef: 'NX-9712',
    linkedBookingAmountUsd: 30.0,
    linkedBookingDetails: 'Hotdesk Area • Floor 46',
    linkedBookingDate: 'Jan 25, 2026 • 08:30 - 17:30',
    linkedSpacePartner: 'Landmark Innovation Hubs',
    partnerHistoricalUptime: '99.8% Hardware Reliability',
    partnerTier: 'Partner Tier: Gold Enterprise',
    partnerRating: 4.9,
    evidenceFiles: [
      {
        id: 'ev-4',
        type: 'telemetry',
        title: 'NFC Reader Error Audit',
        subtitle: 'Card pass cryptographic handshake failed',
        badge: 'AUTH ERR',
        badgeColor: 'amber',
        timestamp: '11:28 ICT',
        telemetryData: {
          speedDown: 'NFC Key Revoked',
          speedUp: 'Status Code 403',
          ping: 'Latency 14ms',
          statusNote: 'Certificate mismatch on turnstile local cache'
        }
      }
    ],
    communicationLog: [
      {
        id: 'log-6',
        sender: 'Alex Nguyen (Customer)',
        timestamp: '11:30 ICT',
        message: 'Lockout reported at turnstile gate 3.',
        iconType: 'person',
        variant: 'accent'
      }
    ],
    adjudicationDecision: 'partial_credit',
    resolutionJustification: 'Customer credential refreshed and $10 courtesy credit awarded.'
  },
  {
    id: 'CASE-404',
    caseNumber: '#CASE-404',
    title: 'Meeting Pod Booking Conflict & Double Reservation Overlap',
    caseType: 'Booking Conflict',
    caseCategoryFilter: 'facility',
    reporterName: 'Sarah Jenkins',
    reporterEmail: 's.jenkins@designops.co',
    reporterRole: 'Pro Member',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    relatedWorkspace: 'Da Nang Coastal Innovation Hub • Pod 02',
    severity: 'normal',
    severityLabel: 'Normal',
    status: 'open',
    statusLabel: 'Open',
    submittedAtFormatted: 'Jan 25, 2026 • 10:45 ICT',
    relativeTime: '3.6h ago',
    customerStatement:
      'When arriving at Pod 02 at my scheduled 11:00 slot, another client was already booked inside through offline walk-in.',
    assignedModerator: 'Marcus Vance',
    linkedBookingRef: 'NX-9685',
    linkedBookingAmountUsd: 18.0,
    linkedBookingDetails: 'Focus Pod 02 (2p)',
    linkedBookingDate: 'Jan 25, 2026 • 11:00 - 13:00',
    linkedSpacePartner: 'Da Nang SeaView Co',
    partnerHistoricalUptime: '97.2% Sync Uptime',
    partnerTier: 'Partner Tier: Silver',
    partnerRating: 4.4,
    evidenceFiles: [],
    communicationLog: [
      {
        id: 'log-7',
        sender: 'Sarah Jenkins (Customer)',
        timestamp: '10:45 ICT',
        message: 'Conflict reported via in-app rapid dispute.',
        iconType: 'person',
        variant: 'accent'
      }
    ],
    adjudicationDecision: 'partial_credit',
    resolutionJustification: 'Full refund plus Pod 03 relocation granted.'
  },
  {
    id: 'CASE-405',
    caseNumber: '#CASE-405',
    title: 'Damaged Ergonomic Task Chair at Dedicated Desk 18',
    caseType: 'Property Damage',
    caseCategoryFilter: 'damage',
    reporterName: 'Michael Chen',
    reporterEmail: 'mchen@velocitylab.vn',
    reporterRole: 'Resident Dedicated Desk',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    relatedWorkspace: 'NexSpace Saigon Prime Hub • Floor 3',
    severity: 'normal',
    severityLabel: 'Normal',
    status: 'under_review',
    statusLabel: 'Under Review',
    submittedAtFormatted: 'Jan 25, 2026 • 09:15 ICT',
    relativeTime: '5.1h ago',
    customerStatement:
      'Pneumatic cylinder on Herman Miller chair in Dedicated Desk 18 sinks to floor level upon sitting. Unusable for 8h workday.',
    assignedModerator: 'Marcus Vance',
    linkedBookingRef: 'NX-9640',
    linkedBookingAmountUsd: 20.0,
    linkedBookingDetails: 'Dedicated Desk #18',
    linkedBookingDate: 'Jan 25, 2026 • Monthly Pass',
    linkedSpacePartner: 'Acme Coworking VN',
    partnerHistoricalUptime: '99.2% Maintenance Standard',
    partnerTier: 'Partner Tier: Gold Enterprise',
    partnerRating: 4.8,
    evidenceFiles: [
      {
        id: 'ev-5',
        type: 'photo',
        title: 'Task Chair Cylinder Defect',
        subtitle: 'Hydraulic seal leak photograph',
        badge: 'PHOTO OK',
        badgeColor: 'emerald',
        timestamp: '09:12 ICT',
        imageUrl:
          'https://images.unsplash.com/photo-1580481077195-c328a37ea71a?w=600&auto=format&fit=crop&q=80'
      }
    ],
    communicationLog: [
      {
        id: 'log-8',
        sender: 'Michael Chen (Customer)',
        timestamp: '09:15 ICT',
        message: 'Requested chair replacement from maintenance inventory.',
        iconType: 'person',
        variant: 'accent'
      },
      {
        id: 'log-9',
        sender: 'Hub Facilities Team',
        timestamp: '09:40 ICT',
        message: 'Replacement ergonomic task chair delivered to desk 18.',
        iconType: 'storefront',
        variant: 'partner'
      }
    ],
    adjudicationDecision: 'dismiss',
    resolutionJustification: 'Hardware replaced within 30 minutes; case closed successfully.'
  }
];
