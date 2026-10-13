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
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_PERMISSIONS, PermissionDefinition } from '../data/mock-roles';
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

export function RolePermissionMatrix() {
  const [permissions, setPermissions] = useState<PermissionDefinition[]>(MOCK_PERMISSIONS);
  const [initialPermissions, setInitialPermissions] = useState<PermissionDefinition[]>(MOCK_PERMISSIONS);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModifiedOnly, setShowModifiedOnly] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Compute modified permission keys
  const modifiedKeys = useMemo(() => {
    return permissions
      .filter((perm) => {
        const initial = initialPermissions.find((p) => p.key === perm.key);
        if (!initial) return false;
        return initial.customer !== perm.customer || initial.organizer !== perm.organizer;
      })
      .map((p) => p.key);
  }, [permissions, initialPermissions]);

  // Handle toggling customer / organizer permission
  const handleToggle = (key: string, role: 'customer' | 'organizer') => {
    setPermissions((prev) =>
      prev.map((perm) => {
        if (perm.key === key) {
          return {
            ...perm,
            [role]: !perm[role]
          };
        }
        return perm;
      })
    );
  };

  // Discard changes
  const handleDiscard = () => {
    setPermissions(initialPermissions);
    toast.info('Changes Discarded', {
      description: 'Reverted all modified role permissions back to previous state.'
    });
  };

  // Save changes
  const handleSave = () => {
    setInitialPermissions(permissions);
    toast.success('Permissions Applied (Simulated)', {
      description: `Cryptographically signed and applied ${modifiedKeys.length} modified permission rules.`
    });
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
            {filteredPermissions.map((perm) => {
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
                        onCheckedChange={() => handleToggle(perm.key, 'customer')}
                        aria-label={`Customer permission for ${perm.key}`}
                      />
                    </div>
                  </td>

                  <td className='py-3.5 px-4 text-center'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Checkbox
                        checked={perm.organizer}
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

            {filteredPermissions.length === 0 && (
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
