import { BankSelector } from './bank-selector';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  LoaderCircle
} from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useBusinessTypes } from '@/features/organizer-application/hooks/use-business-types';
import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  businessContactSchema,
  bankDetailsSchema,
  businessProfileMutationOptions,
  businessProfileQueryOptions
} from '../api/profile';
import type {
  BusinessContactInput,
  OrganizerBusinessProfile,
  BusinessProfileInput
} from '../api/profile';

const emptySubscribe = () => () => {};
function useCopy() {
  const { language } = useLanguage();
  return (en: string, vi: string) => (language === 'vi' ? vi : en);
}

export function BusinessProfileView() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const c = useCopy();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const actorId = user?.id ?? 0;
  const allowed = !!token && !!user && getUserRole(user) === 'ORGANIZER';
  const query = useQuery({ ...businessProfileQueryOptions(actorId), enabled: mounted && allowed });
  if (!mounted || (allowed && query.isPending))
    return (
      <p role='status'>{c('Loading business profile…', 'Đang tải thông tin doanh nghiệp…')}</p>
    );
  if (!allowed)
    return (
      <p role='alert'>
        {c(
          'Sign in with an Organizer account to access your business profile.',
          'Vui lòng đăng nhập bằng tài khoản Organizer.'
        )}
      </p>
    );
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : undefined;
    return (
      <div className='space-y-3' role='alert'>
        <p>{query.error.message}</p>
        {status === 401 ? (
          <Link to='/auth/sign-in' className='text-primary underline'>
            {c('Sign in again', 'Đăng nhập lại')}
          </Link>
        ) : status !== 403 && status !== 404 && status !== 409 ? (
          <Button onClick={() => void query.refetch()}>{c('Try again', 'Thử lại')}</Button>
        ) : null}
      </div>
    );
  }
  if (!query.data)
    return (
      <p role='status'>{c('Loading business profile…', 'Đang tải thông tin doanh nghiệp…')}</p>
    );
  return (
    <BusinessContactForm
      key={`${actorId}:${query.data.id}`}
      actorId={actorId}
      profile={query.data}
    />
  );
}

