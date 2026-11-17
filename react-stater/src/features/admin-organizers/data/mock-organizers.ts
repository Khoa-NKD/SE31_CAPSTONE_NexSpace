/**
 * Strictly deterministic mock data aligned with Stitch Project 6390451165421541093.
 * Screens:
 * - A04: Organizer Verification Overview (Screen ID: fb6e4168ee454adb97e04cf8231dddd8)
 * - A05: Verification Requests Queue & Provider Details (Screen ID: 9dad414d1c7d45c4a03ebaa3188a4a5c)
 */

export interface VerificationDocument {
  id: string;
  type: 'gpkd' | 'cccd' | 'bank_certificate';
  title: string;
  englishTitle: string;
  fileFormat: string;
  fileSize: string;
  uploadedAt: string;
  ocrMatchRate: number;
  ocrStatus: 'matched' | 'review' | 'mismatch';
  details: {
    regNumber?: string;
    companyName?: string;
    legalRep?: string;
    headquarters?: string;
    idNumber?: string;
    dob?: string;
    expiryDate?: string;
    issueDate?: string;
    issueAuthority?: string;
    identificationFeatures?: string;
    mrzCode?: string;
    biometricMatchRate?: number;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
    accountHolder?: string;
  };
}

export interface VerificationAuditItem {
  id: string;
  timestamp: string;
  relativeTime: string;
  type: 'gov_api' | 'submission' | 'secops_claim' | 'decision';
  status: 'passed' | 'info' | 'pending' | 'critical';
  title: string;
  description: string;
  actor?: string;
}

export interface VerificationApplication {
  id: string; // e.g. '#APP-9021'
  legalName: string;
  tradeName: string;
  category: string;
  charterCapital: string;
  taxCode: string;
  legalRepresentative: string;
  registeredAddress: string;
  city: string;
  submittedAtFormatted: string;
  submittedAtRelative: string;
  slaRemaining: string;
  slaTargetHours: number;
  status: 'pending' | 'action_required' | 'approved' | 'rejected';
  statusLabel: string;
  isInitialReview: boolean;
  documentsUploadedCount: number;
  totalDocumentsCount: number;
  nationalPortalActive: boolean;
  documents: VerificationDocument[];
  auditTrail: VerificationAuditItem[];
  rejectionReason?: string;
}

export interface OrganizerPipelineKpis {
  pendingInitialReviewCount: number;
  pendingOldestHours: number;
  underInvestigationCount: number;
  approvedCountLast30d: number;
  passRatePercentage: number;
  momGrowthPercentage: number;
  rejectedRisksCount: number;
  slaAverageTurnaroundHours: number;
  firstPassApprovalRatePercentage: number;
}

export interface DailyThroughputPoint {
  dayLabel: string;
  incomingCount: number;
  approvedCount: number;
  barIncomingHeightPx: number;
  barApprovedHeightPx: number;
}

export interface DropoffIssueStat {
  id: string;
  title: string;
  percentage: number;
  casesCount: number;
  colorClass: string;
}

export const MOCK_ORGANIZER_KPIS: OrganizerPipelineKpis = {
  pendingInitialReviewCount: 12,
  pendingOldestHours: 18,
  underInvestigationCount: 5,
  approvedCountLast30d: 48,
  passRatePercentage: 92.3,
  momGrowthPercentage: 14,
  rejectedRisksCount: 6,
  slaAverageTurnaroundHours: 4.2,
  firstPassApprovalRatePercentage: 78.4
};

export const MOCK_DAILY_THROUGHPUT: DailyThroughputPoint[] = [
  { dayLabel: 'D1', incomingCount: 14, approvedCount: 11, barIncomingHeightPx: 90, barApprovedHeightPx: 70 },
  { dayLabel: 'D2', incomingCount: 17, approvedCount: 13, barIncomingHeightPx: 110, barApprovedHeightPx: 85 },
  { dayLabel: 'D3', incomingCount: 22, approvedCount: 18, barIncomingHeightPx: 140, barApprovedHeightPx: 120 },
  { dayLabel: 'D4', incomingCount: 12, approvedCount: 10, barIncomingHeightPx: 80, barApprovedHeightPx: 65 },
  { dayLabel: 'D5', incomingCount: 25, approvedCount: 21, barIncomingHeightPx: 160, barApprovedHeightPx: 135 },
  { dayLabel: 'D6', incomingCount: 20, approvedCount: 15, barIncomingHeightPx: 130, barApprovedHeightPx: 95 },
  { dayLabel: 'D7', incomingCount: 11, approvedCount: 9, barIncomingHeightPx: 75, barApprovedHeightPx: 60 },
  { dayLabel: 'D8', incomingCount: 19, approvedCount: 17, barIncomingHeightPx: 125, barApprovedHeightPx: 110 },
  { dayLabel: 'D9', incomingCount: 26, approvedCount: 22, barIncomingHeightPx: 170, barApprovedHeightPx: 145 },
  { dayLabel: 'D10', incomingCount: 23, approvedCount: 20, barIncomingHeightPx: 150, barApprovedHeightPx: 130 },
  { dayLabel: 'D11', incomingCount: 29, approvedCount: 24, barIncomingHeightPx: 190, barApprovedHeightPx: 160 },
  { dayLabel: 'D12', incomingCount: 21, approvedCount: 18, barIncomingHeightPx: 140, barApprovedHeightPx: 120 },
  { dayLabel: 'D13', incomingCount: 27, approvedCount: 23, barIncomingHeightPx: 180, barApprovedHeightPx: 155 },
  { dayLabel: 'Today', incomingCount: 25, approvedCount: 19, barIncomingHeightPx: 165, barApprovedHeightPx: 130 }
];

