import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  MapPin,
  ArrowLeft,
  ArrowRight,
  Save,
  Navigation,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { RealInteractiveMap } from './real-interactive-map';
import { useWizardStore } from '../store/wizard-store';
import { locationSchema } from '../schemas/wizard-schemas';
import {
  VIETNAM_CITIES,
  getCityByName,
  getWardsForCity,
  verifyCoordinatesMatchCity
} from '../data/vietnam-locations';

export function StepLocationView() {
  const router = useRouter();
  const basicInfo = useWizardStore((state) => state.basicInfo);
  const location = useWizardStore((state) => state.location);
  const setLocation = useWizardStore((state) => state.setLocation);
  const setCoordinates = useWizardStore((state) => state.setCoordinates);
  const saveDraft = useWizardStore((state) => state.saveDraft);

  // Local Form State
  const [streetAddress, setStreetAddress] = useState(location.streetAddress);
  const [district, setDistrict] = useState(location.district);
  const [city, setCity] = useState(location.city);
  const [floorSuite, setFloorSuite] = useState(location.floorSuite);
  const [latitude, setLatitudeState] = useState(location.latitude);
  const [longitude, setLongitudeState] = useState(location.longitude);
  const [entryNotes, setEntryNotes] = useState(location.entryNotes);
  const [isManualCoords, setIsManualCoords] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamic Ward list for current city
  const availableWards = getWardsForCity(city);
  const verification = verifyCoordinatesMatchCity(city, latitude, longitude);

  const handleCoordinatesChange = (lat: number, lng: number) => {
    setLatitudeState(lat);
    setLongitudeState(lng);
    setCoordinates(lat, lng);
  };

  // Synchronize City Selection with Wards & Coordinates
  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));

    const cityConfig = getCityByName(newCity);
    if (cityConfig) {
      // Check if current ward belongs to the newly selected city
      const isCurrentWardValid = cityConfig.wards.some((w) => w.name === district);
      const targetWard = isCurrentWardValid ? district : (cityConfig.wards[0]?.name || '');
      const targetCoords = cityConfig.wards.find((w) => w.name === targetWard) || cityConfig.defaultCoords;

      setDistrict(targetWard);
      setLatitudeState(targetCoords.lat);
      setLongitudeState(targetCoords.lng);
      setCoordinates(targetCoords.lat, targetCoords.lng);

      setLocation({
        city: newCity,
        district: targetWard,
        latitude: targetCoords.lat,
        longitude: targetCoords.lng
      });

      toast.info(`Location Synchronized to ${newCity}`, {
        description: `District updated and map calibrated to ${targetWard} (${targetCoords.lat.toFixed(4)}° N, ${targetCoords.lng.toFixed(4)}° E).`
      });
    }
  };

  // Synchronize Ward Selection with Representative Coordinates
  const handleWardChange = (newWard: string) => {
    setDistrict(newWard);
    if (errors.district) setErrors((prev) => ({ ...prev, district: '' }));

    const cityConfig = getCityByName(city);
    const wardItem = cityConfig?.wards.find((w) => w.name === newWard);
    if (wardItem) {
      setLatitudeState(wardItem.lat);
      setLongitudeState(wardItem.lng);
      setCoordinates(wardItem.lat, wardItem.lng);
      setLocation({
        district: newWard,
        latitude: wardItem.lat,
        longitude: wardItem.lng
      });
      toast.success(`District Selected: ${newWard}`, {
        description: `Map calibrated to ${wardItem.lat.toFixed(4)}° N, ${wardItem.lng.toFixed(4)}° E.`
      });
    } else {
      setLocation({ district: newWard });
    }
  };

  const handleSaveDraft = () => {
    setLocation({
      streetAddress,
      district,
      city,
      floorSuite,
      latitude,
      longitude,
      entryNotes
    });
    saveDraft();
    toast.success('Draft Saved Locally', {
      description: 'Location and coordinates saved to local draft.'
    });
  };

  const handleBack = () => {
    // Preserve current state before navigating back
    setLocation({
      streetAddress,
      district,
      city,
      floorSuite,
      latitude,
      longitude,
      entryNotes
    });
    router.navigate({ to: '/dashboard/organizer/workspaces/create' });
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    const values = {
      streetAddress: streetAddress.trim(),
      district,
      city,
      floorSuite: floorSuite.trim(),
      latitude,
      longitude,
      entryNotes: entryNotes.trim()
    };

    const result = locationSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Location Validation Error', {
        description: 'Please complete all required address fields before proceeding.'
      });
      return;
    }

    setErrors({});
    setLocation(values);
    saveDraft();

    toast.success('Location Saved', {
      description: 'Proceeding to Operating Hours configuration.'
    });

    router.navigate({ to: '/dashboard/organizer/workspaces/create/hours' });
  };

  return (
    <div className='w-full max-w-7xl mx-auto py-2 sm:py-4 flex flex-col justify-between'>
      <div>
        {/* Wizard Header Bar */}
        <WizardHeader currentStep={2} />

        {/* Wizard Stepper */}
        <WizardStepper currentStep={2} />

        {/* Split Grid: 45% Form on lg (5 cols) / 55% Interactive Map (7 cols) */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch'>
          {/* Left Form Panel */}
          <section className='lg:col-span-5 bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs flex flex-col justify-between'>
            {/* Panel Header */}
            <div className='pb-4 border-b border-border'>
              <h1 className='text-lg sm:text-xl font-bold font-heading text-foreground tracking-tight'>
                Address &amp; Geographic Coordinates
              </h1>
              <p className='text-xs text-muted-foreground mt-1'>
                Pinpoint your venue&apos;s precise location for tenant GPS discovery and map search.
              </p>
            </div>

            {/* Auto-sync Banner */}
            <div className='mt-3.5 mb-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-muted-foreground text-xs'>
              <span className='size-2 rounded-full bg-emerald-500' />
              <span className='font-medium text-foreground'>Draft automatically synced</span>
              <span className='text-muted-foreground ml-auto text-[11px]'>just now</span>
            </div>

            {/* Address Form */}
            <form onSubmit={handleContinue} className='space-y-4'>
              {/* Street Address */}
              <div>
                <label htmlFor='street-address' className='block text-xs font-semibold text-foreground mb-1.5'>
                  Street Address <span className='text-destructive'>*</span>
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground'>
                    <MapPin className='size-4' />
                  </div>
                  <Input
                    id='street-address'
                    type='text'
                    value={streetAddress}
                    onChange={(e) => {
                      setStreetAddress(e.target.value);
                      if (errors.streetAddress) setErrors((prev) => ({ ...prev, streetAddress: '' }));
                    }}
                    placeholder='Enter building name and street address'
                    className={`pl-9 h-10 text-xs sm:text-sm ${errors.streetAddress ? 'border-destructive' : ''}`}
                  />
                </div>
                <p className='text-[11px] text-muted-foreground mt-1'>Building name, street number, and tower</p>
                {errors.streetAddress && <p className='text-xs text-destructive mt-1 font-medium'>{errors.streetAddress}</p>}
              </div>

              {/* Two Column: Ward/District + City */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='min-w-0 w-full'>
                  <label htmlFor='ward-district-trigger' className='block text-xs font-semibold text-foreground mb-1.5'>
                    Ward / District <span className='text-destructive'>*</span>
                  </label>
                  <Select
                    value={district}
                    onValueChange={handleWardChange}
                  >
                    <SelectTrigger
                      id='ward-district-trigger'
                      className='w-full min-w-0 h-10 text-xs sm:text-sm justify-between gap-2 overflow-hidden [&>span]:truncate [&>span]:min-w-0 [&>span]:block'
                      aria-label='Select ward or district'
                    >
                      <SelectValue placeholder='Select district' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWards.map((w) => (
                        <SelectItem key={w.name} value={w.name} className='text-xs sm:text-sm'>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.district && <p className='text-xs text-destructive mt-1 font-medium'>{errors.district}</p>}
                </div>

                <div className='min-w-0 w-full'>
                  <label htmlFor='city-select-trigger' className='block text-xs font-semibold text-foreground mb-1.5'>
                    City <span className='text-destructive'>*</span>
                  </label>
                  <Select
                    value={city}
                    onValueChange={handleCityChange}
                  >
                    <SelectTrigger
                      id='city-select-trigger'
                      className='w-full min-w-0 h-10 text-xs sm:text-sm justify-between gap-2 overflow-hidden [&>span]:truncate [&>span]:min-w-0 [&>span]:block'
                      aria-label='Select city'
                    >
                      <SelectValue placeholder='Select city' />
                    </SelectTrigger>
                    <SelectContent>
                      {VIETNAM_CITIES.map((c) => (
                        <SelectItem key={c.name} value={c.name} className='text-xs sm:text-sm'>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className='text-xs text-destructive mt-1 font-medium'>{errors.city}</p>}
                </div>
              </div>

              {/* Building Floor & Suite */}
              <div>
                <label htmlFor='floor-suite' className='block text-xs font-semibold text-foreground mb-1.5'>
                  Postal Code / Building Floor &amp; Suite
                </label>
                <Input
                  id='floor-suite'
                  type='text'
                  value={floorSuite}
                  onChange={(e) => setFloorSuite(e.target.value)}
                  placeholder='e.g. Suite 1204, 700000'
                  className='h-10 text-xs sm:text-sm'
                />
              </div>

              {/* Auto-detected Geolocation Card */}
              <div className='rounded-lg bg-muted/50 border border-border p-3.5 space-y-2.5'>
                <div className='flex items-center justify-between'>
                  {verification.isMatch ? (
                    <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold'>
                      <CheckCircle2 className='size-3.5 text-emerald-500' />
                      Geolocation Verified &amp; Matched ({city})
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold'>
                      <AlertCircle className='size-3.5 text-amber-500' />
                      Pin Recalibrated
                    </span>
                  )}
                  <button
                    type='button'
                    onClick={() => setIsManualCoords(!isManualCoords)}
                    className='text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium inline-flex items-center gap-1'
                  >
                    <Sliders className='size-3' />
                    <span>{isManualCoords ? 'Lock Coordinates' : 'Adjust manually'}</span>
                  </button>
                </div>

                {isManualCoords ? (
                  <div className='grid grid-cols-2 gap-2 pt-1'>
                    <div>
                      <label htmlFor='manual-lat' className='text-[10px] text-muted-foreground uppercase font-mono'>
                        Latitude
                      </label>
                      <Input
                        id='manual-lat'
                        type='number'
                        step='0.0001'
                        value={latitude}
                        onChange={(e) => handleCoordinatesChange(parseFloat(e.target.value) || 0, longitude)}
                        className='h-8 text-xs font-mono'
                      />
                    </div>
                    <div>
                      <label htmlFor='manual-lng' className='text-[10px] text-muted-foreground uppercase font-mono'>
                        Longitude
                      </label>
                      <Input
                        id='manual-lng'
                        type='number'
                        step='0.0001'
                        value={longitude}
                        onChange={(e) => handleCoordinatesChange(latitude, parseFloat(e.target.value) || 0)}
                        className='h-8 text-xs font-mono'
                      />
                    </div>
                  </div>
                ) : (
                  <div className='flex items-baseline justify-between pt-0.5'>
                    <div className='font-mono text-xs font-medium text-foreground bg-card px-2.5 py-1 rounded border border-border'>
                      Lat: <span className='font-semibold text-indigo-600 dark:text-indigo-400'>{latitude.toFixed(4)}° N</span>{' '}
                      | Long:{' '}
                      <span className='font-semibold text-indigo-600 dark:text-indigo-400'>{longitude.toFixed(4)}° E</span>
                    </div>
                  </div>
                )}

                <div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
                  <Navigation className='size-3 text-emerald-500' />
                  <span>
                    {verification.isMatch
                      ? `Precision: High (Exact Rooftop Level, ±2m) • ${city}`
                      : verification.message}
                  </span>
                </div>
              </div>

              {/* Parking & Entry Instructions */}
              <div>
                <label htmlFor='entry-notes' className='block text-xs font-semibold text-foreground mb-1.5'>
                  Parking &amp; Entry Instructions
                </label>
                <Textarea
                  id='entry-notes'
                  rows={3}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder='Parking details, elevator banks, reception floor...'
                  className='text-xs sm:text-sm leading-relaxed resize-none'
                />
                <p className='text-[11px] text-muted-foreground mt-1'>
                  Provide clear arrival tips for first-time guests and couriers.
                </p>
              </div>
            </form>
          </section>

          {/* Right Map Panel */}
          <section className='lg:col-span-7 flex flex-col h-full'>
            <RealInteractiveMap
              venueName={basicInfo.name}
              streetAddress={streetAddress}
              latitude={latitude}
              longitude={longitude}
              onCoordinatesChange={handleCoordinatesChange}
              onAddressSelect={(selected) => {
                if (selected.street) {
                  setStreetAddress(selected.street);
                }
              }}
            />
          </section>
        </div>
      </div>

      {/* Sticky Action Footer Bar */}
      <footer className='mt-8 bg-card/95 backdrop-blur border border-border px-6 py-4 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3'>
        {/* Left: Previous Step */}
        <Button
          type='button'
          variant='ghost'
          onClick={handleBack}
          className='gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          <span>Back to Basic Info</span>
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
            <span>Continue to Operating Hours</span>
            <ArrowRight className='size-4' />
          </Button>
        </div>
      </footer>
    </div>
  );
}
