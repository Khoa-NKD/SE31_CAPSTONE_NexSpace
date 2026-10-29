import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Building2, ArrowRight } from 'lucide-react';
import { MOCK_RECENT_OVERVIEW_SUBMISSIONS } from '../data/mock-organizers';

export function RecentSubmissionsTable() {
  const [activeTab, setActiveTab] = useState<'all' | 'initial' | 'resubmission'>('all');

  const filteredItems = MOCK_RECENT_OVERVIEW_SUBMISSIONS.filter((item) => {
    if (activeTab === 'initial') return item.isInitialReview;
    if (activeTab === 'resubmission') return !item.isInitialReview;
    return true;
  });

  return (
    <section aria-label='Recent Verification Submissions' className='bg-card rounded-xl border border-border shadow-2xs p-6 flex flex-col gap-4'>
      {/* Table Header & Filter Tabs */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2'>
        <div>
          <h2 className='text-base font-bold font-heading text-foreground'>
            Recent Submissions Awaiting Action
          </h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Overview only. Approvals, rejections, and legal doc audit must be executed inside the{' '}
            <Link to='/dashboard/admin/organizers/queue' className='text-primary font-semibold hover:underline'>
              Verification Queue (Screen A05)
            </Link>
            .
          </p>
        </div>

        {/* Filter Pills Segment */}
        <div className='flex items-center gap-1.5 bg-muted/70 p-1 rounded-lg border border-border self-start md:self-auto' role='tablist'>
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All (17)
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === 'initial'}
            onClick={() => setActiveTab('initial')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'initial'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Initial Review (12)
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === 'resubmission'}
            onClick={() => setActiveTab('resubmission')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'resubmission'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Re-submission (5)
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className='overflow-x-auto border border-border rounded-lg'>
        <table className='w-full text-left border-collapse'>
          <thead>
            <tr className='bg-muted/60 border-b border-border h-9'>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                ORGANIZER &amp; LEGAL ENTITY
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                TAX ID / REGISTRATION
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                SUBMITTED TIME
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                CURRENT STATE
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right'>
                ACTION
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border text-xs'>
            {filteredItems.map((item) => (
              <tr key={item.appId} className='hover:bg-muted/40 transition-colors h-12'>
                <td className='py-3 px-4' aria-label={item.organizerName}>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0'>
                      <Building2 className='size-4' aria-hidden='true' />
                    </div>
                    <div>
                      <div className='font-bold font-heading text-foreground leading-tight'>
                        {item.organizerName}
                      </div>
                      <div className='text-[11px] text-muted-foreground'>
                        {item.legalEntity}
                      </div>
                    </div>
                  </div>
                </td>
                <td className='py-3 px-4'>
                  <span className='font-mono text-[11px] font-medium text-foreground bg-muted px-2 py-0.5 rounded border border-border'>
                    {item.taxCode}
                  </span>
                </td>
                <td className='py-3 px-4'>
                  <div className='font-medium text-foreground'>{item.submittedRelative}</div>
                  <div className='text-[10px] text-muted-foreground'>{item.submittedExact}</div>
                </td>
                <td className='py-3 px-4'>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.statusVariant === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.statusVariant === 'pending' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      aria-hidden='true'
                    ></span>
                    {item.status}
                  </span>
                </td>
                <td className='py-3 px-4 text-right'>
                  <Link
                    to='/dashboard/admin/organizers/queue'
                    search={{ appId: item.appId }}
                    className='inline-flex items-center gap-1 text-primary hover:text-indigo-700 font-semibold transition-colors group'
                  >
                    <span>Review in Queue</span>
                    <ArrowRight className='size-3.5 group-hover:translate-x-0.5 transition-transform' aria-hidden='true' />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
