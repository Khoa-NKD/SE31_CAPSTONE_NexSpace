export interface CommissionRule {
  id: string;
  ruleCode: string;
  name: string;
  nameVi?: string;
  subtitle: string;
  subtitleVi?: string;
  scope: string;
  scopeVi?: string;
  scopeType: 'marketplace' | 'enterprise' | 'gateway';
  effectiveRate: number; // percentage (e.g. 12.0)
  fixedFeeVnd?: number; // e.g. 2000
  effectiveFrom: string;
  effectiveTo: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'DEPRECATED';
  description: string;
  descriptionVi?: string;
  applicableSpaces: string;
  applicableSpacesVi?: string;
  calculationType: 'PERCENTAGE' | 'FLAT_VARIABLE' | 'TIERED';
  version: string;
}

export interface GtvMonthlyData {
  month: string;
  monthVi: string;
  gtvAmountVnd: number;
  gtvDisplay: string;
  gtvDisplayVnd: string;
  netRevenueVnd: number;
  netDisplay: string;
  netDisplayVnd: string;
  gtvPercent: number; // For relative bar widths
  revenuePercent: number;
}

export interface ActiveFeeTile {
  id: string;
  title: string;
  titleVi: string;
  category: string;
  categoryVi: string;
  rateDisplay: string;
  subRateLabel: string;
  subRateLabelVi: string;
  description: string;
  descriptionVi: string;
  retained30d: string;
  retained30dVnd: string;
  volumeLabel: string;
  volumeLabelVi: string;
  statusBadge: string;
  statusBadgeVi: string;
  statusColor: 'emerald' | 'indigo' | 'blue' | 'amber';
  icon: string;
}

export const MOCK_ACTIVE_FEE_TILES: ActiveFeeTile[] = [
  {
    id: 'tile-mkt',
    title: 'Marketplace Take-Rate',
    titleVi: 'Phí sàn Marketplace (Take-Rate)',
    category: 'MARKETPLACE TAKE-RATE',
    categoryVi: 'PHÍ HOA HỒNG SÀN',
    rateDisplay: '10.0%',
    subRateLabel: 'per confirmed booking',
    subRateLabelVi: 'mỗi đặt chỗ thành công',
    description:
      'Applies to all on-demand hot desks, quiet booths, and hourly meeting rooms across Southeast Asia nodes.',
    descriptionVi:
      'Áp dụng cho toàn bộ bàn làm việc linh hoạt (hot desk), phòng họp theo giờ và buồng làm việc yên tĩnh.',
    retained30d: '$14,250.00',
    retained30dVnd: '362.000.000 ₫',
    volumeLabel: '3,842 transactions',
    volumeLabelVi: '3.842 giao dịch',
    statusBadge: 'Active',
    statusBadgeVi: 'Đang áp dụng',
    statusColor: 'emerald',
    icon: 'storefront'
  },
  {
    id: 'tile-enterprise',
    title: 'Enterprise Private Suites',
    titleVi: 'Hợp đồng Văn phòng Doanh nghiệp',
    category: 'ENTERPRISE PRIVATE SUITES',
    categoryVi: 'DOANH NGHIỆP TRỌN GÓI',
    rateDisplay: '8.0%',
    subRateLabel: 'recurring monthly billing',
    subRateLabelVi: 'thanh toán định kỳ hàng tháng',
    description:
      'Long-term month-to-month contracts & dedicated team wings (Tier-1 Enterprise partners with negotiated SLA).',
    descriptionVi:
      'Hợp đồng thuê dài hạn theo tháng và phân khu văn phòng riêng cho đối tác doanh nghiệp lớn (Tier-1 SLA).',
    retained30d: '$8,450.00',
    retained30dVnd: '215.000.000 ₫',
    volumeLabel: '42 monthly accounts',
    volumeLabelVi: '42 hợp đồng tháng',
    statusBadge: 'Tier-1 Partner',
    statusBadgeVi: 'Đối tác Tier-1',
    statusColor: 'indigo',
    icon: 'building'
  },
  {
    id: 'tile-gateway',
    title: 'Gateway Pass-Through (PayOS)',
    titleVi: 'Phí Cổng Thanh Toán (PayOS)',
    category: 'GATEWAY PASS-THROUGH (PAYOS)',
    categoryVi: 'CHUYỂN TIẾP TRUNG GIAN',
    rateDisplay: '0 ₫',
    subRateLabel: 'zero pass-through fee',
    subRateLabelVi: 'miễn phí chuyển tiếp qua cổng',
    description:
      'Direct pass-through gateway fee via VietQR NAPAS247 & domestic card rails (Zero platform fee applied).',
    descriptionVi:
      'Miễn phí chuyển tiếp trung gian qua cổng VietQR NAPAS247 & thẻ nội địa (0 ₫ phí chuyển tiếp).',
    retained30d: '100% matched',
    retained30dVnd: '100% cân khớp',
    volumeLabel: 'Reconciled',
    volumeLabelVi: 'Đã đối soát',
    statusBadge: 'Pass-through',
    statusBadgeVi: 'Thu hộ chuyển tiếp',
    statusColor: 'blue',
    icon: 'qrCode'
  }
];

