import {
  Star,
  Sunset,
  Wifi,
  QrCode,
  Users,
  Chair,
  Building
} from '@/components/ui/hugeicons';
import type { MapResource, CustomerFloor } from '../detail/public-floor-map';
import type { PublicWorkspaceDetail } from '../../api/types';
import { useCurrency } from '@/features/landing/context/currency-context';
import { isResourceOffice } from '../../utils/seat-room-utils';

export interface SeatMetaStripProps {
  resource?: MapResource | null;
  workspace?: PublicWorkspaceDetail | null;
  floor?: CustomerFloor | null;
}

export function SeatMetaStrip({ resource, workspace, floor }: SeatMetaStripProps) {
  const { formatPrice } = useCurrency();

  const isRoom = resource?.category === 'ROOM';
  const isOffice = resource ? isResourceOffice(resource) : false;
  const capacity = resource?.capacity || (isRoom ? (isOffice ? 4 : 6) : 1);
  const hourlyRate = resource?.pricePerHour || 0;

  const zoneTag =
    resource?.zoneName?.toUpperCase() || (isRoom ? 'KHU PHÒNG HỌP' : 'KHU BÀN LÀM VIỆC');
  const seatId = resource?.code ? `MÃ #${resource.code}` : (resource?.name || '');
  const title = resource?.name
    ? resource.code
      ? `${resource.name} (${resource.code})`
      : resource.name
    : resource?.code || (isRoom ? 'Phòng làm việc' : 'Bàn làm việc');

  const locationParts = [workspace?.name, floor?.name, resource?.typeName].filter(Boolean);
  const locationDesc =
    locationParts.length > 0
      ? locationParts.join(' • ')
      : isRoom
        ? 'Phòng họp & làm việc tiêu chuẩn'
        : 'Bàn làm việc Focus tiêu chuẩn';

  const hasReviews = typeof workspace?.rating === 'number' && workspace.rating > 0;
  const ratingValue = hasReviews ? Number(workspace.rating).toFixed(1) : null;
  const reviewsCount = workspace?.reviewsCount ?? 0;

  const metaBadges = [
    {
      icon: isRoom ? (isOffice ? Building : Users) : Chair,
      label: 'SỨC CHỨA',
      value: `${capacity} Chỗ ngồi`
    },
    {
      icon: Sunset,
      label: 'ĐƠN GIÁ',
      value: hourlyRate > 0 ? `${formatPrice(hourlyRate)} / giờ` : 'Liên hệ báo giá'
    },
    {
      icon: Wifi,
      label: 'KẾT NỐI MẠNG',
      value: 'WiFi & Internet tốc độ cao'
    },
    {
      icon: QrCode,
      label: 'MỞ KHÓA',
      value: 'Mã QR thông minh 24/7'
    }
  ];

  return (
    <div className='bg-card border-border shadow-xs space-y-5 rounded-xl border p-6'>
      {/* Title & Rating Row */}
      <div className='border-border/60 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center'>
        <div>
          <div className='mb-1.5 flex items-center gap-2'>
            <span className='bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold'>
              {zoneTag}
            </span>
            {seatId && (
              <span className='text-muted-foreground text-xs font-medium font-mono'>{seatId}</span>
            )}
          </div>
          <h1 className='text-foreground font-sans text-xl font-bold tracking-tight sm:text-2xl'>
            {title}
          </h1>
          <p className='text-muted-foreground mt-1 text-xs sm:text-sm'>{locationDesc}</p>
        </div>

        {/* Rating Block */}
        <div className='flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 sm:flex-col sm:items-end'>
          <div className='flex items-center gap-1'>
            <Star
              className={`h-4 w-4 ${hasReviews ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/60'}`}
            />
            <span className='font-sans text-base font-bold text-foreground'>
              {ratingValue ?? 'Mới'}
            </span>
          </div>
          <span className='text-muted-foreground text-xs'>
            ({reviewsCount} đánh giá)
          </span>
        </div>
      </div>

      {/* Feature Meta Badges Strip */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {metaBadges.map((badge, idx) => {
          const Icon = badge.icon;
          return (
            <div
              key={idx}
              className='bg-muted/50 border-border/60 flex items-center gap-2.5 rounded-lg border p-3'
            >
              <Icon className='text-primary h-5 w-5 shrink-0' />
              <div>
                <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                  {badge.label}
                </p>
                <p className='text-foreground text-xs font-semibold sm:text-sm'>{badge.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
