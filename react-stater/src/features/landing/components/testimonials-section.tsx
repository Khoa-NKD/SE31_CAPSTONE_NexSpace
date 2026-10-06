import React from 'react';
import { Star } from 'lucide-react';
import { TESTIMONIALS } from '../api/data';

export function TestimonialsSection() {
  return (
    <section className='bg-card/50 border-border/60 border-b py-20'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Section Header */}
        <div className='mx-auto max-w-2xl text-center'>
          <span className='text-[#4b41e1] text-xs font-semibold tracking-wider uppercase'>
            Proven Enterprise Impact
          </span>
          <h2 className='text-foreground font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl'>
            Real results from real teams.
          </h2>
          <p className='text-muted-foreground mt-2 text-base leading-relaxed'>
            How modern organizations ditch rigid 5-year commercial leases for agile workspace on
            NexSpace.
          </p>
        </div>

        {/* 2-Column Quote Grid */}
        <div className='mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2'>
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className='custom-level-1 bg-card border-border/80 relative flex flex-col justify-between rounded-2xl border p-8'
            >
              <div>
                {/* 5-Star Rating */}
                <div className='mb-4 flex items-center gap-1 text-amber-500'>
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className='h-4 w-4 fill-amber-500' />
                  ))}
                </div>

                <p className='text-foreground text-base italic leading-relaxed'>
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author Details */}
              <div className='border-border/60 mt-8 flex items-center gap-4 border-t pt-6'>
                <div className='bg-indigo-100 text-[#4b41e1] dark:bg-indigo-950 dark:text-indigo-300 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold'>
                  {item.avatarInitials}
                </div>
                <div>
                  <h4 className='text-foreground text-sm font-bold'>{item.name}</h4>
                  <p className='text-muted-foreground text-xs'>
                    {item.role} at {item.company}
                  </p>
                  <span className='text-muted-foreground/80 text-[11px] font-medium'>
                    Team size: {item.teamSize} · {item.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
