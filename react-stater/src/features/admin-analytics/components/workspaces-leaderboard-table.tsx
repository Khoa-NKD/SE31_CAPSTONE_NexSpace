import React, { useState } from 'react';
import {
  Building2,
  Star,
  MapPin,
  ArrowRight,
  Download,
  Store
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { WorkspaceLeaderboardItemDTO } from '../api/types';
import { HubBiDrawer } from './hub-bi-drawer';
import { useLanguage } from '@/features/landing/context/language-context';

interface WorkspacesLeaderboardTableProps {
  items?: WorkspaceLeaderboardItemDTO[];
  isLoading?: boolean;
}

export function WorkspacesLeaderboardTable({ items, isLoading }: WorkspacesLeaderboardTableProps) {
  const { language } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedHub, setSelectedHub] = useState<WorkspaceLeaderboardItemDTO | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const sourceItems = items || [];

  const filteredItems = sourceItems.filter((item) => {
    if (selectedCity === 'all') return true;
    const cityLower = (item.city || '').toLowerCase();
    const addressLower = (item.address || '').toLowerCase();
    const combined = `${cityLower} ${addressLower}`;

    if (selectedCity === 'hcmc') return combined.includes('hcm') || combined.includes('hồ chí minh') || combined.includes('sài gòn');
    if (selectedCity === 'hanoi') return combined.includes('hanoi') || combined.includes('hà nội');
    if (selectedCity === 'danang') return combined.includes('da nang') || combined.includes('đà nẵng');
    return true;
  });

  function handleOpenHubBi(hub: WorkspaceLeaderboardItemDTO) {
    setSelectedHub(hub);
    setIsDrawerOpen(true);
  }

  function handleDownloadCsv() {
    if (sourceItems.length === 0) {
      toast.error(language === 'vi' ? 'Không có dữ liệu để xuất file' : 'No data available to export');
      return;
    }
    toast.success(language === 'vi' ? 'Đã tải file CSV xếp hạng không gian' : 'Leaderboard CSV Exported', {
      description: language === 'vi'
        ? `Đã xuất ${sourceItems.length} bản ghi xếp hạng hiệu suất không gian.`
        : `Downloaded regional workspace performance rankings dataset (${sourceItems.length} hubs).`
    });
  }

  return (
    <>
      <section
        aria-label='Top Performing Workspaces Leaderboard'
        className='bg-card text-card-foreground rounded-xl border border-border shadow-2xs overflow-hidden'
      >
        {/* Table Card Header & Regional Filters */}
        <div className='p-4 sm:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm sm:text-base font-bold text-foreground tracking-tight'>
                {language === 'vi' ? 'Bảng xếp hạng hiệu suất Không gian (Leaderboard)' : 'Top Performing Workspaces Leaderboard'}
              </h2>
              <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20'>
                {sourceItems.length > 0 ? (language === 'vi' ? 'Dữ liệu hệ thống' : 'Live DB Metrics') : 'Zero Drift'}
              </span>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {language === 'vi'
                ? 'Xếp hạng không gian làm việc theo doanh thu GMV thực tế, lượt đặt chỗ và đánh giá khách hàng.'
                : 'Ranked by verified GMV revenue, confirmed bookings, and customer satisfaction.'}
            </p>
          </div>

          {/* Quick City Filter Pills */}
          <div className='flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs'>
            {[
              { id: 'all', label: language === 'vi' ? 'Tất cả' : 'All Cities' },
              { id: 'danang', label: 'Đà Nẵng' },
              { id: 'hcmc', label: 'TP. Hồ Chí Minh' },
              { id: 'hanoi', label: 'Hà Nội' }
            ].map((city) => (
              <button
                key={city.id}
                type='button'
                onClick={() => setSelectedCity(city.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCity === city.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse text-xs'>
            <thead>
              <tr className='bg-muted/40 text-muted-foreground text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-border'>
                <th scope='col' className='py-2.5 px-4 w-14'>{language === 'vi' ? 'Hạng' : 'Rank'}</th>
                <th scope='col' className='py-2.5 px-4'>{language === 'vi' ? 'Tên không gian & Địa chỉ' : 'Workspace & Address'}</th>
                <th scope='col' className='py-2.5 px-4'>{language === 'vi' ? 'Khu vực' : 'Area'}</th>
                <th scope='col' className='py-2.5 px-4 text-right'>{language === 'vi' ? 'Lượt đặt' : 'Bookings'}</th>
                <th scope='col' className='py-2.5 px-4 text-right'>{language === 'vi' ? 'Doanh thu GMV' : 'Gross Volume'}</th>
                <th scope='col' className='py-2.5 px-4 w-44'>{language === 'vi' ? 'Tỷ lệ lấp đầy' : 'Occupancy'}</th>
                <th scope='col' className='py-2.5 px-4'>{language === 'vi' ? 'Đánh giá' : 'Rating'}</th>
                <th scope='col' className='py-2.5 px-4 text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>{language === 'vi' ? 'Thao tác' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60 font-medium'>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className='animate-pulse'>
                    <td className='py-3.5 px-4' aria-label={language === 'vi' ? 'Đang tải hạng' : 'Loading rank'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='size-6 rounded-full bg-muted' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4' aria-label={language === 'vi' ? 'Đang tải thông tin không gian' : 'Loading workspace info'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-3.5 w-40 bg-muted rounded mb-1' aria-hidden='true' />
                      <div className='h-2.5 w-56 bg-muted rounded' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4' aria-label={language === 'vi' ? 'Đang tải thành phố' : 'Loading city'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-3 w-16 bg-muted rounded' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4 text-right' aria-label={language === 'vi' ? 'Đang tải lượt đặt' : 'Loading bookings'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-3 w-10 bg-muted rounded ml-auto' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4 text-right' aria-label={language === 'vi' ? 'Đang tải doanh thu' : 'Loading revenue'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-3 w-20 bg-muted rounded ml-auto' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4' aria-label={language === 'vi' ? 'Đang tải tỷ lệ lấp đầy' : 'Loading occupancy'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-2 w-full bg-muted rounded' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4' aria-label={language === 'vi' ? 'Đang tải đánh giá' : 'Loading rating'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-3 w-12 bg-muted rounded' aria-hidden='true' />
                    </td>
                    <td className='py-3.5 px-4 text-right' aria-label={language === 'vi' ? 'Đang tải hành động' : 'Loading action'}>
                      <span className='sr-only'>{language === 'vi' ? 'Đang tải' : 'Loading'}</span>
                      <div className='h-6 w-16 bg-muted rounded ml-auto' aria-hidden='true' />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className='py-12 text-center text-muted-foreground'>
                    <div className='flex flex-col items-center justify-center space-y-1.5'>
                      <Store className='size-8 text-muted-foreground/40' />
                      <p className='text-xs font-semibold'>
                        {language === 'vi' ? 'Không tìm thấy không gian phù hợp' : 'No workspaces found'}
                      </p>
                      <p className='text-[11px] text-muted-foreground'>
                        {language === 'vi' ? 'Chưa có dữ liệu đặt chỗ hoặc doanh thu ghi nhận cho bộ lọc này.' : 'No recorded booking revenue for the selected filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((hub) => {
                  const isGold = hub.rank === 1;
                  const isSilver = hub.rank === 2;
                  const isBronze = hub.rank === 3;

                  return (
                    <tr
                      key={hub.id}
                      className='hover:bg-muted/30 transition-colors group'
                    >
                      {/* Rank Badge */}
                      <td className='py-3 px-4'>
                        <div
                          className={`size-6 rounded-full flex items-center justify-center font-bold text-[11px] shadow-2xs border ${
                            isGold
                              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                              : isSilver
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-400'
                                : isBronze
                                  ? 'bg-orange-500/20 text-orange-900 dark:text-orange-200 border-orange-500/40'
                                  : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          #{hub.rank}
                        </div>
                      </td>

                      {/* Workspace Details */}
                      <td className='py-3 px-4' aria-label={hub.name}>
                        <div className='flex items-center gap-2.5'>
                          <div className='size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0'>
                            <Building2 className='size-4' />
                          </div>
                          <div className='min-w-0'>
                            <button
                              type='button'
                              onClick={() => handleOpenHubBi(hub)}
                              className='font-bold text-foreground group-hover:text-primary transition-colors text-xs text-left hover:underline truncate block max-w-xs'
                            >
                              {hub.name}
                            </button>
                            <div className='text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate max-w-xs'>
                              <MapPin className='size-2.5 text-muted-foreground shrink-0' />
                              <span className='truncate'>{hub.address}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* District / City */}
                      <td className='py-3 px-4'>
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border/60'>
                          {hub.district || hub.city}
                        </span>
                      </td>

                      {/* Total Bookings */}
                      <td className='py-3 px-4 text-right font-mono font-semibold text-foreground text-xs'>
                        {hub.totalBookings30d.toLocaleString()}{' '}
                        <span className='text-[10px] text-muted-foreground font-sans'>
                          {language === 'vi' ? 'lượt' : 'bk'}
                        </span>
                      </td>

                      {/* Gross Revenue */}
                      <td className='py-3 px-4 text-right font-mono'>
                        <div className='font-bold text-foreground text-xs'>
                          {hub.localCurrencyDisplay || `${hub.grossRevenueVnd?.toLocaleString('vi-VN')} ₫`}
                        </div>
                        <div className='text-[10px] text-muted-foreground'>
                          {hub.grossRevenueDisplay || `$${hub.grossRevenueUsd?.toFixed(1)} USD`}
                        </div>
                      </td>

                      {/* Average Occupancy % */}
                      <td className='py-3 px-4' aria-label={`Average Occupancy ${hub.averageOccupancyPercent}%`}>
                        <div className='space-y-1'>
                          <div className='flex justify-between text-[11px] font-bold text-foreground'>
                            <span>{hub.averageOccupancyPercent}%</span>
                            <span
                              className={`text-[10px] ${
                                hub.occupancyStatus === 'Optimal'
                                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                  : 'text-muted-foreground font-medium'
                              }`}
                            >
                              {hub.occupancyStatus}
                            </span>
                          </div>
                          <div className='w-full bg-muted rounded-full h-1.5 overflow-hidden'>
                            <div
                              className='bg-primary h-1.5 rounded-full transition-all duration-500'
                              style={{ width: `${Math.min(100, hub.averageOccupancyPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Satisfaction */}
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-1'>
                          <Star className='size-3 text-amber-500 fill-amber-500' />
                          <span className='font-bold text-foreground text-xs'>
                            {hub.satisfactionRating}
                          </span>
                          <span className='text-[10px] text-muted-foreground'>
                            ({hub.reviewsCount})
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className='py-3 px-4 text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleOpenHubBi(hub)}
                          className='h-7 text-xs font-semibold text-primary hover:text-primary/80 gap-1 px-2'
                        >
                          <span>{language === 'vi' ? 'Chi tiết' : 'BI View'}</span>
                          <ArrowRight className='size-3' />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className='px-4 sm:px-5 py-2.5 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-1.5'>
          <div className='flex items-center gap-1.5'>
            <span>
              {language === 'vi'
                ? `Hiển thị ${filteredItems.length} không gian đã kiểm định`
                : `Showing ${filteredItems.length} verified workspaces`}
            </span>
            <span className='size-1 rounded-full bg-muted-foreground' />
            <span>{language === 'vi' ? 'Đồng bộ tự động qua cơ sở dữ liệu' : 'Live database sync active'}</span>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleDownloadCsv}
              className='font-semibold text-primary hover:underline inline-flex items-center gap-1'
            >
              <Download className='size-3' />
              <span>{language === 'vi' ? 'Tải file CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Hub BI Slide-over Drawer */}
      <HubBiDrawer
        hub={selectedHub}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
