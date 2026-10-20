import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  CheckCircle2,
  AlertTriangle,
  Edit,
  Building2,
  Clock,
  Image as ImageIcon,
  Layers,
  MapPin,
  Star,
  Send,
  Eye,
  Sparkles,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { useSubmitWorkspaceMutation } from '@/features/workspaces/api';
import { isDurableMediaUrl } from '../utils/wizard-api-mapper';

function isItemValidMedia(item: { url?: string; uploadStatus?: string }): boolean {
  if (!item.url) return false;
  if (item.uploadStatus === 'error' || item.uploadStatus === 'uploading') return false;
  return isDurableMediaUrl(item.url);
}

export function StepReviewChecklistView() {
  const router = useRouter();
  const {
    basicInfo,
    location,
    operatingHours,
    amenities,
    media,
    floorPlan,
    saveDraft,
    setSubmissionStatus
  } = useWizardStore();

  const {
    canonicalWorkspaceId,
    serverVersion,
    saveDraftToServer
  } = useWizardDraftSync();

  const submitMutation = useSubmitWorkspaceMutation();

  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Validation audits
  const isBasicInfoValid =
    Boolean(basicInfo.name && basicInfo.category && basicInfo.totalArea > 0 && basicInfo.contactEmail);
  const isLocationValid =
    Boolean(location.streetAddress && location.district && location.city && location.latitude && location.longitude);
  const isOperatingHoursValid =
    operatingHours.is247 || operatingHours.schedule.some((s) => s.isOpen);
  const isAmenitiesValid = amenities.length >= 1;

  const durableMediaCount = media.items.filter(isItemValidMedia).length;
  const hasDurableCover = Boolean(
    media.coverPhotoId &&
    media.items.some(
      (item) => item.id === media.coverPhotoId && isItemValidMedia(item)
    )
  );
  const hasOnlyLocalPreviews = media.items.length > 0 && durableMediaCount === 0;
  const isMediaValid = durableMediaCount >= 1 && (hasDurableCover || durableMediaCount > 0);

  const isFloorPlanValid =
    floorPlan.floors.length >= 1 &&
    floorPlan.zones.length >= 1 &&
    floorPlan.zones.every((z) => z.baseHourlyRate >= 0);

  // Calculate audit score
  const auditSections = [
    { id: 'basic_loc', name: 'Basic Info & Location', valid: isBasicInfoValid && isLocationValid },
    { id: 'hours', name: 'Operating Hours & Access', valid: isOperatingHoursValid },
    { id: 'media_amenities', name: 'Amenities & Media Assets', valid: isAmenitiesValid && isMediaValid },
    { id: 'floor_plan', name: 'Floor Structure & Zones', valid: isFloorPlanValid }
  ];

  const completedSectionsCount = auditSections.filter((s) => s.valid).length;
  const auditScorePercent = Math.round((completedSectionsCount / auditSections.length) * 100);
  const isReadyForSubmission = completedSectionsCount === auditSections.length;

  const totalCapacity = floorPlan.zones.reduce((acc, z) => acc + z.capacity, 0);
  const coverPhoto = media.items.find((item) => item.id === media.coverPhotoId) || media.items[0];

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!isMediaValid) {
        toast.error('Submission Blocked: Missing Durable Media', {
          description: hasOnlyLocalPreviews
            ? 'Only temporary local previews are present. Local photos cannot be persisted to the server without an active cloud upload service.'
            : 'At least 1 durable workspace photograph is required before submitting for review.'
        });
        setIsSubmitting(false);
        return;
      }

      let targetId = canonicalWorkspaceId;
      let targetVersion = serverVersion;

      // If canonical record not yet created on server, create it first
      if (!targetId) {
        const saved = await saveDraftToServer({ silent: true });
        if (saved) {
          targetId = saved.id;
          targetVersion = saved.version;
        }
      }

      if (!targetId) {
        toast.error('Submission Blocked', {
          description: 'Could not create workspace record on server. Please verify required fields.'
        });
        setIsSubmitting(false);
        return;
      }

      await submitMutation.mutateAsync({
        id: targetId,
        dto: {
          expectedVersion: targetVersion,
          agreementConfirmed: true
        },
        workspaceName: basicInfo.name
      });

      setSubmissionStatus('under_review');
      saveDraft();
      setIsSubmitModalOpen(false);

      toast.success('Workspace Submitted for Review!', {
        description: `Listing ${targetId} entered verification queue #NX-VER-2026. Platform review takes 12-24 hours.`
      });

      router.navigate({ to: '/dashboard/organizer/workspaces' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast.error('Submission Error', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground pb-28'>
      {/* Sub-Header / Breadcrumbs */}
      <div className='px-4 sm:px-8 pt-4 pb-2 border-b border-border bg-card/60 backdrop-blur-xs'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs'>
          <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-muted-foreground truncate'>
            <span className='hover:text-foreground transition-colors'>Workspaces</span>
            <span>&gt;</span>
            <span className='truncate'>{location.district || 'District 1, HCMC'}</span>
            <span>&gt;</span>
            <span className='font-medium text-foreground truncate'>{basicInfo.name}</span>
            <span>&gt;</span>
            <span className='font-bold text-indigo-600 dark:text-indigo-400'>Pre-submission Checklist (O15)</span>
          </nav>

          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className={`text-xs font-semibold px-2.5 py-0.5 ${
                isReadyForSubmission
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}
            >
              Pre-Flight Audit • {auditScorePercent}% Ready
            </Badge>

            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsPreviewModalOpen(true)}
              className='h-7 px-2.5 text-xs gap-1.5 border-border hover:bg-muted'
            >
              <Eye className='size-3.5 text-muted-foreground' />
              <span>Preview Listing</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Review Form Area */}
      <main className='flex-1 p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-6'>
        {/* Header Block */}
        <div>
          <div className='flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-1'>
            <CheckCircle2 className='size-4' />
            <span>Step 5 of 5 • Final Verification</span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
            Workspace Publication Checklist
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            Review and verify all required operational settings, floor inventory, and pricing policies before going live on the NexSpace marketplace.
          </p>

          {/* Readiness Alert Banner */}
          {isReadyForSubmission ? (
            <div className='mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-3'>
              <ShieldCheck className='size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-foreground'>Your workspace is 100% complete! </span>
                All mandatory operational fields, geolocation coordinates, and floor zones meet platform publishing requirements.
              </div>
            </div>
          ) : (
            <div className='mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3'>
              <AlertTriangle className='size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-foreground'>Your workspace is almost ready! </span>
                Please address pending sections highlighted below to enable marketplace publication.
              </div>
            </div>
          )}
        </div>

        {/* ==================== AUDIT CARD 1: BASIC INFO & LOCATION ==================== */}
        <section className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs space-y-4'>
          <div className='flex items-center justify-between pb-3 border-b border-border'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                <Building2 className='size-5' />
              </div>
              <div>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Basic Information &amp; Location</h2>
                <p className='text-xs text-muted-foreground'>Workspace identity, category, street coordinates &amp; contact hotline</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`text-xs font-semibold ${
                  isBasicInfoValid && isLocationValid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isBasicInfoValid && isLocationValid ? 'Complete' : 'Incomplete'}
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create' })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Step 1-2</span>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm'>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Property Name</span>
              <span className='font-semibold text-foreground mt-0.5 block'>{basicInfo.name || 'Not provided'}</span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Category</span>
              <span className='font-medium text-foreground mt-0.5 block capitalize'>
                {basicInfo.category.replace('_', ' ')} • {basicInfo.totalArea} m² Usable Area
              </span>
            </div>
            <div className='sm:col-span-2'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Street Address</span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {location.floorSuite ? `${location.floorSuite}, ` : ''}{location.streetAddress}, {location.district}, {location.city}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Geolocation</span>
              <span className='font-medium text-foreground mt-0.5 flex items-center gap-1'>
                <MapPin className='size-3.5 text-emerald-600' />
                <span>{location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E (Verified Pin)</span>
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Venue Support Hotline</span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {basicInfo.contactPhone} • {basicInfo.contactEmail}
              </span>
            </div>
          </div>
        </section>

        {/* ==================== AUDIT CARD 2: OPERATING HOURS ==================== */}
        <section className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs space-y-4'>
          <div className='flex items-center justify-between pb-3 border-b border-border'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                <Clock className='size-5' />
              </div>
              <div>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Operating Hours &amp; Access Policy</h2>
                <p className='text-xs text-muted-foreground'>Weekly schedules, turnkey door access protocols &amp; cancellation terms</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`text-xs font-semibold ${
                  isOperatingHoursValid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isOperatingHoursValid ? 'Complete' : 'Incomplete'}
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create/hours' })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Step 3</span>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm'>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Weekly Schedule</span>
              <span className='font-semibold text-foreground mt-0.5 block'>
                {operatingHours.is247
                  ? '24/7 Unlimited Access (All days)'
                  : 'Mon – Sat: 08:00 – 22:00 (Configured custom hours)'}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Sunday Policy</span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {operatingHours.schedule.find((s) => s.day === 'sunday')?.isOpen
                  ? 'Open on Sunday'
                  : 'Closed (Weekly sanitization & maintenance window)'}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Check-in Access Type</span>
              <span className='font-medium text-foreground mt-0.5 flex items-center gap-1.5'>
                <QrCode className='size-3.5 text-indigo-600' />
                <span>Automated QR Gate &amp; Smart Turnstile Access</span>
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Cancellation Policy</span>
              <span className='font-medium text-foreground mt-0.5 flex items-center gap-1.5'>
                <CheckCircle2 className='size-3.5 text-emerald-600' />
                <span>Flexible (Full refund up to 2 hours before booking)</span>
              </span>
            </div>
          </div>
        </section>

        {/* ==================== AUDIT CARD 3: AMENITIES & MEDIA ASSETS ==================== */}
        <section className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs space-y-4'>
          <div className='flex items-center justify-between pb-3 border-b border-border'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                <ImageIcon className='size-5' />
              </div>
              <div>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Amenities &amp; Media Assets</h2>
                <p className='text-xs text-muted-foreground'>Facility perks, high-resolution photography &amp; hero media assets</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`text-xs font-semibold ${
                  isAmenitiesValid && isMediaValid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isAmenitiesValid && isMediaValid ? 'Complete' : 'Incomplete'}
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create/amenities' })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Step 4-5</span>
              </Button>
            </div>
          </div>

          {/* Amenities Badges */}
          <div>
            <div className='flex items-center justify-between text-xs mb-2'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider'>
                Selected Amenities ({amenities.length} Verified)
              </span>
              <span className='text-muted-foreground text-[11px]'>Certified by host</span>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {amenities.slice(0, 10).map((am) => (
                <span
                  key={am}
                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/70 text-foreground text-xs font-medium'
                >
                  <Sparkles className='size-3 text-indigo-500' />
                  <span className='capitalize'>{am.replace('-', ' ')}</span>
                </span>
              ))}
              {amenities.length > 10 && (
                <span className='px-2 py-1 rounded bg-muted text-muted-foreground text-xs'>
                  +{amenities.length - 10} more
                </span>
              )}
            </div>
          </div>

          {/* Local Previews Warning Banner if no durable media */}
          {hasOnlyLocalPreviews && (
            <div className='p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs'>
              <AlertTriangle className='size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
              <div>
                <p className='font-semibold'>Local Previews Only (Upload Service Offline)</p>
                <p className='mt-0.5 text-amber-800/90 dark:text-amber-300/90'>
                  Your gallery contains only temporary local file previews. Because cloud storage is not connected, these photos cannot be saved to the server or submitted for review. At least 1 durable photograph is required.
                </p>
              </div>
            </div>
          )}

          {/* Media Previews Grid */}
          <div>
            <div className='flex items-center justify-between text-xs mb-2'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider'>
                Media Assets ({media.items.length} Photos in Gallery)
              </span>
              <span className='text-muted-foreground text-[11px]'>Standard 16:9 ratio</span>
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              {/* Cover Photo */}
              {coverPhoto && (
                <div className='col-span-2 relative h-32 rounded-lg overflow-hidden border border-border group bg-muted'>
                  <img
                    src={coverPhoto.url}
                    alt={coverPhoto.name}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                  />
                  <span className='absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs'>
                    <Star className='size-3 text-amber-400 fill-amber-400' />
                    <span>Cover Photo</span>
                  </span>
                </div>
              )}
              {/* Other Thumbnails */}
              {media.items.filter((m) => m.id !== coverPhoto?.id).slice(0, 2).map((photo) => (
                <div key={photo.id} className='relative h-32 rounded-lg overflow-hidden border border-border group bg-muted'>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                  />
                  <span className='absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium truncate max-w-[120px]'>
                    {photo.caption || photo.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== AUDIT CARD 4: FLOOR PLAN & ZONES ==================== */}
        <section className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs space-y-4'>
          <div className='flex items-center justify-between pb-3 border-b border-border'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                <Layers className='size-5' />
              </div>
              <div>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Floor Plan &amp; Resource Pricing Matrix</h2>
                <p className='text-xs text-muted-foreground'>Configured zones, desk capacities &amp; commercial hourly rates</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`text-xs font-semibold ${
                  isFloorPlanValid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isFloorPlanValid ? 'Complete' : 'Attention Required'}
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create/floor-plan' })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Floor Plan</span>
              </Button>
            </div>
          </div>

          {/* Inventory Summary Bar */}
          <div className='bg-muted/40 rounded-lg p-3 border border-border flex flex-wrap items-center justify-between text-xs gap-2'>
            <div className='flex items-center gap-2 font-medium text-foreground'>
              <Layers className='size-4 text-muted-foreground' />
              <span>{floorPlan.floors.length} Floors Configured</span>
              <span className='text-muted-foreground'>•</span>
              <span>{totalCapacity} Total Capacity</span>
              <span className='text-muted-foreground'>•</span>
              <span>{floorPlan.zones.length} Zones Defined</span>
            </div>
            <div className='flex items-center gap-1.5'>
              {floorPlan.zones.map((zone) => (
                <Badge key={zone.id} variant='outline' className='text-[10px] font-medium'>
                  {zone.name.split('—')[0]}: {zone.capacity} seats (${zone.baseHourlyRate}/h)
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Declaration and Agreement Checkbox */}
        <div className='p-4 rounded-xl bg-card border border-border shadow-2xs space-y-3'>
          <div className='flex items-start gap-3'>
            <Checkbox
              id='terms'
              checked={hasAgreedTerms}
              onCheckedChange={(checked) => setHasAgreedTerms(Boolean(checked))}
              className='mt-1'
            />
            <label htmlFor='terms' className='text-xs leading-relaxed text-muted-foreground cursor-pointer'>
              <span className='font-bold text-foreground'>Organizer Platform Agreement Declaration: </span>
              I confirm that all facility descriptions, safety standards, fire codes, and hourly pricing matrices are accurate and comply with the NexSpace Partner Master Service Agreement. I authorize NexSpace to inspect and publish this listing.
            </label>
          </div>
        </div>
      </main>

      {/* ==================== ELEVATED STICKY SUBMISSION BAR ==================== */}
      <div className='fixed bottom-4 left-4 right-4 sm:left-8 sm:right-8 z-30 pointer-events-none'>
        <div className='max-w-4xl mx-auto pointer-events-auto bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 px-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4'>
          {/* Progress Indicator */}
          <div className='flex flex-col w-full sm:w-auto'>
            <div className='flex items-center gap-3'>
              <span className='text-xs sm:text-sm font-bold text-foreground'>
                {completedSectionsCount} of {auditSections.length} Sections Complete ({auditScorePercent}%)
              </span>
              <div className='h-2 w-32 bg-muted rounded-full overflow-hidden'>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isReadyForSubmission ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${auditScorePercent}%` }}
                />
              </div>
            </div>
            <span className='text-[11px] text-muted-foreground mt-0.5'>
              {isReadyForSubmission
                ? 'All mandatory requirements satisfied. Ready for submission.'
                : 'Complete all steps before publishing to marketplace.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center gap-3 w-full sm:w-auto justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                saveDraft();
                toast.success('Workspace draft saved locally');
              }}
              className='h-10 text-xs sm:text-sm font-medium border-border'
            >
              Save as Draft
            </Button>

            <Button
              type='button'
              disabled={!isReadyForSubmission || !hasAgreedTerms}
              onClick={() => setIsSubmitModalOpen(true)}
              className={`h-10 px-5 text-xs sm:text-sm font-semibold gap-2 shadow-xs transition-all ${
                isReadyForSubmission && hasAgreedTerms
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Send className='size-4' />
              <span>Submit for Marketplace Publishing</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ==================== MODAL: CONFIRM SUBMISSION ==================== */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-indigo-600 dark:text-indigo-400'>
              <Send className='size-5' />
              <span>Confirm Marketplace Submission</span>
            </DialogTitle>
            <DialogDescription>
              Submit <strong className='text-foreground'>{basicInfo.name}</strong> for administrator review and marketplace publication.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2 text-xs text-muted-foreground'>
            <p>
              Once submitted, our Partner Operations team will verify the property details, license records, and fire safety compliance within 12–24 hours.
            </p>
            <div className='p-3 bg-muted/60 rounded-lg border border-border space-y-1.5'>
              <div className='flex justify-between'>
                <span>Listing Name:</span>
                <span className='font-semibold text-foreground'>{basicInfo.name}</span>
              </div>
              <div className='flex justify-between'>
                <span>Floors &amp; Capacity:</span>
                <span className='font-semibold text-foreground'>{floorPlan.floors.length} Floors • {totalCapacity} Desks</span>
              </div>
              <div className='flex justify-between'>
                <span>Assigned Submission Queue:</span>
                <span className='font-mono font-semibold text-indigo-600'>#NX-VER-2026</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className='bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PREVIEW LISTING ==================== */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Public Marketplace Listing Preview</DialogTitle>
            <DialogDescription>
              This is how customers will see your workspace in the NexSpace mobile &amp; web apps.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            {coverPhoto && (
              <div className='relative w-full aspect-video rounded-xl overflow-hidden border border-border'>
                <img src={coverPhoto.url} alt={basicInfo.name} className='w-full h-full object-cover' />
                <div className='absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs font-semibold'>
                  {basicInfo.category.replace('_', ' ')}
                </div>
              </div>
            )}
            <div>
              <h3 className='text-lg font-bold text-foreground'>{basicInfo.name}</h3>
              <p className='text-xs text-muted-foreground flex items-center gap-1 mt-1'>
                <MapPin className='size-3.5 text-muted-foreground' />
                <span>{location.streetAddress}, {location.district}, {location.city}</span>
              </p>
              <p className='text-xs text-foreground mt-2 leading-relaxed'>{basicInfo.description}</p>
            </div>
            <div className='border-t border-border pt-3'>
              <h4 className='text-xs font-bold text-foreground mb-1.5'>Featured Amenities</h4>
              <div className='flex flex-wrap gap-1'>
                {amenities.map((a) => (
                  <Badge key={a} variant='secondary' className='text-[10px] capitalize'>
                    {a.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsPreviewModalOpen(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
