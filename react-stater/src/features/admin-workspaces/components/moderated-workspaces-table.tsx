import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { ModerationDecisionRecord } from '../data/mock-workspaces';
import { AuditLogDialog } from './audit-log-dialog';

interface ModeratedWorkspacesTableProps {
  records: ModerationDecisionRecord[];
}

export function ModeratedWorkspacesTable({ records }: ModeratedWorkspacesTableProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'suspended' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<ModerationDecisionRecord | null>(null);

  const filteredRecords = records.filter((rec) => {
    // Tab filter
    if (activeFilter === 'approved' && rec.actionStatus !== 'approved' && rec.actionStatus !== 'reactivated') return false;
    if (activeFilter === 'suspended' && rec.actionStatus !== 'suspended') return false;
    if (activeFilter === 'resolved' && rec.actionStatus !== 'resolved') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = rec.workspaceName.toLowerCase().includes(q);
      const matchOrg = rec.organizerLegalEntity.toLowerCase().includes(q);
      const matchZone = rec.metroZone.toLowerCase().includes(q);
      const matchId = rec.workspaceId.toLowerCase().includes(q);
      return matchName || matchOrg || matchZone || matchId;
    }
    return true;
  });

  return (
    <>
      <section aria-label='Recently Moderated Workspaces' className='bg-card rounded-xl border border-border shadow-2xs p-6'>
        {/* Table Header & Controls */}
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border'>
          <div>
            <h2 className='text-base font-bold font-heading text-foreground'>
              Recent Moderation Decisions &amp; Lifecycle Events
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Last 24 hours of administrative state transitions, approvals, and compliance notices.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            {/* Search Input */}
            <div className='relative w-64'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' aria-hidden='true' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search workspace or zone...'
                aria-label='Search workspace or zone'
                className='w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'
              />
            </div>

            {/* Filter Pills */}
            <div className='flex items-center gap-1.5 bg-muted/70 p-1 rounded-lg border border-border' role='tablist'>
              <button
                type='button'
                role='tab'
                aria-selected={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeFilter === 'all'
                    ? 'bg-card text-foreground shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All (28)
              </button>
              <button
                type='button'
                role='tab'
                aria-selected={activeFilter === 'approved'}
                onClick={() => setActiveFilter('approved')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeFilter === 'approved'
                    ? 'bg-card text-foreground shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Approved (24)
              </button>
              <button
                type='button'
                role='tab'
                aria-selected={activeFilter === 'suspended'}
                onClick={() => setActiveFilter('suspended')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeFilter === 'suspended'
                    ? 'bg-card text-rose-600 dark:text-rose-400 shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Suspended (3)
              </button>
              <button
                type='button'
                role='tab'
                aria-selected={activeFilter === 'resolved'}
                onClick={() => setActiveFilter('resolved')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeFilter === 'resolved'
                    ? 'bg-card text-foreground shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Flags Resolved (1)
              </button>
            </div>
          </div>
        </div>

        {/* The Dense Data Grid */}
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='border-b border-border text-muted-foreground text-[11px] font-semibold tracking-wider uppercase bg-muted/40 h-9'>
                <th scope='col' className='py-2.5 px-4'>Workspace Name &amp; Unit</th>
                <th scope='col' className='py-2.5 px-4'>Organizer / Legal Entity</th>
                <th scope='col' className='py-2.5 px-4'>Moderation Action</th>
                <th scope='col' className='py-2.5 px-4'>Admin Handler</th>
                <th scope='col' className='py-2.5 px-4 text-right'>Timestamp</th>
                <th scope='col' className='py-2.5 px-4 text-right'>Audit Trail</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border text-xs'>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className='py-8 text-center text-muted-foreground'>
                    No moderation records match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`transition-colors ${
                      rec.actionStatus === 'suspended'
                        ? 'hover:bg-rose-50/30 dark:hover:bg-rose-950/20 bg-rose-50/10'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <td className='py-3.5 px-4' aria-label={rec.workspaceName}>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center font-bold text-xs shrink-0 ${
                            rec.actionStatus === 'suspended'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {rec.shortCode}
                        </div>
                        <div>
                          <div className='font-bold font-heading text-foreground'>
                            {rec.workspaceName}
                          </div>
                          <div className='font-mono text-[11px] text-muted-foreground'>
                            ID: {rec.workspaceId} • {rec.metroZone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='py-3.5 px-4 font-medium text-foreground'>
                      {rec.organizerLegalEntity}
                    </td>
                    <td className='py-3.5 px-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rec.actionStatus === 'approved' || rec.actionStatus === 'reactivated'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : rec.actionStatus === 'suspended'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.actionStatus === 'approved' || rec.actionStatus === 'reactivated'
                              ? 'bg-emerald-500'
                              : rec.actionStatus === 'suspended'
                              ? 'bg-rose-500'
                              : 'bg-indigo-500'
                          }`}
                          aria-hidden='true'
                        ></span>
                        {rec.action}
                      </span>
                    </td>
                    <td className='py-3.5 px-4' aria-label={rec.adminHandler.name}>
                      <div className='flex items-center gap-2'>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rec.adminHandler.avatarBgClass}`}>
                          {rec.adminHandler.initials}
                        </div>
                        <span className='font-medium text-foreground'>{rec.adminHandler.name}</span>
                      </div>
                    </td>
                    <td className='py-3.5 px-4 text-right font-mono text-muted-foreground'>
                      {rec.timestamp}
                    </td>
                    <td className='py-3.5 px-4 text-right'>
                      <button
                        type='button'
                        onClick={() => setSelectedRecord(rec)}
                        className='text-xs text-primary hover:text-indigo-700 font-semibold transition-colors'
                      >
                        Inspect Log →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className='pt-4 mt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground'>
          <span>Showing <strong>{filteredRecords.length}</strong> of <strong>28</strong> recent administrative actions</span>
          <span className='text-muted-foreground italic flex items-center gap-1'>
            <span>Compliance history audit trails logged to SecOps partition</span>
          </span>
        </div>
      </section>

      {/* Audit Log Modal */}
      <AuditLogDialog
        record={selectedRecord}
        isOpen={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
      />
    </>
  );
}
