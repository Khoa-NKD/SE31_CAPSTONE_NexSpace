export type TransactionStatus = 'settled' | 'pending' | 'failed' | 'refunded';
export type PaymentGatewayType = 'PayOS Banking QR' | 'VietQR NAPAS247' | 'Visa / MasterCard';

export interface FinancialSummaryKpis {
  grossVolumeUsd: number;
  grossVolumeVnd: number;
  momGrowth: number;
  netCommissionUsd: number;
  netCommissionVnd: number;
  avgTakeRate: number;
  payoutsUsd: number;
  payoutsVnd: number;
  gatewayFeesUsd: number;
  totalTransactionsCount: number;
  settledCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
}

export interface TransactionRecord {
  id: string; // e.g. "TX-4412"
  bookingRef: string; // e.g. "NX-9021"
  bookingSummary: string; // e.g. "Desk A-12 • NexSpace Saigon Prime Hub"
  customerName: string;
  customerEmail: string;
  organizerLegalName: string;
  gateway: PaymentGatewayType;
  checkoutMethod: string;
  grossChargeUsd: number;
  grossChargeVnd: number;
  platformCommissionPercent: number;
  platformCommissionUsd: number;
  platformCommissionVnd: number;
  gatewayFeePercent: number;
  gatewayFeeUsd: number;
  gatewayFeeVnd: number;
  netPayoutUsd: number;
  netPayoutVnd: number;
  disbursementBank: string;
  status: TransactionStatus;
  statusBadge: string;
  timestamp: string;
  relativeTime: string;
  payOsOrderCode: string;
  napasTraceNo: string;
  bankRefNumber: string;
  webhookLatency: string;
  sha256Checksum: string;
  rawPayloadJson: Record<string, unknown>;
  secOpsLedgerHash: string;
  reconciled: boolean;
}