export const MOCK_GTV_MONTHLY_HISTORY: GtvMonthlyData[] = [
  {
    month: 'Aug 2025',
    monthVi: 'Thg 8/2025',
    gtvAmountVnd: 2450000000,
    gtvDisplay: '$98.0k',
    gtvDisplayVnd: '2,45 tỷ ₫',
    netRevenueVnd: 245000000,
    netDisplay: '$9.8k net',
    netDisplayVnd: '245 tr ₫ net',
    gtvPercent: 68,
    revenuePercent: 24
  },
  {
    month: 'Sep 2025',
    monthVi: 'Thg 9/2025',
    gtvAmountVnd: 2700000000,
    gtvDisplay: '$108.0k',
    gtvDisplayVnd: '2,70 tỷ ₫',
    netRevenueVnd: 270000000,
    netDisplay: '$10.8k net',
    netDisplayVnd: '270 tr ₫ net',
    gtvPercent: 74,
    revenuePercent: 27
  },
  {
    month: 'Oct 2025',
    monthVi: 'Thg 10/2025',
    gtvAmountVnd: 3000000000,
    gtvDisplay: '$120.0k',
    gtvDisplayVnd: '3,00 tỷ ₫',
    netRevenueVnd: 300000000,
    netDisplay: '$12.0k net',
    netDisplayVnd: '300 tr ₫ net',
    gtvPercent: 82,
    revenuePercent: 30
  },
  {
    month: 'Nov 2025',
    monthVi: 'Thg 11/2025',
    gtvAmountVnd: 3200000000,
    gtvDisplay: '$128.0k',
    gtvDisplayVnd: '3,20 tỷ ₫',
    netRevenueVnd: 320000000,
    netDisplay: '$12.8k net',
    netDisplayVnd: '320 tr ₫ net',
    gtvPercent: 88,
    revenuePercent: 32
  },
  {
    month: 'Dec 2025',
    monthVi: 'Thg 12/2025',
    gtvAmountVnd: 3375000000,
    gtvDisplay: '$135.0k',
    gtvDisplayVnd: '3,38 tỷ ₫',
    netRevenueVnd: 337500000,
    netDisplay: '$13.5k net',
    netDisplayVnd: '338 tr ₫ net',
    gtvPercent: 93,
    revenuePercent: 34
  },
  {
    month: 'Jan 2026',
    monthVi: 'Thg 1/2026',
    gtvAmountVnd: 3562500000,
    gtvDisplay: '$142.5k',
    gtvDisplayVnd: '3,56 tỷ ₫',
    netRevenueVnd: 356250000,
    netDisplay: '$14.3k net',
    netDisplayVnd: '356,2 tr ₫ net',
    gtvPercent: 100,
    revenuePercent: 36
  }
];

