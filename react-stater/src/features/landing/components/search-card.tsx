import React, { useState } from 'react';
import { Building2, Calendar, MapPin, Monitor, Search, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { WorkspaceType } from '../api/types';

interface SearchCardProps {
  onSearch?: (criteria: { mode: WorkspaceType; location: string; capacity: string }) => void;
}

const MODE_TABS: {
  id: WorkspaceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'hot-desk', label: 'Hot Desk', icon: Monitor },
  { id: 'dedicated-desk', label: 'Dedicated Desk', icon: User },
  { id: 'private-office', label: 'Private Office', icon: Building2 },
  { id: 'meeting-room', label: 'Meeting Room', icon: Users }
];

export function SearchCard({ onSearch }: SearchCardProps) {
  const [activeMode, setActiveMode] = useState<WorkspaceType>('hot-desk');
  const [location, setLocation] = useState('District 1, Ho Chi Minh City');
  const [dateTime, setDateTime] = useState('Today, Flexible hours');
  const [capacity, setCapacity] = useState('1 - 4 People');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const activeLabel = MODE_TABS.find((m) => m.id === activeMode)?.label ?? 'Workspace';
    toast.success(`Searching available ${activeLabel} spaces in ${location}...`);

    onSearch?.({ mode: activeMode, location, capacity });

    const inventoryElem = document.getElementById('workspaces');
    if (inventoryElem) {
      inventoryElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className='custom-level-3 bg-card border-border/80 mx-auto mt-10 max-w-5xl rounded-2xl border p-6 text-left shadow-lg'>
      {/* Segmented Mode Tabs */}
      <div className='border-border/60 flex flex-wrap items-center gap-2 border-b pb-6'>
        {MODE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveMode(tab.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                isActive
                  ? 'bg-indigo-50 text-[#4b41e1] border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 border font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className='h-4 w-4' />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4-Column Search Form */}
      <form
        onSubmit={handleSearch}
        className='mt-6 grid grid-cols-1 items-end gap-4 md:grid-cols-4'
      >
        {/* Column 1: Location */}
        <div className='space-y-1.5'>
          <label
            htmlFor='search-location'
            className='text-foreground block text-xs font-semibold tracking-wider uppercase'
          >
            Location
          </label>
          <div className='relative flex items-center'>
            <MapPin className='text-muted-foreground absolute left-3.5 h-4 w-4' />
            <input
              id='search-location'
              type='text'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='Where do you want to work?'
              className='border-input bg-card text-foreground focus-visible:ring-indigo-600 h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none transition-all focus-visible:ring-2'
            />
          </div>
        </div>

        {/* Column 2: Date & Time */}
        <div className='space-y-1.5'>
          <label
            htmlFor='search-datetime'
            className='text-foreground block text-xs font-semibold tracking-wider uppercase'
          >
            Date &amp; Time
          </label>
          <div className='relative flex items-center'>
            <Calendar className='text-muted-foreground absolute left-3.5 h-4 w-4' />
            <input
              id='search-datetime'
              type='text'
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              placeholder='Select date & duration'
              className='border-input bg-card text-foreground focus-visible:ring-indigo-600 h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none transition-all focus-visible:ring-2'
            />
          </div>
        </div>

        {/* Column 3: Capacity */}
        <div className='space-y-1.5'>
          <label
            htmlFor='search-capacity'
            className='text-foreground block text-xs font-semibold tracking-wider uppercase'
          >
            Capacity
          </label>
          <div className='relative flex items-center'>
            <User className='text-muted-foreground absolute left-3.5 h-4 w-4' />
            <select
              id='search-capacity'
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className='border-input bg-card text-foreground focus-visible:ring-indigo-600 h-11 w-full cursor-pointer appearance-none rounded-lg border pl-10 pr-8 text-sm outline-none transition-all focus-visible:ring-2'
            >
              <option value='1 - 4 People'>1 - 4 People</option>
              <option value='5 - 12 People (Team)'>5 - 12 People (Team)</option>
              <option value='13 - 30 People (Department)'>13 - 30 People (Department)</option>
              <option value='30+ People (Full Floor)'>30+ People (Full Floor)</option>
            </select>
          </div>
        </div>

        {/* Column 4: Primary CTA */}
        <div>
          <Button
            type='submit'
            className='bg-[#4b41e1] hover:bg-[#4338CA] h-11 w-full cursor-pointer font-medium text-white shadow-md transition-all duration-150 active:scale-[0.98]'
          >
            <Search className='mr-2 h-4 w-4' />
            Find Available Spaces
          </Button>
        </div>
      </form>
    </div>
  );
}
