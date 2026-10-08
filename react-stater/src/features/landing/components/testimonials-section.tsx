import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Star, Users } from 'lucide-react';
import { TESTIMONIALS } from '../api/data';

import { useLanguage } from '../context/language-context';

type CategoryFilter = 'all' | 'people' | 'operations' | 'cre';

export function TestimonialsSection() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const categoryTabs: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: t('testimonials.all') },
    { id: 'people', label: t('testimonials.people') },
    { id: 'operations', label: t('testimonials.operations') },
    { id: 'cre', label: t('testimonials.cre') }
  ];

  const filteredTestimonials =
    activeCategory === 'all'
      ? TESTIMONIALS
      : TESTIMONIALS.filter((item) => item.category === activeCategory);

  return (
    <section
      id='reviews'
      className='border-border/60 bg-slate-50/50 backdrop-blur-xs scroll-mt-20 border-b py-24 dark:bg-slate-900/30'
    >
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Section Header */}
        <div className='mx-auto max-w-3xl text-center'>
          <span className='border-indigo-200 bg-indigo-50 text-[#4b41e1] dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 inline-block rounded-full border px-4 py-1 text-xs font-semibold tracking-wide uppercase'>
            {t('testimonials.badge')}
          </span>
          <h2 className='text-foreground font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl'>
            {t('testimonials.title')}
          </h2>
          <p className='text-muted-foreground mt-3 text-lg leading-relaxed'>
            {t('testimonials.subtitle')}
          </p>

          {/* Category Filter Pills */}
          <div className='mt-8 flex flex-wrap items-center justify-center gap-2'>
            {categoryTabs.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setActiveCategory(tab.id)}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#4b41e1] text-white shadow-xs'
                      : 'bg-card border-border/80 text-muted-foreground hover:text-foreground border'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 or 3 Column Quote Grid */}
        <div className='mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
          <AnimatePresence>
            {filteredTestimonials.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className='glass-card custom-level-1 hover:custom-level-2 group flex flex-col justify-between rounded-2xl p-8 transition-all duration-200'
              >
                <div>
                  {/* 5-Star Rating */}
                  <div className='mb-4 flex items-center gap-1 text-amber-500'>
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className='h-4 w-4 fill-amber-500' />
                    ))}
                  </div>

                  <p className='text-foreground text-sm italic leading-relaxed'>
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                {/* Author Details & Organization Badge */}
                <div className='border-border/60 mt-8 flex items-center gap-4 border-t pt-6'>
                  <div className='bg-indigo-100 text-[#4b41e1] dark:bg-indigo-950 dark:text-indigo-300 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold'>
                    {item.avatarInitials}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h4 className='text-foreground truncate text-sm font-bold'>{item.name}</h4>
                    <p className='text-muted-foreground truncate text-xs font-medium'>
                      {item.role}
                    </p>
                    <div className='text-muted-foreground/80 mt-1 flex items-center gap-2 text-[11px] font-medium'>
                      <span className='flex items-center gap-1 truncate'>
                        <Building2 className='h-3 w-3 shrink-0' />
                        {item.company}
                      </span>
                      <span>·</span>
                      <span className='flex items-center gap-1 shrink-0'>
                        <Users className='h-3 w-3 shrink-0' />
                        {item.teamSize}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
