import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Building, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WORKSPACE_ITEMS } from '../api/data';
import type { WorkspaceCity, WorkspaceItem } from '../api/types';
import { WorkspaceCard } from './workspace-card';
import { ReserveModal } from './reserve-modal';

interface MarketplaceShowcaseProps {
  initialCity?: WorkspaceCity | 'all';
}

const CITY_TABS: { id: WorkspaceCity | 'all'; label: string }[] = [
  { id: 'all', label: 'All Locations' },
  { id: 'hcm', label: 'Ho Chi Minh City' },
  { id: 'hanoi', label: 'Hanoi' },
  { id: 'danang', label: 'Da Nang' }
];

export function MarketplaceShowcase({ initialCity = 'all' }: MarketplaceShowcaseProps) {
  const [activeCity, setActiveCity] = useState<WorkspaceCity | 'all'>(initialCity);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredWorkspaces =
    activeCity === 'all'
      ? WORKSPACE_ITEMS
      : WORKSPACE_ITEMS.filter((item) => item.city === activeCity);

  const handleOpenReserve = (workspace: WorkspaceItem) => {
    setSelectedWorkspace(workspace);
    setIsModalOpen(true);
  };

  return (
    <section id='workspaces' className='border-border/60 scroll-mt-20 border-b py-24'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Top Section Header & City Filter Tabs */}
        <div className='flex flex-col justify-between gap-6 md:flex-row md:items-end'>
          <div>
            <div className='inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#4b41e1] uppercase'>
              <Sparkles className='h-3.5 w-3.5' />
              <span>Live Network Inventory</span>
            </div>
            <h2 className='text-foreground font-display mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl'>
              Better spaces in prime locations
            </h2>
            <p className='text-muted-foreground mt-2 max-w-2xl text-base leading-relaxed'>
              Real-time availability with verified acoustic isolation, ergonomic task seating, and
              enterprise-grade fiber connectivity.
            </p>
          </div>

          {/* City Filter Tabs */}
          <div className='bg-muted/80 border-border/80 inline-flex self-start rounded-xl border p-1 md:self-auto'>
            {CITY_TABS.map((city) => {
              const isActive = activeCity === city.id;
              return (
                <button
                  key={city.id}
                  type='button'
                  onClick={() => setActiveCity(city.id)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition-all duration-150 sm:text-sm active:scale-[0.98] ${
                    isActive
                      ? 'bg-card text-[#4b41e1] custom-level-1 font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {city.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspaces Grid */}
        <div className='mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
          <AnimatePresence>
            {filteredWorkspaces.map((workspace) => (
              <motion.div
                key={workspace.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
              >
                <WorkspaceCard workspace={workspace} onReserve={handleOpenReserve} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* LiquidSpace-Style "Got Extra Space? List With Us" Callout Card */}
        <div id='list-space' className='mt-16 scroll-mt-20'>
          <div className='border-indigo-200/80 bg-linear-to-r from-indigo-50/70 via-card to-sky-50/70 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:via-card dark:to-sky-950/30 flex flex-col items-center justify-between gap-6 rounded-2xl border p-8 shadow-xs md:flex-row md:p-10'>
            <div className='space-y-2 text-left'>
              <div className='inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#4b41e1] uppercase'>
                <Building className='h-4 w-4' />
                <span>For Commercial Property Owners &amp; Organizers</span>
              </div>
              <h3 className='text-foreground font-display text-2xl font-bold tracking-tight'>
                Got extra space? Monetize with NexSpace.
              </h3>
              <p className='text-muted-foreground max-w-2xl text-sm leading-relaxed'>
                Join Southeast Asia’s fastest-growing marketplace of flexible and dedicated office
                space. List by the hour, day, or month—and connect with enterprise corporate tenants
                with instant PayOS payouts.
              </p>
            </div>

            <Button
              asChild
              className='bg-[#4b41e1] hover:bg-[#4338CA] shrink-0 text-white shadow-md active:scale-[0.98]'
            >
              <a href='#advisor' className='flex items-center gap-2'>
                <span>List Your Workspace</span>
                <ArrowRight className='h-4 w-4' />
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Reservation Dialog */}
      <ReserveModal
        workspace={selectedWorkspace}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}
