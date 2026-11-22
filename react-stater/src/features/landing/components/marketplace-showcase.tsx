import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import React, { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Building2, Compass } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { useFeaturedWorkspacesQuery, usePublicWorkspacesQuery } from '@/features/workspaces/api';
import { WorkspaceCard, type LandingWorkspaceCardData } from './workspace-card';
import { useLanguage } from '../context/language-context';
import type { SearchCriteria } from './search-card';
import SpotlightCard from '@/components/react-bits/SpotlightCard';
import { LandingReveal } from './landing-effects';

interface MarketplaceShowcaseProps {
  filterCriteria?: SearchCriteria | null;
  onResetFilters?: () => void;
}

export function MarketplaceShowcase({ filterCriteria, onResetFilters }: MarketplaceShowcaseProps) {
  const { t, language } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const { data: featuredData, isLoading: isFeaturedLoading } = useFeaturedWorkspacesQuery();
  const {
    data: publicListData,
    isLoading: isPublicLoading,
    isError
  } = usePublicWorkspacesQuery({ limit: 6 });

  const isLoading = isFeaturedLoading && isPublicLoading;

  // Combine featured workspaces first, then fill up to 6 from public active workspaces
  const allWorkspaces = useMemo<LandingWorkspaceCardData[]>(() => {
    const map = new Map<string, LandingWorkspaceCardData>();

    if (Array.isArray(featuredData)) {
      for (const item of featuredData) {
        if (item?.id !== undefined) {
          map.set(String(item.id), item);
        }
      }
    }

    const publicItems =
      publicListData?.content ||
      (publicListData as unknown as { listObjects?: LandingWorkspaceCardData[] })?.listObjects ||
      [];

    if (Array.isArray(publicItems)) {
      for (const item of publicItems) {
        if (item?.id !== undefined && !map.has(String(item.id))) {
          map.set(String(item.id), item);
        }
      }
    }

    return Array.from(map.values());
  }, [featuredData, publicListData]);

  // Derive available cities dynamically from real data
  const availableCities = useMemo<string[]>(() => {
    const cities = new Set<string>();
    for (const ws of allWorkspaces) {
      if (ws.city && ws.city.trim()) {
        cities.add(ws.city.trim());
      }
    }
    return Array.from(cities);
  }, [allWorkspaces]);

  // Apply live search/filter criteria if selected on Hero or city tabs
  const displayedWorkspaces = useMemo<LandingWorkspaceCardData[]>(() => {
    return allWorkspaces
      .filter((ws) => {
        if (selectedCity !== 'all' && ws.city !== selectedCity) {
          return false;
        }

        if (filterCriteria?.location) {
          const q = filterCriteria.location.toLowerCase().trim();
          const haystack = [
            ws.name,
            ws.city,
            ws.district,
            ws.streetAddress,
            'address' in ws && typeof ws.address === 'string' ? ws.address : '',
            ws.description
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) {
            return false;
          }
        }

        if (filterCriteria?.mode && filterCriteria.mode !== 'all') {
          const cat = (ws.category || '').toUpperCase();
          if (
            (filterCriteria.mode === 'hot-desk' || filterCriteria.mode === 'dedicated-desk') &&
            !cat.includes('COWORKING') &&
            !cat.includes('HUB')
          ) {
            return false;
          }
          if (
            filterCriteria.mode === 'meeting-room' &&
            !cat.includes('MEETING') &&
            !cat.includes('COWORKING')
          ) {
            return false;
          }
          if (
            filterCriteria.mode === 'private-office' &&
            !cat.includes('PRIVATE') &&
            !cat.includes('SERVICED') &&
            !cat.includes('COWORKING')
          ) {
            return false;
          }
        }

        return true;
      })
      .slice(0, 6);
  }, [allWorkspaces, selectedCity, filterCriteria]);

  return (
    <section
      id='workspaces'
      className='scroll-mt-20 border-b border-slate-200/70 py-14 sm:py-16 dark:border-slate-800/70'
    >
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
          <div>
            <h2 className='font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white'>
              {t('market.title')}
            </h2>
            <p className='mt-1.5 max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-400'>
              {t('market.subtitle')}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {/* Dynamic City Filter Pills (when multiple real cities exist) */}
            {availableCities.length > 1 && (
              <div className='inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900'>
                <button
                  type='button'
                  onClick={() => setSelectedCity('all')}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedCity === 'all'
                      ? 'bg-white text-[#4b41e1] shadow-2xs dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t('market.all')}
                </button>
                {availableCities.map((city) => (
                  <button
                    key={city}
                    type='button'
                    onClick={() => setSelectedCity(city)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedCity === city
                        ? 'bg-white text-[#4b41e1] shadow-2xs dark:bg-slate-800 dark:text-indigo-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}

            <Link
              to='/workspaces'
              className='hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-indigo-300 hover:text-[#4b41e1] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:text-indigo-400'
            >
              <span>{t('market.viewAll')}</span>
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        </div>

        {/* Workspace Cards Grid / States */}
        {isLoading ? (
          <div
            aria-busy='true'
            aria-label={language === 'vi' ? 'Đang tải danh sách không gian' : 'Loading workspaces'}
            className='mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
          >
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <LoadingPlaceholder
                key={item}
                className='flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
              >
                <div className='aspect-[16/10] w-full bg-slate-200 dark:bg-slate-800' />
                <div className='space-y-3 p-5'>
                  <div className='h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800' />
                  <div className='h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800' />
                  <div className='h-3 w-full rounded bg-slate-200 dark:bg-slate-800' />
                  <div className='mt-4 flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800'>
                    <div className='h-4 w-24 rounded bg-slate-200 dark:bg-slate-800' />
                    <div className='h-4 w-16 rounded bg-slate-200 dark:bg-slate-800' />
                  </div>
                </div>
              </LoadingPlaceholder>
            ))}
          </div>
        ) : isError || displayedWorkspaces.length === 0 ? (
          <div className='mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/50'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#4b41e1] dark:bg-indigo-950/60 dark:text-indigo-400'>
              <Building2 className='h-6 w-6' />
            </div>
            <h3 className='mt-3 text-base font-bold text-slate-900 dark:text-white'>
              {t('market.emptyTitle')}
            </h3>
            <p className='mt-1 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400'>
              {t('market.emptyDesc')}
            </p>
            <div className='mt-5 flex flex-wrap items-center justify-center gap-3'>
              {(selectedCity !== 'all' ||
                filterCriteria?.location ||
                (filterCriteria?.mode && filterCriteria.mode !== 'all')) && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setSelectedCity('all');
                    onResetFilters?.();
                  }}
                  className='cursor-pointer rounded-xl'
                >
                  {language === 'vi' ? 'Xóa bộ lọc' : 'Clear Filters'}
                </Button>
              )}
              <Button
                asChild
                size='sm'
                className='rounded-xl bg-[#4b41e1] hover:bg-[#4338CA] text-white'
              >
                <Link to='/workspaces' className='inline-flex items-center gap-1.5'>
                  <Compass className='h-4 w-4' />
                  <span>{t('market.viewAll')}</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className='ns-workspace-grid mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {displayedWorkspaces.map((workspace, index) => (
              <LandingReveal key={String(workspace.id)} delay={index * 0.04}>
                <SpotlightCard
                  className='ns-workspace-spotlight'
                  intensity={0.25}
                  borderGlow={0.3}
                  proximity={0}
                  ambient={false}
                  flare={false}
                  spotlightColor='#a5b4fc'
                >
                  <WorkspaceCard workspace={workspace} />
                </SpotlightCard>
              </LandingReveal>
            ))}
          </div>
        )}

        {/* Mobile View All Button */}
        <div className='mt-6 sm:hidden'>
          <Link
            to='/workspaces'
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:text-[#4b41e1] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          >
            <span>{t('market.viewAll')}</span>
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </div>
    </section>
  );
}