export const MOCK_DROPOFF_ISSUES: DropoffIssueStat[] = [
  {
    id: 'blurry_license',
    title: 'Blurry / Illegible Business License',
    percentage: 42,
    casesCount: 18,
    colorClass: 'bg-status-critical'
  },
  {
    id: 'mismatched_tax',
    title: 'Mismatched Tax Code vs Enterprise Name',
    percentage: 33,
    casesCount: 14,
    colorClass: 'bg-status-pending'
  },
  {
    id: 'invalid_auth',
    title: 'Invalid Legal Representative Auth',
    percentage: 25,
    casesCount: 10,
    colorClass: 'bg-text-secondary'
  }
];

export const INITIAL_VERIFICATION_APPLICATIONS: VerificationApplication[] = [
  {
    id: 'APP-9021',
    legalName: 'Acme Coworking Vietnam Co., Ltd',
    tradeName: 'Acme Hub District 1',
    category: '6810 - Real Estate & Serviced Coworking',
    charterCapital: '10,000,000,000 VND',
    taxCode: '0312345678',
    legalRepresentative: 'Nguyen Van A (Managing Director)',
    registeredAddress: 'Floor 12, Bitexco Financial Tower, 2 Hai Trieu, Ben Nghe, District 1, Ho Chi Minh City',
    city: 'Ho Chi Minh City, VN',
    submittedAtFormatted: 'Today, 08:30 UTC',
    submittedAtRelative: '3h ago',
    slaRemaining: '21h remaining',
    slaTargetHours: 24,
    status: 'pending',
    statusLabel: 'Pending Review',
    isInitialReview: true,
    documentsUploadedCount: 3,
    totalDocumentsCount: 3,
    nationalPortalActive: true,
    documents: [
      {
        id: 'doc-9021-gpkd',
        type: 'gpkd',
        title: 'Giấy phép kinh doanh (GPKD / ERC)',
        englishTitle: 'Enterprise Registration Certificate',
        fileFormat: 'PDF',
        fileSize: '4.2 MB',
        uploadedAt: 'Oct 24, 08:30 UTC',
        ocrMatchRate: 100,
        ocrStatus: 'matched',
        details: {
          regNumber: '0312345678',
          companyName: 'CÔNG TY TNHH ACME COWORKING VIỆT NAM',
          legalRep: 'NGUYỄN VĂN A — Chức danh: Giám Đốc',
          headquarters: 'Tầng 12, Bitexco Financial Tower, Q.1, TP. Hồ Chí Minh'
        }
      },
      {
        id: 'doc-9021-cccd',
        type: 'cccd',
        title: 'Căn cước công dân (CCCD)',
        englishTitle: 'Citizen Identity Card (Front & Back)',
        fileFormat: 'JPG / Biometric Scan',
        fileSize: '3.1 MB',
        uploadedAt: 'Oct 24, 08:30 UTC',
        ocrMatchRate: 99.4,
        ocrStatus: 'matched',
        details: {
          idNumber: '079088001234',
          legalRep: 'NGUYỄN VĂN A',
          dob: '14/08/1988',
          expiryDate: '14/08/2048',
          issueDate: '15/09/2021',
          issueAuthority: 'CỤC TRƯỞNG CỤC C06',
          identificationFeatures: 'Sẹo chấm C: 1cm trên sau đuôi lông mày trái',
          mrzCode: 'IDVNM0790880012348<<0790888M2048<<<',
          biometricMatchRate: 99.4
        }
      },
      {
        id: 'doc-9021-bank',
        type: 'bank_certificate',
        title: 'Bank Account Ownership Certificate',
        englishTitle: 'Vietcombank (VCB) Confirmation Letter',
        fileFormat: 'PDF',
        fileSize: '1.8 MB',
        uploadedAt: 'Oct 24, 08:31 UTC',
        ocrMatchRate: 100,
        ocrStatus: 'matched',
        details: {
          bankName: 'Joint Stock Commercial Bank for Foreign Trade of Vietnam (Vietcombank)',
          bankAccount: '0071000889988',
          bankBranch: 'Vietcombank Saigon Branch',
          accountHolder: 'CÔNG TY TNHH ACME COWORKING VIỆT NAM'
        }
      }
    ],
    auditTrail: [
      {
        id: 'audit-1',
        timestamp: 'Oct 24, 08:32 UTC',
        relativeTime: '2h ago',
        type: 'gov_api',
        status: 'passed',
        title: 'Automated Gov API check passed',
        description: 'MST 0312345678 active on National Business Registry. No tax defaults or blacklists found.'
      },
      {
        id: 'audit-2',
        timestamp: 'Oct 24, 08:30 UTC',
        relativeTime: '3h ago',
        type: 'submission',
        status: 'info',
        title: 'Applicant submitted documentation',
        description: '3 legal certificates provided via self-service workspace onboarding portal.'
      },
      {
        id: 'audit-3',
        timestamp: 'Oct 24, 09:15 UTC',
        relativeTime: '1h ago',
        type: 'secops_claim',
        status: 'pending',
        title: 'Manual SecOps Review Initiated',
        description: 'Claimed by Marcus Vance (CPTO) for legal compliance sign-off.',
        actor: 'Marcus Vance (CPTO)'
      }
    ]
  },
  {
    id: 'APP-9020',
    legalName: 'District 1 Creative Spaces Ltd',
    tradeName: 'District 1 TechSpace',
    category: '6810 - Real Estate & Serviced Coworking',
    charterCapital: '5,000,000,000 VND',
    taxCode: '0319204821',
    legalRepresentative: 'Tran Thi Mai (CEO)',
    registeredAddress: '15 Le Thanh Ton, Ben Nghe, District 1, Ho Chi Minh City',
    city: 'Ho Chi Minh City, VN',
    submittedAtFormatted: 'Oct 24, 11:20 UTC',
    submittedAtRelative: '4h ago',
    slaRemaining: '20h remaining',
    slaTargetHours: 24,
    status: 'pending',
    statusLabel: 'Pending Review',
    isInitialReview: true,
    documentsUploadedCount: 3,
    totalDocumentsCount: 3,
    nationalPortalActive: true,
    documents: [
      {
        id: 'doc-9020-gpkd',
        type: 'gpkd',
        title: 'Giấy phép kinh doanh (GPKD / ERC)',
        englishTitle: 'Enterprise Registration Certificate',
        fileFormat: 'PDF',
        fileSize: '3.8 MB',
        uploadedAt: 'Oct 24, 11:20 UTC',
        ocrMatchRate: 98,
        ocrStatus: 'matched',
        details: {
          regNumber: '0319204821',
          companyName: 'CÔNG TY TNHH KHÔNG GIAN SÁNG TẠO QUẬN 1',
          legalRep: 'TRẦN THỊ MAI — Chức danh: Giám Đốc',
          headquarters: '15 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. Hồ Chí Minh'
        }
      },
      {
        id: 'doc-9020-cccd',
        type: 'cccd',
        title: 'Căn cước công dân (CCCD)',
        englishTitle: 'Citizen Identity Card (Front & Back)',
        fileFormat: 'JPG',
        fileSize: '2.5 MB',
        uploadedAt: 'Oct 24, 11:21 UTC',
        ocrMatchRate: 98.7,
        ocrStatus: 'matched',
        details: {
          idNumber: '079192003456',
          legalRep: 'TRẦN THỊ MAI',
          dob: '22/05/1992',
          expiryDate: '22/05/2052',
          biometricMatchRate: 98.7
        }
      },
      {
        id: 'doc-9020-bank',
        type: 'bank_certificate',
        title: 'Bank Account Ownership Certificate',
        englishTitle: 'Techcombank Confirmation Letter',
        fileFormat: 'PDF',
        fileSize: '1.2 MB',
        uploadedAt: 'Oct 24, 11:22 UTC',
        ocrMatchRate: 100,
        ocrStatus: 'matched',
        details: {
          bankName: 'Techcombank',
          bankAccount: '19034582910012',
          bankBranch: 'Ben Nghe Branch',
          accountHolder: 'CONG TY TNHH KHONG GIAN SANG TAO QUAN 1'
        }
      }
    ],
    auditTrail: [
      {
        id: 'audit-20-1',
        timestamp: 'Oct 24, 11:25 UTC',
        relativeTime: '4h ago',
        type: 'gov_api',
        status: 'passed',
        title: 'Automated Gov API check passed',
        description: 'MST 0319204821 verified and active in national tax database.'
      }
    ]
  },
  {
    id: 'APP-9019',
    legalName: 'Spaces West Lake Hanoi LLC',
    tradeName: 'Spaces Hanoi Premium',
    category: '6810 - Real Estate & Serviced Coworking',
    charterCapital: '15,000,000,000 VND',
    taxCode: '0105678912',
    legalRepresentative: 'Le Quang Huy (General Director)',
    registeredAddress: '88 Xuan Dieu, Quang An, Tay Ho, Hanoi',
    city: 'Hanoi, VN',
    submittedAtFormatted: 'Yesterday, 19:40 UTC',
    submittedAtRelative: '16h ago',
    slaRemaining: '8h remaining',
    slaTargetHours: 24,
    status: 'action_required',
    statusLabel: 'Action Required',
    isInitialReview: false,
    documentsUploadedCount: 2,
    totalDocumentsCount: 3,
    nationalPortalActive: true,
    rejectionReason: 'Bank account certificate missing official red seal stamp. Re-submission requested.',
    documents: [
      {
        id: 'doc-9019-gpkd',
        type: 'gpkd',
        title: 'Giấy phép kinh doanh (GPKD / ERC)',
        englishTitle: 'Enterprise Registration Certificate',
        fileFormat: 'PDF',
        fileSize: '5.1 MB',
        uploadedAt: 'Oct 23, 19:40 UTC',
        ocrMatchRate: 99,
        ocrStatus: 'matched',
        details: {
          regNumber: '0105678912',
          companyName: 'CÔNG TY TNHH SPACES HỒ TÂY HÀ NỘI',
          legalRep: 'LÊ QUANG HUY',
          headquarters: '88 Xuân Diệu, Quảng An, Tây Hồ, Hà Nội'
        }
      },
      {
        id: 'doc-9019-cccd',
        type: 'cccd',
        title: 'Căn cước công dân (CCCD)',
        englishTitle: 'Citizen Identity Card (Front & Back)',
        fileFormat: 'JPG',
        fileSize: '2.9 MB',
        uploadedAt: 'Oct 23, 19:41 UTC',
        ocrMatchRate: 97.5,
        ocrStatus: 'matched',
        details: {
          idNumber: '001085002341',
          legalRep: 'LÊ QUANG HUY',
          dob: '10/11/1985',
          expiryDate: '10/11/2045'
        }
      }
    ],
    auditTrail: [
      {
        id: 'audit-19-1',
        timestamp: 'Oct 23, 21:00 UTC',
        relativeTime: '15h ago',
        type: 'decision',
        status: 'critical',
        title: 'Correction Requested by SecOps Handler',
        description: 'Bank ownership verification letter was uncertified. Notice sent to applicant.',
        actor: 'Elena Rostova (Compliance Analyst)'
      }
    ]
  },
  {
    id: 'APP-9018',
    legalName: 'Dreamplex Hospitality JSC',
    tradeName: 'Dreamplex Nguyen Trung Ngan',
    category: '6810 - Real Estate & Serviced Coworking',
    charterCapital: '25,000,000,000 VND',
    taxCode: '0311223344',
    legalRepresentative: 'Pham Minh Tuan (Chairman)',
    registeredAddress: '21 Nguyen Trung Ngan, Ben Nghe, District 1, Ho Chi Minh City',
    city: 'Ho Chi Minh City, VN',
    submittedAtFormatted: 'Oct 23, 14:15 UTC',
    submittedAtRelative: '1d ago',
    slaRemaining: 'Compliant within SLA',
    slaTargetHours: 24,
    status: 'pending',
    statusLabel: 'Pending Review',
    isInitialReview: true,
    documentsUploadedCount: 3,
    totalDocumentsCount: 3,
    nationalPortalActive: true,
    documents: [
      {
        id: 'doc-9018-gpkd',
        type: 'gpkd',
        title: 'Giấy phép kinh doanh (GPKD / ERC)',
        englishTitle: 'Enterprise Registration Certificate',
        fileFormat: 'PDF',
        fileSize: '4.7 MB',
        uploadedAt: 'Oct 23, 14:15 UTC',
        ocrMatchRate: 100,
        ocrStatus: 'matched',
        details: {
          regNumber: '0311223344',
          companyName: 'CỔ PHẦN DỊCH VỤ DREAMPLEX',
          legalRep: 'PHẠM MINH TUẤN'
        }
      }
    ],
    auditTrail: []
  },
  {
    id: 'APP-9017',
    legalName: 'Toong Co-working Network VN',
    tradeName: 'Toong Trang Thi Hanoi',
    category: '6810 - Real Estate & Serviced Coworking',
    charterCapital: '18,000,000,000 VND',
    taxCode: '0104455667',
    legalRepresentative: 'Duong Do (Founder & CEO)',
    registeredAddress: '8 Trang Thi, Hang Trong, Hoan Kiem, Hanoi',
    city: 'Hanoi, VN',
    submittedAtFormatted: 'Oct 23, 11:20 UTC',
    submittedAtRelative: '1d ago',
    slaRemaining: 'Compliant within SLA',
    slaTargetHours: 24,
    status: 'pending',
    statusLabel: 'Pending Review',
    isInitialReview: true,
    documentsUploadedCount: 3,
    totalDocumentsCount: 3,
    nationalPortalActive: true,
    documents: [],
    auditTrail: []
  },
  {
    id: 'APP-9016',
    legalName: 'CirCO Flex Workspace Corp.',
    tradeName: 'CirCO Dien Bien Phu',
    category: '6810 - Real Estate & Serviced Coworking',
    charterCapital: '8,000,000,000 VND',
    taxCode: '0315566778',
    legalRepresentative: 'Hoang Van Nam (Director)',
    registeredAddress: '222 Dien Bien Phu, Ward 7, District 3, Ho Chi Minh City',
    city: 'Ho Chi Minh City, VN',
    submittedAtFormatted: 'Oct 22, 16:50 UTC',
    submittedAtRelative: '2d ago',
    slaRemaining: 'SLA Breached',
    slaTargetHours: 24,
    status: 'action_required',
    statusLabel: 'Action Required',
    isInitialReview: false,
    documentsUploadedCount: 1,
    totalDocumentsCount: 3,
    nationalPortalActive: false,
    rejectionReason: 'Enterprise tax code shows active warning on national registry. Clarification required.',
    documents: [],
    auditTrail: []
  }
];

