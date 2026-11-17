import { useState } from 'react';
import {
  Star,
  PenLine,
  ThumbsUp,
  BadgeCheck,
  ChevronDown
} from 'lucide-react';

export function SeatReviewsBento() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'tech' | 'remote' | 'photos'>('all');
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({
    r1: 14,
    r2: 9,
    r3: 6
  });

  const toggleHelpful = (id: string) => {
    setHelpfulCounts((prev) => ({
      ...prev,
      [id]: prev[id] + 1
    }));
  };

  const reviews = [
    {
      id: 'r1',
      avatar: 'TQ',
      name: 'Tran Minh Quan',
      tag: 'Booked 6 times',
      role: 'Senior Software Architect at VNG Corp • Stayed Jan 22, 2026',
      rating: 5,
      content:
        '"Desk A-04 is hands down the best hot desk in Central Tower. The Aeron chair is genuinely well-maintained and the 1Gbps fiber connection had zero packet loss during my 4-hour remote pair programming session. West-facing sunset view around 5 PM is gorgeous."',
      category: 'tech'
    },
    {
      id: 'r2',
      avatar: 'SJ',
      name: 'Sarah Jenkins',
      tag: 'Booked 3 times',
      role: 'Product Design Lead • Stayed Jan 18, 2026',
      rating: 5,
      content:
        '"Extremely quiet zone! The acoustic ceiling actually works — barely heard footsteps. Natural sunlight is abundant without glare thanks to automated solar shades. USB-C 65W charging powered my MacBook Pro seamlessly without needing my brick."',
      category: 'remote'
    },
    {
      id: 'r3',
      avatar: 'LL',
      name: 'Le Hoang Long',
      tag: 'Verified Booking',
      role: 'Fintech Consultant • Stayed Jan 14, 2026',
      rating: 5,
      content:
        '"Booked for an urgent client presentation. The power outlets are solid, fast WiFi, and having phone booth Pod M-02 right around the corner for quick calls is super convenient. Will definitely book this exact seat again."',
      category: 'tech'
    }
  ];

  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'tech') return r.category === 'tech';
    if (activeFilter === 'remote') return r.category === 'remote';
    return true;
  });

  return (
    <div className='bg-card border-border shadow-xs space-y-6 rounded-xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-center'>
        <div>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Verified Customer Reviews
          </h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            Real experiences from engineers, remote executives, and founders who booked Desk A-04.
          </p>
        </div>
        <button
          type='button'
          className='border-border hover:bg-muted text-foreground flex cursor-pointer items-center gap-2 self-start rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 md:self-auto'
        >
          <PenLine className='h-3.5 w-3.5' />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Overall Rating Summary Bento Box */}
      <div className='bg-muted/30 border-border/80 grid grid-cols-1 gap-6 rounded-xl border p-5 md:grid-cols-12'>
        {/* Left Score block */}
        <div className='border-border/60 flex flex-col items-center justify-center border-b pb-4 md:col-span-4 md:border-r md:border-b-0 md:pb-0'>
          <span className='font-sans text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
            4.96
          </span>
          <div className='my-2 flex items-center gap-1'>
            {[...Array(5)].map((_, i) => (
              <Star key={i} className='h-4 w-4 fill-amber-500 text-amber-500' />
            ))}
          </div>
          <span className='text-muted-foreground text-xs font-medium'>
            Based on 42 verified stays
          </span>
        </div>

        {/* Right Sub-metrics Breakdown Bars */}
        <div className='flex flex-col justify-center gap-2.5 md:col-span-8'>
          <div>
            <div className='mb-1 flex justify-between text-xs font-medium text-foreground'>
              <span>Ergonomics &amp; Chair Comfort</span>
              <span className='font-bold'>5.0 / 5.0</span>
            </div>
            <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
              <div className='bg-primary h-full rounded-full' style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className='mb-1 flex justify-between text-xs font-medium text-foreground'>
              <span>Quietness &amp; Focus Environment</span>
              <span className='font-bold'>4.9 / 5.0</span>
            </div>
            <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
              <div className='bg-primary h-full rounded-full' style={{ width: '98%' }} />
            </div>
          </div>

          <div>
            <div className='mb-1 flex justify-between text-xs font-medium text-foreground'>
              <span>WiFi Bandwidth &amp; Power Outlets</span>
              <span className='font-bold'>5.0 / 5.0</span>
            </div>
            <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
              <div className='bg-primary h-full rounded-full' style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className='mb-1 flex justify-between text-xs font-medium text-foreground'>
              <span>Natural Lighting &amp; West View</span>
              <span className='font-bold'>4.9 / 5.0</span>
            </div>
            <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
              <div className='bg-primary h-full rounded-full' style={{ width: '98%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Review Filters Chips */}
      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={() => setActiveFilter('all')}
          className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          All Reviews (42)
        </button>
        <button
          type='button'
          onClick={() => setActiveFilter('tech')}
          className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
            activeFilter === 'tech'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          Tech &amp; Engineering (18)
        </button>
        <button
          type='button'
          onClick={() => setActiveFilter('remote')}
          className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
            activeFilter === 'remote'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          Remote Workers (14)
        </button>
        <button
          type='button'
          onClick={() => setActiveFilter('photos')}
          className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
            activeFilter === 'photos'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          With Photos (9)
        </button>
      </div>

      {/* Individual Customer Review Cards */}
      <div className='border-border/60 divide-border/60 flex flex-col divide-y border-t'>
        {filteredReviews.map((review) => (
          <article key={review.id} className='py-5'>
            <div className='mb-2 flex items-start justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold'>
                  {review.avatar}
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h4 className='text-foreground text-xs font-bold sm:text-sm'>
                      {review.name}
                    </h4>
                    <span className='inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
                      <BadgeCheck className='h-3 w-3' />
                      {review.tag}
                    </span>
                  </div>
                  <p className='text-muted-foreground text-xs'>{review.role}</p>
                </div>
              </div>
              <div className='flex items-center text-amber-500'>
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className='h-3.5 w-3.5 fill-amber-500' />
                ))}
              </div>
            </div>

            <p className='text-foreground mt-2 text-xs leading-relaxed sm:text-sm'>
              {review.content}
            </p>

            <div className='text-muted-foreground mt-3 flex items-center gap-4 text-xs'>
              <button
                type='button'
                onClick={() => toggleHelpful(review.id)}
                className='hover:text-primary flex cursor-pointer items-center gap-1.5 transition-colors'
              >
                <ThumbsUp className='h-3.5 w-3.5' />
                <span>Helpful ({helpfulCounts[review.id]})</span>
              </button>
              <button
                type='button'
                className='hover:text-foreground cursor-pointer transition-colors'
              >
                Reply
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Pagination Button */}
      <div className='border-border/60 border-t pt-4 text-center'>
        <button
          type='button'
          className='text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold transition-colors sm:text-sm'
        >
          <span>View All 42 Verified Reviews</span>
          <ChevronDown className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}

