import React from 'react';
import {
  Chair,
  Zap,
  SunMedium,
  Monitor,
  Coffee,
  Wifi,
  ShieldCheck
} from '@/components/ui/hugeicons';
import type { WorkspaceAmenityDto, PublicResourceDetail } from '../../api/types';

interface SeatSpecsGridProps {
  amenities?: WorkspaceAmenityDto[];
  resource?: PublicResourceDetail | null;
}

const getAmenityIcon = (iconName?: string, name?: string) => {
  const lower = (iconName || name || '').toLowerCase();
  if (lower.includes('coffee') || lower.includes('trà') || lower.includes('cà phê')) return Coffee;
  if (lower.includes('wifi') || lower.includes('mạng') || lower.includes('internet')) return Wifi;
  if (lower.includes('ghế') || lower.includes('chair') || lower.includes('armchair')) return Chair;
  if (lower.includes('điện') || lower.includes('sạc') || lower.includes('power')) return Zap;
  if (lower.includes('yên tĩnh') || lower.includes('volume') || lower.includes('ánh sáng')) return SunMedium;
  return ShieldCheck;
};

export function SeatSpecsGrid({
  amenities,
  resource
}: SeatSpecsGridProps) {
  const hasAmenities = amenities && amenities.length > 0;

  return (
    <div className='bg-card border-border shadow-xs space-y-5 rounded-xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Thông số trang thiết bị &amp; Tiện ích chỗ ngồi
          </h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {resource?.typeName
              ? `${resource.typeName}${resource.capacity ? ` • Sức chứa ${resource.capacity} người` : ''} • Tiêu chuẩn NexSpace`
              : 'Trang thiết bị được trang bị theo tiêu chuẩn vận hành không gian.'}
          </p>
        </div>
        <span className='bg-primary/10 text-primary rounded px-3 py-1 text-xs font-semibold'>
          TIÊU CHUẨN NEXSPACE VERIFIED
        </span>
      </div>

      {/* Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {hasAmenities ? (
          amenities.map((a) => {
            const Icon = getAmenityIcon(a.icon, a.name);
            return (
              <div
                key={a.id}
                className='bg-muted/30 border-border/70 flex items-start gap-3.5 rounded-xl border p-4'
              >
                <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                  <Icon className='h-5 w-5' />
                </div>
                <div className='space-y-1'>
                  <h3 className='text-foreground text-xs font-bold sm:text-sm'>{a.name}</h3>
                  <p className='text-muted-foreground text-xs leading-relaxed'>
                    {a.description || 'Tiện ích phục vụ khách đặt chỗ tại không gian.'}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className='col-span-full rounded-xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground'>
            Không gian cung cấp các tiện ích cơ bản gồm bàn làm việc, ghế ngồi tiêu chuẩn, nguồn điện và WiFi tốc độ cao.
          </div>
        )}

        <div className='col-span-full md:col-span-1 flex items-start gap-3.5 rounded-xl border border-border/80 bg-muted/20 p-4'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Monitor className='h-5 w-5' />
          </div>
          <div className='w-full space-y-1'>
            <h3 className='text-foreground text-xs font-bold sm:text-sm'>
              Tiện ích bổ sung theo không gian
            </h3>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              Các tiện ích tính phí thêm (nếu không gian có cung cấp) sẽ hiển thị theo bảng giá thực tế ở bước xác nhận đơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
