import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { amenitiesSchema } from '../schemas/wizard-schemas';
import type { AmenityItem } from '../types/wizard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { amenityQueries, amenityService } from '@/features/amenities';

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
  const queryClient = useQueryClient();

  const {
    amenities,
    amenityAddonRates,
    canonicalWorkspaceId,
    toggleAmenity,
    setAmenityAddonRate,
    setAmenities,
    selectCommonAmenities,
    clearAmenities,
    saveDraft
  } = useWizardStore();
  const { saveDraftToServer, isSaving } = useWizardDraftSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load platform-wide active catalog from Backend (GET /api/amenities)
  const { data: serverAmenities, isLoading } = useQuery(amenityQueries.available());

  // Convert raw server amenities to typed items for onboarding catalog
  const activeCatalog: AmenityItem[] = useMemo(() => {
    if (!serverAmenities || serverAmenities.length === 0) {
      return [];
    }
    return serverAmenities.map((item) => {
      let cat: 'technology' | 'facilities' | 'hospitality' | 'security' = 'technology';
      if (item.category === 'TECH') cat = 'technology';
      else if (item.category === 'COMFORT') cat = 'hospitality';
      else if (item.category === 'SPACE') cat = 'facilities';

      return {
        id: String(item.id),
        name: item.name,
        description: item.description || '',
        category: cat,
        icon: item.icon || 'Sparkles',
        isCommon: true
      };
    });
  }, [serverAmenities]);

  // Clean up legacy string seed IDs once real numeric catalog is loaded
  useEffect(() => {
    if (!activeCatalog.length) return;
    const hasLegacyIds = amenities.some((id) => isNaN(Number(id)));
    if (hasLegacyIds) {
      const validNumericIds = amenities.filter((id) => !isNaN(Number(id)));
      if (validNumericIds.length === 0) {
        // First load with legacy seed data: select the first 4 active items from server
        const defaultIds = activeCatalog.slice(0, 4).map((a) => a.id);
        setAmenities(defaultIds);
      } else {
        setAmenities(validNumericIds);
      }
    }
  }, [activeCatalog, amenities, setAmenities]);

  // -----------------------------------------------------------------------------------------------
  // [NOTE CHO DEV SAU / FUTURE WORKSPACE INTEGRATION]:
  // Hiện tại Spring Boot Backend chưa triển khai module CRUD Workspace (POST /api/workspaces).
  // Do đó khi khởi tạo wizard tạo mới không gian, `canonicalWorkspaceId` ban đầu là undefined.
  // ĐỂ TEST VÀ ĐỒNG BỘ TIỆN ÍCH LÊN DATABASE:
  // - Code đang fallback mặc định về Workspace ID 1 (được seed sẵn trong DataInitializer.java thuộc về 'organizer').
  // - KHI NÀO BACKEND TRIỂN KHAI XONG API WORKSPACE CRUD:
  //   1. Chỉnh numericWorkspaceId: `canonicalWorkspaceId && !isNaN(Number(canonicalWorkspaceId)) ? Number(canonicalWorkspaceId) : undefined;`
  //   2. Bỏ fallback '1' trong `syncAmenitiesToBackend`, `handleSaveDraft`, và `handleContinue`.
  // -----------------------------------------------------------------------------------------------
  const numericWorkspaceId =
    canonicalWorkspaceId && !isNaN(Number(canonicalWorkspaceId))
      ? Number(canonicalWorkspaceId)
      : 1;

  const { data: existingWorkspaceAmenities } = useQuery({
    ...amenityQueries.workspaceAmenities(numericWorkspaceId),
    enabled: !!numericWorkspaceId && numericWorkspaceId > 0
  });

  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (
      !hasHydratedRef.current &&
      existingWorkspaceAmenities &&
      existingWorkspaceAmenities.length > 0
    ) {
      hasHydratedRef.current = true;
      const ids = existingWorkspaceAmenities.map((wa) => String(wa.amenityId));
      setAmenities(ids);
      existingWorkspaceAmenities.forEach((wa) => {
        if (wa.addonPricePerHour > 0) {
          setAmenityAddonRate(String(wa.amenityId), wa.addonPricePerHour);
        }
      });
    }
  }, [existingWorkspaceAmenities, setAmenities, setAmenityAddonRate]);

  const filteredAmenities = useMemo(() => {
    if (!searchQuery.trim()) return activeCatalog;
    const q = searchQuery.toLowerCase();
    return activeCatalog.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [searchQuery, activeCatalog]);

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
    const commonIds = activeCatalog.filter((a) => a.isCommon).map((a) => a.id);
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

  const syncAmenitiesToBackend = async (targetWorkspaceId?: string | number) => {
    const rawId = targetWorkspaceId || canonicalWorkspaceId || '1';
    const wsId = Number(rawId);
    if (isNaN(wsId) || wsId <= 0) return;

    const validAmenities = amenities
      .map((id) => {
        const numId = Number(id);
        if (isNaN(numId) || numId <= 0) return null;
        return {
          amenityId: numId,
          addonPricePerHour: amenityAddonRates?.[id] || 0
        };
      })
      .filter((item): item is { amenityId: number; addonPricePerHour: number } => item !== null);

    try {
      await amenityService.syncWorkspaceAmenities(wsId, { amenities: validAmenities });
      queryClient.invalidateQueries({
        queryKey: [...amenityQueries.all, 'workspace', String(wsId)]
      });
      toast.success('Workspace Amenities Synced', {
        description: `Successfully synchronized ${validAmenities.length} amenities to workspace #${wsId}.`
      });
    } catch (err: unknown) {
      console.warn('Could not sync workspace amenities to backend:', err);
    }
  };

  const handleSaveDraft = async () => {
    saveDraft();
    const updated = await saveDraftToServer();
    const targetId = updated?.id || canonicalWorkspaceId || '1';
    await syncAmenitiesToBackend(targetId);
  };

  const handleBack = () => {
    saveDraft();
    router.navigate({ to: '/dashboard/organizer/workspaces/create/hours', search: (prev) => prev });
  };

  const handleContinue = async (e: React.FormEvent) => {
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
    const updated = await saveDraftToServer({ silent: true });
    const targetId = updated?.id || canonicalWorkspaceId || '1';
    await syncAmenitiesToBackend(targetId);

    toast.success('Amenities Saved', {
      description: 'Proceeding to Media Gallery & Cover Photo.'
    });

    router.navigate({
      to: '/dashboard/organizer/workspaces/create/media',
      search: (prev) => prev
    });
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
              Select all features available in your workspace. Configure optional hourly add-on rates if applicable.
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
          <div className='flex items-center justify-between sm:justify-end gap-2.5 flex-wrap'>
            <Badge
              variant='secondary'
              className='bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold px-2.5 py-1'
            >
              {amenities.length} of {activeCatalog.length} selected
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

        {/* Loading state */}
        {isLoading && (
          <div className='flex items-center justify-center py-16 gap-3 text-muted-foreground'>
            <Loader2 className='size-5 animate-spin' />
            <span className='text-sm'>Đang tải danh mục tiện ích từ hệ thống...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredAmenities.length === 0 && (
          <div className='text-center py-16 border rounded-xl border-dashed bg-muted/20'>
            <AlertCircle className='size-8 mx-auto text-muted-foreground mb-2' />
            <p className='text-sm font-medium text-foreground'>Không có tiện ích nào</p>
            <p className='text-xs text-muted-foreground mt-1'>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có tiện ích nào được tạo trong hệ thống'}
            </p>
          </div>
        )}

        {/* Amenities Categories */}
        {!isLoading && (
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
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5'>
                      {items.map((item) => {
                        const isSelected = amenities.includes(item.id);
                        const addonRate = amenityAddonRates?.[item.id] || 0;

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

                            {/* Pricing & Addon Config */}
                            <div className='mt-3 pt-2.5 border-t border-border/40'>
                              {isSelected ? (
                                <div className='space-y-1.5'>
                                  <div className='flex items-center justify-between text-[11px]'>
                                    <span className='text-muted-foreground font-medium'>Phụ thu</span>
                                    <span
                                      className={`font-semibold ${
                                        addonRate > 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-indigo-600 dark:text-indigo-400'
                                      }`}
                                    >
                                      {addonRate > 0
                                        ? `+${addonRate.toLocaleString('vi-VN')} đ/h`
                                        : 'Miễn phí'}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-1.5'>
                                    <Button
                                      type='button'
                                      size='sm'
                                      variant={addonRate === 0 ? 'default' : 'outline'}
                                      className={`h-7 text-[10px] px-2 py-0 ${
                                        addonRate === 0
                                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                          : 'border-border text-muted-foreground'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAmenityAddonRate(item.id, 0);
                                      }}
                                    >
                                      Miễn phí
                                    </Button>
                                    <div className='relative flex-1'>
                                      <Input
                                        type='number'
                                        min='0'
                                        step='5000'
                                        placeholder='VND/giờ...'
                                        value={addonRate > 0 ? addonRate : ''}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                          setAmenityAddonRate(item.id, val);
                                        }}
                                        className='h-7 text-[11px] px-2 text-right'
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                                  <span>{item.isCommon ? 'Popular Essential' : 'Tiện ích không gian'}</span>
                                  <span className='text-indigo-600 dark:text-indigo-400 font-medium'>Chọn để bật</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}
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
            disabled={isSaving}
            onClick={handleSaveDraft}
            className='gap-1.5 text-xs sm:text-sm border-border hover:bg-muted'
          >
            {isSaving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            type='button'
            disabled={isSaving}
            onClick={handleContinue}
            className='h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm gap-2 shadow-2xs'
          >
            <span>Continue to Media Gallery</span>
            {isSaving ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
