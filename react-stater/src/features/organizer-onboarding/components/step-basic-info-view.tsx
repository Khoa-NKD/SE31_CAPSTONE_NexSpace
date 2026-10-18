import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  CloudSync,
  Building2,
  Briefcase,
  Palette,
  CheckCircle2,
  Phone,
  Mail,
  Save,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { useWizardStore } from '../store/wizard-store';
import { basicInfoSchema } from '../schemas/wizard-schemas';
import type { SpaceCategory } from '../types/wizard';

const CATEGORIES: Array<{
  id: SpaceCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'coworking_hub',
    title: 'Dedicated Coworking Hub',
    description: 'Shared hot desks, dedicated booths, and community zones.',
    icon: Building2
  },
  {
    id: 'business_lounge',
    title: 'Executive Business Lounge',
    description: 'Private suites, premium boardrooms, and concierge services.',
    icon: Briefcase
  },
  {
    id: 'creative_studio',
    title: 'Creative Studio Space',
    description: 'Open-loft, photo/video production, and flexible project rooms.',
    icon: Palette
  }
];

export function StepBasicInfoView() {
  const router = useRouter();
  const basicInfo = useWizardStore((state) => state.basicInfo);
  const setBasicInfo = useWizardStore((state) => state.setBasicInfo);
  const saveDraft = useWizardStore((state) => state.saveDraft);

  // Form local state initialized from store
  const [name, setName] = useState(basicInfo.name);
  const [category, setCategory] = useState<SpaceCategory>(basicInfo.category);
  const [description, setDescription] = useState(basicInfo.description);
  const [totalArea, setTotalArea] = useState<string>(String(basicInfo.totalArea || 1250));
  const [contactPhone, setContactPhone] = useState(basicInfo.contactPhone);
  const [contactEmail, setContactEmail] = useState(basicInfo.contactEmail);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSaveDraft = () => {
    const numericArea = parseFloat(totalArea.replace(/,/g, '')) || 0;
    setBasicInfo({
      name,
      category,
      description,
      totalArea: numericArea,
      contactPhone,
      contactEmail
    });
    saveDraft();
    toast.success('Draft Saved Locally', {
      description: 'Your workspace setup progress has been saved.'
    });
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const numericArea = parseFloat(totalArea.replace(/,/g, '')) || 0;

    const values = {
      name: name.trim(),
      category,
      description: description.trim(),
      totalArea: numericArea,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim()
    };

    const result = basicInfoSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Validation Error', {
        description: 'Please correct the highlighted fields before proceeding.'
      });
      return;
    }

    setErrors({});
    setBasicInfo(values);
    saveDraft();
    router.navigate({ to: '/dashboard/organizer/workspaces/create/location' });
  };

  return (
    <div className='w-full max-w-5xl mx-auto py-2 sm:py-4'>
      {/* Top Wizard Navigation Header */}
      <WizardHeader currentStep={1} />

      {/* Progress Stepper */}
      <WizardStepper currentStep={1} />

      {/* Main Form Container Card (Max-width 760px matching Stitch) */}
      <section className='max-w-[760px] mx-auto bg-card rounded-xl border border-border p-6 sm:p-8 shadow-2xs'>
        {/* Info Banner at Top */}
        <div className='mb-6 flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-indigo-700 dark:text-indigo-300'>
          <CloudSync className='size-5 shrink-0' />
          <p className='text-xs sm:text-sm font-medium'>
            Changes will be saved automatically as draft to your account.
          </p>
        </div>

        {/* Card Header */}
        <div className='border-b border-border pb-5 mb-6'>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight'>
            Basic Information
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            Set up the public title and specifications of your workspace to attract suitable enterprise and flexible tenants.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleContinue} className='space-y-6'>
          {/* Field 1: Workspace Public Name */}
          <div>
            <label htmlFor='workspace-name' className='block text-xs sm:text-sm font-semibold text-foreground mb-1'>
              Workspace Public Name <span className='text-destructive'>*</span>
            </label>
            <p className='text-xs text-muted-foreground mb-2'>
              This will be displayed prominently across NexSpace marketplace and booking confirmations.
            </p>
            <Input
              id='workspace-name'
              type='text'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder='e.g., NexSpace Executive Center Saigon'
              className={`h-10 text-xs sm:text-sm ${errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {errors.name && <p className='text-xs text-destructive mt-1 font-medium'>{errors.name}</p>}
          </div>

          {/* Field 2: Space Category */}
          <div>
            <span id='space-category-label' className='block text-xs sm:text-sm font-semibold text-foreground mb-1'>
              Space Category <span className='text-destructive'>*</span>
            </span>
            <p className='text-xs text-muted-foreground mb-3'>
              Select the primary layout style that defines this venue.
            </p>

            <div
              role='radiogroup'
              aria-labelledby='space-category-label'
              className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'
            >
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      if (errors.category) setErrors((prev) => ({ ...prev, category: '' }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCategory(cat.id);
                      }
                    }}
                    role='radio'
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={`relative p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between border-2 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-2xs'
                        : 'border-border hover:border-muted-foreground/40 bg-card'
                    }`}
                  >
                    <div className='flex items-start justify-between mb-3'>
                      <div
                        className={`size-10 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className='size-5' />
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className='size-5 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20' />
                      ) : (
                        <div className='size-4 rounded-full border border-border' />
                      )}
                    </div>

                    <div>
                      <h3 className='text-xs sm:text-sm font-semibold text-foreground mb-1'>
                        {cat.title}
                      </h3>
                      <p className='text-[11px] sm:text-xs text-muted-foreground leading-snug'>
                        {cat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.category && <p className='text-xs text-destructive mt-1 font-medium'>{errors.category}</p>}
          </div>

          {/* Field 3: Short Description */}
          <div>
            <label htmlFor='workspace-description' className='block text-xs sm:text-sm font-semibold text-foreground mb-1'>
              Short Description
            </label>
            <div className='relative'>
              <Textarea
                id='workspace-description'
                rows={4}
                value={description}
                maxLength={200}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                placeholder='Summarize your venue in 1-2 punchy sentences...'
                className={`text-xs sm:text-sm leading-relaxed resize-none ${errors.description ? 'border-destructive' : ''}`}
              />
            </div>
            <div className='flex items-center justify-between mt-1.5 text-xs text-muted-foreground'>
              <span>Summarize your venue in 1-2 punchy sentences</span>
              <span className='font-mono font-medium'>{description.length} / 200 characters</span>
            </div>
            {errors.description && <p className='text-xs text-destructive mt-1 font-medium'>{errors.description}</p>}
          </div>

          {/* Field 4: Total Usable Area */}
          <div>
            <label htmlFor='workspace-area' className='block text-xs sm:text-sm font-semibold text-foreground mb-1'>
              Total Usable Area <span className='text-destructive'>*</span>
            </label>
            <p className='text-xs text-muted-foreground mb-2'>
              Gross usable floor space including shared common areas and meeting rooms.
            </p>
            <div className='flex rounded-lg border border-border overflow-hidden max-w-xs focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all'>
              <Input
                id='workspace-area'
                type='text'
                value={totalArea}
                onChange={(e) => {
                  setTotalArea(e.target.value);
                  if (errors.totalArea) setErrors((prev) => ({ ...prev, totalArea: '' }));
                }}
                className='h-10 border-0 text-right tabular-nums text-xs sm:text-sm focus-visible:ring-0 rounded-none'
              />
              <div className='bg-muted border-l border-border text-muted-foreground text-xs px-3.5 flex items-center select-none whitespace-nowrap font-medium'>
                sqm (m²)
              </div>
            </div>
            {errors.totalArea && <p className='text-xs text-destructive mt-1 font-medium'>{errors.totalArea}</p>}
          </div>

          {/* Field 5: Contact Phone & Support Email (2 Columns) */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label htmlFor='contact-phone' className='block text-xs sm:text-sm font-semibold text-foreground mb-1'>
                Booking Inquiry Hotline <span className='text-destructive'>*</span>
              </label>
              <div className='relative flex items-center'>
                <Phone className='absolute left-3 size-4 text-muted-foreground pointer-events-none' />
                <Input
                  id='contact-phone'
                  type='text'
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value);
                    if (errors.contactPhone) setErrors((prev) => ({ ...prev, contactPhone: '' }));
                  }}
                  className={`h-10 pl-9 text-xs sm:text-sm ${errors.contactPhone ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.contactPhone && <p className='text-xs text-destructive mt-1 font-medium'>{errors.contactPhone}</p>}
            </div>

            <div>
              <label htmlFor='contact-email' className='block text-xs sm:text-sm font-semibold text-foreground mb-1'>
                Venue Support Email <span className='text-destructive'>*</span>
              </label>
              <div className='relative flex items-center'>
                <Mail className='absolute left-3 size-4 text-muted-foreground pointer-events-none' />
                <Input
                  id='contact-email'
                  type='email'
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    if (errors.contactEmail) setErrors((prev) => ({ ...prev, contactEmail: '' }));
                  }}
                  className={`h-10 pl-9 text-xs sm:text-sm ${errors.contactEmail ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.contactEmail && <p className='text-xs text-destructive mt-1 font-medium'>{errors.contactEmail}</p>}
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className='border-t border-border pt-6 mt-8 flex flex-wrap items-center justify-between gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleSaveDraft}
              className='gap-2 text-xs sm:text-sm border-border hover:bg-muted'
            >
              <Save className='size-4' />
              <span>Save as Draft</span>
            </Button>

            <Button
              type='submit'
              className='h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm gap-2 shadow-2xs'
            >
              <span>Continue to Location &amp; Map</span>
              <ArrowRight className='size-4' />
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
