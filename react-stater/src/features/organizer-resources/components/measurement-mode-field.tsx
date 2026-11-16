import type { MeasurementMode } from '../api/floor-design';
import { useLanguage } from '@/features/landing/context/language-context';

/** Floor edits preserve all workspace and resource geometry. */
export function MeasurementModeField(_props: {
  value: MeasurementMode; onChange: (mode: MeasurementMode) => void; disabled?: boolean;
}) {
  const { language } = useLanguage();
  return <p className='rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground'>
    {language === 'vi'
      ? 'Chỉ đổi biên tầng. Giữ nguyên vị trí, kích thước vùng workspace và ghế/phòng. Thu nhỏ làm vùng tràn theo chiều rộng hoặc chiều dài sẽ không được lưu. Tỷ lệ % chiếm dụng được tính lại theo diện tích tầng mới.'
      : 'Only the floor boundary changes. Workspace areas and resources retain their positions and dimensions. Shrinking past an area is blocked on either axis. Occupancy percentages reflect the new floor area.'}
  </p>;
}
