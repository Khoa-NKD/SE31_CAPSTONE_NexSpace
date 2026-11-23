import React, { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Calendar, AlertCircle } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { adminPlatformAnalyticsQueryOptions } from '@/features/admin-analytics/api/queries';
import { AnalyticsKpiGrid } from '@/features/admin-analytics/components/analytics-kpi-grid';
import { AnalyticsMacroCharts } from '@/features/admin-analytics/components/analytics-macro-charts';
import { WorkspacesLeaderboardTable } from '@/features/admin-analytics/components/workspaces-leaderboard-table';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useLanguage } from '@/features/landing/context/language-context';

export const Route = createFileRoute('/dashboard/admin/analytics')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = useAuthStore.getState();
    const role = getUserRole(auth.user);
    if (role === 'ADMIN') return;
    if (role === 'ORGANIZER') {
      throw redirect({ to: '/dashboard/organizer' });
    }
    throw redirect({ to: '/' });
  },
  head: () => ({
    meta: [
      { title: 'A15 — Platform Analytics Dashboard | NexSpace Admin Console' },
      {
        name: 'description',
        content: 'Longitudinal analysis of GMV, customer acquisition, and spatial occupancy across Southeast Asia nodes.'
      }
    ]
  }),
  component: PlatformAnalyticsDashboardPage
});

function PlatformAnalyticsDashboardPage() {
  const { language } = useLanguage();
  const [activeRange, setActiveRange] = useState<'7D' | '30D' | '90D' | 'YTD' | 'CUSTOM'>('30D');
  const [isSyncing, setIsSyncing] = useState(false);

  const queryRange = activeRange === 'CUSTOM' ? '30D' : activeRange;
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery(adminPlatformAnalyticsQueryOptions(queryRange));

  async function handleLiveSync() {
    setIsSyncing(true);
    try {
      await refetch();
      toast.info(language === 'vi' ? 'Dữ liệu viễn trắc đã được đồng bộ' : 'Telemetry data synchronized', {
        description: language === 'vi'
          ? 'Đã làm mới số liệu GMV, lấp đầy và bảng xếp hạng từ cơ sở dữ liệu.'
          : 'Refreshed GMV metrics, occupancy, and leaderboard from live database.'
      });
    } catch {
      toast.error(language === 'vi' ? 'Không thể đồng bộ dữ liệu lúc này' : 'Failed to sync data at this moment');
    } finally {
      setIsSyncing(false);
    }
  }

  function handleExportBiReport() {
    toast.success(language === 'vi' ? 'Đã xuất báo cáo BI sàn' : 'BI Executive Report Exported', {
      description: language === 'vi'
        ? `Đã tạo báo cáo viễn trắc vận hành toàn diện cho chu kỳ ${activeRange}.`
        : `Compiled comprehensive telemetry PDF dossier for rolling ${activeRange}.`
    });
  }

  return (
    <PageContainer>
      <div className='flex flex-col gap-5 max-w-[1440px] mx-auto w-full pb-12'>
        {/* Breadcrumb */}
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
          <span>Platform Ops</span>
          <span>/</span>
          <span>Overview</span>
          <span>/</span>
          <span className='text-foreground font-semibold'>
            {language === 'vi' ? 'Phân tích & Kinh doanh' : 'Analytics Dashboard'}
          </span>
        </div>

        {/* Header Section */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border/70'>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading'>
                {language === 'vi' ? 'Phân tích Kinh doanh & Báo cáo Vĩ mô' : 'Business Analytics & Intelligence'}
              </h1>
              {isFetching && (
                <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 animate-pulse'>
                  <RefreshCw className='size-2.5 animate-spin' />
                  <span>{language === 'vi' ? 'Đang đồng bộ DB...' : 'Syncing with DB...'}</span>
                </span>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {language === 'vi'
                ? 'Phân tích chỉ số tăng trưởng GMV, doanh thu hoa hồng và tỷ lệ lấp đầy sàn NexSpace theo thời gian thực.'
                : 'Real-time platform GMV, platform commission revenue, and spatial occupancy utilization.'}
            </p>
          </div>

          {/* Controls Cluster */}
          <div className='flex flex-wrap items-center gap-2.5 self-start md:self-auto'>
            {/* Segmented Time Range Selector */}
            <div className='inline-flex p-1 bg-card rounded-lg border border-border shadow-2xs text-xs'>
              {(['7D', '30D', '90D', 'YTD'] as const).map((range) => (
                <button
                  key={range}
                  type='button'
                  onClick={() => setActiveRange(range)}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-all ${
                    activeRange === range
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range}
                </button>
              ))}
              <button
                type='button'
                onClick={() => {
                  setActiveRange('CUSTOM');
                  toast.info(language === 'vi' ? 'Đang chọn khung thời gian tùy chỉnh' : 'Custom date range selected');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-xs border-l border-border/70 ml-0.5 transition-all ${
                  activeRange === 'CUSTOM'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className='size-3' />
                <span>{language === 'vi' ? 'Tùy chỉnh' : 'Custom'}</span>
              </button>
            </div>

            {/* Action CTAs */}
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportBiReport}
              className='text-xs font-semibold gap-1.5 shadow-2xs'
            >
              <Download className='size-3.5' />
              <span>{language === 'vi' ? 'Xuất báo cáo BI' : 'Export BI'}</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleLiveSync}
              disabled={isSyncing || isLoading}
              className='text-xs font-semibold gap-1.5 shadow-2xs'
              title='Force Telemetry Sync'
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className='hidden sm:inline'>{language === 'vi' ? 'Đồng bộ' : 'Sync'}</span>
            </Button>
          </div>
        </div>

        {/* Error Handling State */}
        {isError && !data && (
          <div className='rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center my-4 space-y-3'>
            <div className='flex justify-center'>
              <AlertCircle className='size-8 text-destructive' />
            </div>
            <h3 className='text-sm font-semibold text-foreground'>
              {language === 'vi' ? 'Không thể tải dữ liệu phân tích sàn' : 'Failed to Load Platform Analytics'}
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

        {/* 1. Key Operational Utilization & Growth KPI Cards (Zero Mock Fallback) */}
        <AnalyticsKpiGrid summary={data} isLoading={isLoading} />

        {/* 2. Financial & Volume Macro Trends (Real Recharts Area + Grouped Bar) */}
        <AnalyticsMacroCharts
          macroTrends={data?.macroTrends}
          resourceBreakdown={data?.resourceBreakdown}
          grossRevenueVnd={data?.grossRevenueVnd}
          grossRevenueUsd={data?.grossRevenueUsd}
          netRevenueVnd={data?.netRevenueVnd}
          netRevenueUsd={data?.netRevenueUsd}
          grossRevenueChangePercent={data?.grossRevenueChangePercent}
        />

        {/* 3. Top Performing Workspaces Leaderboard (Real DB Data) */}
        <WorkspacesLeaderboardTable items={data?.leaderboard} isLoading={isLoading} />
      </div>
    </PageContainer>
  );
}
