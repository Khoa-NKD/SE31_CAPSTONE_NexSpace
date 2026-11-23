import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { useLanguage } from '@/features/landing/context/language-context';

interface TimeRangeFilterProps {
  selectedRange: 'today' | '7d' | '30d';
  onRangeChange: (range: 'today' | '7d' | '30d') => void;
}

export function TimeRangeFilter({ selectedRange, onRangeChange }: TimeRangeFilterProps) {
  const { language } = useLanguage();

  const handleExport = () => {
    toast.success(
      language === 'vi' ? 'Đã xuất báo cáo tóm tắt (Mô phỏng)' : 'Summary Report Exported (Simulated)',
      {
        description:
          language === 'vi'
            ? `Đã tạo báo cáo tổng hợp chỉ số vận hành cho ${
                selectedRange === 'today'
                  ? 'Hôm nay'
                  : selectedRange === '7d'
                    ? '7 ngày qua'
                    : '30 ngày qua'
              }.`
            : `Generated operational metrics digest for ${
                selectedRange === 'today'
                  ? 'Today'
                  : selectedRange === '7d'
                    ? 'Last 7 Days'
                    : 'Last 30 Days'
              }.`
      }
    );
  };

  return (
    <div className='flex items-center gap-3 flex-wrap'>
      {/* Time Filter Pill Group */}
      <div className='flex items-center p-1 bg-card border border-border rounded-lg shadow-2xs'>
        <button
          type='button'
          onClick={() => onRangeChange('today')}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            selectedRange === 'today'
              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
        >
          {language === 'vi' ? 'Hôm nay' : 'Today'}
        </button>

        <button
          type='button'
          onClick={() => onRangeChange('7d')}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            selectedRange === '7d'
              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
        >
          {language === 'vi' ? '7 ngày qua' : 'Last 7 Days'}
        </button>

        <button
          type='button'
          onClick={() => onRangeChange('30d')}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            selectedRange === '30d'
              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
        >
          {language === 'vi' ? '30 ngày qua' : 'Last 30 Days'}
        </button>

        <button
          type='button'
          onClick={() => {
            toast.info(
              language === 'vi' ? 'Bộ lọc thời gian tùy chỉnh' : 'Custom Date Filter',
              {
                description:
                  language === 'vi'
                    ? 'Trình chọn khoảng ngày tùy chỉnh được mô phỏng trong bản này.'
                    : 'Selectable date range picker is simulated in this batch.'
              }
            );
          }}
          className='px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded transition-colors flex items-center gap-1 cursor-pointer'
        >
          <span>{language === 'vi' ? 'Tùy chỉnh' : 'Custom'}</span>
          <CalendarIcon className='size-3.5' />
        </button>
      </div>

      {/* Export Summary Outline Button */}
      <Button
        variant='outline'
        size='sm'
        onClick={handleExport}
        className='flex items-center gap-1.5 h-8 px-3 text-xs font-semibold shadow-2xs'
      >
        <Download className='size-3.5 text-muted-foreground' />
        <span>{language === 'vi' ? 'Xuất báo cáo' : 'Export Summary'}</span>
      </Button>
    </div>
  );
}
