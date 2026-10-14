import React from 'react';
import {
  WifiOff,
  Volume2,
  Lock,
  CalendarX,
  Wrench,
  MapPin,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { DisputeCase } from '../data/mock-disputes';

interface DisputesTableProps {
  cases: DisputeCase[];
  selectedCaseId?: string;
  onSelectCase: (disputeCase: DisputeCase) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalRecordsCount: number;
}

function getCaseTypeIcon(type: DisputeCase['caseType']) {
  switch (type) {
    case 'Network Outage':
      return <WifiOff className='size-3 text-red-600' />;
    case 'Noise Disturbance':
      return <Volume2 className='size-3 text-muted-foreground' />;
    case 'Access / NFC Lockout':
      return <Lock className='size-3 text-amber-600' />;
    case 'Booking Conflict':
      return <CalendarX className='size-3 text-blue-600' />;
    case 'Property Damage':
      return <Wrench className='size-3 text-orange-600' />;
    default:
      return <MapPin className='size-3 text-muted-foreground' />;
  }
}

export function DisputesTable({
  cases,
  selectedCaseId,
  onSelectCase,
  page,
  onPageChange,
  pageSize,
  totalRecordsCount
}: DisputesTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalRecordsCount / pageSize));
  const pagedCases = cases.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className='bg-card text-card-foreground rounded-lg border border-border shadow-sm overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse'>
          <thead>
            <tr className='bg-muted/60 h-9 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
              <th scope='col' className='px-4 w-24'>Case ID</th>
              <th scope='col' className='px-4'>Type</th>
              <th scope='col' className='px-4'>Reporter</th>
              <th scope='col' className='px-4'>Related Workspace</th>
              <th scope='col' className='px-3'>Severity</th>
              <th scope='col' className='px-3'>Status</th>
              <th scope='col' className='px-4'>Submitted At</th>
              <th scope='col' className='px-4 text-right'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border text-xs'>
            {pagedCases.length === 0 ? (
              <tr>
                <td colSpan={8} className='py-8 text-center text-muted-foreground'>
                  No dispute cases match your filter criteria.
                </td>
              </tr>
            ) : (
              pagedCases.map((c) => {
                const isSelected = selectedCaseId === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className={`h-12 transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Case ID */}
                    <td className='px-4 font-mono font-bold text-foreground'>
                      <span className={isSelected ? 'text-primary' : 'text-muted-foreground'}>
                        {c.caseNumber}
                      </span>
                    </td>

                    {/* Type Badge */}
                    <td className='px-4'>
                      <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-muted border border-border'>
                        {getCaseTypeIcon(c.caseType)}
                        <span className='text-foreground'>{c.caseType}</span>
                      </span>
                    </td>

                    {/* Reporter */}
                    <td className='px-4'>
                      <div className='flex items-center gap-2'>
                        <img
                          src={c.reporterAvatarUrl}
                          alt={c.reporterName}
                          className='size-6 rounded-full object-cover border border-border shrink-0'
                        />
                        <div className='min-w-0'>
                          <p className='font-semibold text-foreground leading-tight truncate'>
                            {c.reporterName}
                          </p>
                          <p className='text-[10px] text-muted-foreground leading-tight truncate'>
                            {c.reporterEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Related Workspace */}
                    <td className='px-4'>
                      <div className='flex items-center gap-1.5 max-w-[200px]'>
                        <MapPin className='size-3 text-muted-foreground shrink-0' />
                        <span className='font-medium text-foreground truncate' title={c.relatedWorkspace}>
                          {c.relatedWorkspace}
                        </span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className='px-3'>
                      {c.severity === 'critical' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'>
                          <span className='size-1.5 rounded-full bg-red-500' />
                          {c.severityLabel}
                        </span>
                      )}
                      {c.severity === 'high' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'>
                          <span className='size-1.5 rounded-full bg-amber-500' />
                          {c.severityLabel}
                        </span>
                      )}
                      {c.severity === 'normal' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border'>
                          {c.severityLabel}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className='px-3'>
                      {c.status === 'under_investigation' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'>
                          <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
                          {c.statusLabel}
                        </span>
                      )}
                      {c.status === 'under_review' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30'>
                          {c.statusLabel}
                        </span>
                      )}
                      {c.status === 'evidence_attached' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'>
                          {c.statusLabel}
                        </span>
                      )}
                      {c.status === 'open' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'>
                          {c.statusLabel}
                        </span>
                      )}
                      {c.status === 'resolved' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'>
                          <span className='size-1.5 rounded-full bg-emerald-500' />
                          {c.statusLabel}
                        </span>
                      )}
                      {c.status === 'dismissed' && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border'>
                          {c.statusLabel}
                        </span>
                      )}
                    </td>

                    {/* Submitted At */}
                    <td className='px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap'>
                      {c.relativeTime} <span className='text-muted-foreground/60'>• Jan 25</span>
                    </td>

                    {/* Action */}
                    <td className='px-4 text-right'>
                      {isSelected ? (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className='inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold text-[11px] shadow-xs'
                        >
                          <span>Investigating</span>
                          <ArrowRight className='size-3' />
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className='inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border border-input text-muted-foreground hover:text-foreground hover:bg-muted font-medium text-[11px] transition-colors'
                        >
                          <span>Investigate</span>
                          <ChevronRight className='size-3' />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className='flex flex-wrap items-center justify-between px-4 py-3 bg-muted/40 border-t border-border text-xs text-muted-foreground gap-3'>
        <p>
          Showing <span className='font-semibold text-foreground'>{cases.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
          <span className='font-semibold text-foreground'>
            {Math.min(page * pageSize, cases.length)}
          </span>{' '}
          of <span className='font-semibold text-foreground'>{totalRecordsCount}</span> dispute records
        </p>

        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className='px-2 py-1 rounded border border-input bg-background hover:bg-muted disabled:opacity-40 transition-colors'
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type='button'
              onClick={() => onPageChange(p)}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                p === page
                  ? 'border-primary bg-primary text-primary-foreground font-bold'
                  : 'border-input bg-background hover:bg-muted text-foreground'
              }`}
            >
              {p}
            </button>
          ))}

          {totalPages > 5 && <span className='px-1 text-muted-foreground'>…</span>}

          <button
            type='button'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className='px-2 py-1 rounded border border-input bg-background hover:bg-muted disabled:opacity-40 transition-colors'
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
