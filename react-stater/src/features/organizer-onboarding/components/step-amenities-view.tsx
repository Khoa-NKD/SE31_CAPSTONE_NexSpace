import React, { useState, useMemo } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  Wifi,
  PhoneCall,
  Cast,
  Monitor,
  Armchair,
  MoveVertical,
  Lock,
  ShowerHead,
  Heart,
  Bike,
  Presentation,
  Printer,
  Coffee,
  Droplets,
  Beer,
  Utensils,
  Key,
  UserCheck,
  ShieldCheck,
  Mail,
  Search,
  X,
  Check,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Save,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { useWizardStore } from '../store/wizard-store';
import { amenitiesSchema } from '../schemas/wizard-schemas';
import type { AmenityItem } from '../types/wizard';

export const AMENITIES_CATALOG: AmenityItem[] = [
  // 1. Technology & Connectivity
  {
    id: 'fast-wifi',
    name: 'High-speed WiFi (1 Gbps)',
    description: 'Symmetric fiber connection, multi-AP roaming and guest portal',
    category: 'technology',
    icon: 'Wifi',
    isCommon: true
  },
  {
    id: 'phone-booth',
    name: 'Soundproof Phone Booth',
    description: 'Acoustic glass insulation, ventilation fan & interior task lighting',
    category: 'technology',
    icon: 'PhoneCall',
    isCommon: true
  },
  {
    id: 'screen-casting',
    name: 'Wireless Screen Casting',
    description: 'AirPlay, Miracast & Chromecast 4K low-latency streaming',
    category: 'technology',
    icon: 'Cast',
    isCommon: true
  },
  {
    id: 'dual-monitors',
    name: 'Dual Monitors Station',
    description: '27-inch 4K IPS monitors with 90W USB-C single cable docking',
    category: 'technology',
    icon: 'Monitor',
    isCommon: false
  },

  // 2. Facilities & Ergonomics
  {
    id: 'ergonomic-chairs',
    name: 'Herman Miller Chairs',
    description: 'Aeron ergonomic lumbar support seating for all workstations',
    category: 'facilities',
    icon: 'Armchair',
    isCommon: true
  },
  {
    id: 'standing-desks',
    name: 'Standing Desks',
    description: 'Motorized dual-motor height-adjustable sit-stand workstations',
    category: 'facilities',
    icon: 'MoveVertical',
    isCommon: true
  },
  {
    id: 'private-lockers',
    name: 'Private Lockers',
    description: 'Digital RFID keycard secured lockers for personal gear & tech',
    category: 'facilities',
    icon: 'Lock',
    isCommon: false
  },
  {
    id: 'shower-room',
    name: 'Shower Room',
    description: 'Hot showers with complimentary towel service & premium toiletries',
    category: 'facilities',
    icon: 'ShowerHead',
    isCommon: false
  },
  {
    id: 'wellness-room',
    name: 'Nursing & Wellness Room',
    description: 'Private lactation room with dedicated refrigerator & soft armchair',
    category: 'facilities',
    icon: 'Heart',
    isCommon: false
  },
  {
    id: 'bike-storage',
    name: 'Bicycle Storage Rack',
    description: 'Secure indoor bicycle parking with pump and maintenance tools',
    category: 'facilities',
    icon: 'Bike',
    isCommon: false
  },
  {
    id: 'event-space',
    name: 'Event Presentation Space',
    description: 'Raised stage, 85-inch display panel and dual wireless handheld mics',
    category: 'facilities',
    icon: 'Presentation',
    isCommon: false
  },
  {
    id: 'printing-station',
    name: 'Printing & 3D Prototyping',
    description: 'Commercial color laser A3/A4 and dual Bambu Lab 3D printers',
    category: 'facilities',
    icon: 'Printer',
    isCommon: false
  },

  // 3. Hospitality & Refreshments
  {
    id: 'espresso-bar',
    name: 'Specialty Espresso Bar',
    description: 'La Marzocco commercial machine & curated single-origin arabica',
    category: 'hospitality',
    icon: 'Coffee',
    isCommon: true
  },
  {
    id: 'filtered-water-tea',
    name: 'Filtered Water & Tea',
    description: 'Hot/cold reverse osmosis dispenser & loose-leaf organic teas',
    category: 'hospitality',
    icon: 'Droplets',
    isCommon: true
  },
  {
    id: 'craft-beer',
    name: 'Craft Beer on Tap',
    description: 'Complimentary artisan craft brews on tap every Friday evening',
    category: 'hospitality',
    icon: 'Beer',
    isCommon: false
  },
  {
    id: 'pantry-kitchen',
    name: 'Catering & Pantry Kitchen',
    description: 'Microwaves, full-size refrigerators, utensils & dishwasher',
    category: 'hospitality',
    icon: 'Utensils',
    isCommon: true
  },

  // 4. Access, Security & Services
  {
    id: 'smart-lock-247',
    name: '24/7 Keycard Smart Lock',
    description: 'Mobile app Bluetooth & NFC keyless access with time-based permissions',
    category: 'security',
    icon: 'Key',
    isCommon: true
  },
  {
    id: 'community-manager',
    name: 'Onsite Community Manager',
    description: 'Professional front-desk reception & host on duty Monday to Friday',
    category: 'security',
    icon: 'UserCheck',
    isCommon: true
  },
  {
    id: 'cctv-security',
    name: 'CCTV & Biometric Security',
    description: 'High-definition 24/7 security recording in all common corridors',
    category: 'security',
    icon: 'ShieldCheck',
    isCommon: true
  },
  {
    id: 'mail-handling',
    name: 'Mail & Package Handling',
    description: 'Official business address registration and package receiving',
    category: 'security',
    icon: 'Mail',
    isCommon: true
  }
];

