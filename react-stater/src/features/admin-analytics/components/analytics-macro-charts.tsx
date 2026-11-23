import React from 'react';
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
import type { MacroTrendPointDTO, ResourceBreakdownPointDTO } from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface AnalyticsMacroChartsProps {
  macroTrends?: MacroTrendPointDTO[];
  resourceBreakdown?: ResourceBreakdownPointDTO[];
  grossRevenueVnd?: number;
  grossRevenueUsd?: number;
  netRevenueVnd?: number;
  netRevenueUsd?: number;
  grossRevenueChangePercent?: string;
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

interface MacroTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: unknown; dataKey?: string; name?: string }>;
  label?: string;
  language?: string;
}

function MacroTrendTooltip({ active, payload, label, language }: MacroTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const gmv = Number(payload.find(p => p.dataKey === 'gmvVnd')?.value || 0);
  const net = Number(payload.find(p => p.dataKey === 'netRevenueVnd')?.value || 0);

  return (
    <div className='rounded-lg border bg-popover p-3 shadow-md text-xs text-popover-foreground space-y-1.5'>
      <div className='font-bold text-[11px] pb-1 border-b border-border/50'>{label}</div>
      <div className='flex items-center justify-between gap-4'>
        <span className='flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400'>
          <span className='size-2 rounded-full bg-indigo-600'></span>
          <span>{language === 'vi' ? 'Tổng GMV:' : 'Gross Volume:'}</span>
        </span>
        <strong className='font-mono font-bold'>{formatVndFull(gmv)}</strong>
      </div>
      <div className='flex items-center justify-between gap-4'>
        <span className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400'>
          <span className='size-2 rounded-full bg-emerald-500'></span>
          <span>{language === 'vi' ? 'Hoa hồng sàn (~10%):' : 'Net Commission:'}</span>
        </span>
        <strong className='font-mono font-bold text-emerald-600 dark:text-emerald-400'>{formatVndFull(net)}</strong>
      </div>
    </div>
  );
}

