import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Building2, MapPin, Star, Zap } from 'lucide-react';
import { useLanguage } from '../context/language-context';
import { useCurrency } from '../context/currency-context';
import type { CanonicalWorkspace, PublicWorkspaceSummary } from '@/features/workspaces/api/types';

export type LandingWorkspaceCardData = CanonicalWorkspace | PublicWorkspaceSummary;

interface WorkspaceCardProps {
  workspace: LandingWorkspaceCardData;
}

function formatCategoryLabel(category: string | undefined, language: 'en' | 'vi'): string {
  const normalized = (category || '').toUpperCase();
  if (normalized.includes('COWORKING')) {
    return language === 'vi' ? 'Không gian Coworking' : 'Coworking Hub';
  }
  if (normalized.includes('MEETING')) {
    return language === 'vi' ? 'Phòng họp' : 'Meeting Suite';
  }
  if (normalized.includes('PRIVATE')) {
    return language === 'vi' ? 'Văn phòng riêng' : 'Private Office';
  }
  if (normalized.includes('SERVICED')) {
    return language === 'vi' ? 'Văn phòng dịch vụ' : 'Serviced Office';
  }
  if (normalized.includes('ENTERPRISE')) {
    return language === 'vi' ? 'Sàn doanh nghiệp' : 'Enterprise Floor';
  }
  return language === 'vi' ? 'Không gian linh hoạt' : 'Flexible Workspace';
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [imgError, setImgError] = useState(false);

  const workspaceId = String(workspace.id);
  const name = workspace.name;
  const categoryLabel = formatCategoryLabel(workspace.category, language);

  const fallbackAddress =
    'address' in workspace && typeof workspace.address === 'string'
      ? workspace.address
      : '';

  const shortLocation =
    workspace.district && workspace.city
      ? `${workspace.district}, ${workspace.city}`
      : workspace.city || workspace.district || workspace.streetAddress || fallbackAddress || '';

  const coverUrl =
    ('coverImageUrl' in workspace && workspace.coverImageUrl) ||
    ('imageUrl' in workspace && typeof workspace.imageUrl === 'string' ? workspace.imageUrl : null);

  const isInstantBook =
    'bookingConfirmationMode' in workspace &&
    String(workspace.bookingConfirmationMode || '').toUpperCase() === 'INSTANT';

  const rawRating = typeof workspace.rating === 'number' ? workspace.rating : null;
  const reviewsCount =
    'reviewsCount' in workspace && typeof workspace.reviewsCount === 'number'
      ? workspace.reviewsCount
      : 0;
  const hasVerifiedRating = rawRating !== null && rawRating > 0 && reviewsCount > 0;

  const pricePerHour =
    typeof workspace.pricePerHour === 'number' && workspace.pricePerHour > 0
      ? workspace.pricePerHour
      : null;

  const amenityLabels: string[] = React.useMemo(() => {
    if ('amenities' in workspace && Array.isArray(workspace.amenities)) {
      return (workspace.amenities as unknown[])
        .slice(0, 3)
        .map((a) =>
          typeof a === 'string'
            ? a
            : typeof a === 'object' && a !== null && 'label' in a
              ? String((a as { label?: string }).label || '')
              : ''
        )
        .filter(Boolean);
    }
    return [];
  }, [workspace]);

  return (
    <Link
      to='/workspaces/$workspaceId'
      params={{ workspaceId }}
      className='group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800'
    >
      {/* Image Container (16:10 consistent aspect ratio) */}
      <div className='relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800'>
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt={name}
            loading='lazy'
            onError={() => setImgError(true)}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-100 text-slate-400 dark:from-slate-800 dark:via-indigo-950/30 dark:to-slate-800 dark:text-slate-500'>
            <Building2 className='h-9 w-9 stroke-[1.5] text-indigo-400/70' />
            <span className='text-xs font-medium'>{categoryLabel}</span>
          </div>
        )}

        {/* Top Left: Category Pill & Optional Instant Book Badge */}
        <div className='absolute top-3 left-3 flex flex-wrap items-center gap-1.5'>
          <span className='rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md'>
            {categoryLabel}
          </span>
          {isInstantBook && (
            <span className='inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md'>
              <Zap className='h-3 w-3 fill-current' />
              <span>{t('market.instantBook')}</span>
            </span>
          )}
        </div>

        {/* Top Right: Honest Rating or New State */}
        <div className='absolute top-3 right-3'>
          {hasVerifiedRating ? (
            <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-2xs backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:text-white'>
              <Star className='h-3.5 w-3.5 fill-amber-400 text-amber-400' />
              <span>{rawRating.toFixed(1)}</span>
              <span className='font-normal text-slate-500 dark:text-slate-400'>
                ({reviewsCount})
              </span>
            </span>
          ) : (
            <span className='inline-flex items-center rounded-lg border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300'>
              {t('market.newWorkspace')}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className='flex flex-1 flex-col justify-between p-4 sm:p-5'>
        <div>
          {shortLocation && (
            <div className='flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400'>
              <MapPin className='h-3.5 w-3.5 shrink-0 text-slate-400' />
              <span className='truncate'>{shortLocation}</span>
            </div>
          )}

          <h3 className='font-display mt-1.5 line-clamp-1 text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#4b41e1] dark:text-white dark:group-hover:text-indigo-400'>
            {name}
          </h3>

          {workspace.description && (
            <p className='mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
              {workspace.description}
            </p>
          )}

          {amenityLabels.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {amenityLabels.map((amenity) => (
                <span
                  key={amenity}
                  className='rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Pricing & Clear CTA */}
        <div className='mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800/80'>
          <div>
            {pricePerHour !== null ? (
              <div className='flex items-baseline gap-1'>
                <span className='text-xs text-slate-500 dark:text-slate-400'>
                  {t('market.startingFrom')}
                </span>
                <span className='text-base font-extrabold text-slate-900 dark:text-white'>
                  {formatPrice(pricePerHour)}
                </span>
                <span className='text-xs text-slate-500 dark:text-slate-400'>
                  {t('market.perHour')}
                </span>
              </div>
            ) : (
              <span className='text-xs font-medium text-slate-500 dark:text-slate-400'>
                {language === 'vi' ? 'Xem bảng giá chi tiết' : 'View pricing details'}
              </span>
            )}
          </div>

          <span className='inline-flex items-center gap-1 text-xs font-semibold text-[#4b41e1] transition-transform group-hover:translate-x-0.5 dark:text-indigo-400'>
            <span>{t('market.viewDetails')}</span>
            <ArrowRight className='h-3.5 w-3.5' />
          </span>
        </div>
      </div>
    </Link>
  );
}
