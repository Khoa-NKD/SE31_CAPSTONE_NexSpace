import React from 'react';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { WorkspaceList } from './workspace-list';
import { WorkspaceMap } from './workspace-map';

export function WorkspacesPage() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
      <WorkspaceHeader />
      <WorkspaceFilterBar />
      
      {/* Main Body: 50/50 Split View */}
      <main className="flex w-full flex-1 overflow-hidden">
        <WorkspaceList />
        <WorkspaceMap />
      </main>
    </div>
  );
}

