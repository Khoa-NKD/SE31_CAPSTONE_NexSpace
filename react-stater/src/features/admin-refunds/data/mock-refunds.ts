export type RefundStatus = 'pending' | 'processed' | 'rejected';

export interface RefundEvidence {
  type: 'photo' | 'telemetry' | 'log';
  thumbnailUrl: string;
  description: string;
  verificationBadge: string;
  exifTimestamp: string;
  onsiteTicketLog?: string;
  verified: boolean;
}

export interface RefundRecord {
  id: string; // e.g. "#RF-102"
  numericId?: number;
  bookingId?: number;
  bookingRef: string; // e.g. "#NX-9801"
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  avatarInitials: string;
  workspaceHub: string;
  spaceDetails: string;
  originalPaidUsd: number;
  originalPaidVnd: number;
  calculatedRefundUsd: number;
  calculatedRefundVnd: number;
  policyTierLabel: string;
  policyClause: string;
  gatewayFeeDeductionUsd: number;
  gatewayFeeDeductionVnd: number;
  claimReason: string;
  customerStatement: string;
  evidence?: RefundEvidence;
  status: RefundStatus;
  statusBadge: string;
  slaRemaining: string;
  triggeredAt: string;
  escrowReserveCode: string;
  adminResolutionNote?: string;
  bankName?: string;
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  refundReference?: string;
}

export function fromDtoToRecord(dto: import('../api/types').RefundRequestResponseDto): RefundRecord {
  const usdRate = 25450;
  const originalVnd = dto.originalPaidAmount || 0;
  const refundVnd = dto.approvedAmount || dto.requestedAmount || 0;
  const originalUsd = originalVnd / usdRate;
  const refundUsd = refundVnd / usdRate;

  let statusBadge = 'Pending Review';
  let clientStatus: RefundStatus = 'pending';
  if (dto.status === 'PROCESSED' || dto.status === 'APPROVED') {
    clientStatus = 'processed';
    statusBadge = 'Processed & Disbursed (PayOS)';
  } else if (dto.status === 'REJECTED') {
    clientStatus = 'rejected';
    statusBadge = 'Claim Rejected';
  } else {
    clientStatus = 'pending';
    statusBadge = 'Pending Adjudication';
  }

  const initials = dto.customerName
    ? dto.customerName
        .split(' ')
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'KH';

  return {
    id: `#RF-${dto.id}`,
    numericId: dto.id,
    bookingId: dto.bookingId,
    bookingRef: dto.bookingCode ? (dto.bookingCode.startsWith('#') ? dto.bookingCode : `#${dto.bookingCode}`) : `#BK-${dto.bookingId}`,
    customerName: dto.customerName || 'Khách hàng',
    customerEmail: dto.customerEmail || 'no-email@nexspace.vn',
    avatarInitials: initials,
    workspaceHub: dto.workspaceName || 'Không gian làm việc',
    spaceDetails: dto.resourceName || 'Bàn làm việc / Phòng họp',
    originalPaidUsd: originalUsd,
    originalPaidVnd: originalVnd,
    calculatedRefundUsd: refundUsd,
    calculatedRefundVnd: refundVnd,
    policyTierLabel: `${Math.round((refundVnd / (originalVnd || 1)) * 100)}% Policy Tier`,
    policyClause: dto.source || 'Chính sách hủy đơn',
    gatewayFeeDeductionUsd: Math.max(0, originalUsd - refundUsd),
    gatewayFeeDeductionVnd: Math.max(0, originalVnd - refundVnd),
    claimReason: dto.reason || 'Khách hàng yêu cầu hủy đơn',
    customerStatement: dto.reason || 'Yêu cầu hoàn tiền theo chính sách',
    status: clientStatus,
    statusBadge,
    slaRemaining: clientStatus === 'pending' ? 'Cần xử lý' : 'Đã đóng',
    triggeredAt: dto.createdAt ? new Date(dto.createdAt).toLocaleString('vi-VN') : 'Gần đây',
    escrowReserveCode: dto.refundReference || `#ESC-${dto.bookingId}`,
    adminResolutionNote: dto.adminNote,
    bankName: dto.bankName,
    bankBin: dto.bankBin,
    bankAccountNumber: dto.bankAccountNumber,
    bankAccountName: dto.bankAccountName,
    refundReference: dto.refundReference
  };
}

