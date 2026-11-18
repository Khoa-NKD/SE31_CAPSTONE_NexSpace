import { cancellationPolicyError, defaultCancellationRules } from '@/features/workspaces/utils/cancellation-policy';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
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
import { getWizardCategoryLabel, getWizardDayLabel } from '../utils/wizard-copy';

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

function groupConsecutiveSchedule(
  schedule: DaySchedule[],
  c: (en: string, vi: string) => string
): ScheduleGroup[] {
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
      const first = getWizardDayLabel(currentGroupDays[0].day, c);
      const last = getWizardDayLabel(currentGroupDays[currentGroupDays.length - 1].day, c);
      const daysLabel = currentGroupDays.length === 1 ? first : `${first} – ${last}`;
      const isOpen = currentGroupDays[0].isOpen;
      const duration = isOpen
        ? calculateDayDurationHours(currentGroupDays[0].openTime, currentGroupDays[0].closeTime)
        : undefined;
      groups.push({
        daysLabel,
        timeRange: isOpen
          ? `${currentGroupDays[0].openTime} – ${currentGroupDays[0].closeTime}`
          : 'Closed',
        isOpen,
        durationHours: duration
      });
      currentGroupDays = [day];
      currentKey = key;
    }
  }

  if (currentGroupDays.length > 0) {
    const first = getWizardDayLabel(currentGroupDays[0].day, c);
    const last = getWizardDayLabel(currentGroupDays[currentGroupDays.length - 1].day, c);
    const daysLabel = currentGroupDays.length === 1 ? first : `${first} – ${last}`;
    const isOpen = currentGroupDays[0].isOpen;
    const duration = isOpen
      ? calculateDayDurationHours(currentGroupDays[0].openTime, currentGroupDays[0].closeTime)
      : undefined;
    groups.push({
      daysLabel,
      timeRange: isOpen
        ? `${currentGroupDays[0].openTime} – ${currentGroupDays[0].closeTime}`
        : 'Closed',
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
  const c = useOrganizerCopy();
  const router = useRouter();
  const { basicInfo, location, operatingHours, cancellationRules, amenities, media, saveDraft, setSubmissionStatus } =
    useWizardStore();

  const { isSaving, saveDraftToServer } = useWizardDraftSync();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Validation audits for Steps 1–4
  const isBasicInfoValid = Boolean(
    basicInfo.name && basicInfo.category && basicInfo.contactPhone && basicInfo.contactEmail
  );
  const isOperatingHoursValid =
    operatingHours.is247 ||
    (operatingHours.schedule.some((s) => s.isOpen) &&
      operatingHours.schedule.every(
        (s) => !s.isOpen || isOperatingTimeRangeValid(s.openTime, s.closeTime)
      ));
  const isCancellationPolicyValid = !cancellationPolicyError(cancellationRules ?? defaultCancellationRules(), c);
  const isAmenitiesValid = amenities.length >= 1;

  const durableMediaCount = media.items.filter(isItemValidMedia).length;
  const hasDurableCover = Boolean(
    media.coverPhotoId &&
    media.items.some((item) => item.id === media.coverPhotoId && isItemValidMedia(item))
  );
  const hasOnlyLocalPreviews = media.items.length > 0 && durableMediaCount === 0;
  const isMediaValid = durableMediaCount >= 1 && (hasDurableCover || durableMediaCount > 0);

  // Calculate audit score across the 3 core onboarding sections (Steps 1–4)
  const auditSections = [
    { id: 'basic_info', name: 'Basic Information', valid: isBasicInfoValid },
    { id: 'hours', name: 'Operating Hours & Access', valid: isOperatingHoursValid && isCancellationPolicyValid },
    {
      id: 'media_amenities',
      name: 'Amenities & Media Assets',
      valid: isAmenitiesValid && isMediaValid
    }
  ];

  const completedSectionsCount = auditSections.filter((s) => s.valid).length;
  const auditScorePercent = Math.round((completedSectionsCount / auditSections.length) * 100);
  const isReadyForSubmission = completedSectionsCount === auditSections.length;

  const coverPhoto = media.items.find((item) => item.id === media.coverPhotoId) || media.items[0];

  const handleSaveAsDraftAndExit = async () => {
    setIsSubmitting(true);
    try {
      const saved = await saveDraftToServer({ silent: true });
      if (!saved) return;
      setSubmissionStatus('draft');
      saveDraft();
      toast.success(c('Workspace Saved as Draft', 'Đã lưu bản nháp không gian'), {
        description: `${basicInfo.name || c('Workspace', 'Không gian')}${saved?.id ? ` (#${saved.id})` : ''} has been saved in DRAFT status.`
      });
      router.navigate({ to: '/dashboard/organizer/workspaces' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft';
      toast.error(c('Save Draft Error', 'Không thể lưu bản nháp'), { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToSetupFloorAndZone = async () => {
    setIsSubmitting(true);
    try {
      const saved = await saveDraftToServer({ silent: true });
      if (!saved) return;
      setSubmissionStatus('draft');
      saveDraft();

      const numericWorkspaceId = Number(saved.id);

      toast.success(c('Workspace Draft Saved', 'Đã lưu bản nháp không gian'), {
        description: 'Redirecting to Floor Plan & Zones setup...'
      });

      if (
        numericWorkspaceId &&
        Number.isSafeInteger(numericWorkspaceId) &&
        numericWorkspaceId > 0
      ) {
        router.navigate({
          to: '/dashboard/organizer/floorplan',
          search: { workspaceId: numericWorkspaceId }
        });
      } else {
        router.navigate({ to: '/dashboard/organizer/floorplan' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to proceed to Floor & Zone setup';
      toast.error(c('Navigation Error', 'Không thể chuyển trang'), { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground pb-28'>
      {/* Sub-Header / Breadcrumbs */}
      <div className='px-4 sm:px-8 pt-4 pb-2 border-b border-border bg-card/60 backdrop-blur-xs'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs'>
          <nav
            aria-label={c('Breadcrumb', 'Điều hướng')}
            className='flex items-center gap-1.5 text-muted-foreground truncate'
          >
            <span className='hover:text-foreground transition-colors'>
              {c('Workspaces', 'Không gian')}
            </span>
            <span>&gt;</span>
            <span className='font-medium text-foreground truncate'>
              {basicInfo.name || c('New Workspace', 'Không gian mới')}
            </span>
            <span>&gt;</span>
            <span className='font-bold text-indigo-600 dark:text-indigo-400'>
              {c('Overview & Review', 'Tổng quan và kiểm tra')}
            </span>
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
              {c('Pre-Flight Audit •', 'Kiểm tra hồ sơ •')} {auditScorePercent}
              {c('% Ready', '% hoàn tất')}
            </Badge>

            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsPreviewModalOpen(true)}
              className='h-7 px-2.5 text-xs gap-1.5 border-border hover:bg-muted'
            >
              <Eye className='size-3.5 text-muted-foreground' />
              <span>{c('Preview Listing', 'Xem trước trang giới thiệu')}</span>
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
            <span>{c('Workspace Overview & Review', 'Tổng quan và kiểm tra không gian')}</span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
            {c('Workspace Overview & Review', 'Tổng quan và kiểm tra không gian')}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            {c(
              'Review your workspace information, operating hours, amenities, and gallery photos before saving or proceeding to floor plan and zones setup.',
              'Kiểm tra thông tin, giờ hoạt động, tiện ích và ảnh trước khi lưu hoặc thiết lập sơ đồ.'
            )}
          </p>

          {/* Readiness Alert Banner */}
          {isReadyForSubmission ? (
            <div className='mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-3'>
              <ShieldCheck className='size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-foreground'>
                  {c(
                    'Workspace overview details complete!',
                    'Thông tin không gian đã đầy đủ!'
                  )}{' '}
                </span>
                {c('Choose', 'Chọn')} <strong>{c('Save Draft', 'Lưu bản nháp')}</strong>{' '}
                {c(
                  'to return to your workspace list in DRAFT status, or',
                  'để về danh sách không gian ở trạng thái bản nháp, hoặc'
                )}{' '}
                <strong>{c('Go to Setup Floor & Zone', 'Thiết lập tầng và khu vực')}</strong>{' '}
                {c(
                  'to proceed to floor and zone configuration.',
                  'để tiếp tục cấu hình tầng và khu vực.'
                )}
              </div>
            </div>
          ) : (
            <div className='mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3'>
              <AlertTriangle className='size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-foreground'>
                  {c('Some sections are still incomplete.', 'Một số mục chưa đầy đủ.')}{' '}
                </span>

                {c(
                  'Please review and complete all required sections before continuing.',
                  'Hãy hoàn thành các mục bắt buộc trước khi tiếp tục.'
                )}
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
                <h2 className='text-sm sm:text-base font-bold text-foreground'>
                  {c('Basic Information', 'Thông tin cơ bản')}
                </h2>
                <p className='text-xs text-muted-foreground'>
                  {c(
                    'Workspace identity, space category, usable area, description & contact hotline',
                    'Tên, loại hình, mô tả và thông tin liên hệ của không gian'
                  )}
                </p>
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
                onClick={() =>
                  router.navigate({
                    to: '/dashboard/organizer/workspaces/create',
                    search: (prev) => prev
                  })
                }
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>{c('Edit Step 1', 'Sửa bước 1')}</span>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm'>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Workspace Public Name', 'Tên công khai của không gian')}
              </span>
              <span className='font-semibold text-foreground mt-0.5 block'>
                {basicInfo.name || c('Not provided', 'Chưa cung cấp')}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Space Category', 'Loại hình không gian')}
              </span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {getWizardCategoryLabel(basicInfo.category, c)}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                Total Usable Area
              </span>
              <span className='font-semibold text-foreground mt-0.5 block'>
                {basicInfo.totalArea ? `${basicInfo.totalArea} m² (sqm)` : '0 m²'}
              </span>
            </div>
            <div className='sm:col-span-2 lg:col-span-3'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Short Description', 'Mô tả ngắn')}
              </span>
              <p className='font-normal text-foreground/90 mt-0.5 bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs sm:text-sm leading-relaxed'>
                {basicInfo.description ? (
                  basicInfo.description
                ) : (
                  <span className='italic text-muted-foreground'>
                    {c('No description provided', 'Chưa có mô tả')}
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Booking Inquiry Hotline', 'Số điện thoại hỗ trợ đặt chỗ')}
              </span>
              <span className='font-medium text-foreground mt-0.5 block font-mono'>
                {basicInfo.contactPhone || c('Not provided', 'Chưa cung cấp')}
              </span>
            </div>
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Venue Support Email', 'Email hỗ trợ của không gian')}
              </span>
              <span className='font-medium text-foreground mt-0.5 block'>
                {basicInfo.contactEmail || c('Not provided', 'Chưa cung cấp')}
              </span>
            </div>
            {location.entryNotes && (
              <div className='sm:col-span-2 lg:col-span-3'>
                <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                  {c('Entry Instructions', 'Hướng dẫn vào không gian')}
                </span>
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
                <h2 className='text-sm sm:text-base font-bold text-foreground'>
                  {c('Operating Hours & Access Policy', 'Giờ hoạt động và chính sách ra vào')}
                </h2>
                <p className='text-xs text-muted-foreground'>
                  {c(
                    'Weekly operating schedules, statutory holiday exceptions & door access protocols',
                    'Lịch hoạt động trong tuần, ngày lễ và quy định ra vào'
                  )}
                </p>
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
                onClick={() =>
                  router.navigate({
                    to: '/dashboard/organizer/workspaces/create/hours',
                    search: (prev) => prev
                  })
                }
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>{c('Edit Step 2', 'Sửa bước 2')}</span>
              </Button>
            </div>
          </div>

          {/* Weekly Schedule Display */}
          <div className='space-y-3 pt-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Weekly Operating Schedule', 'Lịch hoạt động trong tuần')}
              </span>
              {operatingHours.is247 && (
                <Badge className='bg-indigo-600 text-white text-[10px] font-bold'>
                  {c('Open 24/7 Active', 'Đang mở cửa 24/7')}
                </Badge>
              )}
            </div>

            {operatingHours.is247 ? (
              <div className='p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-2.5'>
                <Sparkles className='size-4 text-indigo-600 shrink-0' />
                <span className='text-xs font-semibold text-indigo-950 dark:text-indigo-200'>
                  {c(
                    '24/7 Unlimited Access • Workspace remains open continuously all 7 days with no closed intervals.',
                    'Hoạt động 24/7 • Không gian mở cửa liên tục cả 7 ngày trong tuần.'
                  )}
                </span>
              </div>
            ) : (
              <div className='space-y-2.5'>
                {/* Consecutive Group Summary */}
                <div className='flex flex-wrap gap-2'>
                  {groupConsecutiveSchedule(operatingHours.schedule, c).map((group, idx) => (
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
                            <Badge
                              variant='secondary'
                              className='text-[10px] h-4 px-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold'
                            >
                              {group.durationHours} {c('hrs', 'giờ')}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge
                          variant='outline'
                          className='text-[10px] h-4 px-1.5 bg-muted text-muted-foreground'
                        >
                          {c('Closed', 'Đóng cửa')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* 7-Day Visual Strip */}
                <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1'>
                  {operatingHours.schedule.map((day) => {
                    const shortName = getWizardDayLabel(day.day, c);
                    return (
                      <div
                        key={day.day}
                        className={`p-2.5 rounded-lg border text-center transition-colors ${
                          day.isOpen
                            ? 'bg-background border-border/80 shadow-2xs'
                            : 'bg-muted/30 border-dashed border-border/60 opacity-60'
                        }`}
                      >
                        <span className='text-[11px] font-bold text-foreground block'>
                          {shortName}
                        </span>
                        {day.isOpen ? (
                          <div className='mt-1'>
                            <span className='text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate'>
                              {day.openTime}
                            </span>
                            <span className='text-[9px] text-muted-foreground block leading-tight'>
                              {c('to', 'đến')}
                            </span>
                            <span className='text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate'>
                              {day.closeTime}
                            </span>
                          </div>
                        ) : (
                          <span className='text-[10px] font-medium text-muted-foreground mt-1.5 block'>
                            {c('Closed', 'Đóng cửa')}
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
                {c('Public Holidays Policy', 'Chính sách ngày lễ')}
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                {operatingHours.blockHolidays ? (
                  <>
                    <ShieldCheck className='size-3.5 text-emerald-600 shrink-0' />
                    <span>
                      {c(
                        'Auto-block on 5 statutory holidays (11 official days + compensatory)',
                        'Tự động ngừng nhận đặt vào ngày lễ (11 ngày chính thức và ngày nghỉ bù)'
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className='size-3.5 text-muted-foreground shrink-0' />
                    <span>
                      {c(
                        'Standard hours apply on public holidays (No auto-block)',
                        'Áp dụng giờ hoạt động thông thường vào ngày lễ'
                      )}
                    </span>
                  </>
                )}
              </span>
            </div>

            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Check-in Grace Period', 'Thời gian nhận chỗ sớm')}
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                {operatingHours.allowGracePeriod ? (
                  <>
                    <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
                    <span>
                      {c(
                        '15-minute early check-in allowed before official opening',
                        'Cho phép nhận chỗ sớm 15 phút'
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className='size-3.5 text-muted-foreground shrink-0' />
                    <span>
                      {c('Standard check-in at scheduled booking start', 'Nhận chỗ đúng giờ đặt')}
                    </span>
                  </>
                )}
              </span>
            </div>

            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Check-in Access Type', 'Hình thức ra vào')}
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                <QrCode className='size-3.5 text-indigo-600 shrink-0' />
                <span>
                  {c(
                    'Automated QR Gate & Smart Turnstile Access',
                    'Cổng QR và cổng kiểm soát thông minh'
                  )}
                </span>
              </span>
            </div>

            <div className='p-2.5 rounded-lg border border-border/60 bg-muted/20'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider block'>
                {c('Cancellation Policy', 'Chính sách hủy')}
              </span>
              <span className='font-medium text-foreground mt-1 flex items-center gap-1.5'>
                <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
                <span>
                  {(cancellationRules ?? defaultCancellationRules()).map((rule) => `${rule.minHoursBeforeStart}h: ${rule.refundPercent}%`).join(' · ')}
                </span>
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
                <h2 className='text-sm sm:text-base font-bold text-foreground'>
                  {c('Amenities & Media Assets', 'Tiện ích và thư viện ảnh')}
                </h2>
                <p className='text-xs text-muted-foreground'>
                  {c(
                    'Facility perks, high-resolution photography & hero media assets',
                    'Tiện ích, ảnh chất lượng cao và ảnh bìa'
                  )}
                </p>
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
                onClick={() =>
                  router.navigate({
                    to: '/dashboard/organizer/workspaces/create/amenities',
                    search: (prev) => prev
                  })
                }
                className='h-8 text-xs text-muted-foreground hover:text-indigo-600 gap-1'
              >
                <Edit className='size-3.5' />
                <span className='hidden sm:inline'>{c('Edit Step 3-4', 'Sửa bước 3–4')}</span>
              </Button>
            </div>
          </div>

          {/* Amenities Badges */}
          <div>
            <div className='flex items-center justify-between text-xs mb-2'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider'>
                {c('Selected Amenities (', 'Tiện ích đã chọn (')}
                {amenities.length} {c('Verified)', 'đã xác minh)')}
              </span>
              <span className='text-muted-foreground text-[11px]'>
                {c('Certified by host', 'Đối tác xác nhận')}
              </span>
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
                  +{amenities.length - 10} {c('more', 'khác')}
                </span>
              )}
            </div>
          </div>

          {/* Local Previews Warning Banner if no durable media */}
          {hasOnlyLocalPreviews && (
            <div className='p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs'>
              <AlertTriangle className='size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
              <div>
                <p className='font-semibold'>
                  {c(
                    'Local Previews Only (Upload Service Offline)',
                    'Chỉ có ảnh xem trước (dịch vụ tải ảnh ngoại tuyến)'
                  )}
                </p>
                <p className='mt-0.5 text-amber-800/90 dark:text-amber-300/90'>
                  {c(
                    'Your gallery contains only temporary local file previews. Because cloud storage is not connected, these photos cannot be saved to the server or submitted for review. At least 1 durable photograph is required.',
                    'Thư viện chỉ có ảnh xem trước tạm thời, chưa lưu lên máy chủ. Cần ít nhất 1 ảnh đã tải lên để gửi hồ sơ.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Media Previews Grid */}
          <div>
            <div className='flex items-center justify-between text-xs mb-2'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider'>
                {c('Media Assets (', 'Thư viện ảnh (')}
                {media.items.length} {c('Photos in Gallery)', 'ảnh)')}
              </span>
              <span className='text-muted-foreground text-[11px]'>
                {c('Standard 16:9 ratio', 'Tỷ lệ tiêu chuẩn 16:9')}
              </span>
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
                    <span>{c('Cover Photo', 'Ảnh bìa')}</span>
                  </span>
                </div>
              )}
              {/* Other Thumbnails */}
              {media.items
                .filter((m) => m.id !== coverPhoto?.id)
                .slice(0, 2)
                .map((photo) => (
                  <div
                    key={photo.id}
                    className='relative h-32 rounded-lg overflow-hidden border border-border group bg-muted'
                  >
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
                {completedSectionsCount} {c('of', 'trên')} {auditSections.length}{' '}
                {c('Overview Sections Ready (', 'Các mục đã hoàn tất (')}
                {auditScorePercent}%)
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
              {c(
                'Save as DRAFT and return to Workspaces, or continue to Setup Floor & Zone.',
                'Lưu bản nháp và về danh sách không gian, hoặc tiếp tục thiết lập tầng và khu vực.'
              )}
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
              {isSaving || isSubmitting ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Save className='size-4' />
              )}
              <span>
                {isSaving
                  ? c(c('Saving Draft...', 'Đang lưu bản nháp...'), 'Đang lưu bản nháp...')
                  : c('Save Draft', 'Lưu bản nháp')}
              </span>
            </Button>

            <Button
              type='button'
              disabled={isSubmitting || isSaving}
              onClick={handleGoToSetupFloorAndZone}
              className='h-10 px-5 text-xs sm:text-sm font-semibold gap-2 shadow-xs transition-all bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              <span>{c('Go to Setup Floor & Zone', 'Thiết lập tầng và khu vực')}</span>
              {isSubmitting ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <ArrowRight className='size-4' />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ==================== MODAL: PREVIEW LISTING ==================== */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {c('Public Marketplace Listing Preview', 'Xem trước trang không gian công khai')}
            </DialogTitle>
            <DialogDescription>
              {c(
                'This is how customers will see your workspace in the NexSpace mobile & web apps.',
                'Đây là cách khách hàng nhìn thấy không gian trên ứng dụng và website NexSpace.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            {coverPhoto && (
              <div className='relative w-full aspect-video rounded-xl overflow-hidden border border-border'>
                <img
                  src={coverPhoto.url}
                  alt={basicInfo.name}
                  className='w-full h-full object-cover'
                />
                <div className='absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs font-semibold'>
                  {basicInfo.category.replace('_', ' ')}
                </div>
              </div>
            )}
            <div>
              <h3 className='text-lg font-bold text-foreground'>{basicInfo.name}</h3>
              <p className='text-xs text-muted-foreground flex items-center gap-1 mt-1'>
                <MapPin className='size-3.5 text-muted-foreground' />
                <span>
                  {location.streetAddress || 'Address will be inherited from the linked building'}
                </span>
              </p>
              <p className='text-xs text-foreground mt-2 leading-relaxed'>
                {basicInfo.description}
              </p>
            </div>
            <div className='border-t border-border pt-3'>
              <h4 className='text-xs font-bold text-foreground mb-1.5'>
                {c('Featured Amenities', 'Tiện ích nổi bật')}
              </h4>
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
            <Button variant='outline' onClick={() => setIsPreviewModalOpen(false)}>
              {c('Close Preview', 'Đóng xem trước')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
