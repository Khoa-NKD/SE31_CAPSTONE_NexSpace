import type { ReactNode } from 'react';
import { Building2, MapPin, ImageIcon, ArrowUpRight } from '@/components/ui/hugeicons';
import '../styles/workspace-wizard.css';

export function WorkspaceOverviewHero({
  name,
  address,
  coverUrl,
  photoCount,
  badge,
  metrics,
  children,
  preview = false
}: {
  name: string;
  address: string;
  coverUrl?: string;
  photoCount?: number;
  badge?: ReactNode;
  metrics: ReactNode;
  children?: ReactNode;
  preview?: boolean;
}) {
  return (
    <div className='overview-hero'>
      <div className='overview-hero-content'>
        <div className='overview-hero-eyebrow'>
          <span />
          {preview ? 'Bản xem trước' : 'Tổng quan không gian'}
        </div>
        <div className='overview-hero-title'>
          {preview ? <h2>{name}</h2> : <h1>{name}</h1>}
          {badge}
        </div>
        <p className='overview-hero-address'>
          <MapPin className='size-3.5 shrink-0' />
          <span>{address || 'Chưa thiết lập địa chỉ'}</span>
        </p>
        {children && <div className='overview-hero-actions'>{children}</div>}
        <div className='overview-hero-metrics'>{metrics}</div>
      </div>
      <div className='overview-hero-cover'>
        {coverUrl ? (
          <img src={coverUrl} alt={'Ảnh bìa ' + name} />
        ) : (
          <div className='overview-hero-cover-empty'>
            <Building2 className='size-10' />
            <span>Chưa có ảnh bìa</span>
          </div>
        )}
        {photoCount != null && photoCount > 0 && (
          <span className='overview-hero-photo-count'>
            <ImageIcon className='size-3.5' />
            {photoCount} ảnh
          </span>
        )}
      </div>
    </div>
  );
}

const sections = ['Thông tin', 'Địa điểm', 'Mặt bằng', 'Giờ hoạt động', 'Tiện ích', 'Hình ảnh'];

export function WorkspaceOverviewNavigation({ changes = [] }: { changes?: boolean[] }) {
  return (
    <nav className='overview-section-nav' aria-label='Chuyển nhanh đến nhóm thông tin'>
      {sections.map((title, index) => (
        <a key={title} href={'#overview-section-' + (index + 1)} data-changed={!!changes[index]}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          {title}
          {changes[index] ? (
            <span className='overview-nav-change' aria-label='Có thay đổi' />
          ) : (
            <ArrowUpRight className='size-3 opacity-40' />
          )}
        </a>
      ))}
    </nav>
  );
}