export const MOCK_FINANCIAL_KPIS: FinancialSummaryKpis = {
  grossVolumeUsd: 142500.0,
  grossVolumeVnd: 3562500000,
  momGrowth: 12.4,
  netCommissionUsd: 17100.0,
  netCommissionVnd: 427500000,
  avgTakeRate: 12.0,
  payoutsUsd: 121125.0,
  payoutsVnd: 3028125000,
  gatewayFeesUsd: 4275.0,
  totalTransactionsCount: 3842,
  settledCount: 3780,
  pendingCount: 38,
  failedCount: 18,
  refundedCount: 6
};

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TX-4412',
    bookingRef: 'NX-9021',
    bookingSummary: 'Desk A-12 • NexSpace Saigon Prime Hub',
    customerName: 'Alex Nguyen',
    customerEmail: 'alex@pentacord.io',
    organizerLegalName: 'Acme Coworking Vietnam Co., Ltd',
    gateway: 'PayOS Banking QR',
    checkoutMethod: 'PayOS Smart Checkout • VietQR NAPAS247 Instant Transfer',
    grossChargeUsd: 10.0,
    grossChargeVnd: 250000,
    platformCommissionPercent: 12.0,
    platformCommissionUsd: 1.2,
    platformCommissionVnd: 30000,
    gatewayFeePercent: 1.1,
    gatewayFeeUsd: 0.11,
    gatewayFeeVnd: 2750,
    netPayoutUsd: 8.69,
    netPayoutVnd: 217250,
    disbursementBank: 'VPBank • Account ending in **9921 (Acme Coworking VN)',
    status: 'settled',
    statusBadge: 'Settled & Matched 100%',
    timestamp: 'Today, 08:48 UTC',
    relativeTime: '3h ago',
    payOsOrderCode: '20260125-9021-P05',
    napasTraceNo: 'TRC-993821094',
    bankRefNumber: 'FT26025982134928',
    webhookLatency: '200 OK (in 320ms)',
    sha256Checksum: 'SHA-256 Validated [Match]',
    rawPayloadJson: {
      orderCode: '20260125-9021-P05',
      amount: 250000,
      description: 'NX9021 DESK A12 BITEXCO',
      accountNumber: '988012345678',
      reference: 'FT26025982134928',
      transactionDateTime: '2026-01-25 15:48:50',
      currency: 'VND',
      paymentLinkId: 'plink_9921_vn',
      code: '00',
      desc: 'success'
    },
    secOpsLedgerHash: 'IBX-NX21-SEC-4412',
    reconciled: true
  },
  {
    id: 'TX-4411',
    bookingRef: 'NX-9020',
    bookingSummary: 'Meeting Room 03 • Hanoi Westlake Creative Space',
    customerName: 'Sarah Jenkins',
    customerEmail: 's.jenkins@innoasia.sg',
    organizerLegalName: 'V-Ventures Workspace JSC',
    gateway: 'PayOS Banking QR',
    checkoutMethod: 'PayOS Smart Checkout • VietQR NAPAS247',
    grossChargeUsd: 32.0,
    grossChargeVnd: 800000,
    platformCommissionPercent: 12.0,
    platformCommissionUsd: 3.84,
    platformCommissionVnd: 96000,
    gatewayFeePercent: 1.1,
    gatewayFeeUsd: 0.35,
    gatewayFeeVnd: 8800,
    netPayoutUsd: 27.81,
    netPayoutVnd: 695200,
    disbursementBank: 'Techcombank • Account ending in **4411 (V-Ventures JSC)',
    status: 'settled',
    statusBadge: 'Settled & Matched 100%',
    timestamp: 'Today, 07:13 UTC',
    relativeTime: '5h ago',
    payOsOrderCode: '20260125-9020-P04',
    napasTraceNo: 'TRC-993820881',
    bankRefNumber: 'FT26025977112841',
    webhookLatency: '200 OK (in 280ms)',
    sha256Checksum: 'SHA-256 Validated [Match]',
    rawPayloadJson: {
      orderCode: '20260125-9020-P04',
      amount: 800000,
      description: 'NX9020 MTG 03 KEANGNAM',
      accountNumber: '190388992211',
      reference: 'FT26025977112841',
      code: '00',
      desc: 'success'
    },
    secOpsLedgerHash: 'IBX-NX21-SEC-4411',
    reconciled: true
  },
  {
    id: 'TX-4410',
    bookingRef: 'NX-9019',
    bookingSummary: 'Desk C-08 • Da Nang Coastal Tech Haven',
    customerName: 'David Kim',
    customerEmail: 'david.corea@gmail.com',
    organizerLegalName: 'Danang Coastal Hubs Ltd.',
    gateway: 'Visa / MasterCard',
    checkoutMethod: 'Direct Payment • Visa 3DS Secure',
    grossChargeUsd: 18.5,
    grossChargeVnd: 462500,
    platformCommissionPercent: 12.0,
    platformCommissionUsd: 2.22,
    platformCommissionVnd: 55500,
    gatewayFeePercent: 2.0,
    gatewayFeeUsd: 0.37,
    gatewayFeeVnd: 9250,
    netPayoutUsd: 15.91,
    netPayoutVnd: 397750,
    disbursementBank: 'VietinBank • Account ending in **1092 (Danang Coastal)',
    status: 'settled',
    statusBadge: 'Settled & Matched 100%',
    timestamp: 'Yesterday, 07:30 UTC',
    relativeTime: '1d ago',
    payOsOrderCode: '20260124-9019-CARD',
    napasTraceNo: 'VISA-3DS-882910',
    bankRefNumber: 'CARD2602498214',
    webhookLatency: '200 OK (in 410ms)',
    sha256Checksum: 'SHA-256 Validated [Match]',
    rawPayloadJson: {
      orderCode: '20260124-9019-CARD',
      amount: 462500,
      cardType: 'VISA',
      status: 'CAPTURED'
    },
    secOpsLedgerHash: 'IBX-NX21-SEC-4410',
    reconciled: true
  },
  {
    id: 'TX-4409',
    bookingRef: 'NX-9018',
    bookingSummary: 'Studio 04 • Thao Dien Creative Hub',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@archstudio.design',
    organizerLegalName: 'Saigon Creative Spaces Ltd.',
    gateway: 'PayOS Banking QR',
    checkoutMethod: 'PayOS Smart Checkout • VietQR Instant Transfer',
    grossChargeUsd: 45.0,
    grossChargeVnd: 1125000,
    platformCommissionPercent: 12.0,
    platformCommissionUsd: 5.4,
    platformCommissionVnd: 135000,
    gatewayFeePercent: 1.1,
    gatewayFeeUsd: 0.5,
    gatewayFeeVnd: 12375,
    netPayoutUsd: 39.1,
    netPayoutVnd: 977625,
    disbursementBank: 'Vietcombank • Account ending in **8821 (Saigon Creative)',
    status: 'settled',
    statusBadge: 'Settled & Matched 100%',
    timestamp: 'Today, 08:05 UTC',
    relativeTime: '4h ago',
    payOsOrderCode: '20260125-9018-P03',
    napasTraceNo: 'TRC-993819920',
    bankRefNumber: 'FT26025966332190',
    webhookLatency: '200 OK (in 190ms)',
    sha256Checksum: 'SHA-256 Validated [Match]',
    rawPayloadJson: {
      orderCode: '20260125-9018-P03',
      amount: 1125000,
      description: 'NX9018 THAO DIEN STUDIO 04',
      code: '00'
    },
    secOpsLedgerHash: 'IBX-NX21-SEC-4409',
    reconciled: true
  },
  {
    id: 'TX-4408',
    bookingRef: 'NX-9017',
    bookingSummary: 'Desk B-04 • NexSpace Saigon Prime Hub',
    customerName: 'Michael Thorne',
    customerEmail: 'm.thorne@singpost.sg',
    organizerLegalName: 'Acme Coworking Vietnam Co., Ltd',
    gateway: 'PayOS Banking QR',
    checkoutMethod: 'PayOS Smart Checkout • Full Refund Reversal',
    grossChargeUsd: 10.0,
    grossChargeVnd: 250000,
    platformCommissionPercent: 12.0,
    platformCommissionUsd: 0,
    platformCommissionVnd: 0,
    gatewayFeePercent: 0,
    gatewayFeeUsd: 0,
    gatewayFeeVnd: 0,
    netPayoutUsd: 0,
    netPayoutVnd: 0,
    disbursementBank: 'Escrow Held • Reversed to Customer Account',
    status: 'refunded',
    statusBadge: 'Refunded (100%)',
    timestamp: 'Today, 08:30 UTC',
    relativeTime: '3h ago',
    payOsOrderCode: '20260125-9017-REF',
    napasTraceNo: 'REF-NAPAS-00291',
    bankRefNumber: 'FT26025955110022',
    webhookLatency: '200 OK (in 350ms)',
    sha256Checksum: 'SHA-256 Validated [Match]',
    rawPayloadJson: {
      orderCode: '20260125-9017-REF',
      originalOrderCode: '20260125-9017-P02',
      refundAmount: 250000,
      status: 'REFUND_COMPLETED'
    },
    secOpsLedgerHash: 'IBX-NX21-SEC-4408',
    reconciled: true
  },
  {
    id: 'TX-4407',
    bookingRef: 'NX-9016',
    bookingSummary: 'Executive Suite 02 • Landmark 81 Innovation Center',
    customerName: 'Bao Chau Tran',
    customerEmail: 'chau.tran@fintechvn.io',
    organizerLegalName: 'District 1 Creative Spaces Ltd',
    gateway: 'PayOS Banking QR',
    checkoutMethod: 'PayOS Smart Checkout • Escrow Ingress',
    grossChargeUsd: 58.5,
    grossChargeVnd: 1462500,
    platformCommissionPercent: 12.0,
    platformCommissionUsd: 7.02,
    platformCommissionVnd: 175500,
    gatewayFeePercent: 1.1,
    gatewayFeeUsd: 0.64,
    gatewayFeeVnd: 16087,
    netPayoutUsd: 50.84,
    netPayoutVnd: 1270913,
    disbursementBank: 'PayOS Smart Escrow #ESC-9007 (Pending Checkout)',
    status: 'pending',
    statusBadge: 'Pending Escrow Hold',
    timestamp: 'Today, 09:15 UTC',
    relativeTime: '2h ago',
    payOsOrderCode: '20260125-9016-P01',
    napasTraceNo: 'TRC-993822004',
    bankRefNumber: 'FT26025999881100',
    webhookLatency: '200 OK (in 305ms)',
    sha256Checksum: 'SHA-256 Validated [Match]',
    rawPayloadJson: {
      orderCode: '20260125-9016-P01',
      amount: 1462500,
      status: 'ESCROW_HELD'
    },
    secOpsLedgerHash: 'IBX-NX21-SEC-4407',
    reconciled: false
  }
];