function BusinessContactForm({
  profile,
  actorId
}: {
  profile: OrganizerBusinessProfile;
  actorId: number;
}) {
  const c = useCopy();
  const businessTypes = useBusinessTypes();
  const queryClient = useQueryClient();
  const mutation = useMutation(businessProfileMutationOptions(queryClient, actorId));
  const submitting = useRef(false);
  const [notice, setNotice] = useState({ success: '', error: '' });
  const [bankName, setBankName] = useState(profile.bankName ?? '');
  const [bankHolder, setBankHolder] = useState(profile.bankAccountHolder ?? '');
  const [bankNumber, setBankNumber] = useState('');
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const form = useForm<BusinessContactInput>({
    resolver: zodResolver(businessContactSchema),
    defaultValues: contactValues(profile)
  });
  useApplicationNotice(
    notice.success,
    notice.error,
    mutation.isPending || form.formState.isSubmitting
  );
  const bankDirty =
    bankName.trim() !== (profile.bankName ?? '') ||
    bankHolder.trim() !== (profile.bankAccountHolder ?? '') ||
    bankNumber.trim() !== '';
  const dirty = form.formState.isDirty || bankDirty;
  const busy = mutation.isPending || form.formState.isSubmitting;
  const legalFields = [
    [c('Legal business name', 'Tên pháp lý doanh nghiệp'), profile.legalName],
    [c('Business type', 'Loại hình kinh doanh'), businessTypes.label(profile.businessType)],
    [c('Tax ID', 'Mã số thuế'), profile.taxId],
    [c('Legal representative', 'Người đại diện pháp luật'), profile.representativeName]
  ];

  const onSubmit = async (contacts: BusinessContactInput) => {
    if (submitting.current) return;
    setNotice({ success: '', error: '' });
    setBankErrors({});
    const input: BusinessProfileInput = { ...contacts };
    if (bankDirty) {
      const parsed = bankDetailsSchema.safeParse({
        bankName,
        bankAccountHolder: bankHolder,
        bankAccountNumber: bankNumber
      });
      const errors: Record<string, string> = {};
      if (!parsed.success)
        for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
      if (!bankNumber.trim() && !profile.bankAccountLastFour)
        errors.bankAccountNumber = c(
          'Enter a new account number before saving bank details.',
          'Vui lòng nhập số tài khoản trước khi lưu thông tin ngân hàng.'
        );
      if (Object.keys(errors).length) {
        setBankErrors(errors);
        return;
      }
      if (parsed.success) input.bankDetails = parsed.data;
    }
    submitting.current = true;
    try {
      const updated = await mutation.mutateAsync(input);
      form.reset(contactValues(updated));
      setBankName(updated.bankName ?? '');
      setBankHolder(updated.bankAccountHolder ?? '');
      setBankNumber('');
      setNotice({
        success: c('Business profile updated successfully.', 'Đã cập nhật thông tin doanh nghiệp.'),
        error: ''
      });
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.validationErrors ?? {})) {
          if (field in businessContactSchema.shape)
            form.setError(field as keyof BusinessContactInput, { message });
          else if (field.startsWith('bankDetails.'))
            setBankErrors((current) => ({
              ...current,
              [field.slice('bankDetails.'.length)]: message
            }));
        }
        if (error.status === 403 || error.status === 409)
          void queryClient.invalidateQueries({
            queryKey: businessProfileQueryOptions(actorId).queryKey,
            exact: true
          });
      }
      setNotice({
        success: '',
        error:
          error instanceof Error
            ? error.message
            : c('Could not save your business profile.', 'Không thể lưu thông tin doanh nghiệp.')
      });
    } finally {
      submitting.current = false;
    }
  };

  const cancel = () => {
    form.reset(contactValues(profile));
    setBankName(profile.bankName ?? '');
    setBankHolder(profile.bankAccountHolder ?? '');
    setBankNumber('');
    setBankErrors({});
    setNotice({ success: '', error: '' });
  };

  return (
    <div className='mx-auto w-full max-w-6xl space-y-6 pb-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <div className='bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl'>
            <Building2 className='size-7' />
          </div>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
              {c('Business Profile', 'Hồ sơ doanh nghiệp')}
            </h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              {c(
                'Manage your business contact and banking details.',
                'Quản lý thông tin liên hệ và tài khoản ngân hàng doanh nghiệp.'
              )}
            </p>
          </div>
        </div>
        <Badge
          variant='outline'
          className='border-primary/20 bg-primary/5 text-primary gap-1.5 px-3 py-1.5'
        >
          <ShieldCheck />
          {c('Verified business', 'Doanh nghiệp đã xác minh')}
        </Badge>
      </div>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className='space-y-6'
      >
        <Card className='overflow-hidden'>
          <CardHeader className='border-border border-b bg-muted/30'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <LockKeyhole className='text-muted-foreground size-5' />
              {c('Legal information', 'Thông tin pháp lý')}
            </CardTitle>
            <CardDescription>
              {c(
                'Verified legal details are read-only. Contact details can be updated below.',
                'Thông tin pháp lý đã xác minh chỉ được xem. Bạn có thể cập nhật thông tin liên hệ bên dưới.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-x-8 gap-y-6 pt-6 sm:grid-cols-2'>
            {legalFields.map(([label, value]) => (
              <div key={label} className='min-w-0 space-y-1.5'>
                <p className='text-muted-foreground text-sm'>{label}</p>
                <p className='text-foreground break-words text-sm font-medium'>
                  {value || c('Not provided', 'Chưa cung cấp')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className='grid items-start gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <Phone className='text-primary size-5' />
                {c('Contact details', 'Thông tin liên hệ')}
              </CardTitle>
              <CardDescription>
                {c(
                  'Keep your business contact information up to date.',
                  'Cập nhật địa chỉ và các kênh liên hệ của doanh nghiệp.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <fieldset disabled={busy} className='space-y-5 disabled:opacity-70'>
                {(
                  [
                    ['address', c('Business address', 'Địa chỉ doanh nghiệp'), 500, MapPin],
                    ['contactEmail', c('Contact email', 'Email liên hệ'), 255, Mail],
                    ['contactPhone', c('Contact phone', 'Số điện thoại liên hệ'), 20, Phone]
                  ] as const
                ).map(([name, label, maxLength, Icon]) => (
                  <div key={name} className='space-y-2'>
                    <label htmlFor={`business-${name}`} className='text-sm font-medium'>
                      {label} <span className='text-destructive'>*</span>
                    </label>
                    <div className='relative'>
                      <Icon className='text-muted-foreground pointer-events-none absolute top-3 left-3 size-4' />
                      <Input
                        id={`business-${name}`}
                        className='pl-10'
                        type={
                          name === 'contactEmail'
                            ? 'email'
                            : name === 'contactPhone'
                              ? 'tel'
                              : 'text'
                        }
                        maxLength={maxLength}
                        {...form.register(name)}
                        aria-required='true'
                        aria-invalid={!!form.formState.errors[name]}
                        aria-describedby={
                          form.formState.errors[name] ? `business-${name}-error` : undefined
                        }
                      />
                    </div>
                    {form.formState.errors[name] ? (
                      <p
                        id={`business-${name}-error`}
                        role='alert'
                        className='text-destructive text-sm'
                      >
                        {form.formState.errors[name]?.message}
                      </p>
                    ) : null}
                  </div>
                ))}
              </fieldset>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Landmark className='text-primary size-5' />
                  {c('Bank account', 'Tài khoản ngân hàng')}
                </CardTitle>
                <Badge variant='secondary'>{c('Optional', 'Không bắt buộc')}</Badge>
              </div>
              <CardDescription>
                {c(
                  'Save the bank account used by your business. This does not initiate a transfer.',
                  'Lưu tài khoản ngân hàng của doanh nghiệp. Thao tác này không thực hiện chuyển tiền.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='border-border bg-muted/30 flex gap-3 rounded-xl border p-3 text-sm'>
                <ShieldCheck className='text-primary mt-0.5 size-4 shrink-0' />
                <div>
                  <p className='font-medium'>
                    {profile.bankAccountLastFour
                      ? c('Saved account: ', 'Tài khoản đã lưu: ') +
                        '•••• ' +
                        profile.bankAccountLastFour
                      : profile.bankAccountConfigured
                        ? c(
                            'Re-enter the account number to update legacy bank details.',
                            'Nhập lại số tài khoản để cập nhật thông tin ngân hàng cũ.'
                          )
                        : c('No bank account added', 'Chưa thêm tài khoản ngân hàng')}
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {c(
                      'Account numbers are encrypted and only the last four digits are displayed.',
                      'Số tài khoản được mã hóa và chỉ hiển thị 4 số cuối.'
                    )}
                  </p>
                </div>
              </div>
              {!profile.bankingAvailable ? (
                <p role='status' className='text-muted-foreground text-sm'>
                  {c(
                    'Bank account updates are temporarily unavailable. Contact details can still be saved.',
                    'Tạm thời chưa thể cập nhật ngân hàng. Bạn vẫn có thể lưu thông tin liên hệ.'
                  )}
                </p>
              ) : null}
              <fieldset
                disabled={busy || !profile.bankingAvailable}
                className='space-y-5 disabled:opacity-60'
              >
                <BankSelector
                  value={bankName}
                  onChange={setBankName}
                  disabled={busy || !profile.bankingAvailable}
                  error={bankErrors.bankName}
                />
                {(
                  [
                    [
                      'bankAccountHolder',
                      c('Account holder', 'Chủ tài khoản'),
                      bankHolder,
                      setBankHolder,
                      c('Name registered with the bank', 'Tên chủ tài khoản đăng ký tại ngân hàng'),
                      UserRound
                    ],
                    [
                      'bankAccountNumber',
                      c('New account number', 'Số tài khoản mới'),
                      bankNumber,
                      setBankNumber,
                      profile.bankAccountLastFour
                        ? c('Leave blank to keep the saved number', 'Để trống để giữ số đang lưu')
                        : c('Enter the bank account number', 'Nhập số tài khoản ngân hàng'),
                      LockKeyhole
                    ]
                  ] as const
                ).map(([name, label, value, setValue, placeholder, Icon]) => (
                  <div key={name} className='space-y-2'>
                    <label htmlFor={`business-${name}`} className='text-sm font-medium'>
                      {label}
                    </label>
                    <div className='relative'>
                      <Icon className='text-muted-foreground pointer-events-none absolute top-3 left-3 size-4' />
                      <Input
                        id={`business-${name}`}
                        className='pl-10'
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        type='text'
                        inputMode={name === 'bankAccountNumber' ? 'numeric' : undefined}
                        autoComplete='off'
                        spellCheck={false}
                        maxLength={name === 'bankAccountNumber' ? 34 : 100}
                        placeholder={placeholder}
                        aria-invalid={!!bankErrors[name]}
                        aria-describedby={bankErrors[name] ? `${name}-error` : undefined}
                      />
                    </div>
                    {bankErrors[name] ? (
                      <p id={`${name}-error`} role='alert' className='text-destructive text-sm'>
                        {bankErrors[name]}
                      </p>
                    ) : null}
                  </div>
                ))}
              </fieldset>
            </CardContent>
          </Card>
        </div>
        <div className='border-border bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 sm:px-6'>
          <p className='text-muted-foreground flex items-center gap-2 text-sm'>
            <ShieldCheck className='size-4 shrink-0' />
            {c(
              'Updating these details keeps your business approval unchanged.',
              'Cập nhật thông tin này không thay đổi trạng thái đã duyệt.'
            )}
          </p>
          <div className='flex gap-3'>
            <Button type='button' variant='outline' disabled={busy || !dirty} onClick={cancel}>
              {c('Cancel changes', 'Hủy thay đổi')}
            </Button>
            <Button type='submit' disabled={busy || !dirty}>
              {busy ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <Save className='size-4' />
              )}
              {busy ? c('Saving…', 'Đang lưu…') : c('Save changes', 'Lưu thay đổi')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function contactValues(profile: OrganizerBusinessProfile): BusinessContactInput {
  return {
    address: profile.address ?? '',
    contactEmail: profile.contactEmail ?? '',
    contactPhone: profile.contactPhone ?? ''
  };
}
