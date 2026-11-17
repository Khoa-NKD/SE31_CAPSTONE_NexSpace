import React from 'react';
import {
  Laptop,
  Armchair,
  Mic,
  Users,
  Building2,
  Sparkles,
  LucideIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RESOURCE_TYPE_CONFIGS } from '../data/mock-create-resource';
import { CreateResourceType } from '../types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Laptop,
  Armchair,
  Mic,
  Users,
  Building2,
  Sparkles
};

interface ResourceIdentitySectionProps {
  resourceCode: string;
  displayName: string;
  resourceType: CreateResourceType;
  onChangeCode: (code: string) => void;
  onChangeName: (name: string) => void;
  onSelectType: (type: CreateResourceType, defaultCap: number) => void;
}

export function ResourceIdentitySection({
  resourceCode,
  displayName,
  resourceType,
  onChangeCode,
  onChangeName,
  onSelectType
}: ResourceIdentitySectionProps) {
  return (
    <section className='space-y-6'>
      {/* Step Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-foreground'>
            Resource Identity &amp; Categorization
          </h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Define the unique key, public title, and structural category
          </p>
        </div>
        <span className='text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary dark:text-primary-foreground border border-primary/20 rounded-md'>
          Step 1 of 6
        </span>
      </div>

      {/* Code & Name Row */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
        <div className='space-y-1.5'>
          <Label htmlFor='resource-code' className='text-xs font-semibold text-foreground flex items-center gap-1'>
            Resource Code <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='resource-code'
            type='text'
            value={resourceCode}
            onChange={(e) => onChangeCode(e.target.value)}
            placeholder='e.g. DESK-A12'
            className='h-10 text-sm font-semibold tracking-wide bg-background border-input focus-visible:ring-primary'
          />
          <p className='text-[11px] text-muted-foreground'>
            Unique inventory identifier across this floor.
          </p>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='display-name' className='text-xs font-semibold text-foreground flex items-center gap-1'>
            Public Listing Name <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='display-name'
            type='text'
            value={displayName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder='e.g. Quiet Executive Focus Desk A-12'
            className='h-10 text-sm bg-background border-input focus-visible:ring-primary'
          />
          <p className='text-[11px] text-muted-foreground'>
            Client-facing label shown in mobile bookings &amp; search.
          </p>
        </div>
      </div>

      {/* Resource Type Matrix */}
      <div className='space-y-2.5'>
        <Label className='text-xs font-semibold text-foreground flex items-center gap-1'>
          Resource Type <span className='text-destructive'>*</span>
        </Label>
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
          {RESOURCE_TYPE_CONFIGS.map((config) => {
            const Icon = ICON_MAP[config.icon] || Armchair;
            const isSelected = resourceType === config.type;

            return (
              <button
                key={config.type}
                type='button'
                onClick={() => onSelectType(config.type, config.defaultCapacity)}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 group relative cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={isSelected}
              >
                <div className='flex items-center justify-between w-full'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        'size-8 rounded-lg flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted text-muted-foreground group-hover:text-foreground'
                      )}
                    >
                      <Icon className='size-4' aria-hidden='true' />
                    </div>
                    <span className={cn('text-xs font-semibold', isSelected ? 'text-foreground' : 'text-foreground/80')}>
                      {config.label}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-md border',
                      isSelected
                        ? 'bg-primary/15 text-primary dark:text-primary-foreground border-primary/30'
                        : 'bg-muted/80 text-muted-foreground border-border'
                    )}
                  >
                    {config.badge}
                  </span>
                </div>
                <p className='text-[11px] text-muted-foreground leading-snug line-clamp-1'>
                  {config.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

