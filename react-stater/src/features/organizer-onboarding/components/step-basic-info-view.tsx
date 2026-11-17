import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { WizardHeader } from './wizard-header';
import { WizardStepper } from './wizard-stepper';
import { useWizardStore } from '../store/wizard-store';
import { useWizardDraftSync } from '../hooks/use-wizard-draft-sync';
import { getWizardCategoryLabel, getWizardValidationMessage } from '../utils/wizard-copy';
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

interface StepBasicInfoViewProps {
  routeWorkspaceId?: string;
}

export function StepBasicInfoView({
  routeWorkspaceId: _routeWorkspaceId
}: StepBasicInfoViewProps = {}) {
  const c = useOrganizerCopy();
  const router = useRouter();
  const basicInfo = useWizardStore((state) => state.basicInfo);
  const setBasicInfo = useWizardStore((state) => state.setBasicInfo);
  const { canonicalWorkspaceId, serverVersion, isSaving, saveDraftToServer } = useWizardDraftSync();

  // Form local state initialized from store and updated when store hydrates
  const [name, setName] = useState(basicInfo.name);
  const [category, setCategory] = useState<SpaceCategory>(basicInfo.category);
  const [description, setDescription] = useState(basicInfo.description);
  const [contactPhone, setContactPhone] = useState(basicInfo.contactPhone);
  const [contactEmail, setContactEmail] = useState(basicInfo.contactEmail);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setName((prev) => (prev !== basicInfo.name ? basicInfo.name : prev));
    setCategory((prev) => (prev !== basicInfo.category ? basicInfo.category : prev));
    setDescription((prev) => (prev !== basicInfo.description ? basicInfo.description : prev));
    setContactPhone((prev) => (prev !== basicInfo.contactPhone ? basicInfo.contactPhone : prev));
    setContactEmail((prev) => (prev !== basicInfo.contactEmail ? basicInfo.contactEmail : prev));
  }, [basicInfo]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSaveDraft = async () => {
    setBasicInfo({
      name,
      category,
      description,
      contactPhone,
      contactEmail
    });
    await saveDraftToServer();
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      name: name.trim(),
      category,
      description: description.trim(),
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
      toast.error(c(c('Validation Error', 'Thông tin chưa hợp lệ'), 'Thông tin chưa hợp lệ'), {
        description: c(
          'Please correct the highlighted fields before proceeding.',
          'Vui lòng sửa các mục được đánh dấu trước khi tiếp tục.'
        )
      });
      return;
    }

    setErrors({});
    setBasicInfo(values);
    await saveDraftToServer({ silent: true });
    router.navigate({ to: '/dashboard/organizer/workspaces/create/hours', search: (prev) => prev });
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
        <div className='mb-6 flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-indigo-700 dark:text-indigo-300'>
          <div className='flex items-center gap-3'>
            <CloudSync className='size-5 shrink-0' />
            <p className='text-xs sm:text-sm font-medium'>
              {canonicalWorkspaceId
                ? c(
                    `Draft #${canonicalWorkspaceId} saved (v${serverVersion || 1}).`,
                    `Đã lưu bản nháp #${canonicalWorkspaceId} (v${serverVersion || 1}).`
                  )
                : c(
                    'Changes will be saved as a draft to your account.',
                    'Thông tin sẽ được lưu thành bản nháp trong tài khoản của bạn.'
                  )}
            </p>
          </div>
          {canonicalWorkspaceId && (
            <Badge
              variant='outline'
              className='text-[11px] font-mono font-semibold bg-white dark:bg-card border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shrink-0'
            >
              {canonicalWorkspaceId}
            </Badge>
          )}
        </div>

        {/* Card Header */}
        <div className='border-b border-border pb-5 mb-6'>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight'>
            {c('Basic Information', 'Thông tin cơ bản')}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            {c(
              'Set up the public title and specifications of your workspace to attract suitable enterprise and flexible tenants.',
              'Thiết lập tên và thông tin không gian để khách hàng dễ dàng lựa chọn.'
            )}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleContinue} className='space-y-6'>
          {/* Field 1: Workspace Public Name */}
          <div>
            <label
              htmlFor='workspace-name'
              className='block text-xs sm:text-sm font-semibold text-foreground mb-1'
            >
              {c('Workspace Public Name', 'Tên công khai của không gian')}{' '}
              <span className='text-destructive'>*</span>
            </label>
            <p className='text-xs text-muted-foreground mb-2'>
              {c(
                'This will be displayed prominently across NexSpace marketplace and booking confirmations.',
                'Tên này xuất hiện trên NexSpace và trong xác nhận đặt chỗ.'
              )}
            </p>
            <Input
              id='workspace-name'
              type='text'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder={c(
                'e.g., NexSpace Executive Center Saigon',
                'VD: NexSpace Executive Center Saigon'
              )}
              className={`h-10 text-xs sm:text-sm ${errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {errors.name && (
              <p className='text-xs text-destructive mt-1 font-medium'>
                {getWizardValidationMessage(errors.name, c)}
              </p>
            )}
          </div>

          {/* Field 2: Space Category */}
          <div>
            <span
              id='space-category-label'
              className='block text-xs sm:text-sm font-semibold text-foreground mb-1'
            >
              {c('Space Category', 'Loại hình không gian')}{' '}
              <span className='text-destructive'>*</span>
            </span>
            <p className='text-xs text-muted-foreground mb-3'>
              {c(
                'Select the primary layout style that defines this venue.',
                'Chọn loại hình chính của không gian này.'
              )}
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
                        {getWizardCategoryLabel(cat.id, c)}
                      </h3>
                      <p className='text-[11px] sm:text-xs text-muted-foreground leading-snug'>
                        {c(
                          cat.description,
                          {
                            coworking_hub:
                              'Ghế linh hoạt, buồng làm việc riêng và khu vực cộng đồng.',
                            business_lounge: 'Phòng riêng, phòng họp cao cấp và dịch vụ hỗ trợ.',
                            creative_studio:
                              'Không gian mở, sản xuất ảnh/video và phòng dự án linh hoạt.'
                          }[cat.id]
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.category && (
              <p className='text-xs text-destructive mt-1 font-medium'>
                {getWizardValidationMessage(errors.category, c)}
              </p>
            )}
          </div>

          {/* Field 3: Short Description */}
          <div>
            <label
              htmlFor='workspace-description'
              className='block text-xs sm:text-sm font-semibold text-foreground mb-1'
            >
              {c('Short Description', 'Mô tả ngắn')}
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
                placeholder={c(
                  'Summarize your venue in 1-2 punchy sentences...',
                  'Giới thiệu không gian trong 1–2 câu ngắn gọn...'
                )}
                className={`text-xs sm:text-sm leading-relaxed resize-none ${errors.description ? 'border-destructive' : ''}`}
              />
            </div>
            <div className='flex items-center justify-between mt-1.5 text-xs text-muted-foreground'>
              <span>
                {c(
                  'Summarize your venue in 1-2 punchy sentences',
                  'Giới thiệu không gian trong 1–2 câu ngắn gọn'
                )}
              </span>
              <span className='font-mono font-medium'>
                {description.length} {c('/ 200 characters', '/ 200 ký tự')}
              </span>
            </div>
            {errors.description && (
              <p className='text-xs text-destructive mt-1 font-medium'>
                {getWizardValidationMessage(errors.description, c)}
              </p>
            )}
          </div>

          {/* Contact phone and support email */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='contact-phone'
                className='block text-xs sm:text-sm font-semibold text-foreground mb-1'
              >
                {c('Booking Inquiry Hotline', 'Số điện thoại hỗ trợ đặt chỗ')}{' '}
                <span className='text-destructive'>*</span>
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
              {errors.contactPhone && (
                <p className='text-xs text-destructive mt-1 font-medium'>
                  {getWizardValidationMessage(errors.contactPhone, c)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='contact-email'
                className='block text-xs sm:text-sm font-semibold text-foreground mb-1'
              >
                {c('Venue Support Email', 'Email hỗ trợ của không gian')}{' '}
                <span className='text-destructive'>*</span>
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
              {errors.contactEmail && (
                <p className='text-xs text-destructive mt-1 font-medium'>
                  {getWizardValidationMessage(errors.contactEmail, c)}
                </p>
              )}
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className='border-t border-border pt-6 mt-8 flex flex-wrap items-center justify-between gap-3'>
            <Button
              type='button'
              variant='outline'
              disabled={isSaving}
              onClick={handleSaveDraft}
              className='gap-2 text-xs sm:text-sm border-border hover:bg-muted'
            >
              {isSaving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
              <span>
                {isSaving
                  ? c(c('Saving Draft...', 'Đang lưu bản nháp...'), 'Đang lưu bản nháp...')
                  : c(c('Save as Draft', 'Lưu bản nháp'), 'Lưu bản nháp')}
              </span>
            </Button>

            <Button
              type='submit'
              disabled={isSaving}
              className='h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm gap-2 shadow-2xs'
            >
              <span>{c('Continue to Operating Hours', 'Tiếp tục đến giờ hoạt động')}</span>
              {isSaving ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <ArrowRight className='size-4' />
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
