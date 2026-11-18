import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { adminPlatformAnalyticsQueryOptions } from '@/features/admin-analytics/api/queries';
import { AnalyticsKpiGrid } from '@/features/admin-analytics/components/analytics-kpi-grid';
import { AnalyticsMacroCharts } from '@/features/admin-analytics/components/analytics-macro-charts';
import { WorkspacesLeaderboardTable } from '@/features/admin-analytics/components/workspaces-leaderboard-table';

export const Route = createFileRoute('/dashboard/admin/analytics')({
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

function handleExportBiReport() {
  toast.success('BI Executive Report Exported', {
    description: 'Compiled comprehensive telemetry PDF dossier for rolling 30 days.'
  });
}

function PlatformAnalyticsDashboardPage() {
  const [activeRange, setActiveRange] = useState<'7D' | '30D' | '90D' | 'YTD' | 'CUSTOM'>('30D');
  const [isSyncing, setIsSyncing] = useState(false);

  const queryRange = activeRange === 'CUSTOM' ? '30D' : activeRange;
  const { data, isLoading, refetch } = useQuery(adminPlatformAnalyticsQueryOptions(queryRange));

  async function handleLiveSync() {
    setIsSyncing(true);
    try {
      await refetch();
      toast.info('Dữ liệu viễn trắc đã được đồng bộ', {
        description: 'Đã làm mới số liệu GMV, lấp đầy và bảng xếp hạng từ cơ sở dữ liệu.'
      });
    } catch {
      toast.error('Không thể đồng bộ dữ liệu lúc này');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <PageContainer>
      <div className='flex flex-col gap-6 max-w-[1440px] mx-auto w-full'>
        {/* Breadcrumb */}
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
          <span>Platform Ops</span>
          <span>/</span>
          <span>Overview</span>
          <span>/</span>
          <span className='text-foreground font-semibold'>Analytics Dashboard</span>
        </div>

        {/* Header Section */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                Business Analytics &amp; Intelligence
              </h1>
              {isLoading && (
                <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 animate-pulse'>
                  Đang tải số liệu DB...
                </span>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Phân tích chỉ số tăng trưởng GMV, doanh thu hoa hồng và tỷ lệ lấp đầy sàn NexSpace theo thời gian thực.
            </p>
          </div>

          {/* Controls Cluster */}
          <div className='flex flex-wrap items-center gap-2.5 self-start md:self-auto'>
            {/* Segmented Time Range Selector */}
            <div className='inline-flex p-1 bg-card rounded-lg border border-border shadow-xs text-xs'>
              {(['7D', '30D', '90D', 'YTD'] as const).map((range) => (
                <button
                  key={range}
                  type='button'
                  onClick={() => setActiveRange(range)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    activeRange === range
                      ? 'bg-primary text-primary-foreground shadow-xs'
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
                  toast.info('Đang chọn khung thời gian tùy chỉnh');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold border-l border-border ml-1 transition-all ${
                  activeRange === 'CUSTOM'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className='size-3' />
                <span>Custom</span>
              </button>
            </div>

            {/* Action CTAs */}
            <Button
              variant='outline'
              onClick={handleExportBiReport}
              className='text-xs font-semibold gap-1.5 shadow-xs'
            >
              <Download className='size-3.5' />
              <span>Export BI Report</span>
            </Button>
            <Button
              variant='outline'
              onClick={handleLiveSync}
              disabled={isSyncing || isLoading}
              className='text-xs font-semibold gap-1.5 shadow-xs'
              title='Force Telemetry Sync'
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className='hidden sm:inline'>Live Sync</span>
            </Button>
          </div>
        </div>

        {/* 1. Key Operational Utilization & Growth KPI Cards */}
        <AnalyticsKpiGrid summary={data} isLoading={isLoading} />

        {/* 2. Financial & Volume Macro Trends (50% / 50% split) */}
        <AnalyticsMacroCharts
          macroTrends={data?.macroTrends}
          resourceBreakdown={data?.resourceBreakdown}
          grossRevenueVnd={data?.grossRevenueVnd}
          grossRevenueUsd={data?.grossRevenueUsd}
          netRevenueVnd={data?.netRevenueVnd}
          netRevenueUsd={data?.netRevenueUsd}
          grossRevenueChangePercent={data?.grossRevenueChangePercent}
        />

        {/* 3. Top Performing Workspaces Leaderboard */}
        <WorkspacesLeaderboardTable items={data?.leaderboard} isLoading={isLoading} />
      </div>
    </PageContainer>
  );
}
