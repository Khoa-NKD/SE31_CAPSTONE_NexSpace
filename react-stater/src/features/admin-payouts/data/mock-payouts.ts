import type { OrganizerWithdrawalBatch, OrganizerPayoutSetting } from '../api/types';

export const INITIAL_PAYOUT_BATCHES: OrganizerWithdrawalBatch[] = [
  {
    id: 101,
    batchCode: 'WD-20261124-001',
    organizerId: 1,
    organizerName: 'Công ty Cổ phần Dreamplex Co-working',
    amount: 18450000,
    payoutType: 'AUTO_DAILY',
    status: 'PAID',
    bankName: 'VPBank',
    bankBin: '970432',
    bankAccountNumber: '09812349921',
    bankAccountHolder: 'DREAMPLEX CO-WORKING JSC',
    payosReference: 'POS-PAY-882190',
    errorReason: null,
    createdAt: '2026-11-24T08:30:00Z'
  },
  {
    id: 102,
    batchCode: 'WD-20261123-002',
    organizerId: 2,
    organizerName: 'Công ty Cổ phần Không gian Sáng tạo Toong',
    amount: 24120000,
    payoutType: 'MANUAL',
    status: 'PAID',
    bankName: 'Techcombank',
    bankBin: '970407',
    bankAccountNumber: '1903456784410',
    bankAccountHolder: 'CONG TY TOONG CO-WORKING',
    payosReference: 'POS-PAY-881942',
    errorReason: null,
    createdAt: '2026-11-23T17:15:00Z'
  },
  {
    id: 103,
    batchCode: 'WD-20261123-003',
    organizerId: 3,
    organizerName: 'Công ty TNHH Campus Nest Demo',
    amount: 6840000,
    payoutType: 'AUTO_DAILY',
    status: 'PAID',
    bankName: 'Vietcombank',
    bankBin: '970436',
    bankAccountNumber: '0071001212',
    bankAccountHolder: 'MAI DANG HUY',
    payosReference: 'POS-PAY-881801',
    errorReason: null,
    createdAt: '2026-11-23T08:30:00Z'
  },
  {
    id: 104,
    batchCode: 'WD-20261122-004',
    organizerId: 4,
    organizerName: 'Công ty TNHH Riverlight Workspace Demo',
    amount: 12456678,
    payoutType: 'MANUAL',
    status: 'PAID',
    bankName: 'MBBank',
    bankBin: '970422',
    bankAccountNumber: '080010990293',
    bankAccountHolder: 'RIVERLIGHT HUB VN',
    payosReference: 'POS-PAY-880911',
    errorReason: null,
    createdAt: '2026-11-22T14:20:00Z'
  },
  {
    id: 105,
    batchCode: 'WD-20261121-005',
    organizerId: 5,
    organizerName: 'Công ty TNHH The Hive Vietnam Coworking',
    amount: 5200000,
    payoutType: 'AUTO_DAILY',
    status: 'FAILED',
    bankName: 'ACB',
    bankBin: '970416',
    bankAccountNumber: '246813576678',
    bankAccountHolder: 'THE HIVE VN CO LTD',
    payosReference: null,
    errorReason: 'Lỗi cổng PayOS: Ngân hàng thụ hưởng quá tải kết nối (Timeout)',
    createdAt: '2026-11-21T08:30:00Z'
  }
];

export const INITIAL_PENDING_CONFIG_REQUESTS: OrganizerPayoutSetting[] = [];