export function formatVnd(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export interface RefundSummaryKpis {
  pendingCount: number;
  pendingVolumeVnd: number;
  processedCount: number;
  processedVolumeVnd: number;
  rejectedCount: number;
  rejectedVolumeVnd: number;
  pendingVolumeUsd?: number;
  processedVolumeUsd?: number;
  rejectedVolumeUsd?: number;
}

export const MOCK_REFUND_KPIS: RefundSummaryKpis = {
  pendingCount: 5,
  pendingVolumeVnd: 216000,
  processedCount: 5,
  processedVolumeVnd: 216000,
  rejectedCount: 0,
  rejectedVolumeVnd: 0,
  pendingVolumeUsd: 8.5,
  processedVolumeUsd: 8.5,
  rejectedVolumeUsd: 0
};

export const INITIAL_REFUNDS_DATA: RefundRecord[] = [
  {
    id: '#RF-102',
    bookingRef: '#NX-9801',
    customerName: 'Sarah Jenkins',
    customerEmail: 's.jenkins@remotelab.co',
    customerCompany: 'RemoteLab Inc. (Verified Nomad)',
    avatarInitials: 'SJ',
    workspaceHub: 'NexSpace Landmark Tower',
    spaceDetails: 'Floor 21 • Meeting Suite B (6p)',
    originalPaidUsd: 30.0,
    originalPaidVnd: 750000,
    calculatedRefundUsd: 24.0,
    calculatedRefundVnd: 600000,
    policyTierLabel: '80% Policy Tier',
    policyClause: 'Clause 4.2: Facility Defect',
    gatewayFeeDeductionUsd: 6.0,
    gatewayFeeDeductionVnd: 150000,
    claimReason: 'Air conditioning failure in meeting room - Suite B',
    customerStatement:
      'The air conditioning unit in Meeting Suite B was leaking water and blowing ambient 32°C air. Unusable for executive client presentation. Reported to reception desk at 14:20.',
    evidence: {
      type: 'photo',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
      description: 'Overhead HVAC unit leaking condensation onto meeting table',
      verificationBadge: 'Facility Photo Verified',
      exifTimestamp: 'Jan 25, 14:18:22',
      onsiteTicketLog: 'Onsite Desk Staff Ticket #LOG-442 logged at 14:22',
      verified: true
    },
    status: 'pending',
    statusBadge: 'Pending Review',
    slaRemaining: '4h remaining',
    triggeredAt: 'Triggered 14:35 via Customer App',
    escrowReserveCode: '#ESC-9801',
    adminResolutionNote:
      'Approved under Clause 4.2 (Facility defect confirmed by building operations log #LOG-442).'
  },
  {
    id: '#RF-101',
    bookingRef: '#NX-9788',
    customerName: 'David Kim',
    customerEmail: 'd.kim@solaris.kr',
    customerCompany: 'Solaris Systems Korea',
    avatarInitials: 'DK',
    workspaceHub: 'NexSpace Saigon Prime',
    spaceDetails: 'Hotdesk #14',
    originalPaidUsd: 10.0,
    originalPaidVnd: 250000,
    calculatedRefundUsd: 10.0,
    calculatedRefundVnd: 250000,
    policyTierLabel: '100% Policy',
    policyClause: 'Clause 2.1: Host Cancellation >24h',
    gatewayFeeDeductionUsd: 0.0,
    gatewayFeeDeductionVnd: 0,
    claimReason: 'Host cancellation >24h',
    customerStatement:
      'The operator notified me of a scheduled maintenance power outage 26 hours before my booking slot.',
    evidence: {
      type: 'log',
      thumbnailUrl: '',
      description: 'Host maintenance announcement log verified in operator portal',
      verificationBadge: 'Platform System Log',
      exifTimestamp: 'Jan 24, 09:12:00',
      onsiteTicketLog: 'Maintenance Broadcast #SYS-881',
      verified: true
    },
    status: 'processed',
    statusBadge: 'Processed',
    slaRemaining: 'Closed',
    triggeredAt: 'Completed via PayOS Auto-Reversal',
    escrowReserveCode: '#ESC-9788',
    adminResolutionNote: 'Full refund automatically processed under Host Cancellation clause.'
  },
  {
    id: '#RF-100',
    bookingRef: '#NX-9750',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@nomadstudio.eu',
    customerCompany: 'Nomad Studio Europe',
    avatarInitials: 'ER',
    workspaceHub: 'Da Nang SeaView Hub',
    spaceDetails: 'Private Studio 4',
    originalPaidUsd: 45.0,
    originalPaidVnd: 1125000,
    calculatedRefundUsd: 0.0,
    calculatedRefundVnd: 0,
    policyTierLabel: '0% - No Show',
    policyClause: 'Clause 5.4: Customer Missed Check-in',
    gatewayFeeDeductionUsd: 0.0,
    gatewayFeeDeductionVnd: 0,
    claimReason: 'Customer missed check-in',
    customerStatement:
      'My flight was delayed and I requested a credit voucher instead of my missed morning booking.',
    evidence: {
      type: 'log',
      thumbnailUrl: '',
      description: 'Turnstile access logs show no check-in attempt before slot conclusion.',
      verificationBadge: 'Turnstile Audit Pass',
      exifTimestamp: 'Jan 23, 18:00:00',
      onsiteTicketLog: 'Automated NFC Gate Audit #GATE-DN-04',
      verified: true
    },
    status: 'rejected',
    statusBadge: 'Rejected',
    slaRemaining: 'Closed',
    triggeredAt: 'Denied after staff review',
    escrowReserveCode: '#ESC-9750',
    adminResolutionNote:
      'Claim rejected under Clause 5.4 (No cancellation notification submitted prior to booking start).'
  },
  {
    id: '#RF-099',
    bookingRef: '#NX-9712',
    customerName: 'Alex Nguyen',
    customerEmail: 'alex.ng@devflow.vn',
    customerCompany: 'DevFlow Vietnam',
    avatarInitials: 'AN',
    workspaceHub: 'NexSpace Saigon Prime',
    spaceDetails: 'Dedicated Desk #8',
    originalPaidUsd: 25.0,
    originalPaidVnd: 625000,
    calculatedRefundUsd: 20.0,
    calculatedRefundVnd: 500000,
    policyTierLabel: '80% Policy',
    policyClause: 'Clause 3.1: Duplicate Gateway Charge',
    gatewayFeeDeductionUsd: 5.0,
    gatewayFeeDeductionVnd: 125000,
    claimReason: 'Double charge glitch',
    customerStatement:
      'Mobile banking app sent duplicate authorization requests during checkout. Two identical debits recorded.',
    evidence: {
      type: 'telemetry',
      thumbnailUrl: '',
      description: 'PayOS webhook confirmed duplicate authorization transaction #TX-4318 and #TX-4319.',
      verificationBadge: 'PayOS Gateway Match',
      exifTimestamp: 'Jan 22, 11:04:15',
      onsiteTicketLog: 'PayOS Reversal Request #REV-901',
      verified: true
    },
    status: 'processed',
    statusBadge: 'Processed',
    slaRemaining: 'Closed',
    triggeredAt: 'Completed via PayOS Auto-Reversal',
    escrowReserveCode: '#ESC-9712',
    adminResolutionNote: 'Duplicate billing reversal validated with PayOS gateway telemetry.'
  },
  {
    id: '#RF-098',
    bookingRef: '#NX-9685',
    customerName: 'Michael Chen',
    customerEmail: 'mchen@velocitylab.vn',
    customerCompany: 'Velocity Labs',
    avatarInitials: 'MC',
    workspaceHub: 'NexSpace Saigon Prime',
    spaceDetails: 'Pod 03 • Focus Room',
    originalPaidUsd: 18.0,
    originalPaidVnd: 450000,
    calculatedRefundUsd: 14.4,
    calculatedRefundVnd: 360000,
    policyTierLabel: '80% Policy Tier',
    policyClause: 'Clause 4.1: Hardware Equipment Glitch',
    gatewayFeeDeductionUsd: 3.6,
    gatewayFeeDeductionVnd: 90000,
    claimReason: 'Monitor HDMI display connection failure',
    customerStatement: '4K monitor in focus pod had faulty video input card, unusable for virtual call.',
    status: 'pending',
    statusBadge: 'Pending Review',
    slaRemaining: '2h remaining',
    triggeredAt: 'Triggered 16:10 via Customer App',
    escrowReserveCode: '#ESC-9685',
    adminResolutionNote: 'Under technical triage with hub facilities team.'
  },
  {
    id: '#RF-097',
    bookingRef: '#NX-9640',
    customerName: 'Jessica Wu',
    customerEmail: 'jess.wu@asiaventures.sg',
    customerCompany: 'Asia Ventures SG',
    avatarInitials: 'JW',
    workspaceHub: 'Westlake Executive Suites',
    spaceDetails: 'Executive Boardroom (12p)',
    originalPaidUsd: 80.0,
    originalPaidVnd: 2000000,
    calculatedRefundUsd: 64.0,
    calculatedRefundVnd: 1600000,
    policyTierLabel: '80% Policy Tier',
    policyClause: 'Clause 4.3: Acoustic Insulation Failure',
    gatewayFeeDeductionUsd: 16.0,
    gatewayFeeDeductionVnd: 400000,
    claimReason: 'Loud construction noise in adjacent corridor',
    customerStatement: 'Drilling noise throughout entire 2-hour confidential board presentation.',
    status: 'pending',
    statusBadge: 'Pending Review',
    slaRemaining: '1h remaining',
    triggeredAt: 'Triggered 17:02 via Customer App',
    escrowReserveCode: '#ESC-9640',
    adminResolutionNote: 'Urgent resolution required: partner logged unannounced building drilling.'
  }
];
