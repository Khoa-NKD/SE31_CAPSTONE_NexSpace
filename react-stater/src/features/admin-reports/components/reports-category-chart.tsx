import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { MOCK_CATEGORY_BREAKDOWN } from '../data/mock-reports-overview';

export function ReportsCategoryChart() {
  const [timeRange, setTimeRange] = useState('30d');
  const totalCases = 43;

  return (
    <div className='bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm flex flex-col justify-between'>
      <div>
        <div className='flex items-center justify-between pb-4 border-b border-border mb-5'>
          <div>
            <h2 className='text-base font-bold text-foreground'>
              Distribution by Violation Category
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Aggregated triage distribution across Vietnam flagship hubs
            </p>
          </div>

          <div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              aria-label='Filter category distribution by time range'
              className='h-8 px-2.5 py-1 text-xs font-medium rounded-lg bg-background border border-input text-foreground focus:ring-1 focus:ring-primary cursor-pointer'
            >
              <option value='30d'>Last 30 Days</option>
              <option value='q3'>Current Quarter (Q3)</option>
              <option value='all'>All Time</option>
            </select>
          </div>
        </div>

        {/* Chart Area: SVG Donut + Legend */}
        <div className='flex flex-col sm:flex-row items-center gap-6 sm:gap-8 py-2'>
          {/* SVG Donut Chart with Center Label */}
          <div className='relative size-44 shrink-0 flex items-center justify-center'>
            <svg className='size-full transform -rotate-90' viewBox='0 0 120 120'>
              {/* Background Track */}
              <circle
                cx='60'
                cy='60'
                r='48'
                fill='transparent'
                className='stroke-muted'
                strokeWidth='16'
              />
              {/* Segment 1: Facility Defects (45% = 135.7 of 301.6) Indigo */}
              <circle
                cx='60'
                cy='60'
                r='48'
                fill='transparent'
                stroke='#4F46E5'
                strokeWidth='16'
                strokeDasharray='135.7 301.6'
                strokeDashoffset='0'
                strokeLinecap='round'
              />
              {/* Segment 2: Noise (30% = 90.5 of 301.6) Sky */}
              <circle
                cx='60'
                cy='60'
                r='48'
                fill='transparent'
                stroke='#0284C7'
                strokeWidth='16'
                strokeDasharray='90.5 301.6'
                strokeDashoffset='-137'
                strokeLinecap='round'
              />
              {/* Segment 3: Billing (25% = 75.4 of 301.6) Amber */}
              <circle
                cx='60'
                cy='60'
                r='48'
                fill='transparent'
                stroke='#F59E0B'
                strokeWidth='16'
                strokeDasharray='75.4 301.6'
                strokeDashoffset='-228'
                strokeLinecap='round'
              />
            </svg>

            {/* Center Label */}
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none'>
              <span className='text-[22px] font-bold text-foreground leading-tight'>
                {totalCases}
              </span>
              <span className='text-[10px] uppercase font-bold tracking-wider text-muted-foreground'>
                Total Cases
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className='flex-1 w-full flex flex-col gap-2.5'>
            {MOCK_CATEGORY_BREAKDOWN.map((item) => (
              <div
                key={item.id}
                className='flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border text-xs'
              >
                <div className='flex items-center gap-2.5'>
                  <span
                    className='size-3 rounded-full shrink-0'
                    style={{ backgroundColor: item.color }}
                  />
                  <span className='font-medium text-foreground'>{item.name}</span>
                </div>
                <div className='text-right shrink-0'>
                  <span className='font-bold text-foreground'>{item.percentage}%</span>
                  <span className='text-muted-foreground text-[11px] ml-1'>
                    ({item.casesCount} cases)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Insight Callout */}
      <div className='mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2.5 text-xs'>
        <Info className='size-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0' />
        <p className='text-foreground'>
          <strong>Facility defects</strong> represent the highest refund exposure. Automated
          contractor dispatch active for HVAC and electrical failures.
        </p>
      </div>
    </div>
  );
}
