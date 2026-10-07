import React from 'react';
import { motion } from 'motion/react';
import { PLATFORM_STATS } from '../api/data';

export function StatsBar() {
  return (
    <section className='border-border/60 bg-muted/20 border-b py-12'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        <div className='grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8'>
          {PLATFORM_STATS.map((stat, index) => (
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
