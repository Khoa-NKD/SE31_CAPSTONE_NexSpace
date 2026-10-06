import React, { useState } from 'react';
import { WORKSPACE_ITEMS } from '../api/data';
import type { WorkspaceCity, WorkspaceItem } from '../api/types';
import { WorkspaceCard } from './workspace-card';
import { ReserveModal } from './reserve-modal';

interface MarketplaceShowcaseProps {
  initialCity?: WorkspaceCity;
}

const CITY_TABS: { id: WorkspaceCity; label: string }[] = [
  { id: 'hanoi', label: 'Hanoi' },
  { id: 'hcm', label: 'Ho Chi Minh City' },
  { id: 'danang', label: 'Da Nang' }
];

export function MarketplaceShowcase({ initialCity = 'hcm' }: MarketplaceShowcaseProps) {
  const [activeCity, setActiveCity] = useState<WorkspaceCity>(initialCity);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter workspaces based on active city
  const filteredWorkspaces = WORKSPACE_ITEMS.filter((item) => item.city === activeCity);

  const handleOpenReserve = (workspace: WorkspaceItem) => {
    setSelectedWorkspace(workspace);
    setIsModalOpen(true);
  };

  return (
    <section id='workspaces' className='border-border/60 scroll-mt-20 border-b py-20'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Top Section Header & City Filter Tabs */}
        <div className='flex flex-col justify-between gap-6 md:flex-row md:items-end'>
          <div>
            <span className='text-[#4b41e1] text-xs font-semibold tracking-wider uppercase'>
              Live Network Inventory
            </span>
            <h2 className='text-foreground font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl'>
              Better spaces in prime locations
            </h2>
            <p className='text-muted-foreground mt-2 text-base leading-relaxed'>
              Real-time availability with verified amenities, high-speed fiber, and acoustic
              isolation.
            </p>
          </div>

          {/* City Filter Tabs */}
          <div className='bg-muted border-border/80 inline-flex self-start rounded-xl border p-1 md:self-auto'>
            {CITY_TABS.map((city) => {
              const isActive = activeCity === city.id;
              return (
                <button
                  key={city.id}
                  type='button'
                  onClick={() => setActiveCity(city.id)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
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
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} onReserve={handleOpenReserve} />
          ))}
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
