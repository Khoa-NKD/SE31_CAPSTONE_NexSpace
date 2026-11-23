import { useLanguage } from '@/features/landing/context/language-context';
import { availabilityColors } from '@/features/organizer-resources/utils/availability';
export const selectedResourceColor = '#6366f1';
export function ResourceStatusLegend({ className = '' }: { className?: string }) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const entries = [
    [availabilityColors.AVAILABLE, vi ? 'Còn trống' : 'Available'],
    [availabilityColors.LOCKED, vi ? 'Đang giữ chỗ' : 'On hold'],
    [availabilityColors.BOOKED, vi ? 'Đã có người đặt' : 'Booked'],
    [availabilityColors.MAINTENANCE, vi ? 'Đang bảo trì' : 'Under maintenance'],
    [availabilityColors.DISABLED, vi ? 'Ngừng nhận đặt' : 'Not accepting bookings']
  ];
  return (
    <div
      className={'flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] ' + className}
      aria-label={vi ? 'Chú thích trạng thái' : 'Status legend'}
    >
      {entries.map(([color, label]) => (
        <span
          key={color}
          className='inline-flex items-center gap-1.5 whitespace-nowrap font-medium'
          style={{ color }}
        >
          <span
            className='size-2.5 rounded-sm border'
            style={{ borderColor: color, backgroundColor: color + '33' }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
