import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Rocket, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateResourceHeader } from './create-resource-header';
import { ResourceIdentitySection } from './resource-identity-section';
import { ResourceLocationSection } from './resource-location-section';
import { ResourcePhotosSection } from './resource-photos-section';
import { ResourceSpecsAmenitiesSection } from './resource-specs-amenities-section';
import { ResourcePricingSection } from './resource-pricing-section';
import { ResourceRulesSection } from './resource-rules-section';
import { ResourceLivePreviewCard } from './resource-live-preview-card';
import {
  CreateResourceFormData,
  CreateResourceType,
  ResourcePhoto
} from '../types';
import { INITIAL_RESOURCE_FORM_DATA } from '../data/mock-create-resource';

export function CreateResourceView() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateResourceFormData>(INITIAL_RESOURCE_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Identity handlers
  function handleChangeCode(code: string) {
    setFormData((prev) => ({ ...prev, resourceCode: code }));
  }

  function handleChangeName(name: string) {
    setFormData((prev) => ({ ...prev, displayName: name }));
  }

  function handleSelectType(type: CreateResourceType, defaultCap: number) {
    setFormData((prev) => ({
      ...prev,
      resourceType: type,
      capacity: defaultCap
    }));
  }

  // Location handlers
  function handleChangeFloor(floor: string) {
    setFormData((prev) => ({ ...prev, floorLevel: floor }));
  }

  function handleChangeZone(zone: string) {
    setFormData((prev) => ({ ...prev, zoneSection: zone }));
  }

  // Photo handlers
  function handleSetPrimaryPhoto(photoId: string) {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => ({
        ...p,
        isPrimary: p.id === photoId
      }))
    }));
  }

  function handleDeletePhoto(photoId: string) {
    setFormData((prev) => {
      const remaining = prev.photos.filter((p) => p.id !== photoId);
      // If deleted was primary and there are remaining photos, make the first one primary
      const hadPrimary = remaining.some((p) => p.isPrimary);
      if (!hadPrimary && remaining.length > 0) {
        remaining[0].isPrimary = true;
      }
      return { ...prev, photos: remaining };
    });
  }

  function handleAddPhoto(newPhoto: ResourcePhoto) {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, newPhoto]
    }));
  }

  // Specs & Amenities handlers
  function handleChangeCapacity(capacity: number) {
    setFormData((prev) => ({ ...prev, capacity }));
  }

  function handleChangeSpecifications(specs: string) {
    setFormData((prev) => ({ ...prev, specifications: specs }));
  }

  function handleToggleAmenity(amenityLabel: string) {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenityLabel);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenityLabel)
          : [...prev.amenities, amenityLabel]
      };
    });
  }

  // Pricing handlers
  function handleChangeHourlyRate(val: string) {
    setFormData((prev) => ({ ...prev, hourlyRate: val }));
  }

  function handleChangeDailyRate(val: string) {
    setFormData((prev) => ({ ...prev, dailyRate: val }));
  }

  // Rules handlers
  function handleToggleInstantBooking(checked: boolean) {
    setFormData((prev) => ({ ...prev, instantBooking: checked }));
  }

  function handleTogglePublishLive(checked: boolean) {
    setFormData((prev) => ({ ...prev, publishLive: checked }));
  }

  // Form submission
  function handleSaveDraft() {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Draft Saved', {
        description: `Resource "${formData.displayName || formData.resourceCode}" saved to drafts.`
      });
    }, 400);
  }

  function handlePublish() {
    if (!formData.resourceCode.trim()) {
      toast.error('Validation Error', {
        description: 'Please enter a unique Resource Code (e.g. DESK-A12).'
      });
      return;
    }

    if (!formData.displayName.trim()) {
      toast.error('Validation Error', {
        description: 'Please provide a Public Listing Name.'
      });
      return;
    }

    if (!formData.hourlyRate.trim() || isNaN(parseFloat(formData.hourlyRate))) {
      toast.error('Validation Error', {
        description: 'Please set a valid Hourly Base Rate.'
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Resource Published Successfully! 🚀', {
        description: `"${formData.displayName}" (${formData.resourceCode}) is now live on the marketplace.`
      });
      navigate({ to: '/dashboard/organizer/resources' });
    }, 600);
  }

  const primaryPhoto = formData.photos.find((p) => p.isPrimary) || formData.photos[0];

  return (
    <div className='max-w-[1360px] w-full mx-auto space-y-6 pb-12'>
      {/* Page Header */}
      <CreateResourceHeader />

      {/* Main Grid: Form Sections (8 Cols) vs Live Preview Card (4 Cols) */}
      <div className='grid grid-cols-12 gap-8 items-start'>
        {/* Left: Interactive Multi-Section Form */}
        <div className='col-span-12 lg:col-span-8 bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-xs space-y-7'>
          {/* Section 1: Resource Identity */}
          <ResourceIdentitySection
            resourceCode={formData.resourceCode}
            displayName={formData.displayName}
            resourceType={formData.resourceType}
            onChangeCode={handleChangeCode}
            onChangeName={handleChangeName}
            onSelectType={handleSelectType}
          />

          {/* Section 2: Location & Spatial Hierarchy */}
          <ResourceLocationSection
            workspaceHub={formData.workspaceHub}
            floorLevel={formData.floorLevel}
            zoneSection={formData.zoneSection}
            onChangeFloor={handleChangeFloor}
            onChangeZone={handleChangeZone}
          />

          {/* Section 3: Photography Gallery */}
          <ResourcePhotosSection
            photos={formData.photos}
            onSetPrimary={handleSetPrimaryPhoto}
            onDeletePhoto={handleDeletePhoto}
            onAddPhoto={handleAddPhoto}
          />

          {/* Section 4: Specs & Amenities */}
          <ResourceSpecsAmenitiesSection
            capacity={formData.capacity}
            specifications={formData.specifications}
            selectedAmenities={formData.amenities}
            onChangeCapacity={handleChangeCapacity}
            onChangeSpecifications={handleChangeSpecifications}
            onToggleAmenity={handleToggleAmenity}
          />

          {/* Section 5: Base Pricing Matrix */}
          <ResourcePricingSection
            hourlyRate={formData.hourlyRate}
            dailyRate={formData.dailyRate}
            onChangeHourlyRate={handleChangeHourlyRate}
            onChangeDailyRate={handleChangeDailyRate}
          />

          {/* Section 6: Publishing & Booking Rules */}
          <ResourceRulesSection
            instantBooking={formData.instantBooking}
            publishLive={formData.publishLive}
            onToggleInstantBooking={handleToggleInstantBooking}
            onTogglePublishLive={handleTogglePublishLive}
          />

          {/* Footer Action CTAs */}
          <div className='border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className='w-full sm:w-auto h-11 px-6 font-semibold text-xs border-border hover:bg-muted/80 gap-2'
            >
              <Save className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Save as Draft</span>
            </Button>

            <Button
              type='button'
              onClick={handlePublish}
              disabled={isSubmitting}
              className='w-full sm:w-auto h-11 px-7 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95'
            >
              <Rocket className='size-4' aria-hidden='true' />
              <span>Publish Seat to Marketplace 🚀</span>
            </Button>
          </div>
        </div>

        {/* Right: Sticky Live Customer Preview Column */}
        <div className='col-span-12 lg:col-span-4'>
          <ResourceLivePreviewCard
            displayName={formData.displayName}
            floorLevel={formData.floorLevel}
            zoneSection={formData.zoneSection}
            capacity={formData.capacity}
            hourlyRate={formData.hourlyRate}
            primaryPhoto={primaryPhoto}
            selectedAmenities={formData.amenities}
          />
        </div>
      </div>
    </div>
  );
}

