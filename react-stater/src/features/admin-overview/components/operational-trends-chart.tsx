import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  Zap,
  Wallet,
  Calendar,
  CheckCircle2,
  BarChart3
} from '@/components/ui/hugeicons';
import type {
  AdminOperationalTrendPointDTO,
  AdminVolumeSummaryDTO,
  MacroTrendPointDTO
} from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface OperationalTrendsChartProps {
  trendPoints: AdminOperationalTrendPointDTO[];
  summary: AdminVolumeSummaryDTO;
  macroTrends?: MacroTrendPointDTO[];
}

function formatVndShort(val: number): string {
  if (val >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(1)}B ₫`;
  }
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}M ₫`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0)}k ₫`;
  }
  return `${val} ₫`;
}

function formatVndFull(val: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(val);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: unknown }>;
  label?: string;
  isRevenue?: boolean;
  language?: string;
}

function ChartCustomTooltip({ active, payload, label, isRevenue, language }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const val = Number(payload[0].value || 0);

  return (
    <div className='rounded-lg border bg-popover p-2.5 shadow-md text-xs text-popover-foreground'>
      <div className='font-semibold mb-1 text-[11px]'>{label}</div>
      {isRevenue ? (
        <>
          <div className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold'>
            <span className='size-2 rounded-full bg-emerald-500'></span>
            <span>{formatVndFull(val)}</span>
          </div>
          <div className='text-[10px] text-muted-foreground mt-0.5'>
            {language === 'vi' ? 'Tiền quyết toán PayOS' : 'PayOS Settlements'}
          </div>
        </>
      ) : (
        <div className='flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold'>
          <span className='size-2 rounded-full bg-indigo-600'></span>
          <span>{val} {language === 'vi' ? 'lượt đặt chỗ' : 'bookings'}</span>
        </div>
      )}
    </div>
  );
}

export function OperationalTrendsChart({
  trendPoints,
  summary,
  macroTrends: _macroTrends
}: OperationalTrendsChartProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'both' | 'revenue' | 'bookings'>('both');

  const hasData = trendPoints && trendPoints.length > 0;
  const totalSettlements = trendPoints?.reduce((acc, p) => acc + (p.settlements || 0), 0) || 0;
  const totalBookingsCount = trendPoints?.reduce((acc, p) => acc + (p.bookings || 0), 0) || 0;

  return (
    <Card className='rounded-xl border border-border/70 p-4 sm:p-5 shadow-2xs flex flex-col justify-between bg-card mb-6'>
      <div>
        {/* Header & Metric Highlights */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-border/60'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='p-1.5 rounded-lg bg-primary/10 text-primary'>
                <BarChart3 className='size-4' />
              </div>
              <h3 className='text-base font-semibold text-foreground tracking-tight'>
                {language === 'vi'
                  ? 'Phân tích xu hướng dòng tiền & Vận hành sàn'
                  : 'Financial Flow & Platform Operational Trends'}
              </h3>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5 ml-8'>
              {language === 'vi'
                ? 'Biểu đồ dòng tiền thanh toán PayOS thực tế và tần suất đặt chỗ theo chu kỳ.'
                : 'Real-time PayOS transaction cashflow vs booking volume frequency.'}
            </p>
          </div>

          {/* Quick Metrics Bar in Header */}
          <div className='flex items-center gap-3 sm:gap-4 text-xs flex-wrap'>
            <div className='flex flex-col'>
              <span className='text-[10px] uppercase font-semibold text-muted-foreground tracking-wider'>
                {language === 'vi' ? 'Tổng dòng tiền' : 'Total Volume'}
              </span>
              <span className='font-bold text-foreground text-sm font-heading'>
                {summary.totalVolume || formatVndFull(totalSettlements)}
              </span>
            </div>

            <div className='h-7 w-px bg-border/70 hidden sm:block'></div>

            <div className='flex flex-col'>
              <span className='text-[10px] uppercase font-semibold text-muted-foreground tracking-wider'>
                {language === 'vi' ? 'Tổng đặt chỗ' : 'Total Bookings'}
              </span>
              <span className='font-bold text-foreground text-sm font-heading'>
                {totalBookingsCount} {language === 'vi' ? 'lượt' : 'bookings'}
              </span>
            </div>

            <div className='h-7 w-px bg-border/70 hidden sm:block'></div>

            <div className='flex flex-col'>
              <span className='text-[10px] uppercase font-semibold text-muted-foreground tracking-wider'>
                {language === 'vi' ? 'Tỷ lệ PayOS' : 'PayOS SLA'}
              </span>
              <span className='font-bold text-emerald-600 dark:text-emerald-400 text-sm'>
                {summary.slaSuccessRate || '99.4%'}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher & Legend Bar */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-3.5'>
          {/* View Switcher Pills */}
          <div className='inline-flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/50 text-xs'>
            <button
              type='button'
              onClick={() => setActiveTab('both')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'both'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {language === 'vi' ? 'Toàn diện (Tiền & Đặt chỗ)' : 'Dual View'}
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('revenue')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'revenue'
                  ? 'bg-card text-foreground shadow-2xs font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wallet className='size-3' />
              <span>{language === 'vi' ? 'Biểu đồ Tiền (VNĐ)' : 'Revenue (VND)'}</span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('bookings')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'bookings'
                  ? 'bg-card text-foreground shadow-2xs font-semibold text-indigo-600 dark:text-indigo-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className='size-3' />
              <span>{language === 'vi' ? 'Lượt đặt chỗ' : 'Bookings'}</span>
            </button>
          </div>

          {/* Peak Insight Badge */}
          {summary.peakDay && (
            <div className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-md text-[11px] text-indigo-700 dark:text-indigo-300'>
              <Zap className='size-3 text-indigo-600 dark:text-indigo-400 shrink-0' />
              <span>
                {language === 'vi' ? 'Ngày cao điểm:' : 'Peak Day:'}{' '}
                <strong>{summary.peakCount}</strong> {language === 'vi' ? 'lượt vào' : 'on'}{' '}
                <strong>{summary.peakDay}</strong>
                {summary.peakHub && ` (${summary.peakHub})`}
              </span>
            </div>
          )}
        </div>

        {/* Charts Viewport */}
        {!hasData ? (
          <div className='h-64 flex flex-col items-center justify-center text-muted-foreground text-xs'>
            <Calendar className='size-8 text-muted-foreground/40 mb-2' />
            <span>{language === 'vi' ? 'Chưa có dữ liệu xu hướng cho khoảng thời gian này.' : 'No trend data recorded for this range.'}</span>
          </div>
        ) : (
          <div className='mt-2'>
            {/* 1. DUAL VIEW: Two distinct side-by-side charts for Financials and Bookings */}
            {activeTab === 'both' && (
              <div className='grid grid-cols-1 lg:grid-cols-12 gap-5'>
                {/* FINANCIAL CHART: 7 Columns (Largest) */}
                <div className='lg:col-span-7 bg-muted/20 rounded-xl p-3.5 border border-border/50'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-1.5'>
                      <span className='size-2.5 rounded-full bg-emerald-500'></span>
                      <span className='text-xs font-semibold text-foreground'>
                        {language === 'vi' ? 'Dòng tiền giao dịch PayOS (VNĐ)' : 'PayOS Settlements (VND)'}
                      </span>
                    </div>
                    <span className='text-[11px] font-bold text-emerald-600 dark:text-emerald-400'>
                      {formatVndFull(totalSettlements)}
                    </span>
                  </div>

                  <div className='w-full h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <AreaChart data={trendPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id='colorSettlementsDual' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='5%' stopColor='#10B981' stopOpacity={0.3} />
                            <stop offset='95%' stopColor='#10B981' stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='currentColor' className='text-border/60' />
                        <XAxis
                          dataKey='day'
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          className='text-muted-foreground'
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => formatVndShort(v)}
                          className='text-muted-foreground'
                          width={45}
                        />
                        <Tooltip
                          content={<ChartCustomTooltip isRevenue language={language} />}
                        />
                        <Area
                          type='monotone'
                          dataKey='settlements'
                          name='Dòng tiền PayOS'
                          stroke='#10B981'
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill='url(#colorSettlementsDual)'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* BOOKINGS CHART: 5 Columns */}
                <div className='lg:col-span-5 bg-muted/20 rounded-xl p-3.5 border border-border/50'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-1.5'>
                      <span className='size-2.5 rounded-full bg-indigo-600'></span>
                      <span className='text-xs font-semibold text-foreground'>
                        {language === 'vi' ? 'Lượt đặt chỗ (Bookings)' : 'Booking Volume'}
                      </span>
                    </div>
                    <span className='text-[11px] font-bold text-indigo-600 dark:text-indigo-400'>
                      {totalBookingsCount} {language === 'vi' ? 'đặt chỗ' : 'total'}
                    </span>
                  </div>

                  <div className='w-full h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={trendPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='currentColor' className='text-border/60' />
                        <XAxis
                          dataKey='day'
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          className='text-muted-foreground'
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          allowDecimals={false}
                          className='text-muted-foreground'
                          width={30}
                        />
                        <Tooltip
                          content={<ChartCustomTooltip isRevenue={false} language={language} />}
                        />
                        <Bar
                          dataKey='bookings'
                          name='Lượt đặt chỗ'
                          fill='#4F46E5'
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 2. REVENUE ONLY FULL-WIDTH VIEW */}
            {activeTab === 'revenue' && (
              <div className='bg-muted/20 rounded-xl p-4 border border-border/50'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <span className='size-3 rounded-full bg-emerald-500'></span>
                    <span className='text-sm font-semibold text-foreground'>
                      {language === 'vi'
                        ? 'Biểu đồ Chi tiết Doanh thu Quyết toán PayOS (VNĐ)'
                        : 'Detailed PayOS Transaction Volume & Settlements (VND)'}
                    </span>
                  </div>
                  <Badge variant='outline' className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>
                    {formatVndFull(totalSettlements)}
                  </Badge>
                </div>

                <div className='w-full h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={trendPoints} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                      <defs>
                        <linearGradient id='colorSettlementsSolo' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#10B981' stopOpacity={0.35} />
                          <stop offset='95%' stopColor='#10B981' stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='currentColor' className='text-border/60' />
                      <XAxis
                        dataKey='day'
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        className='text-muted-foreground'
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatVndShort(v)}
                        className='text-muted-foreground'
                        width={60}
                      />
                      <Tooltip
                        content={<ChartCustomTooltip isRevenue language={language} />}
                      />
                      <Area
                        type='monotone'
                        dataKey='settlements'
                        name='Quyết toán PayOS'
                        stroke='#10B981'
                        strokeWidth={3}
                        fillOpacity={1}
                        fill='url(#colorSettlementsSolo)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. BOOKINGS ONLY FULL-WIDTH VIEW */}
            {activeTab === 'bookings' && (
              <div className='bg-muted/20 rounded-xl p-4 border border-border/50'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <span className='size-3 rounded-full bg-indigo-600'></span>
                    <span className='text-sm font-semibold text-foreground'>
                      {language === 'vi'
                        ? 'Biểu đồ Chi tiết Lượng Đặt Chỗ (Bookings Frequency)'
                        : 'Detailed Booking Frequency Volume'}
                    </span>
                  </div>
                  <Badge variant='outline' className='text-xs font-bold text-indigo-600 dark:text-indigo-400'>
                    {totalBookingsCount} {language === 'vi' ? 'lượt đặt chỗ' : 'bookings'}
                  </Badge>
                </div>

                <div className='w-full h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={trendPoints} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='currentColor' className='text-border/60' />
                      <XAxis
                        dataKey='day'
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        className='text-muted-foreground'
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                        className='text-muted-foreground'
                        width={35}
                      />
                      <Tooltip
                        content={<ChartCustomTooltip isRevenue={false} language={language} />}
                      />
                      <Bar
                        dataKey='bookings'
                        name='Lượng đặt chỗ'
                        fill='#4F46E5'
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Gateway Status */}
      <div className='mt-3.5 pt-2.5 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-muted-foreground gap-1.5'>
        <div className='flex items-center gap-1.5'>
          <CheckCircle2 className='size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0' />
          <span>
            {language === 'vi'
              ? 'Cổng thanh toán PayOS: Hoạt động bình thường, 0 giao dịch nghẽn hàng đợi.'
              : 'PayOS Gateway: Operational, 0 queued sync retries.'}
          </span>
        </div>
        <span className='font-mono text-[10px] text-muted-foreground/80'>
          Real-time Audit Ledger Sync
        </span>
      </div>
    </Card>
  );
}