export const MOCK_COMMISSION_RULES: CommissionRule[] = [
  {
    id: 'rule-01',
    ruleCode: 'NX_COMM_MKT_ST_01',
    name: 'Standard Marketplace Hot Desk Fee',
    nameVi: 'Phí sàn Bàn làm việc tiêu chuẩn (Hot Desk)',
    subtitle: 'Base transaction commission',
    subtitleVi: 'Phí hoa hồng giao dịch cơ bản',
    scope: 'Global Marketplace (All Spaces)',
    scopeVi: 'Toàn bộ sàn (Tất cả không gian)',
    scopeType: 'marketplace',
    effectiveRate: 10.0,
    effectiveFrom: '01/01/2025',
    effectiveTo: 'Vô thời hạn',
    status: 'ACTIVE',
    description:
      'Applies platform-wide to hot desks, flexible pods, and hourly meeting rooms in Vietnam and Singapore hubs.',
    descriptionVi:
      'Áp dụng trên toàn hệ thống cho bàn làm việc linh hoạt, buồng làm việc và phòng họp theo giờ.',
    applicableSpaces: 'All Hot Desks & Hourly Meeting Rooms',
    applicableSpacesVi: 'Tất cả bàn làm việc & phòng họp theo giờ',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-02',
    ruleCode: 'NX_COMM_ENT_PR_02',
    name: 'Dedicated Enterprise Suite Rate',
    nameVi: 'Tỷ lệ Phí Văn phòng Doanh nghiệp Chuyên biệt',
    subtitle: 'Long-term corporate tenant agreement',
    subtitleVi: 'Thỏa thuận đối tác doanh nghiệp dài hạn',
    scope: 'Tier-1 Enterprise Accounts',
    scopeVi: 'Khách hàng Doanh nghiệp Tier-1',
    scopeType: 'enterprise',
    effectiveRate: 8.0,
    effectiveFrom: '15/11/2025',
    effectiveTo: '31/12/2026',
    status: 'ACTIVE',
    description:
      'Volume-based corporate retainer applied to month-to-month contracts and private team suites.',
    descriptionVi:
      'Chính sách ưu đãi theo khối lượng cho hợp đồng thuê tháng và văn phòng làm việc riêng của đội nhóm.',
    applicableSpaces: 'Enterprise Suites & Private Wings',
    applicableSpacesVi: 'Phòng làm việc riêng & Phân khu chuyên biệt',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-03',
    ruleCode: 'NX_COMM_GW_PAYOS_03',
    name: 'Instant PayOS VietQR Pass-through (Free)',
    nameVi: 'Miễn phí Chuyển tiếp VietQR qua Cổng PayOS',
    subtitle: 'Domestic rails direct pass-through',
    subtitleVi: 'Miễn phí chuyển tiếp trung gian (0 ₫)',
    scope: 'All VietQR & Domestic Rails',
    scopeVi: 'Cổng VietQR NAPAS247 & Thẻ nội địa',
    scopeType: 'gateway',
    effectiveRate: 0.0,
    fixedFeeVnd: 0,
    effectiveFrom: 'Ngày ra mắt',
    effectiveTo: 'Vô thời hạn',
    status: 'ACTIVE',
    description:
      'Zero fee direct pass-through gateway rail charges via VietQR NAPAS247 and domestic credit/debit cards.',
    descriptionVi:
      'Miễn phí xử lý kỹ thuật chuyển tiếp trung gian qua NAPAS247 và thẻ ngân hàng trong nước (0 ₫).',
    applicableSpaces: 'Domestic checkout transactions',
    applicableSpacesVi: 'Giao dịch thanh toán trực tuyến trong nước',
    calculationType: 'FLAT_VARIABLE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-04',
    ruleCode: 'NX_COMM_EVT_SUR_04',
    name: 'Weekend Event Auditorium Surcharge',
    nameVi: 'Phụ phí Hội trường & Sự kiện Cuối tuần',
    subtitle: 'After-hours & large venue surcharge',
    subtitleVi: 'Phụ thu ngoài giờ & không gian quy mô lớn',
    scope: 'After-hours & Auditorium',
    scopeVi: 'Ngoài giờ & Hội trường sự kiện',
    scopeType: 'marketplace',
    effectiveRate: 15.0,
    effectiveFrom: '01/10/2025',
    effectiveTo: 'Vô thời hạn',
    status: 'ACTIVE',
    description:
      'Additional platform facilitation and technical support fee for weekend corporate hackathons and summits.',
    descriptionVi:
      'Phí vận hành hạ tầng bổ sung cho các sự kiện công nghệ, hội thảo và hackathon tổ chức vào thứ 7, chủ nhật.',
    applicableSpaces: 'Auditoriums & Event Halls',
    applicableSpacesVi: 'Hội trường & Phòng hội thảo lớn',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-05',
    ruleCode: 'NX_COMM_CNL_PEN_05',
    name: 'Late Cancellation Penalty Share',
    nameVi: 'Phí xử lý Hủy chỗ Sát giờ',
    subtitle: 'Short-notice cancellation split',
    subtitleVi: 'Khấu trừ khi hủy chỗ cận giờ nhận phòng',
    scope: 'Short-notice Cancellations',
    scopeVi: 'Hủy chỗ trong vòng 24 giờ',
    scopeType: 'marketplace',
    effectiveRate: 20.0,
    effectiveFrom: 'Ngày ra mắt',
    effectiveTo: 'Vô thời hạn',
    status: 'ACTIVE',
    description:
      'Platform mediation fee retained from non-refundable late cancellation fees paid by customers.',
    descriptionVi:
      'Phí hòa giải và xử lý giữ chỗ trích từ khoản phí phạt hủy không hoàn lại của khách hàng.',
    applicableSpaces: 'All cancellations < 24h prior to check-in',
    applicableSpacesVi: 'Hủy phòng trước giờ nhận phòng dưới 24h',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  }
];
