import React, { useState } from 'react';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { WorkspaceList } from './workspace-list';
import { WorkspaceMap } from './workspace-map';
import type { PublicWorkspaceSummary } from '../api/types';

export function WorkspacesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [workspaces, setWorkspaces] = useState<PublicWorkspaceSummary[]>([]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
      <WorkspaceHeader />
      <WorkspaceFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        totalCount={totalCount}
      />
      
      {/* Main Body: 50/50 Split View */}
      <main className="flex w-full flex-1 overflow-hidden">
        <WorkspaceList
          search={search}
          category={category}
          onTotalCountChange={setTotalCount}
          onWorkspacesLoaded={setWorkspaces}
        />
        <WorkspaceMap workspaces={workspaces} />
      </main>
    </div>
  );
}
