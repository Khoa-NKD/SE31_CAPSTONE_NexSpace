import React, { useState } from 'react';
import { Copy, ArrowRight, Lock, Check } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MOCK_RECENT_DISPUTES } from '../data/mock-reports-overview';

export function ReportsRecentQueue() {
  const [filterSegment, setFilterSegment] = useState<'all' | 'urgent' | 'medium'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Copied ${text} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = MOCK_RECENT_DISPUTES.filter((item) => {
    if (filterSegment === 'urgent') return item.severity === 'URGENT';
    if (filterSegment === 'medium') return item.severity === 'MEDIUM' || item.severity === 'HIGH';
    return true;
  });

  return (
    <section className='bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden mb-12' id='queue-table'>
      {/* Table Header & Segment Tabs */}
      <div className='p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card'>
        <div>
          <div className='flex items-center gap-3'>
            <h2 className='text-base font-bold text-foreground'>
              Recent Dispute Submissions
            </h2>
            <span className='px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold border border-border'>
              5 Awaiting Review
            </span>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Showing top unassigned and recently escalated disputes awaiting action.
          </p>
        </div>

        {/* Filter Segment Tabs */}
        <div className='flex items-center p-1 rounded-lg bg-muted/60 border border-border self-start sm:self-auto text-xs'>
          <button
            type='button'
            onClick={() => setFilterSegment('all')}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              filterSegment === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All (5)
          </button>
          <button
            type='button'
            onClick={() => setFilterSegment('urgent')}
            className={`px-3 py-1 rounded transition-colors ${
              filterSegment === 'urgent'
                ? 'bg-background text-red-600 dark:text-red-400 font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Urgent Only (2)
          </button>
          <button
            type='button'
            onClick={() => setFilterSegment('medium')}
            className={`px-3 py-1 rounded transition-colors ${
              filterSegment === 'medium'
                ? 'bg-background text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Medium (3)
          </button>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse'>
          <thead>
            <tr className='bg-muted/50 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider h-9 border-b border-border'>
              <th scope='col' className='py-2.5 px-4'>CASE ID</th>
              <th scope='col' className='py-2.5 px-4'>REPORTED SUBJECT & HUB</th>
              <th scope='col' className='py-2.5 px-4'>REPORTER</th>
              <th scope='col' className='py-2.5 px-4'>SEVERITY</th>
              <th scope='col' className='py-2.5 px-4'>LOGGED</th>
              <th scope='col' className='py-2.5 px-4'>TRIAGE STATUS</th>
              <th scope='col' className='py-2.5 px-4 text-right'>ACTION</th>
            </tr>
          </thead>
          <tbody className='divide-y border-border text-xs'>
            {filteredItems.map((item) => (
              <tr key={item.id} className='hover:bg-muted/40 transition-colors'>
                {/* Case ID */}
                <td className='py-3.5 px-4'>
                  <div className='flex items-center gap-1.5'>
                    <span className='font-mono font-bold text-foreground text-[13px]'>
                      {item.id}
                    </span>
                    <button
                      type='button'
                      onClick={(e) => handleCopy(item.id, e)}
                      className='text-muted-foreground hover:text-foreground p-0.5 rounded'
                      title='Copy Case ID'
                      aria-label={`Copy Case ID ${item.id}`}
                    >
                      {copiedId === item.id ? (
                        <Check className='size-3 text-emerald-500' />
                      ) : (
                        <Copy className='size-3' />
                      )}
                    </button>
                  </div>
                </td>

                {/* Subject & Hub */}
                <td className='py-3.5 px-4'>
                  <div className='font-bold text-foreground text-[13.5px]'>{item.subject}</div>
                  <div className='text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5'>
                    <span>{item.hubLocation}</span>
                  </div>
                </td>

                {/* Reporter */}
                <td className='py-3.5 px-4'>
                  <div className='flex items-center gap-2.5'>
                    <img
                      src={item.reporterAvatarUrl}
                      alt={item.reporterName}
                      className='size-7 rounded-full object-cover border border-border shrink-0'
                    />
                    <div>
                      <div className='font-medium text-foreground text-[12px]'>
                        {item.reporterName}
                      </div>
                      <div className='text-[10px] text-muted-foreground'>{item.reporterRole}</div>
                    </div>
                  </div>
                </td>

                {/* Severity */}
                <td className='py-3.5 px-4'>
                  {item.severity === 'URGENT' && (
                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 text-[11px] font-bold'>
                      <span className='size-1.5 rounded-full bg-red-500' />
                      URGENT
                    </span>
                  )}
                  {item.severity === 'HIGH' && (
                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold'>
                      <span className='size-1.5 rounded-full bg-amber-500' />
                      HIGH
                    </span>
                  )}
                  {item.severity === 'MEDIUM' && (
                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 text-[11px] font-bold'>
                      <span className='size-1.5 rounded-full bg-slate-400' />
                      MEDIUM
                    </span>
                  )}
                </td>

                {/* Logged */}
                <td className='py-3.5 px-4 text-muted-foreground font-mono text-[12px]'>
                  {item.loggedTimeAgo}
                </td>

                {/* Triage Status */}
                <td className='py-3.5 px-4'>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      item.triageBadgeColor === 'amber'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        item.triageBadgeColor === 'amber' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                    />
                    {item.triageStatus}
                  </span>
                </td>

                {/* Action Link to A12 */}
                <td className='py-3.5 px-4 text-right'>
                  <Link
                    to='/dashboard/admin/disputes'
                    search={{ caseId: item.caseCode }}
                    className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 text-xs font-semibold transition-colors'
                  >
                    <span>Investigate in A12</span>
                    <ArrowRight className='size-3.5' />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Bottom Anchor Bar Linking to A12 */}
      <div className='p-4 bg-muted/40 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <Lock className='size-4 text-emerald-600' />
          <span>
            Showing 5 active priority cases • All cases cryptographically signed to immutable incident audit log
          </span>
        </div>

        <Button asChild variant='outline' size='sm' className='self-start sm:self-auto h-8 text-xs font-semibold'>
          <Link to='/dashboard/admin/disputes'>
            <span>View Full Queue (A12)</span>
            <ArrowRight className='size-3.5 ml-1.5' />
          </Link>
        </Button>
      </div>
    </section>
  );
}
