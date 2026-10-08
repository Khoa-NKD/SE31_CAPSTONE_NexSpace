import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/language-context';
import { PLATFORM_STATS } from '../api/data';

export function StatsBar() {
  const { language } = useLanguage();

  const stats =
    language === 'vi'
      ? [
          {
            value: '4M+ m²',
            label: 'Mạng lưới không gian linh hoạt',
            description: 'Mặt bằng cao cấp tại các trung tâm tài chính & kinh doanh lớn'
          },
          {
            value: '60 Tỷ+ VNĐ',
            label: 'Tiết kiệm chi phí danh mục',
            description: 'Mức cắt giảm chi phí văn phòng trung bình hàng năm cho mỗi doanh nghiệp'
          },
          {
            value: '68%',
            label: 'Tối ưu mật độ & sử dụng',
            description: 'Gia tăng hiệu suất khai thác diện tích và mật độ nhân sự làm việc'
          },
          {
            value: '99.98%',
            label: 'Độ tin cậy chuẩn SLA',
            description: 'Cam kết đặt chỗ tức thì với tiêu chuẩn cách âm được kiểm định'
          }
        ]
      : PLATFORM_STATS;

  return (
    <section className='border-border/60 bg-slate-50/40 backdrop-blur-xs border-b py-12 dark:bg-slate-900/30'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        <div className='grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8'>
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className='glass-card custom-level-1 hover:custom-level-2 group flex flex-col justify-between rounded-2xl p-6 transition-all duration-200'
            >
              <div>
                <span className='font-display text-3xl font-extrabold tracking-tight text-[#4b41e1] sm:text-4xl'>
                  {stat.value}
                </span>
                <h4 className='text-foreground mt-2 text-sm font-semibold tracking-tight'>
                  {stat.label}
                </h4>
              </div>
              <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