export const MOCK_RECENT_OVERVIEW_SUBMISSIONS = [
  {
    appId: 'APP-9021',
    organizerName: 'WorkHub Central Saigon',
    legalEntity: 'Saigon Co-Working JSC • Ho Chi Minh City, VN',
    iconType: 'business',
    taxCode: '0317829104-VN',
    submittedRelative: '1h ago',
    submittedExact: 'Oct 24, 2025 14:40 UTC',
    status: 'Pending Initial Review',
    statusVariant: 'pending' as const,
    isInitialReview: true
  },
  {
    appId: 'APP-9020',
    organizerName: 'District 1 TechSpace',
    legalEntity: 'D1 Creative Spaces Ltd • Ho Chi Minh City, VN',
    iconType: 'corporate_fare',
    taxCode: '0319204821-VN',
    submittedRelative: '4h ago',
    submittedExact: 'Oct 24, 2025 11:20 UTC',
    status: 'Pending Initial Review',
    statusVariant: 'pending' as const,
    isInitialReview: true
  },
  {
    appId: 'APP-9019',
    organizerName: 'Da Nang SeaView Hub',
    legalEntity: 'VietCoast Properties JSC • Da Nang, VN',
    iconType: 'apartment',
    taxCode: '0401889212-VN',
    submittedRelative: '7h ago',
    submittedExact: 'Oct 24, 2025 08:00 UTC',
    status: 'Documents Requested',
    statusVariant: 'info' as const,
    isInitialReview: false
  },
  {
    appId: 'APP-9018',
    organizerName: 'Spaces West Lake Hanoi',
    legalEntity: 'Spaces West Lake Hanoi LLC • Hanoi, VN',
    iconType: 'domain',
    taxCode: '0105678912-VN',
    submittedRelative: '16h ago',
    submittedExact: 'Oct 23, 2025 19:40 UTC',
    status: 'Re-submission Awaiting Audit',
    statusVariant: 'pending' as const,
    isInitialReview: false
  },
  {
    appId: 'APP-9017',
    organizerName: 'CirCO Flex Workspace Corp.',
    legalEntity: 'CirCO Flex Workspace Corp. • Ho Chi Minh City, VN',
    iconType: 'store',
    taxCode: '0315566778-VN',
    submittedRelative: '1d ago',
    submittedExact: 'Oct 23, 2025 11:20 UTC',
    status: 'Pending Initial Review',
    statusVariant: 'pending' as const,
    isInitialReview: true
  }
];
