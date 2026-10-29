import React from 'react';
import { ArrowRight, Building, Building2, Store, Landmark, Layers } from 'lucide-react';
import { VerificationApplication } from '../data/mock-organizers';

interface QueueRequestsTableProps {
  applications: VerificationApplication[];
  selectedAppId: string | null;
  onSelectApplication: (app: VerificationApplication) => void;
}

function getTradeIcon(tradeName: string) {
  if (tradeName.includes('Hub') || tradeName.includes('Central')) return <Building2 className='size-4' aria-hidden='true' />;
  if (tradeName.includes('Spaces') || tradeName.includes('Premium')) return <Landmark className='size-4' aria-hidden='true' />;
  if (tradeName.includes('Dreamplex')) return <Store className='size-4' aria-hidden='true' />;
  if (tradeName.includes('CirCO')) return <Layers className='size-4' aria-hidden='true' />;
  return <Building className='size-4' aria-hidden='true' />;
}

export function QueueRequestsTable({
  applications,
  selectedAppId,
  onSelectApplication
}: QueueRequestsTableProps) {
  return (
    <div className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden mb-8'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse'>
          <thead>
            <tr className='bg-muted/60 border-b border-border h-9'>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Application ID
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Organizer Legal Name &amp; Trade
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Tax Code / MST
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Submitted At
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Documents
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Status
              </th>
              <th scope='col' className='py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right'>
                Action
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border text-xs'>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className='text-center py-12 text-muted-foreground'>
                  No verification applications match your current filter criteria.
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                const isSelected = selectedAppId === app.id;
                return (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    tabIndex={0}
                    aria-label={`Select application ${app.id}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectApplication(app);
                      }
                    }}
                    className={`cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-l-primary'
                        : 'hover:bg-muted/40 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Application ID */}
                    <td className='py-3 px-4 font-mono font-bold text-primary'>
                      #{app.id}
                    </td>

                    {/* Legal Name & Trade */}
                    <td className='py-3 px-4' aria-label={app.legalName}>
                      <div className='flex items-center gap-2.5'>
                        <div className='w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                          {getTradeIcon(app.tradeName)}
                        </div>
                        <div>
                          <div className='font-bold font-heading text-foreground leading-tight'>
                            {app.legalName}
                          </div>
                          <div className='text-[11px] text-muted-foreground'>
                            Trade: {app.tradeName} • {app.city}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tax Code */}
                    <td className='py-3 px-4 font-mono text-foreground'>
                      {app.taxCode}
                    </td>

                    {/* Submitted At */}
                    <td className='py-3 px-4'>
                      <div className='text-foreground'>{app.submittedAtFormatted}</div>
                      <div className='text-[11px] text-muted-foreground'>{app.submittedAtRelative}</div>
                    </td>

                    {/* Documents Uploaded */}
                    <td className='py-3 px-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          app.documentsUploadedCount === app.totalDocumentsCount
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            app.documentsUploadedCount === app.totalDocumentsCount
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                          aria-hidden='true'
                        ></span>
                        {app.documentsUploadedCount}/{app.totalDocumentsCount} Uploaded
                      </span>
                    </td>

                    {/* Status */}
                    <td className='py-3 px-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          app.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : app.status === 'action_required' || app.status === 'rejected'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            app.status === 'approved'
                              ? 'bg-emerald-500'
                              : app.status === 'action_required' || app.status === 'rejected'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                          aria-hidden='true'
                        ></span>
                        {app.statusLabel}
                      </span>
                    </td>

                    {/* Action */}
                    <td className='py-3 px-4 text-right'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        aria-label={`Inspect application ${app.id}`}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-2xs hover:bg-primary/90'
                            : 'bg-card border border-border text-foreground hover:bg-muted/70 shadow-2xs'
                        }`}
                      >
                        <span>Inspect</span>
                        <ArrowRight className='size-3' aria-hidden='true' />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
