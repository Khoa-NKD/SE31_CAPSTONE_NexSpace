import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Search,
  Lock,
  HelpCircle,
  Eye,
  FileEdit,
  Upload,
  CalendarPlus,
  CalendarX,
  Download,
  CreditCard,
  CheckCircle,
  Flag,
  UserX,
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  rolePermissionsQueryOptions,
  useUpdateRolePermissionsMutation,
  type PermissionDefinition
} from '../api';
import { DockedSaveBar } from './docked-save-bar';

function getPermissionIcon(iconName: string) {
  switch (iconName) {
    case 'eye':
      return <Eye className='size-3.5 text-muted-foreground' />;
    case 'fileEdit':
      return <FileEdit className='size-3.5 text-muted-foreground' />;
    case 'upload':
      return <Upload className='size-3.5 text-muted-foreground' />;
    case 'calendarPlus':
      return <CalendarPlus className='size-3.5 text-muted-foreground' />;
    case 'calendarX':
      return <CalendarX className='size-3.5 text-muted-foreground' />;
    case 'download':
      return <Download className='size-3.5 text-muted-foreground' />;
    case 'creditCard':
      return <CreditCard className='size-3.5 text-muted-foreground' />;
    case 'checkCircle':
      return <CheckCircle className='size-3.5 text-muted-foreground' />;
    case 'flag':
      return <Flag className='size-3.5 text-muted-foreground' />;
    case 'userX':
      return <UserX className='size-3.5 text-muted-foreground' />;
    case 'shieldAlert':
      return <ShieldAlert className='size-3.5 text-muted-foreground' />;
    default:
      return <CheckCircle className='size-3.5 text-muted-foreground' />;
  }
}

/**
 * Fixed permission governance constraints.
 * Permanently immutable permission states according to NexSpace tenant boundaries.
 */
const FIXED_PERMISSION_CONSTRAINTS: Record<
  string,
  {
    customer?: { disabled: boolean; reason: string };
    organizer?: { disabled: boolean; reason: string };
  }
> = {
  'workspace:create_draft': {
    customer: {
      disabled: true,
      reason: 'Customer role cannot receive workspace authoring rights (tenant role segregation).'
    }
  },
  'workspace:publish': {
    customer: {
      disabled: true,
      reason: 'Only verified space organizers can publish workspace listings.'
    }
  },
  'booking:create': {
    organizer: {
      disabled: true,
      reason: 'Organizer role operates venues and does not initiate client bookings in this matrix.'
    }
  },
  'financial:export_ledger': {
    customer: {
      disabled: true,
      reason: 'Financial ledger export is restricted to space organizers and finance administrators.'
    }
  },
  'financial:payout_request': {
    customer: {
      disabled: true,
      reason: 'Bank payout requests are restricted to verified space organizers.'
    }
  },
  'refund:approve': {
    customer: {
      disabled: true,
      reason: 'Customers cannot approve their own refund disbursements.'
    }
  },
  'moderation:ban_user': {
    customer: {
      disabled: true,
      reason: 'Emergency user suspension is restricted to root SecOps administrators.'
    },
    organizer: {
      disabled: true,
      reason: 'Emergency user suspension is restricted to root SecOps administrators.'
    }
  },
  'audit_log:export': {
    customer: {
      disabled: true,
      reason: 'Immutable SOC2 audit log export is restricted to platform governance.'
    },
    organizer: {
      disabled: true,
      reason: 'Immutable SOC2 audit log export is restricted to platform governance.'
    }
  }
};