const CATEGORY_METADATA = {
  technology: {
    label: 'Technology & Connectivity',
    badge: 'Digital Infra'
  },
  facilities: {
    label: 'Facilities & Ergonomics',
    badge: 'Workplace Ergonomics'
  },
  hospitality: {
    label: 'Hospitality & Refreshments',
    badge: 'Food & Beverage'
  },
  security: {
    label: 'Access, Security & Services',
    badge: 'Safety & Management'
  }
} as const;

function renderAmenityIcon(iconName: string) {
  const props = { className: 'size-5' };
  switch (iconName) {
    case 'Wifi':
      return <Wifi {...props} />;
    case 'PhoneCall':
      return <PhoneCall {...props} />;
    case 'Cast':
      return <Cast {...props} />;
    case 'Monitor':
      return <Monitor {...props} />;
    case 'Armchair':
      return <Armchair {...props} />;
    case 'MoveVertical':
      return <MoveVertical {...props} />;
    case 'Lock':
      return <Lock {...props} />;
    case 'ShowerHead':
      return <ShowerHead {...props} />;
    case 'Heart':
      return <Heart {...props} />;
    case 'Bike':
      return <Bike {...props} />;
    case 'Presentation':
      return <Presentation {...props} />;
    case 'Printer':
      return <Printer {...props} />;
    case 'Coffee':
      return <Coffee {...props} />;
    case 'Droplets':
      return <Droplets {...props} />;
    case 'Beer':
      return <Beer {...props} />;
    case 'Utensils':
      return <Utensils {...props} />;
    case 'Key':
      return <Key {...props} />;
    case 'UserCheck':
      return <UserCheck {...props} />;
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'Mail':
      return <Mail {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

export function StepAmenitiesView() {
  const router = useRouter();
  const {
    amenities,
    toggleAmenity,
    selectCommonAmenities,
    clearAmenities,
    saveDraft
  } = useWizardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredAmenities = useMemo(() => {
    if (!searchQuery.trim()) return AMENITIES_CATALOG;
    const q = searchQuery.toLowerCase();
    return AMENITIES_CATALOG.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const groupedAmenities = useMemo(() => {
    const groups: Record<string, AmenityItem[]> = {
      technology: [],
      facilities: [],
      hospitality: [],
      security: []
    };
    filteredAmenities.forEach((item) => {
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredAmenities]);

  const handleSelectCommon = () => {
    const commonIds = AMENITIES_CATALOG.filter((a) => a.isCommon).map((a) => a.id);
    selectCommonAmenities(commonIds);
    setValidationError(null);
    toast.success('Common Amenities Added', {
      description: 'Standard enterprise essentials selected.'
    });
  };

  const handleClearAll = () => {
    clearAmenities();
    toast.info('Selections Cleared', {
      description: 'All amenities have been unselected.'
    });
  };

  const handleSaveDraft = () => {
    saveDraft();
    toast.success('Draft Saved', {
      description: 'Your selected amenities draft has been safely saved.'
    });
  };

  const handleBack = () => {
    saveDraft();
    router.navigate({ to: '/dashboard/organizer/workspaces/create/hours' });
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    const result = amenitiesSchema.safeParse(amenities);
    if (!result.success) {
      const err =
        result.error.issues[0]?.message ||
        'Please select at least 1 amenity for your workspace.';
      setValidationError(err);
      toast.error('Amenities Selection Required', {
        description: err
      });
      return;
    }

    setValidationError(null);
    saveDraft();

    toast.success('Amenities Saved', {
      description: 'Proceeding to Media Gallery & Cover Photo.'
    });

    router.navigate({ to: '/dashboard/organizer/workspaces/create/media' });
  };

  return (
    <div className='w-full max-w-6xl mx-auto py-2 sm:py-4 flex flex-col justify-between'>
      <div>
        {/* Wizard Header Bar */}
        <WizardHeader currentStep={4} />

        {/* Wizard Stepper */}
        <WizardStepper currentStep={4} />

        {/* Page Title & Subtitle Banner */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Workspace Amenities &amp; Facilities
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Select all features and equipment available to customers in this workspace location.
            </p>
          </div>
          <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium self-start sm:self-center shrink-0'>
            <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span>Draft automatically synced</span>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className='mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-xs sm:text-sm'>
            <AlertCircle className='size-5 shrink-0 mt-0.5' />
            <div>
              <p className='font-semibold'>Selection Incomplete</p>
              <p className='mt-0.5 text-xs opacity-90'>{validationError}</p>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className='mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3.5 sm:p-4 rounded-xl shadow-2xs'>
          {/* Search Input */}
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
            <Input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search amenities (e.g. WiFi, Ergonomic chair, Phone booth, Coffee)...'
              className='pl-9 h-10 text-xs sm:text-sm'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                aria-label='Clear search query'
              >
                <X className='size-4' />
              </button>
            )}
          </div>

          {/* Counter + Bulk Actions */}
          <div className='flex items-center justify-between sm:justify-end gap-2.5'>
            <Badge
              variant='secondary'
              className='bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold px-2.5 py-1'
            >
              {amenities.length} of {AMENITIES_CATALOG.length} selected
            </Badge>

            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleSelectCommon}
              className='text-xs h-9 border-border hover:bg-muted'
            >
              Select All Common
            </Button>

            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleClearAll}
              disabled={amenities.length === 0}
              className='text-xs h-9 text-muted-foreground hover:text-foreground'
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Amenities Categories */}
        <div className='space-y-8'>
          {(['technology', 'facilities', 'hospitality', 'security'] as const).map(
            (catKey) => {
              const items = groupedAmenities[catKey];
              if (!items || items.length === 0) return null;

              const meta = CATEGORY_METADATA[catKey];
              const selectedInCat = items.filter((i) =>
                amenities.includes(i.id)
              ).length;

              return (
                <section key={catKey} className='space-y-3.5'>
                  {/* Category Header */}
                  <div className='flex items-center justify-between border-b border-border pb-2.5'>
                    <div className='flex items-center gap-2.5'>
                      <h2 className='text-sm sm:text-base font-bold text-foreground'>
                        {meta.label}
                      </h2>
                      <span className='text-xs text-muted-foreground'>
                        ({selectedInCat}/{items.length} selected)
                      </span>
                    </div>
                    <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                      {meta.badge}
                    </Badge>
                  </div>

                  {/* 4-column Responsive Grid */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5'>
                    {items.map((item) => {
                      const isSelected = amenities.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          role='checkbox'
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => {
                            toggleAmenity(item.id);
                            setValidationError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggleAmenity(item.id);
                              setValidationError(null);
                            }
                          }}
                          className={`relative group rounded-xl p-4 cursor-pointer transition-all border text-left flex flex-col justify-between select-none ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-500 shadow-2xs ring-1 ring-indigo-600/30'
                              : 'bg-card border-border hover:border-slate-400 dark:hover:border-slate-600 hover:bg-muted/40 shadow-2xs'
                          }`}
                        >
                          <div>
                            {/* Top Row: Icon + Checkbox */}
                            <div className='flex items-start justify-between gap-2 mb-3'>
                              <div
                                className={`size-10 rounded-lg flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80'
                                }`}
                              >
                                {renderAmenityIcon(item.icon)}
                              </div>

                              <div
                                className={`size-5 rounded flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-muted-foreground/40 bg-background group-hover:border-foreground/70'
                                }`}
                              >
                                {isSelected && (
                                  <Check className='size-3.5 stroke-[3]' />
                                )}
                              </div>
                            </div>

                            {/* Amenity Title */}
                            <h3
                              className={`text-xs sm:text-sm font-bold tracking-tight leading-snug ${
                                isSelected
                                  ? 'text-indigo-950 dark:text-indigo-100 font-bold'
                                  : 'text-foreground'
                              }`}
                            >
                              {item.name}
                            </h3>

                            {/* Amenity Description */}
                            <p className='text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-1'>
                              {item.description}
                            </p>
                          </div>

                          {/* Common Tag if applicable */}
                          {item.isCommon && (
                            <div className='mt-3 pt-2 border-t border-border/40 flex items-center justify-between'>
                              <span className='text-[10px] text-muted-foreground font-medium'>
                                Popular Essential
                              </span>
                              {isSelected && (
                                <span className='text-[10px] font-semibold text-indigo-600 dark:text-indigo-400'>
                                  Included
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }
          )}
        </div>
      </div>

      {/* Sticky Action Footer Bar */}
      <footer className='mt-8 bg-card/95 backdrop-blur border border-border px-6 py-4 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3'>
        {/* Left: Back to Operating Hours */}
        <Button
          type='button'
          variant='ghost'
          onClick={handleBack}
          className='gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          <span>Back to Operating Hours</span>
        </Button>

        {/* Right: Save Draft & Continue */}
        <div className='flex items-center gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={handleSaveDraft}
            className='gap-1.5 text-xs sm:text-sm border-border hover:bg-muted'
          >
            <Save className='size-4' />
            <span>Save Draft</span>
          </Button>

          <Button
            type='button'
            onClick={handleContinue}
            className='h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm gap-2 shadow-2xs'
          >
            <span>Continue to Media Gallery</span>
            <ArrowRight className='size-4' />
          </Button>
        </div>
      </footer>
    </div>
  );
}
