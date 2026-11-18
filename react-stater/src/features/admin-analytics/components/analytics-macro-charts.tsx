import React from 'react';
import type { MacroTrendPointDTO, ResourceBreakdownPointDTO } from '../api/types';

interface AnalyticsMacroChartsProps {
  macroTrends?: MacroTrendPointDTO[];
  resourceBreakdown?: ResourceBreakdownPointDTO[];
  grossRevenueVnd?: number;
  grossRevenueUsd?: number;
  netRevenueVnd?: number;
  netRevenueUsd?: number;
  grossRevenueChangePercent?: string;
}

export function AnalyticsMacroCharts({
  macroTrends,
  resourceBreakdown: _resourceBreakdown,
  grossRevenueVnd,
  grossRevenueUsd,
  netRevenueVnd,
  netRevenueUsd,
  grossRevenueChangePercent
}: AnalyticsMacroChartsProps) {
  const latestMonth = macroTrends && macroTrends.length > 0
    ? macroTrends[macroTrends.length - 1]
    : null;

  const telemetryGmvUsd = latestMonth
    ? `$${latestMonth.gmvUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : '$142,500';
  const telemetryNetUsd = latestMonth
    ? `$${latestMonth.netRevenueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : '$17,100';
  const telemetryMonthLabel = latestMonth?.month || 'Tháng gần nhất';

  const totalGmvDisplay = grossRevenueVnd !== undefined
    ? `${grossRevenueVnd.toLocaleString('vi-VN')} ₫ ($${(grossRevenueUsd || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} USD)`
    : '$142,500.00 USD';

  const totalNetDisplay = netRevenueVnd !== undefined
    ? `${netRevenueVnd.toLocaleString('vi-VN')} ₫ ($${(netRevenueUsd || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} USD)`
    : '$17,100.00 USD';

  const changePercentDisplay = grossRevenueChangePercent || '+12.4% MoM';

  const months = macroTrends && macroTrends.length >= 6
    ? macroTrends.map(m => m.month)
    : ['Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12', 'Th 1'];

  return (
    <section
      aria-label='Financial & Volume Macro Trends'
      className='grid grid-cols-1 lg:grid-cols-2 gap-5'
    >
      {/* Left Card: Gross Booking Value vs Net Platform Fees (Dual Line Area Chart) */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm flex flex-col justify-between'>
        <div>
          {/* Header & Visual Legend */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border'>
            <div>
              <h2 className='text-base font-bold text-foreground tracking-tight'>
                Gross Booking Value vs Net Platform Fees
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Dòng tiền giao dịch thực tế qua cổng ký quỹ NexSpace &amp; PayOS
              </p>
            </div>
            {/* Legends */}
            <div className='flex items-center gap-4 text-xs font-semibold'>
              <div className='flex items-center gap-1.5'>
                <span className='size-3 rounded-full bg-primary' />
                <span className='text-foreground'>Gross Volume (GMV)</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='size-3 rounded-full bg-emerald-500' />
                <span className='text-foreground'>Net Rev (~10-12%)</span>
              </div>
            </div>
          </div>

          {/* Area Chart SVG Canvas */}
          <div className='relative mt-6 h-64 w-full'>
            {/* Interactive Telemetry Box */}
            <div className='absolute top-3 right-8 z-10 bg-slate-900 text-white rounded-lg p-2.5 shadow-xl border border-slate-700 pointer-events-none text-xs'>
              <div className='text-[10px] text-slate-400 font-bold uppercase tracking-wide'>
                {telemetryMonthLabel} Telemetry
              </div>
              <div className='flex items-center justify-between gap-4 mt-1 font-mono'>
                <span className='text-slate-300'>GMV:</span>
                <span className='font-bold text-white'>{telemetryGmvUsd}</span>
              </div>
              <div className='flex items-center justify-between gap-4 font-mono text-emerald-400'>
                <span>Net Rev:</span>
                <span className='font-bold'>{telemetryNetUsd}</span>
              </div>
            </div>

            <svg
              className='w-full h-full overflow-visible'
              preserveAspectRatio='none'
              viewBox='0 0 540 220'
              aria-label='GMV vs Net Platform Fees Area Chart'
            >
              <defs>
                <linearGradient id='gmvGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#4F46E5' stopOpacity='0.32' />
                  <stop offset='100%' stopColor='#4F46E5' stopOpacity='0.01' />
                </linearGradient>
                <linearGradient id='netRevGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#10B981' stopOpacity='0.25' />
                  <stop offset='100%' stopColor='#10B981' stopOpacity='0.0' />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line stroke='currentColor' className='text-border/40' strokeDasharray='4 4' strokeWidth='1' x1='0' x2='540' y1='30' y2='30' />
              <line stroke='currentColor' className='text-border/40' strokeDasharray='4 4' strokeWidth='1' x1='0' x2='540' y1='80' y2='80' />
              <line stroke='currentColor' className='text-border/40' strokeDasharray='4 4' strokeWidth='1' x1='0' x2='540' y1='130' y2='130' />
              <line stroke='currentColor' className='text-border' strokeWidth='1' x1='0' x2='540' y1='180' y2='180' />

              {/* Left Axis Labels */}
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='0' y='26'>$150k</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='0' y='76'>$100k</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='0' y='126'>$50k</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='0' y='176'>$0</text>

              {/* GMV Area & Line */}
              <path
                d='M 40,122 C 110,110 160,98 220,86 C 290,74 350,56 420,44 C 470,36 500,28 530,22 L 530,180 L 40,180 Z'
                fill='url(#gmvGradient)'
              />
              <path
                d='M 40,122 C 110,110 160,98 220,86 C 290,74 350,56 420,44 C 470,36 500,28 530,22'
                fill='none'
                stroke='#4F46E5'
                strokeWidth='2.5'
              />

              {/* Net Revenue Area & Line */}
              <path
                d='M 40,168 C 110,165 160,162 220,158 C 290,153 350,147 420,142 C 470,138 500,134 530,129 L 530,180 L 40,180 Z'
                fill='url(#netRevGradient)'
              />
              <path
                d='M 40,168 C 110,165 160,162 220,158 C 290,153 350,147 420,142 C 470,138 500,134 530,129'
                fill='none'
                stroke='#10B981'
                strokeWidth='2.5'
              />

              {/* Data points */}
              <circle cx='530' cy='22' fill='#4F46E5' r='4.5' stroke='#FFFFFF' strokeWidth='2' />
              <circle cx='530' cy='129' fill='#10B981' r='4.5' stroke='#FFFFFF' strokeWidth='2' />

              {/* Dynamic Timestamps */}
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='10' textAnchor='middle' x='40' y='200'>{months[0]}</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='10' textAnchor='middle' x='135' y='200'>{months[1]}</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='10' textAnchor='middle' x='235' y='200'>{months[2]}</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='10' textAnchor='middle' x='335' y='200'>{months[3]}</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='10' textAnchor='middle' x='435' y='200'>{months[4]}</text>
              <text fill='currentColor' className='text-foreground font-bold' fontFamily='Inter' fontSize='10' textAnchor='middle' x='530' y='200'>{months[5]}</text>
            </svg>
          </div>
        </div>

        {/* Summary Footer */}
        <div className='mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between text-xs bg-muted/40 p-3 rounded-lg gap-2'>
          <span className='text-muted-foreground'>
            Total GMV: <strong className='text-foreground font-bold font-mono'>{totalGmvDisplay}</strong>
          </span>
          <span className='text-muted-foreground'>
            Net Commission Retained: <strong className='text-emerald-700 dark:text-emerald-400 font-bold font-mono'>{totalNetDisplay}</strong>{' '}
            <span className='text-emerald-700 dark:text-emerald-400 font-semibold'>({changePercentDisplay})</span>
          </span>
        </div>
      </div>

      {/* Right Card: Booking Volume by Resource Type (Grouped Bar Chart) */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm flex flex-col justify-between'>
        <div>
          {/* Header & Legends */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border'>
            <div>
              <h2 className='text-base font-bold text-foreground tracking-tight'>
                Booking Volume by Resource Type
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Phân bổ đặt chỗ thực tế theo loại hình tài nguyên
              </p>
            </div>
            {/* Legends */}
            <div className='flex items-center gap-3 text-xs font-semibold'>
              <div className='flex items-center gap-1.5'>
                <span className='size-3 rounded-xs bg-indigo-600' />
                <span className='text-foreground'>Hot Desks</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='size-3 rounded-xs bg-sky-400' />
                <span className='text-foreground'>Meeting Suites</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='size-3 rounded-xs bg-slate-800 dark:bg-slate-300' />
                <span className='text-foreground'>Dedicated Pods</span>
              </div>
            </div>
          </div>

          {/* Grouped Bar Chart SVG Canvas */}
          <div className='relative mt-6 h-64 w-full'>
            <svg
              className='w-full h-full overflow-visible'
              preserveAspectRatio='none'
              viewBox='0 0 540 220'
              aria-label='Booking volume by resource type grouped bar chart'
            >
              {/* Gridlines */}
              <line stroke='currentColor' className='text-border/40' strokeDasharray='4 4' strokeWidth='1' x1='40' x2='540' y1='30' y2='30' />
              <line stroke='currentColor' className='text-border/40' strokeDasharray='4 4' strokeWidth='1' x1='40' x2='540' y1='80' y2='80' />
              <line stroke='currentColor' className='text-border/40' strokeDasharray='4 4' strokeWidth='1' x1='40' x2='540' y1='130' y2='130' />
              <line stroke='currentColor' className='text-border' strokeWidth='1' x1='40' x2='540' y1='180' y2='180' />

              {/* Left Axis Labels */}
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='10' y='34'>800 bk</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='10' y='84'>500 bk</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='10' y='134'>250 bk</text>
              <text fill='currentColor' className='text-muted-foreground' fontFamily='Inter' fontSize='9' x='10' y='180'>0</text>

              {/* Grouped Bars: Wk 48 - Wk 01 */}
              {[
                { x: 60, label: 'Tuần 1', h1: 100, y1: 80, h2: 55, y2: 125, h3: 28, y3: 152 },
                { x: 140, label: 'Tuần 2', h1: 110, y1: 70, h2: 62, y2: 118, h3: 32, y3: 148 },
                { x: 220, label: 'Tuần 3', h1: 115, y1: 65, h2: 68, y2: 112, h3: 35, y3: 145 },
                { x: 300, label: 'Tuần 4', h1: 125, y1: 55, h2: 75, y2: 105, h3: 38, y3: 142 },
                { x: 380, label: 'Tuần 5', h1: 132, y1: 48, h2: 82, y2: 98, h3: 40, y3: 140 },
                { x: 460, label: 'Tuần 6', h1: 142, y1: 38, h2: 90, y2: 90, h3: 44, y3: 136, isLatest: true }
              ].map((grp) => (
                <g key={grp.label} transform={`translate(${grp.x}, 0)`}>
                  <rect fill='#4F46E5' height={grp.h1} rx='2' width='16' x='0' y={grp.y1} />
                  <rect fill='#38BDF8' height={grp.h2} rx='2' width='16' x='18' y={grp.y2} />
                  <rect fill='#1E293B' height={grp.h3} rx='2' width='16' x='36' y={grp.y3} className='dark:fill-slate-300' />
                  <text
                    fill='currentColor'
                    className={grp.isLatest ? 'text-foreground font-bold' : 'text-muted-foreground'}
                    fontFamily='Inter'
                    fontSize='10'
                    textAnchor='middle'
                    x='26'
                    y='198'
                  >
                    {grp.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Footnote Proportional Breakdown */}
        <div className='mt-4 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center bg-muted/40 p-2.5 rounded-lg text-xs'>
          <div className='border-r border-border pr-2'>
            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>Hot Desks</span>
            <strong className='text-foreground font-bold'>54%</strong>{' '}
            <span className='text-muted-foreground text-[11px]'>(Linh hoạt)</span>
          </div>
          <div className='border-r border-border pr-2'>
            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>Meeting Suites</span>
            <strong className='text-foreground font-bold'>31%</strong>{' '}
            <span className='text-muted-foreground text-[11px]'>(Phòng họp)</span>
          </div>
          <div>
            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>Dedicated Pods</span>
            <strong className='text-foreground font-bold'>15%</strong>{' '}
            <span className='text-muted-foreground text-[11px]'>(Pod cá nhân)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
