import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { RESOURCE_ARTICLES } from '../api/data';
import { useLanguage } from '../context/language-context';

export function ResourcesSection() {
  const { t } = useLanguage();

  return (
    <section id='resources' className='border-border/60 scroll-mt-20 border-b py-24'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Section Header */}
        <div className='mx-auto max-w-3xl text-center'>
          <div className='inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#4b41e1] uppercase'>
            <BookOpen className='h-3.5 w-3.5' />
            <span>{t('resources.badge')}</span>
          </div>
          <h2 className='text-foreground font-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl'>
            {t('resources.title')}
          </h2>
          <p className='text-muted-foreground mt-3 text-lg leading-relaxed'>
            {t('resources.subtitle')}
          </p>
        </div>

        {/* 3 Articles Grid */}
        <div className='mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3'>
          {RESOURCE_ARTICLES.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className='glass-card custom-level-1 hover:custom-level-2 group flex flex-col justify-between rounded-2xl p-7 transition-all duration-200'
            >
              <div>
                {/* Meta info: Category & Read Time */}
                <div className='mb-4 flex items-center justify-between text-xs'>
                  <span className='bg-indigo-50 border-indigo-200 text-[#4b41e1] dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 rounded-full border px-2.5 py-0.5 font-semibold'>
                    {article.category}
                  </span>
                  <div className='text-muted-foreground flex items-center gap-1 font-medium'>
                    <Clock className='h-3.5 w-3.5' />
                    <span>{article.readTime}</span>
                  </div>
                </div>

                <h3 className='text-foreground group-hover:text-[#4b41e1] font-display text-lg font-bold tracking-tight transition-colors duration-150'>
                  {article.title}
                </h3>

                <p className='text-muted-foreground mt-3 text-xs leading-relaxed'>
                  {article.summary}
                </p>
              </div>

              {/* Bottom Read Link */}
              <div className='border-border/60 mt-6 border-t pt-5'>
                <a
                  href={article.href}
                  className='text-[#4b41e1] inline-flex items-center gap-1.5 text-xs font-bold transition-transform duration-150 group-hover:translate-x-1'
                >
                  <span>Read full analysis</span>
                  <ArrowRight className='h-3.5 w-3.5' />
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
