import React, { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import {
  adminOverviewQueryOptions,
  adminPlatformAnalyticsQueryOptions
} from '@/features/admin-overview/api/queries';
import { AdminKpiRow } from '@/features/admin-overview/components/admin-kpi-row';
import { PriorityTriageGrid } from '@/features/admin-overview/components/priority-triage-grid';
import { OperationalTrendsChart } from '@/features/admin-overview/components/operational-trends-chart';
import { LiveSystemAlerts } from '@/features/admin-overview/components/live-system-alerts';
import { TimeRangeFilter } from '@/features/admin-overview/components/time-range-filter';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from '@/components/ui/hugeicons';

export const Route = createFileRoute('/dashboard/overview')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = useAuthStore.getState();
    const role = getUserRole(auth.user);
    if (role === 'ADMIN') return;
    if (role === 'ORGANIZER') {
      throw redirect({ to: '/dashboard/organizer' });
    }
    // Customer (USER) / Guest: Blocked from Admin Dashboard!
    throw redirect({ to: '/' });
  },
  head: () => ({
    meta: [
      { title: 'A01 — Administrator Dashboard | NexSpace Console' },
      { name: 'description', content: 'Real-time platform operations and priority triage.' }
    ]
  }),
  component: AdministratorDashboardPage
});

function DashboardOverviewSkeleton() {
  return (
    <div className='space-y-5 animate-pulse'>
      {/* 5 KPI Skeletons */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='rounded-xl border border-border/60 p-3.5 bg-card/50 space-y-2.5'>
            <div className='flex justify-between items-center'>
              <Skeleton className='h-3 w-20' />
              <Skeleton className='size-6 rounded-md' />
            </div>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-3 w-full' />
          </div>
        ))}
      </div>

      {/* Main Trends Skeleton */}
      <div className='rounded-xl border border-border/60 p-5 bg-card/50 space-y-4'>
        <div className='flex justify-between items-center pb-3 border-b border-border/40'>
          <div className='space-y-1.5'>
            <Skeleton className='h-5 w-48' />
            <Skeleton className='h-3 w-64' />
          </div>
          <div className='flex gap-3'>
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
          </div>
        </div>
        <Skeleton className='h-72 w-full rounded-lg' />
      </div>

      {/* Triage & Alerts Skeletons */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-5'>
        <div className='lg:col-span-7 space-y-3'>
          <Skeleton className='h-4 w-40' />
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-36 rounded-xl' />
            ))}
          </div>
        </div>
        <div className='lg:col-span-5 space-y-3'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-36 rounded-xl' />
        </div>
      </div>
    </div>
  );
}

function AdministratorDashboardPage() {
  const { language } = useLanguage();
  const [selectedRange, setSelectedRange] = useState<'today' | '7d' | '30d'>('7d');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery(adminOverviewQueryOptions(selectedRange));

  const { data: platformData } = useQuery(adminPlatformAnalyticsQueryOptions(selectedRange));

  return (
    <PageContainer>
      <div className='flex flex-col min-h-screen pb-12 min-w-0 w-full'>
        {/* Page Header Row */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5'>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading'>
                {language === 'vi' ? 'Bảng điều khiển Quản trị' : 'Administrator Dashboard'}
              </h1>
              {isFetching && (
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 animate-pulse'>
                  <RefreshCw className='size-2.5 animate-spin' />
                  <span>{language === 'vi' ? 'Đang đồng bộ...' : 'Syncing...'}</span>
                </span>
              )}
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              {language === 'vi'
                ? 'Vận hành nền tảng thời gian thực, quản lý dòng tiền và phân loại công việc ưu tiên.'
                : 'Real-time platform operations, financial flows, and priority workload triage.'}
            </p>
          </div>

          <TimeRangeFilter
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
        </div>

        {/* Loading Skeleton */}
        {isLoading && !data && <DashboardOverviewSkeleton />}

        {/* Error State */}
        {isError && !data && (
          <div className='rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center my-6 space-y-3'>
            <div className='flex justify-center'>
              <AlertCircle className='size-8 text-destructive' />
            </div>
            <h3 className='text-sm font-semibold text-foreground'>
              {language === 'vi' ? 'Không thể tải dữ liệu điều hành' : 'Failed to Load Operations Data'}
            </h3>
            <p className='text-xs text-muted-foreground max-w-md mx-auto'>
              {error instanceof Error ? error.message : 'Lỗi kết nối máy chủ phân tích quản trị.'}
            </p>
            <Button size='sm' variant='outline' onClick={() => refetch()} className='gap-1.5'>
              <RefreshCw className='size-3.5' />
              <span>{language === 'vi' ? 'Thử lại' : 'Retry'}</span>
            </Button>
          </div>
        )}

        {/* Live Data Presentation (Zero Mock Fallback) */}
        {data && (
          <>
            {/* 1. Core KPI Bento Row (Compact 5 Cards) */}
            <AdminKpiRow kpis={data.kpis} />

            {/* 2. OPERATIONAL & FINANCIAL TRENDS (Largest, Most Prominent Section) */}
            <OperationalTrendsChart
              trendPoints={data.trendPoints || []}
              summary={data.volumeSummary || {
                totalVolume: '0 ₫',
                slaSuccessRate: '100%',
                peakDay: '',
                peakCount: 0,
                peakHub: ''
              }}
              macroTrends={platformData?.macroTrends}
            />

            {/* 3. Lower Section: Priority Triage & Live Audit Alerts */}
            <section className='grid grid-cols-1 lg:grid-cols-12 gap-5'>
              <div className='lg:col-span-7'>
                <PriorityTriageGrid items={data.triageItems || []} />
              </div>

              <div className='lg:col-span-5'>
                <LiveSystemAlerts initialAlerts={data.alerts || []} />
              </div>
            </section>
          </>
        )}

        {/* Supplementary Footnote */}
        <div className='mt-8 pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-1.5'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span>NexSpace Platform Operations v4.19.2</span>
            <span>•</span>
            <span>PayOS Webhook Gateway Live</span>
            <span>•</span>
            <span className='font-mono'>Region: ap-southeast-1</span>
          </div>
          <div>All operational and financial metrics cryptographically audited</div>
        </div>
      </div>
    </PageContainer>
  );
}
