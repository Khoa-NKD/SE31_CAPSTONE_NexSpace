import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  MapPin,
  DollarSign,
  Laptop,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { customerPreferenceQueryOptions } from '../api/queries';
import { CustomerPreferenceForm } from './customer-preference-form';

function formatPrice(val: number | null | undefined) {
  if (val === null || val === undefined) return null;
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
}

function getCategoryLabel(cat?: string) {
  switch (cat) {
    case 'DESK':
      return 'Bàn làm việc';
    case 'ROOM':
      return 'Phòng họp / Riêng';
    default:
      return 'Linh hoạt (Bất kỳ)';
  }
}

function getNoiseLabel(noise?: string | null) {
  switch (noise) {
    case 'QUIET':
      return 'Yên tĩnh';
    case 'MODERATE':
      return 'Vừa phải';
    case 'LIVELY':
      return 'Sôi động';
    default:
      return 'Chưa chọn';
  }
}

export function CustomerPreferenceView() {
  const { data: preferences, isLoading, isError } = useQuery(customerPreferenceQueryOptions());

  const hasConfigured = Boolean(
    preferences &&
      ((preferences.districts && preferences.districts.length > 0) ||
        preferences.budgetMin !== null ||
        preferences.budgetMax !== null ||
        (preferences.resourceCategory && preferences.resourceCategory !== 'ANY') ||
        (preferences.amenityIds && preferences.amenityIds.length > 0))
  );

  return (
    <Card className='border border-border/80'>
      <CardHeader className='pb-4 border-b border-border/40'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 rounded-xl bg-primary/10 text-primary'>
              <SlidersHorizontal className='w-6 h-6' />
            </div>
            <div>
              <CardTitle className='text-lg font-bold flex items-center gap-2'>
                Sở thích không gian cá nhân
                {hasConfigured ? (
                  <Badge variant='outline' className='text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20'>
                    <CheckCircle2 className='w-3 h-3 mr-1 inline' />
                    Đã thiết lập
                  </Badge>
                ) : (
                  <Badge variant='secondary' className='text-xs'>
                    Chưa thiết lập
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Cá nhân hóa tiêu chí tìm kiếm để hệ thống AI NexSpace đề xuất không gian phù hợp nhất.
              </CardDescription>
            </div>
          </div>

          {preferences?.updatedAt && (
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground self-start sm:self-auto bg-muted/50 px-3 py-1.5 rounded-lg'>
              <Clock className='w-3.5 h-3.5' />
              <span>Cập nhật: {new Date(preferences.updatedAt).toLocaleDateString('vi-VN')}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className='pt-6 space-y-6'>
        {/* 1. Highlight Metric Badges khi đã thiết lập */}
        {hasConfigured && preferences && (
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/30 rounded-xl border border-border/50'>
            {/* Khu vực */}
            <div className='space-y-1'>
              <span className='text-[11px] font-medium text-muted-foreground flex items-center gap-1'>
                <MapPin className='w-3.5 h-3.5 text-primary' />
                Khu vực
              </span>
              <p className='text-xs font-semibold text-foreground truncate'>
                {preferences.districts && preferences.districts.length > 0
                  ? preferences.districts.join(', ')
                  : 'Toàn thành phố'}
              </p>
            </div>

            {/* Ngân sách */}
            <div className='space-y-1'>
              <span className='text-[11px] font-medium text-muted-foreground flex items-center gap-1'>
                <DollarSign className='w-3.5 h-3.5 text-emerald-500' />
                Khoảng giá
              </span>
              <p className='text-xs font-semibold text-foreground truncate'>
                {preferences.budgetMin !== null || preferences.budgetMax !== null
                  ? `${formatPrice(preferences.budgetMin) || '0 đ'} - ${
                      formatPrice(preferences.budgetMax) || 'Không giới hạn'
                    }`
                  : 'Linh hoạt'}
              </p>
            </div>

            {/* Loại chỗ ngồi */}
            <div className='space-y-1'>
              <span className='text-[11px] font-medium text-muted-foreground flex items-center gap-1'>
                <Laptop className='w-3.5 h-3.5 text-blue-500' />
                Loại không gian
              </span>
              <p className='text-xs font-semibold text-foreground'>
                {getCategoryLabel(preferences.resourceCategory)}
              </p>
            </div>

            {/* Môi trường */}
            <div className='space-y-1'>
              <span className='text-[11px] font-medium text-muted-foreground flex items-center gap-1'>
                <Sparkles className='w-3.5 h-3.5 text-amber-500' />
                Môi trường
              </span>
              <p className='text-xs font-semibold text-foreground'>
                {getNoiseLabel(preferences.noiseLevel)}
              </p>
            </div>
          </div>
        )}

        {/* 2. Main Configuration Form */}
        {isLoading ? (
          <div className='space-y-6 py-4'>
            <Skeleton className='h-8 w-1/3' />
            <div className='flex gap-2'>
              <Skeleton className='h-8 w-20' />
              <Skeleton className='h-8 w-24' />
              <Skeleton className='h-8 w-28' />
            </div>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : isError ? (
          <div className='p-4 text-center text-sm text-destructive bg-destructive/10 rounded-lg'>
            Không thể tải thông tin sở thích không gian. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.
          </div>
        ) : (
          <CustomerPreferenceForm
            key={preferences?.updatedAt || (preferences ? 'loaded' : 'empty')}
            initialData={preferences}
          />
        )}
      </CardContent>
    </Card>
  );
}

