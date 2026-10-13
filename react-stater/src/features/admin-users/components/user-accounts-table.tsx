import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AdminUserRecord, PLATFORM_TOTAL_ACCOUNTS } from '../data/mock-users';

interface UserAccountsTableProps {
  users: AdminUserRecord[];
  selectedUserId?: string;
  onSelectUser: (user: AdminUserRecord) => void;
}

export function UserAccountsTable({
  users,
  selectedUserId,
  onSelectUser
}: UserAccountsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Card className='rounded-xl border border-border/80 overflow-hidden shadow-xs bg-card'>
      {/* Table Stats Header Toolbar */}
      <div className='px-4 py-3 bg-muted/60 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          <span>
            Showing <strong className='text-foreground font-semibold'>{users.length}</strong> sample records
            (simulated from {PLATFORM_TOTAL_ACCOUNTS.toLocaleString()} total platform accounts)
          </span>
          <span className='inline-block size-1 rounded-full bg-border' />
          <button
            type='button'
            onClick={() => {
              setSelectedIds(users.map((u) => u.id));
              toast.info('Batch Selection Simulated', {
                description: `All sample records selected for bulk operations.`
              });
            }}
            className='text-primary font-semibold hover:underline cursor-pointer'
          >
            Select sample set
          </button>
        </div>

        {/* Pagination indicators */}
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label='Previous page'
          >
            <ChevronLeft className='size-4' aria-hidden='true' />
          </Button>

          <span className='font-mono text-xs font-semibold text-foreground px-2'>
            Page {currentPage} of 1,842
          </span>

          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            onClick={() => {
              setCurrentPage((p) => p + 1);
              toast.info('Pagination Note', {
                description: 'Page advance simulated across the sample dataset.'
              });
            }}
            aria-label='Next page'
          >
            <ChevronRight className='size-4' aria-hidden='true' />
          </Button>
        </div>
      </div>

      {/* Table Viewport */}
      <div className='overflow-x-auto min-w-0'>
        <table className='w-full min-w-[860px] text-left border-collapse text-xs'>
          <thead>
            <tr className='bg-muted/80 h-9 border-b border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-wider select-none'>
              <th className='w-10 px-3 text-center'>
                <Checkbox
                  checked={selectedIds.length === users.length && users.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label='Select all users on current page'
                />
              </th>
              <th className='w-28 px-3 py-2 font-semibold'>User ID</th>
              <th className='min-w-[200px] px-3 py-2 font-semibold'>Full Name &amp; Profile</th>
              <th className='min-w-[160px] px-3 py-2 font-semibold'>Email Address</th>
              <th className='w-32 px-3 py-2 font-semibold'>Role</th>
              <th className='w-32 px-3 py-2 font-semibold'>Account Status</th>
              <th className='w-32 px-3 py-2 font-semibold'>Verification</th>
              <th className='w-36 px-3 py-2 font-semibold'>Registered</th>
            </tr>
          </thead>

          <tbody className='divide-y divide-border/60'>
            {users.map((user) => {
              const isSelected = selectedUserId === user.id;
              const isChecked = selectedIds.includes(user.id);
              const isLocked = user.status === 'Locked';
              const isActive = user.status === 'Active';

              return (
                <tr
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectUser(user);
                    }
                  }}
                  tabIndex={0}
                  className={`cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-l-2 border-primary'
                      : isChecked
                      ? 'bg-muted/40 hover:bg-muted/50'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <td
                    className='w-10 px-3 text-center'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRow(user.id);
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked
                            ? [...prev.filter((i) => i !== user.id), user.id]
                            : prev.filter((i) => i !== user.id)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${user.name}`}
                    />
                  </td>

                  <td className='px-3 py-3'>
                    <span className='font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground text-[11px] border border-border/80'>
                      {user.id}
                    </span>
                  </td>

                  <td className='px-3 py-3' aria-label={user.name}>
                    <div className='flex items-center gap-2.5'>
                      <div className='size-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0'>
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <div className='min-w-0'>
                        <span className='font-medium text-foreground block truncate leading-tight'>
                          {user.name}
                        </span>
                        <span className='text-[10px] text-muted-foreground block truncate'>
                          {user.company}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className='px-3 py-3 font-mono text-muted-foreground text-[11px]'>
                    {user.email}
                  </td>

                  <td className='px-3 py-3'>
                    <Badge
                      variant='outline'
                      className={`text-[11px] font-semibold ${
                        user.role === 'Organizer'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : user.role === 'Administrator'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {user.role}
                    </Badge>
                  </td>

                  <td className='px-3 py-3'>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : isLocked
                          ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isActive ? 'bg-emerald-500' : isLocked ? 'bg-red-500' : 'bg-slate-400'
                        }`}
                      />
                      {user.status}
                    </span>
                  </td>

                  <td className='px-3 py-3'>
                    {user.kycStatus === 'Verified KYC' ? (
                      <span className='inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium'>
                        <CheckCircle2 className='size-3.5 text-emerald-600' />
                        <span>Verified</span>
                      </span>
                    ) : user.kycStatus === 'Pending KYC' ? (
                      <span className='inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium'>
                        <Clock className='size-3.5 text-amber-500' />
                        <span>KYC Pending</span>
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1 text-muted-foreground font-medium'>
                        <HelpCircle className='size-3.5 text-slate-400' />
                        <span>Unverified</span>
                      </span>
                    )}
                  </td>

                  <td className='px-3 py-3 text-muted-foreground'>
                    <span className='block text-foreground font-medium'>{user.registeredDate}</span>
                    <span className='text-[10px] font-mono'>{user.registeredTimeUtc}</span>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={8} className='py-8 text-center text-muted-foreground'>
                  No accounts matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className='px-4 py-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2'>
        <div>
          <span>Showing {users.length} sample accounts of {PLATFORM_TOTAL_ACCOUNTS.toLocaleString()} total platform records</span>
        </div>
        <div className='flex items-center gap-1 font-mono text-[11px]'>
          <span>Dataset: Deterministic Sample</span>
          <span>•</span>
          <span>Filter State: Local</span>
        </div>
      </div>
    </Card>
  );
}
