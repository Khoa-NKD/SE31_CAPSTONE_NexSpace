import React from 'react';
import { ChevronDown } from 'lucide-react';
import { sampleWorkspaces } from '../constants/sample-data';
import { WorkspaceCard } from './workspace-card';

export function WorkspaceList() {
  return (
    <section className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-background p-6 lg:w-1/2 lg:p-8 [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
      {/* List Meta Header with sorting */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            24 workspaces available in District 1
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Instant booking enabled for enterprise & freelance professionals
          </p>
        </div>
        
        {/* Sorting Menu */}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Sort by:</span>
          <div className="relative">
            <select className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm font-semibold text-foreground shadow-sm transition-all cursor-pointer hover:border-border/80 focus:border-[#4b41e1] focus:ring-1 focus:ring-[#4b41e1]">
              <option defaultValue="recommended">Recommended</option>
              <option value="lowest">Lowest Price</option>
              <option value="highest">Highest Rated</option>
              <option value="fastest">Fastest WiFi</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          </div>
        </div>
      </div>

      {/* Cards */}
      {sampleWorkspaces.map((workspace, index) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          isActive={index === 0} // Make the first one active for demonstration
        />
      ))}

      {/* Pagination / Footer Info in Feed */}
      <div className="py-4 text-center text-xs text-muted-foreground">
        <span>Showing 4 of 24 verified locations in District 1</span>
      </div>
    </section>
  );
}