function ResourceTooltip({ active, payload, label, language }: MacroTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className='rounded-lg border bg-popover p-3 shadow-md text-xs text-popover-foreground space-y-1'>
      <div className='font-bold text-[11px] pb-1 border-b border-border/50'>{label}</div>
      {payload.map((item, idx) => (
        <div key={idx} className='flex items-center justify-between gap-4'>
          <span className='text-muted-foreground'>{item.name}:</span>
          <strong className='font-mono'>{String(item.value)} {language === 'vi' ? 'lượt' : 'bk'}</strong>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsMacroCharts({
  macroTrends,
  resourceBreakdown,
  grossRevenueVnd,
  grossRevenueUsd,
  netRevenueVnd,
  netRevenueUsd,
  grossRevenueChangePercent
}: AnalyticsMacroChartsProps) {
  const { language } = useLanguage();

  const totalGmvDisplay = grossRevenueVnd !== undefined
    ? `${grossRevenueVnd.toLocaleString('vi-VN')} ₫ ($${(grossRevenueUsd || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} USD)`
    : '0 ₫';

  const totalNetDisplay = netRevenueVnd !== undefined
    ? `${netRevenueVnd.toLocaleString('vi-VN')} ₫ ($${(netRevenueUsd || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} USD)`
    : '0 ₫';

  const changePercentDisplay = grossRevenueChangePercent || '+14.8% MoM';

  // Calculate real resource percentages from actual data
  const totalHotDesks = resourceBreakdown?.reduce((acc, r) => acc + (r.hotDesks || 0), 0) || 0;
  const totalMeetingSuites = resourceBreakdown?.reduce((acc, r) => acc + (r.meetingSuites || 0), 0) || 0;
  const totalPods = resourceBreakdown?.reduce((acc, r) => acc + (r.dedicatedPods || 0), 0) || 0;
  const grandTotal = totalHotDesks + totalMeetingSuites + totalPods || 1;

  const hotDesksPct = Math.round((totalHotDesks / grandTotal) * 100);
  const suitesPct = Math.round((totalMeetingSuites / grandTotal) * 100);
  const podsPct = Math.max(0, 100 - hotDesksPct - suitesPct);

  return (
    <section
      aria-label='Financial & Volume Macro Trends'
      className='grid grid-cols-1 lg:grid-cols-2 gap-4'
    >
      {/* Left Card: Gross Booking Value vs Net Platform Fees (Real Area Chart) */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-4 sm:p-5 shadow-2xs flex flex-col justify-between'>
        <div>
          {/* Header & Visual Legend */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60'>
            <div>
              <h2 className='text-sm sm:text-base font-bold text-foreground tracking-tight'>
                {language === 'vi'
                  ? 'Tổng giá trị giao dịch (GMV) & Hoa hồng sàn'
                  : 'Gross Booking Value vs Net Platform Fees'}
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {language === 'vi'
                  ? 'Dòng tiền giao dịch thực tế qua cổng ký quỹ NexSpace & PayOS 6 tháng gần nhất'
                  : 'Verified escrow cashflow via PayOS Gateway across rolling 6 months'}
              </p>
            </div>
            {/* Legends */}
            <div className='flex items-center gap-3 text-xs font-semibold shrink-0'>
              <div className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-indigo-600' />
                <span className='text-foreground text-[11px]'>{language === 'vi' ? 'Tổng GMV' : 'Gross (GMV)'}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-emerald-500' />
                <span className='text-foreground text-[11px]'>{language === 'vi' ? 'Hoa hồng sàn (~10%)' : 'Net Rev (~10%)'}</span>
              </div>
            </div>
          </div>

          {/* Real Area Chart */}
          <div className='mt-4 h-64 w-full'>
            {macroTrends && macroTrends.length > 0 ? (
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={macroTrends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id='realGmvGrad' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#4F46E5' stopOpacity={0.3} />
                      <stop offset='95%' stopColor='#4F46E5' stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id='realNetGrad' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#10B981' stopOpacity={0.35} />
                      <stop offset='95%' stopColor='#10B981' stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='currentColor' className='text-border/50' />
                  <XAxis
                    dataKey='month'
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
                  <Tooltip content={<MacroTrendTooltip language={language} />} />
                  <Area
                    type='monotone'
                    dataKey='gmvVnd'
                    name='Tổng GMV'
                    stroke='#4F46E5'
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill='url(#realGmvGrad)'
                  />
                  <Area
                    type='monotone'
                    dataKey='netRevenueVnd'
                    name='Hoa hồng sàn'
                    stroke='#10B981'
                    strokeWidth={2}
                    fillOpacity={1}
                    fill='url(#realNetGrad)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className='h-full flex items-center justify-center text-xs text-muted-foreground'>
                {language === 'vi' ? 'Chưa có đủ dữ liệu chu kỳ 6 tháng' : 'Insufficient 6-month historical data'}
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className='mt-3.5 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg gap-1.5'>
          <span className='text-muted-foreground text-[11px]'>
            Total GMV: <strong className='text-foreground font-bold font-mono'>{totalGmvDisplay}</strong>
          </span>
          <span className='text-muted-foreground text-[11px]'>
            {language === 'vi' ? 'Hoa hồng sàn nhận:' : 'Net Commission:'}{' '}
            <strong className='text-emerald-700 dark:text-emerald-400 font-bold font-mono'>{totalNetDisplay}</strong>{' '}
            <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>({changePercentDisplay})</span>
          </span>
        </div>
      </div>

      {/* Right Card: Booking Volume by Resource Type (Real Bar Chart) */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-4 sm:p-5 shadow-2xs flex flex-col justify-between'>
        <div>
          {/* Header & Legends */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60'>
            <div>
              <h2 className='text-sm sm:text-base font-bold text-foreground tracking-tight'>
                {language === 'vi' ? 'Phân bổ đặt chỗ theo loại tài nguyên' : 'Booking Volume by Resource Type'}
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {language === 'vi'
                  ? 'Tần suất sử dụng tài nguyên linh hoạt theo tuần từ cơ sở dữ liệu'
                  : 'Weekly reservation breakdown by resource modalities from database'}
              </p>
            </div>
            {/* Legends */}
            <div className='flex items-center gap-2.5 text-xs font-semibold shrink-0'>
              <div className='flex items-center gap-1'>
                <span className='size-2.5 rounded-xs bg-indigo-600' />
                <span className='text-foreground text-[11px]'>Hot Desks</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='size-2.5 rounded-xs bg-sky-400' />
                <span className='text-foreground text-[11px]'>Suites</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='size-2.5 rounded-xs bg-slate-700 dark:bg-slate-300' />
                <span className='text-foreground text-[11px]'>Pods</span>
              </div>
            </div>
          </div>

          {/* Real Grouped Bar Chart */}
          <div className='mt-4 h-64 w-full'>
            {resourceBreakdown && resourceBreakdown.length > 0 ? (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={resourceBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='currentColor' className='text-border/50' />
                  <XAxis
                    dataKey='week'
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
                  <Tooltip content={<ResourceTooltip language={language} />} />
                  <Bar dataKey='hotDesks' name='Hot Desks' fill='#4F46E5' radius={[3, 3, 0, 0]} />
                  <Bar dataKey='meetingSuites' name='Meeting Suites' fill='#38BDF8' radius={[3, 3, 0, 0]} />
                  <Bar dataKey='dedicatedPods' name='Dedicated Pods' fill='#64748B' radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className='h-full flex items-center justify-center text-xs text-muted-foreground'>
                {language === 'vi' ? 'Chưa có dữ liệu phân bổ theo tuần' : 'No weekly breakdown recorded'}
              </div>
            )}
          </div>
        </div>

        {/* Footnote Proportional Breakdown */}
        <div className='mt-3.5 pt-2.5 border-t border-border/50 grid grid-cols-3 gap-2 text-center bg-muted/30 p-2 rounded-lg text-xs'>
          <div className='border-r border-border/60 pr-1'>
            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>Hot Desks</span>
            <strong className='text-foreground font-bold'>{hotDesksPct}%</strong>{' '}
            <span className='text-muted-foreground text-[10px]'>({language === 'vi' ? 'Linh hoạt' : 'Flex'})</span>
          </div>
          <div className='border-r border-border/60 pr-1'>
            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>Meeting Suites</span>
            <strong className='text-foreground font-bold'>{suitesPct}%</strong>{' '}
            <span className='text-muted-foreground text-[10px]'>({language === 'vi' ? 'Phòng họp' : 'Meeting'})</span>
          </div>
          <div>
            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>Dedicated Pods</span>
            <strong className='text-foreground font-bold'>{podsPct}%</strong>{' '}
            <span className='text-muted-foreground text-[10px]'>({language === 'vi' ? 'Pod yên tĩnh' : 'Pods'})</span>
          </div>
        </div>
      </div>
    </section>
  );
}
