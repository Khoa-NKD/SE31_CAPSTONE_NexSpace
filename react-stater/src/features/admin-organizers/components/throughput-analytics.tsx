import React, { useState } from 'react';
import { Timer, CheckCircle } from 'lucide-react';
import { DailyThroughputPoint, OrganizerPipelineKpis } from '../data/mock-organizers';

interface ThroughputAnalyticsProps {
  data: DailyThroughputPoint[];
  kpis: OrganizerPipelineKpis;
}

export function ThroughputAnalytics({ data, kpis }: ThroughputAnalyticsProps) {
  const [hoveredDay, setHoveredDay] = useState<DailyThroughputPoint | null>(null);

  return (
    <div className='lg:col-span-7 bg-card rounded-xl border border-border p-6 shadow-2xs flex flex-col justify-between'>
      <div>
        {/* Card Header & Legend */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border'>
          <div>
            <h2 className='text-base font-bold font-heading text-foreground'>
              Submission Volume vs Approvals (Last 14 Days)
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Daily throughput of incoming host organizer KYC applications vs compliance sign-offs.
            </p>
          </div>
          {/* Legend */}
          <div className='flex items-center gap-4 text-xs font-medium'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-xs bg-indigo-200 dark:bg-indigo-800' aria-hidden='true'></span>
              <span className='text-muted-foreground'>Incoming</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-xs bg-primary' aria-hidden='true'></span>
              <span className='text-foreground font-semibold'>Approved</span>
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className='relative h-56 pt-6 pb-2 flex flex-col justify-end'>
          {/* Background Grid Guide Lines */}
          <div className='absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40'>
            <div className='w-full border-b border-dashed border-border'></div>
            <div className='w-full border-b border-dashed border-border'></div>
            <div className='w-full border-b border-dashed border-border'></div>
          </div>

          {/* Interactive Tooltip Overlay when hovered */}
          {hoveredDay && (
            <div
              className='absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs shadow-lg z-20 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-100'
              role='status'
              aria-live='polite'
            >
              <span className='font-bold'>{hoveredDay.dayLabel}</span>
              <span>Incoming: <strong>{hoveredDay.incomingCount}</strong></span>
              <span>Approved: <strong className='text-emerald-400'>{hoveredDay.approvedCount}</strong></span>
            </div>
          )}

          {/* 14 Daily Bar Clusters */}
          <div className='relative z-10 flex items-end justify-between gap-1 h-44 px-1'>
            {data.map((day) => {
              const isToday = day.dayLabel === 'Today';
              return (
                <button
                  type='button'
                  key={day.dayLabel}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onFocus={() => setHoveredDay(day)}
                  onBlur={() => setHoveredDay(null)}
                  aria-label={`${day.dayLabel}: ${day.incomingCount} incoming submissions, ${day.approvedCount} approved`}
                  className='relative flex flex-col items-center flex-1 group cursor-pointer h-full justify-end focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary rounded'
                >
                  <div className='flex items-end gap-1 w-full justify-center'>
                    {/* Incoming Bar */}
                    <div
                      style={{ height: `${day.barIncomingHeightPx}px` }}
                      className='w-2 sm:w-2.5 bg-indigo-200 dark:bg-indigo-900/80 rounded-t group-hover:opacity-80 transition-all'
                    ></div>
                    {/* Approved Bar */}
                    <div
                      style={{ height: `${day.barApprovedHeightPx}px` }}
                      className='w-2 sm:w-2.5 bg-primary rounded-t group-hover:brightness-110 transition-all'
                    ></div>
                  </div>
                  <span
                    className={`mt-2 text-[10px] ${
                      isToday
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom KPI strip */}
      <div className='pt-4 mt-2 border-t border-border grid grid-cols-2 gap-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-indigo-50 dark:bg-indigo-950/50 text-primary rounded-lg'>
            <Timer className='size-5' aria-hidden='true' />
          </div>
          <div>
            <div className='text-sm sm:text-base font-bold font-heading text-foreground'>
              {kpis.slaAverageTurnaroundHours} Hours
            </div>
            <div className='text-xs text-muted-foreground'>
              Average Turnaround SLA
            </div>
          </div>
        </div>

        <div className='flex items-center gap-3 border-l border-border pl-4'>
          <div className='p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg'>
            <CheckCircle className='size-5' aria-hidden='true' />
          </div>
          <div>
            <div className='text-sm sm:text-base font-bold font-heading text-foreground'>
              {kpis.firstPassApprovalRatePercentage}%
            </div>
            <div className='text-xs text-muted-foreground'>
              First-Pass Approval Rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
