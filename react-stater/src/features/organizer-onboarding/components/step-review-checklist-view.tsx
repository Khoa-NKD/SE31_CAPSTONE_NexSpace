import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Edit,
  Building2,
  Clock,
  Image as ImageIcon,
  MapPin,
  Star,
  ArrowRight,
  Save,
  Eye,
  Sparkles,
  QrCode,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { isDurableMediaUrl } from '../utils/wizard-api-mapper';
import { isOperatingTimeRangeValid } from '../schemas/wizard-schemas';
import type { DaySchedule } from '../types/wizard';

const CATEGORY_LABELS: Record<string, string> = {
  coworking_hub: 'Dedicated Coworking Hub',
  business_lounge: 'Executive Business Lounge',
  creative_studio: 'Creative Studio Space'
};

const DAY_SHORT_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};

interface ScheduleGroup {
  daysLabel: string;
  timeRange: string;
  isOpen: boolean;
  durationHours?: number;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier?.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (modifier?.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + (minutes || 0);
}

function calculateDayDurationHours(openTime: string, closeTime: string): number {
  const start = parseTimeToMinutes(openTime);
  const end = parseTimeToMinutes(closeTime);
  if (end <= start) return 0;
  return Math.round(((end - start) / 60) * 10) / 10;
}

function groupConsecutiveSchedule(schedule: DaySchedule[]): ScheduleGroup[] {
  if (!schedule || schedule.length === 0) return [];

  const groups: ScheduleGroup[] = [];
  let currentGroupDays: DaySchedule[] = [];
  let currentKey = '';

  for (const day of schedule) {
    const key = day.isOpen ? `${day.openTime} - ${day.closeTime}` : 'CLOSED';
    if (currentGroupDays.length === 0) {
      currentGroupDays.push(day);
      currentKey = key;
    } else if (key === currentKey) {
      currentGroupDays.push(day);
    } else {
      const first = DAY_SHORT_LABELS[currentGroupDays[0].day] || currentGroupDays[0].label;
      const last = DAY_SHORT_LABELS[currentGroupDays[currentGroupDays.length - 1].day] || currentGroupDays[currentGroupDays.length - 1].label;
      const daysLabel = currentGroupDays.length === 1 ? first : `${first} – ${last}`;
      const isOpen = currentGroupDays[0].isOpen;
      const duration = isOpen ? calculateDayDurationHours(currentGroupDays[0].openTime, currentGroupDays[0].closeTime) : undefined;
      groups.push({
        daysLabel,
        timeRange: isOpen ? `${currentGroupDays[0].openTime} – ${currentGroupDays[0].closeTime}` : 'Closed',
        isOpen,
        durationHours: duration
      });
      currentGroupDays = [day];
      currentKey = key;
    }
  }

  if (currentGroupDays.length > 0) {
    const first = DAY_SHORT_LABELS[currentGroupDays[0].day] || currentGroupDays[0].label;
    const last = DAY_SHORT_LABELS[currentGroupDays[currentGroupDays.length - 1].day] || currentGroupDays[currentGroupDays.length - 1].label;
    const daysLabel = currentGroupDays.length === 1 ? first : `${first} – ${last}`;
    const isOpen = currentGroupDays[0].isOpen;
    const duration = isOpen ? calculateDayDurationHours(currentGroupDays[0].openTime, currentGroupDays[0].closeTime) : undefined;
    groups.push({
      daysLabel,
      timeRange: isOpen ? `${currentGroupDays[0].openTime} – ${currentGroupDays[0].closeTime}` : 'Closed',
      isOpen,
      durationHours: duration
    });
  }

  return groups;
}

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
    canonicalWorkspaceId,
    saveDraft,
    setSubmissionStatus
  } = useWizardStore();

  const {
    isSaving,
    saveDraftToServer
  } = useWizardDraftSync();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Validation audits for Steps 1–4
  const isBasicInfoValid = Boolean(
    basicInfo.name &&
    basicInfo.category &&
    basicInfo.totalArea > 0 &&
    basicInfo.contactPhone &&
    basicInfo.contactEmail
  );

  const isOperatingHoursValid =
    operatingHours.is247 ||
    (operatingHours.schedule.some((s) => s.isOpen) &&
      operatingHours.schedule.every(
        (s) => !s.isOpen || isOperatingTimeRangeValid(s.openTime, s.closeTime)
      ));
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

  // Calculate audit score across the 3 core onboarding sections (Steps 1–4)
  const auditSections = [
    { id: 'basic_info', name: 'Basic Information', valid: isBasicInfoValid },
    { id: 'hours', name: 'Operating Hours & Access', valid: isOperatingHoursValid },
    { id: 'media_amenities', name: 'Amenities & Media Assets', valid: isAmenitiesValid && isMediaValid }
  ];

  const completedSectionsCount = auditSections.filter((s) => s.valid).length;
  const auditScorePercent = Math.round((completedSectionsCount / auditSections.length) * 100);
  const isReadyForSubmission = completedSectionsCount === auditSections.length;

  const coverPhoto = media.items.find((item) => item.id === media.coverPhotoId) || media.items[0];

  const handleSaveAsDraftAndExit = async () => {
    setIsSubmitting(true);
    try {
      const saved = await saveDraftToServer({ silent: true });
      setSubmissionStatus('draft');
      saveDraft();
      toast.success('Workspace Saved as Draft', {
        description: `${basicInfo.name || 'Workspace'}${saved?.id ? ` (#${saved.id})` : ''} has been saved in DRAFT status.`
      });
      router.navigate({ to: '/dashboard/organizer/workspaces' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft';
      toast.error('Save Draft Error', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToSetupFloorAndZone = async () => {
    setIsSubmitting(true);
    try {
      const saved = await saveDraftToServer({ silent: true });
      setSubmissionStatus('draft');
      saveDraft();

      const rawId = saved?.id || canonicalWorkspaceId;
      const numericMatch = rawId ? String(rawId).match(/\d+/) : null;
      const numericWorkspaceId = numericMatch ? Number(numericMatch[0]) : undefined;

      toast.success('Workspace Draft Saved', {
        description: 'Redirecting to Floor Plan & Zones setup...'
      });

      if (numericWorkspaceId && Number.isSafeInteger(numericWorkspaceId) && numericWorkspaceId > 0) {
        router.navigate({
          to: '/dashboard/organizer/floorplan',
          search: { workspaceId: numericWorkspaceId }
        });
      } else {
        router.navigate({ to: '/dashboard/organizer/floorplan' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to proceed to Floor & Zone setup';
      toast.error('Navigation Error', { description: msg });
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
            <span className='font-medium text-foreground truncate'>{basicInfo.name || 'New Workspace'}</span>
            <span>&gt;</span>
            <span className='font-bold text-indigo-600 dark:text-indigo-400'>Overview &amp; Review</span>
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
            <span>Workspace Overview &amp; Review</span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
            Workspace Overview &amp; Review
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            Review your workspace information, operating hours, amenities, and gallery photos before saving or proceeding to floor plan and zones setup.
          </p>

          {/* Readiness Alert Banner */}
          {isReadyForSubmission ? (
            <div className='mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-3'>
              <ShieldCheck className='size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-foreground'>Workspace overview details complete! </span>
                Choose <strong>Save Draft</strong> to return to your workspace list in DRAFT status, or <strong>Go to Setup Floor &amp; Zone</strong> to proceed to floor and zone configuration.
              </div>
            </div>
          ) : (
            <div className='mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3'>
              <AlertTriangle className='size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-foreground'>Some sections are still incomplete. </span>
                Please review and complete all required sections before continuing.
              </div>
            </div>
          )}
        </div>

        {/* ==================== AUDIT CARD 1: BASIC INFORMATION ==================== */}
        <section className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs space-y-4'>
          <div className='flex items-center justify-between pb-3 border-b border-border'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                <Building2 className='size-5' />
              </div>
              <div>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Basic Information</h2>
                <p className='text-xs text-muted-foreground'>Workspace identity, space category, usable area, description &amp; contact hotline</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`text-xs font-semibold ${
                  isBasicInfoValid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isBasicInfoValid ? 'Complete' : 'Incomplete'}
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create', search: (prev) => prev })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Step 1</span>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm'>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Workspace Public Name</span>
              <span className='font-semibold text-foreground mt-0.5 block'>{basicInfo.name || 'Not provided'}</span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Space Category</span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {CATEGORY_LABELS[basicInfo.category] || basicInfo.category.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Total Usable Area</span>
              <span className='font-semibold text-foreground mt-0.5 block'>
                {basicInfo.totalArea ? `${basicInfo.totalArea} m² (sqm)` : '0 m²'}
              </span>
            </div>
            <div className='sm:col-span-2 lg:col-span-3'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Short Description</span>
              <p className='font-normal text-foreground/90 mt-0.5 bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs sm:text-sm leading-relaxed'>
                {basicInfo.description ? basicInfo.description : <span className='italic text-muted-foreground'>No description provided</span>}
              </p>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Booking Inquiry Hotline</span>
              <span className='font-medium text-foreground mt-0.5 block font-mono'>
                {basicInfo.contactPhone || 'Not provided'}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Venue Support Email</span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {basicInfo.contactEmail || 'Not provided'}
              </span>
            </div>
            {location.entryNotes && (
              <div className='sm:col-span-2 lg:col-span-3'>
                <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>Entry Instructions</span>
                <p className='font-normal text-foreground/80 mt-0.5 text-xs italic'>
                  {location.entryNotes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ==================== AUDIT CARD 2: OPERATING HOURS & ACCESS POLICY ==================== */}
        <section className='bg-card rounded-xl border border-border p-5 sm:p-6 shadow-2xs space-y-4'>
          <div className='flex items-center justify-between pb-3 border-b border-border'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                <Clock className='size-5' />
              </div>
              <div>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Operating Hours &amp; Access Policy</h2>
                <p className='text-xs text-muted-foreground'>Weekly operating schedules, statutory holiday exceptions &amp; door access protocols</p>
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
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create/hours', search: (prev) => prev })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Step 2</span>
              </Button>
            </div>
          </div>

          {/* Weekly Schedule Display */}
          <div className='space-y-3 pt-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                Weekly Operating Schedule
              </span>
              {operatingHours.is247 && (
                <Badge className='bg-indigo-600 text-white text-[10px] font-bold'>
                  Open 24/7 Active
                </Badge>
              )}
            </div>

            {operatingHours.is247 ? (
              <div className='p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-2.5'>
                <Sparkles className='size-4 text-indigo-600 shrink-0' />
                <span className='text-xs font-semibold text-indigo-950 dark:text-indigo-200'>
                  24/7 Unlimited Access • Workspace remains open continuously all 7 days with no closed intervals.
                </span>
              </div>
            ) : (
              <div className='space-y-2.5'>
                {/* Consecutive Group Summary */}
                <div className='flex flex-wrap gap-2'>
                  {groupConsecutiveSchedule(operatingHours.schedule).map((group, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
                        group.isOpen
                          ? 'bg-muted/40 border-border'
                          : 'bg-muted/20 border-border/60 opacity-75'
                      }`}
                    >
                      <span className='font-bold text-foreground'>{group.daysLabel}:</span>
                      {group.isOpen ? (
                        <div className='flex items-center gap-1.5'>
                          <span className='font-medium text-foreground'>{group.timeRange}</span>
                          {typeof group.durationHours === 'number' && group.durationHours > 0 && (
                            <Badge variant='secondary' className='text-[10px] h-4 px-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold'>
                              {group.durationHours} hrs
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant='outline' className='text-[10px] h-4 px-1.5 bg-muted text-muted-foreground'>
                          Closed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* 7-Day Visual Strip */}
                <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1'>
                  {operatingHours.schedule.map((day) => {
                    const shortName = DAY_SHORT_LABELS[day.day] || day.label;
                    return (
                      <div
                        key={day.day}
                        className={`p-2.5 rounded-lg border text-center transition-colors ${
                          day.isOpen
                            ? 'bg-background border-border/80 shadow-2xs'
                            : 'bg-muted/30 border-dashed border-border/60 opacity-60'
                        }`}
                      >
                        <span className='text-[11px] font-bold text-foreground block'>{shortName}</span>
                        {day.isOpen ? (
                          <div className='mt-1'>
                            <span className='text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate'>
                              {day.openTime}
                            </span>
                            <span className='text-[9px] text-muted-foreground block leading-tight'>to</span>
                            <span className='text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate'>
                              {day.closeTime}
                            </span>
                          </div>
                        ) : (
                          <span className='text-[10px] font-medium text-muted-foreground mt-1.5 block'>
                            Closed
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Operating Policies Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs'>
            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                Public Holidays Policy
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                {operatingHours.blockHolidays ? (
                  <>
                    <ShieldCheck className='size-3.5 text-emerald-600 shrink-0' />
                    <span>Auto-block on 5 statutory holidays (11 official days + compensatory)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className='size-3.5 text-muted-foreground shrink-0' />
                    <span>Standard hours apply on public holidays (No auto-block)</span>
                  </>
                )}
              </span>
            </div>

            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                Check-in Grace Period
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                {operatingHours.allowGracePeriod ? (
                  <>
                    <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
                    <span>15-minute early check-in allowed before official opening</span>
                  </>
                ) : (
                  <>
                    <Clock className='size-3.5 text-muted-foreground shrink-0' />
                    <span>Standard check-in at scheduled booking start</span>
                  </>
                )}
              </span>
            </div>

            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                Check-in Access Type
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                <QrCode className='size-3.5 text-indigo-600 shrink-0' />
                <span>Automated QR Gate &amp; Smart Turnstile Access</span>
              </span>
            </div>

            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                Cancellation Policy
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
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
                onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create/amenities', search: (prev) => prev })}
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>Edit Step 3-4</span>
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
      </main>

      {/* ==================== ELEVATED STICKY ACTION BAR ==================== */}
      <div className='fixed bottom-4 left-4 right-4 sm:left-8 sm:right-8 z-30 pointer-events-none'>
        <div className='max-w-4xl mx-auto pointer-events-auto bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 px-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4'>
          {/* Progress Indicator */}
          <div className='flex flex-col w-full sm:w-auto'>
            <div className='flex items-center gap-3'>
              <span className='text-xs sm:text-sm font-bold text-foreground'>
                {completedSectionsCount} of {auditSections.length} Overview Sections Ready ({auditScorePercent}%)
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
              Save as DRAFT and return to Workspaces, or continue to Setup Floor &amp; Zone.
            </span>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center gap-3 w-full sm:w-auto justify-end'>
            <Button
              type='button'
              variant='outline'
              disabled={isSaving || isSubmitting}
              onClick={handleSaveAsDraftAndExit}
              className='h-10 px-4 text-xs sm:text-sm font-medium border-border gap-1.5'
            >
              {isSaving || isSubmitting ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
              <span>{isSaving ? 'Saving Draft...' : 'Save Draft'}</span>
            </Button>

            <Button
              type='button'
              disabled={isSubmitting || isSaving}
              onClick={handleGoToSetupFloorAndZone}
              className='h-10 px-5 text-xs sm:text-sm font-semibold gap-2 shadow-xs transition-all bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              <span>Go to Setup Floor &amp; Zone</span>
              {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
            </Button>
          </div>
        </div>
      </div>

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
                <span>{location.streetAddress || 'Address will be inherited from the linked building'}</span>
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
