import { Building2, Link2, MapPin } from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorOption } from '../api/resources';

export function FloorLocationBanner({ floor }: { floor: FloorOption }) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const location = floor.location;
  return (
    <div className='flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-primary/[.04] px-5 py-3 text-xs'>
      {location ? (
        <>
          <span className='flex items-center gap-2 font-semibold'>
            <Building2 className='size-4 text-primary' />
            {location.buildingName} · {location.physicalFloorName} ({location.floorNumber})
          </span>
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <MapPin className='size-3.5' />
            {c('Workspace area', 'Khu vực workspace')}: {location.width} × {location.height} px · X{' '}
            {location.x}, Y {location.y}
          </span>
        </>
      ) : (
        <span className='flex items-center gap-2 text-amber-600 dark:text-amber-400'>
          <Link2 className='size-4' />
          {c(
            'Existing layout has not been mapped to a physical building floor. Use Floor actions → Link physical floor.',
            'Sơ đồ cũ chưa liên kết tầng vật lý. Chọn Thao tác tầng → Liên kết tầng vật lý.'
          )}
        </span>
      )}
      <span className='text-muted-foreground'>
        {c(
          'Seats, rooms and bookings belong to this workspace; the Organizer manages them.',
          'Ghế/phòng và booking được phân biệt theo workspace; Organizer quản lý tất cả.'
        )}
      </span>
    </div>
  );
}