export function RolePermissionMatrix() {
  const {
    data: serverPermissions,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(rolePermissionsQueryOptions());

  const updateMutation = useUpdateRolePermissionsMutation();

  const [localOverrides, setLocalOverrides] = useState<
    Record<string, { customer?: boolean; organizer?: boolean }>
  >({});
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModifiedOnly, setShowModifiedOnly] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Effective permissions merged with local session overrides
  const permissions = useMemo<PermissionDefinition[]>(() => {
    if (!serverPermissions) return [];
    return serverPermissions.map((perm) => {
      const ov = localOverrides[perm.key];
      if (!ov) return perm;
      return {
        ...perm,
        customer: ov.customer !== undefined ? ov.customer : perm.customer,
        organizer: ov.organizer !== undefined ? ov.organizer : perm.organizer
      };
    });
  }, [serverPermissions, localOverrides]);

  // Compute modified permission keys
  const modifiedKeys = useMemo(() => {
    if (!serverPermissions) return [];
    return Object.keys(localOverrides).filter((key) => {
      const original = serverPermissions.find((p) => p.key === key);
      if (!original) return false;
      const ov = localOverrides[key];
      const customerDiff = ov.customer !== undefined && ov.customer !== original.customer;
      const organizerDiff = ov.organizer !== undefined && ov.organizer !== original.organizer;
      return customerDiff || organizerDiff;
    });
  }, [serverPermissions, localOverrides]);

  // Handle toggling customer / organizer permission
  const handleToggle = (key: string, role: 'customer' | 'organizer') => {
    if (!serverPermissions) return;

    // Check fixed governance constraints
    const constraint = FIXED_PERMISSION_CONSTRAINTS[key]?.[role];
    if (constraint?.disabled) {
      toast.error('Permission Fixed by Governance', {
        description: constraint.reason
      });
      return;
    }

    const original = serverPermissions.find((p) => p.key === key);
    if (!original) return;

    setLocalOverrides((prev) => {
      const currentVal =
        prev[key]?.[role] !== undefined ? prev[key][role] : original[role];
      const nextVal = !currentVal;

      const nextOverrides = {
        ...prev[key],
        [role]: nextVal
      };

      // Check if both roles match original server values
      const nextCustomer =
        role === 'customer' ? nextVal : (nextOverrides.customer ?? original.customer);
      const nextOrganizer =
        role === 'organizer' ? nextVal : (nextOverrides.organizer ?? original.organizer);

      if (nextCustomer === original.customer && nextOrganizer === original.organizer) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }

      return {
        ...prev,
        [key]: nextOverrides
      };
    });
  };

  // Discard changes
  const handleDiscard = () => {
    setLocalOverrides({});
    toast.info('Changes Discarded', {
      description: 'Reverted all modified role permissions back to previous state.'
    });
  };

  // Save changes via real HTTP mutation
  const handleSave = () => {
    if (!serverPermissions || modifiedKeys.length === 0) return;

    const payload = modifiedKeys.map((key) => {
      const original = serverPermissions.find((p) => p.key === key);
      const ov = localOverrides[key];
      return {
        key,
        customer: ov?.customer !== undefined ? ov.customer : original?.customer,
        organizer: ov?.organizer !== undefined ? ov.organizer : original?.organizer
      };
    });

    updateMutation.mutate(
      { permissions: payload, modifiedCount: modifiedKeys.length },
      {
        onSuccess: () => {
          setLocalOverrides({});
        }
      }
    );
  };

  // Filtered permission rows
  const filteredPermissions = useMemo(() => {
    return permissions.filter((perm) => {
      if (selectedModule !== 'all' && perm.module.toLowerCase() !== selectedModule.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesKey = perm.key.toLowerCase().includes(query);
        const matchesDesc = perm.description.toLowerCase().includes(query);
        if (!matchesKey && !matchesDesc) return false;
      }
      if (showModifiedOnly && !modifiedKeys.includes(perm.key)) {
        return false;
      }
      return true;
    });
  }, [permissions, selectedModule, searchQuery, showModifiedOnly, modifiedKeys]);

  return (
    <Card className='rounded-xl border border-border/80 shadow-xs flex flex-col overflow-hidden bg-card mb-8'>
      {/* Matrix Controls Toolbar */}
      <div className='p-4 sm:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card'>
        {/* Left: Filters & Search */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* Module Filter Select */}
          <div className='relative'>
            <label htmlFor='module-filter-select' className='sr-only'>
              Filter permissions by module
            </label>
            <select
              id='module-filter-select'
              aria-label='Filter permissions by module'
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className='h-9 pl-3 pr-8 rounded-lg bg-card border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer'
            >
              <option value='all'>All Modules (11)</option>
              <option value='workspaces'>Workspaces</option>
              <option value='bookings'>Bookings</option>
              <option value='financials'>Financials</option>
              <option value='moderation'>Moderation</option>
              <option value='governance'>Governance</option>
            </select>
          </div>

          {/* Search Input */}
          <div className='relative w-64'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Filter permission key...'
              className='h-9 pl-9 pr-3 text-xs bg-card'
            />
          </div>

          {/* Scope Tag Pill */}
          <div className='hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted text-muted-foreground text-xs border border-border'>
            <span>Scope: Platform Wide</span>
          </div>
        </div>

        {/* Right: View Toggles & Documentation */}
        <div className='flex items-center gap-4'>
          <label className='inline-flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground'>
            <Checkbox
              checked={showModifiedOnly}
              onCheckedChange={(checked) => setShowModifiedOnly(!!checked)}
            />
            <span className='font-medium text-foreground'>
              Show modified only ({modifiedKeys.length})
            </span>
          </label>

          <span className='h-4 w-px bg-border'></span>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowGuideModal(true)}
            className='inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/90 h-8 px-2'
          >
            <HelpCircle className='size-3.5' />
            <span>Role Definitions Guide</span>
          </Button>
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div className='overflow-x-auto min-w-0'>
        <table className='w-full min-w-[780px] border-collapse text-left'>
          <thead>
            <tr className='bg-muted/70 border-b border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-wider select-none'>
              <th className='py-3 px-6 w-[36%] min-w-[260px]' scope='col'>
                Permission Key &amp; Operational Scope
              </th>
              <th className='py-3 px-4 w-[16%] min-w-[130px]' scope='col'>
                Functional Module
              </th>
              <th className='py-3 px-4 w-[16%] min-w-[100px] text-center' scope='col' aria-label='Customer role'>
                <div className='flex flex-col items-center'>
                  <span className='text-foreground font-semibold'>Customer</span>
                  <span className='font-normal text-[10px] text-muted-foreground lowercase'>
                    nomad / client
                  </span>
                </div>
              </th>
              <th className='py-3 px-4 w-[16%] min-w-[140px] text-center' scope='col' aria-label='Organizer role'>
                <div className='flex flex-col items-center'>
                  <span className='text-foreground font-semibold'>Organizer</span>
                  <span className='font-normal text-[10px] text-muted-foreground lowercase'>
                    venue / landlord
                  </span>
                </div>
              </th>
              <th className='py-3 px-4 w-[16%] min-w-[150px] text-center bg-muted/90' scope='col' aria-label='Administrator role'>
                <div className='flex flex-col items-center'>
                  <span className='text-foreground font-semibold inline-flex items-center gap-1'>
                    <Lock className='size-3 text-muted-foreground' />
                    <span>Administrator</span>
                  </span>
                  <span className='font-normal text-[10px] text-muted-foreground lowercase'>
                    root secops tier
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className='divide-y divide-border/60 text-xs'>
            {isLoading && (
              <tr>
                <td colSpan={5} className='py-12 text-center text-muted-foreground'>
                  <div className='inline-flex items-center gap-2'>
                    <Loader2 className='size-4 animate-spin text-primary' />
                    <span>Loading role permissions matrix from API...</span>
                  </div>
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td colSpan={5} className='py-12 text-center'>
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <p className='text-xs text-destructive font-medium'>
                      Failed to load role permissions: {error instanceof Error ? error.message : 'Mock server error'}.
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      aria-label='Retry loading role permissions'
                      onClick={() => refetch()}
                      className='inline-flex items-center gap-1.5 h-8 text-xs'
                    >
                      <RefreshCw className='size-3.5' />
                      <span>Retry Connection</span>
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !isError && filteredPermissions.map((perm) => {
              const isModified = modifiedKeys.includes(perm.key);

              return (
                <tr
                  key={perm.key}
                  className={`hover:bg-muted/30 transition-colors ${
                    isModified ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                  }`}
                >
                  <td className='py-3.5 px-6'>
                    <div className='font-mono font-semibold text-foreground flex items-center gap-1.5'>
                      {getPermissionIcon(perm.icon)}
                      <span>{perm.name}</span>
                      {isModified && (
                        <span className='px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-sans font-medium'>
                          Modified
                        </span>
                      )}
                    </div>
                    <div className='text-muted-foreground text-[11px] mt-0.5 leading-relaxed'>
                      {perm.description}
                    </div>
                  </td>

                  <td className='py-3.5 px-4'>
                    <Badge variant='outline' className='text-[11px] font-medium'>
                      {perm.module}
                    </Badge>
                  </td>

                  <td className='py-3.5 px-4 text-center'>
                    <div className='flex justify-center'>
                      <Checkbox
                        checked={perm.customer}
                        disabled={FIXED_PERMISSION_CONSTRAINTS[perm.key]?.customer?.disabled}
                        title={FIXED_PERMISSION_CONSTRAINTS[perm.key]?.customer?.reason}
                        onCheckedChange={() => handleToggle(perm.key, 'customer')}
                        aria-label={`Customer permission for ${perm.key}`}
                      />
                    </div>
                  </td>

                  <td className='py-3.5 px-4 text-center'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Checkbox
                        checked={perm.organizer}
                        disabled={FIXED_PERMISSION_CONSTRAINTS[perm.key]?.organizer?.disabled}
                        title={FIXED_PERMISSION_CONSTRAINTS[perm.key]?.organizer?.reason}
                        onCheckedChange={() => handleToggle(perm.key, 'organizer')}
                        aria-label={`Organizer permission for ${perm.key}`}
                      />
                      {perm.organizerNotice && (
                        <span className='px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-medium'>
                          {perm.organizerNotice}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className='py-3.5 px-4 text-center bg-muted/40'>
                    <div
                      className='inline-flex items-center justify-center gap-1 text-muted-foreground font-mono text-[11px]'
                      title='Enforced by platform root policy'
                    >
                      <CheckCircle className='size-3.5 text-primary' />
                      <Lock className='size-3 text-muted-foreground' />
                    </div>
                  </td>
                </tr>
              );
            })}

            {!isLoading && !isError && filteredPermissions.length === 0 && (
              <tr>
                <td colSpan={5} className='py-8 text-center text-muted-foreground'>
                  No permissions matching the selected filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Docked / Sticky Action Footer */}
      <DockedSaveBar
        modifiedKeys={modifiedKeys}
        isSaving={updateMutation.isPending}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />

      {/* Role Definitions Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <HelpCircle className='size-5 text-indigo-600' />
              <span>Role Definitions &amp; Permission Boundaries</span>
            </DialogTitle>
            <DialogDescription className='pt-2 text-xs text-muted-foreground'>
              Reference guide for permission scopes across tenant entities.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 text-xs bg-muted/40 p-3.5 rounded-lg border border-border text-foreground'>
            <p>
              <strong>Customer Permissions:</strong> Limited to personal reservation flows, public browsing, and initiating dispute flags for booked resources.
            </p>
            <p>
              <strong>Organizer Permissions:</strong> Covers room layout authoring, inventory pricing, and requesting bank settlements. Publishing workspaces directly requires completed legal KYC verification.
            </p>
            <p>
              <strong>Administrator Permissions:</strong> Superuser root tier enforced by platform security kernel. Cannot be disabled via UI.
            </p>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowGuideModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
