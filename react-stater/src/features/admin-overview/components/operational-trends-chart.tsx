import React from 'react';
import { Card } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { CheckCircle2, Zap } from 'lucide-react';
import { OperationalTrendPoint } from '../data/mock-overview';

interface OperationalTrendsChartProps {
  trendPoints: OperationalTrendPoint[];
  summary: {
    totalVolume: string;
    slaSuccessRate: string;
    peakDay: string;
    peakCount: number;
    peakHub: string;
  };
}

export function OperationalTrendsChart({ trendPoints, summary }: OperationalTrendsChartProps) {
  return (
    <Card className='rounded-xl border border-border/80 p-6 shadow-xs flex flex-col justify-between bg-card'>
      <div>
        {/* Header & Metrics */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70'>
          <div>
            <h3 className='text-base font-semibold text-foreground'>
              Recent Operational Trends
            </h3>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Daily Booking Volume vs PayOS Transactions (Last 7 Days)
            </p>
          </div>

          <div className='flex items-center gap-4 text-xs'>
            <div className='flex flex-col'>
              <span className='text-muted-foreground text-[11px]'>Total Volume</span>
              <span className='font-bold text-foreground'>{summary.totalVolume}</span>
            </div>
            <div className='h-6 w-px bg-border'></div>
            <div className='flex flex-col'>
              <span className='text-muted-foreground text-[11px]'>PayOS Success</span>
              <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                {summary.slaSuccessRate}
              </span>
            </div>
          </div>
        </div>

        {/* Legend & Peak Badge */}
        <div className='flex flex-wrap items-center justify-between gap-2 mt-4 mb-2'>
          <div className='flex items-center gap-4 text-xs font-medium text-muted-foreground'>
            <div className='flex items-center gap-1.5'>
              <span className='w-3 h-3 rounded-xs bg-indigo-600'></span>
              <span>Booking Volume</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-3 h-3 rounded-xs bg-sky-400'></span>
              <span>PayOS Settlements</span>
            </div>
          </div>

          <div className='inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] text-indigo-700 dark:text-indigo-300'>
            <Zap className='size-3.5' />
            <span>
              Peak: <strong>{summary.peakCount}</strong> on {summary.peakDay} ({summary.peakHub})
            </span>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className='w-full h-64 mt-4'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id='colorBookings' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#4F46E5' stopOpacity={0.25} />
                  <stop offset='95%' stopColor='#4F46E5' stopOpacity={0} />
                </linearGradient>
                <linearGradient id='colorSettlements' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#38BDF8' stopOpacity={0.2} />
                  <stop offset='95%' stopColor='#38BDF8' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' opacity={0.6} />
              <XAxis dataKey='day' tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px'
                }}
              />
              <Area
                type='monotone'
                dataKey='bookings'
                name='Bookings'
                stroke='#4F46E5'
                strokeWidth={2.5}
                fillOpacity={1}
                fill='url(#colorBookings)'
              />
              <Line
                type='monotone'
                dataKey='settlements'
                name='PayOS Settlements'
                stroke='#38BDF8'
                strokeWidth={2}
                strokeDasharray='4 4'
                dot={{ r: 3, fill: '#FFFFFF', stroke: '#38BDF8', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Note */}
      <div className='mt-4 pt-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground'>
        <div className='flex items-center gap-1.5'>
          <CheckCircle2 className='size-4 text-emerald-600 dark:text-emerald-400' />
          <span>Gateway uptime: PayOS API operational with 0 queued retries.</span>
        </div>
        <span className='font-medium text-primary cursor-pointer hover:underline'>
          Telemetry Stream Active
        </span>
      </div>
    </Card>
  );
}
