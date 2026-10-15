import React, { useState } from 'react';
import {
  Building2,
  Star,
  MapPin,
  ArrowRight,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  MOCK_LEADERBOARD_ITEMS,
  WorkspaceLeaderboardItem
} from '../data/mock-analytics';
import { HubBiDrawer } from './hub-bi-drawer';

function handleDownloadCsv() {
  toast.success('Leaderboard CSV Exported', {
    description: 'Downloaded regional workspace performance rankings dataset.'
  });
}

export function WorkspacesLeaderboardTable() {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedHub, setSelectedHub] = useState<WorkspaceLeaderboardItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredItems = MOCK_LEADERBOARD_ITEMS.filter((item) => {
    if (selectedCity === 'all') return true;
    if (selectedCity === 'hcmc') return item.city === 'HCMC';
    if (selectedCity === 'hanoi') return item.city === 'Hanoi';
    if (selectedCity === 'danang') return item.city === 'Da Nang';
    if (selectedCity === 'singapore') return item.city === 'Singapore';
    return true;
  });

  function handleOpenHubBi(hub: WorkspaceLeaderboardItem) {
    setSelectedHub(hub);
    setIsDrawerOpen(true);
  }

  return (
    <>
      <section
        aria-label='Top Performing Workspaces Leaderboard'
        className='bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden'
      >
        {/* Table Card Header & Regional Filters */}
        <div className='p-6 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h2 className='text-base font-bold text-foreground tracking-tight'>
                Top Performing Workspaces Leaderboard
              </h2>
              <span className='px-2.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary border border-primary/20'>
                Tier-1 Revenue Hubs
              </span>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Top revenue-generating hubs ranked by gross bookings, occupancy velocity, and member satisfaction ratings.
            </p>
          </div>

          {/* Quick City Filter Pills */}
          <div className='flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs'>
            {[
              { id: 'all', label: 'All Cities' },
              { id: 'hcmc', label: 'Ho Chi Minh City' },
              { id: 'hanoi', label: 'Hanoi' },
              { id: 'danang', label: 'Da Nang' },
              { id: 'singapore', label: 'Singapore' }
            ].map((city) => (
              <button
                key={city.id}
                type='button'
                onClick={() => setSelectedCity(city.id)}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                  selectedCity === city.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse text-xs'>
            <thead>
              <tr className='bg-muted/50 text-muted-foreground text-[11px] font-bold uppercase tracking-wider border-b border-border'>
                <th scope='col' className='py-3 px-5 w-16'>Rank</th>
                <th scope='col' className='py-3 px-5'>Workspace Name &amp; Location</th>
                <th scope='col' className='py-3 px-5'>City / District</th>
                <th scope='col' className='py-3 px-5 text-right'>Total Bookings (30d)</th>
                <th scope='col' className='py-3 px-5 text-right'>Gross Revenue (GMV)</th>
                <th scope='col' className='py-3 px-5 w-48'>Average Occupancy %</th>
                <th scope='col' className='py-3 px-5'>Satisfaction</th>
                <th scope='col' className='py-3 px-5 text-right'>Action</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border font-medium'>
              {filteredItems.map((hub) => {
                const isGold = hub.rank === 1;
                const isSilver = hub.rank === 2;
                const isBronze = hub.rank === 3;

                return (
                  <tr
                    key={hub.id}
                    className='hover:bg-muted/30 transition-colors group'
                  >
                    {/* Rank Badge */}
                    <td className='py-4 px-5'>
                      <div
                        className={`size-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs border ${
                          isGold
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                            : isSilver
                              ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-400'
                              : isBronze
                                ? 'bg-orange-500/20 text-orange-900 dark:text-orange-200 border-orange-500/40'
                                : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        #{hub.rank}
                      </div>
                    </td>

                    {/* Workspace Details */}
                    <td className='py-4 px-5' aria-label={hub.name}>
                      <div className='flex items-center gap-3'>
                        <div className='size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0'>
                          <Building2 className='size-5' />
                        </div>
                        <div>
                          <button
                            type='button'
                            onClick={() => handleOpenHubBi(hub)}
                            className='font-bold text-foreground group-hover:text-primary transition-colors text-xs text-left hover:underline'
                          >
                            {hub.name}
                          </button>
                          <div className='text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5'>
                            <MapPin className='size-3 text-muted-foreground shrink-0' />
                            <span>{hub.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* District */}
                    <td className='py-4 px-5'>
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border'>
                        {hub.district}
                      </span>
                    </td>

                    {/* Total Bookings */}
                    <td className='py-4 px-5 text-right font-mono font-semibold text-foreground text-xs'>
                      {hub.totalBookings30d.toLocaleString()}{' '}
                      <span className='text-[11px] text-muted-foreground font-sans'>bks</span>
                    </td>

                    {/* Gross Revenue */}
                    <td className='py-4 px-5 text-right font-mono'>
                      <div className='font-bold text-foreground text-xs'>
                        {hub.grossRevenueDisplay}
                      </div>
                      <div className='text-[11px] text-muted-foreground'>
                        {hub.localCurrencyDisplay}
                      </div>
                    </td>

                    {/* Average Occupancy % */}
                    <td className='py-4 px-5' aria-label={`Average Occupancy ${hub.averageOccupancyPercent}%`}>
                      <div className='space-y-1.5'>
                        <div className='flex justify-between text-xs font-bold text-foreground'>
                          <span>{hub.averageOccupancyPercent}%</span>
                          <span
                            className={`text-[10px] ${
                              hub.occupancyStatus === 'Optimal'
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : 'text-muted-foreground font-medium'
                            }`}
                          >
                            {hub.occupancyStatus}
                          </span>
                        </div>
                        <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                          <div
                            className='bg-primary h-2 rounded-full transition-all duration-500'
                            style={{ width: `${hub.averageOccupancyPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Satisfaction */}
                    <td className='py-4 px-5'>
                      <div className='flex items-center gap-1.5'>
                        <Star className='size-3.5 text-amber-500 fill-amber-500' />
                        <span className='font-bold text-foreground text-xs'>
                          {hub.satisfactionRating}
                        </span>
                        <span className='text-[11px] text-muted-foreground'>
                          ({hub.reviewsCount})
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className='py-4 px-5 text-right'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleOpenHubBi(hub)}
                        className='h-7 text-xs font-semibold text-primary hover:text-primary/80 gap-1 px-2'
                      >
                        <span>View Hub BI</span>
                        <ArrowRight className='size-3' />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className='px-6 py-3 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2'>
          <div className='flex items-center gap-2'>
            <span>Displaying top {filteredItems.length} of 86 audited commercial hubs</span>
            <span className='size-1 rounded-full bg-muted-foreground' />
            <span>Real-time booking reconciliation enabled</span>
          </div>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={handleDownloadCsv}
              className='font-semibold text-primary hover:underline inline-flex items-center gap-1'
            >
              <Download className='size-3' />
              <span>Download CSV Audit</span>
            </button>
            <span className='text-border'>|</span>
            <button
              type='button'
              onClick={() => toast.info('Viewing all 86 registered partner hubs across Vietnam and Singapore')}
              className='font-semibold text-primary hover:underline'
            >
              View All 86 Partners
            </button>
          </div>
        </div>
      </section>

      {/* Hub BI Slide-over Drawer */}
      <HubBiDrawer
        hub={selectedHub}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
