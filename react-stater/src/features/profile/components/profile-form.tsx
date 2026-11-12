import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Lock, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { profileFormSchema, type ProfileFormValues } from '../schemas/profile-schema';
import { useUpdateProfileMutation } from '../api/mutations';
import { ApiError } from '@/lib/api-client';
import type { UserDto, UserGender } from '../api/types';

interface ProfileFormProps {
  user: UserDto | null;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<UserGender | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Confirmation pop-up state
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [pendingValues, setPendingValues] = useState<ProfileFormValues | null>(null);

  const updateProfileMutation = useUpdateProfileMutation();
  const isPending = updateProfileMutation.isPending;

  // Sync initial state when user loads or updates
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setBirthDate(user.birthDate || '');
      setGender(user.gender || '');
      setFieldErrors({});
    }
  }, [user]);

  // Reset to current user values
  const handleReset = () => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setBirthDate(user.birthDate || '');
      setGender(user.gender || '');
      setFieldErrors({});
      toast.info('Đã khôi phục dữ liệu ban đầu.');
    }
  };

  // Pre-submit validation
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const rawValues = {
      firstName,
      lastName,
      phone,
      birthDate,
      gender: (gender || undefined) as UserGender | undefined,
      avatar: user?.avatarUrl || user?.avatar || ''
    };

    const result = profileFormSchema.safeParse(rawValues);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        if (!errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError || 'Thông tin nhập chưa hợp lệ.');
      return;
    }

    setPendingValues(result.data);
    setShowConfirmSave(true);
  };

  // Confirmed -> Dispatch API
  const handleConfirmSave = async () => {
    if (!pendingValues) return;
    setShowConfirmSave(false);

    try {
      await updateProfileMutation.mutateAsync({
        firstName: pendingValues.firstName,
        lastName: pendingValues.lastName || undefined,
        phone: pendingValues.phone || undefined,
        birthDate: pendingValues.birthDate || undefined,
        gender: pendingValues.gender,
        avatar: pendingValues.avatar || undefined
      });

      toast.success('Cập nhật hồ sơ thành công!');
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = err.data as { message?: string; errors?: Record<string, string>; validationErrors?: Record<string, string> } | null;
        const validationErr = payload?.errors || payload?.validationErrors;
        if (validationErr) {
          setFieldErrors(validationErr);
        }
        toast.error(payload?.message || err.message || 'Cập nhật hồ sơ thất bại');
      } else {
        toast.error('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      }
    }
  };

  return (
    <>
      <Card className='border border-border/80'>
        <CardHeader>
          <CardTitle className='text-lg font-bold'>Thông tin hồ sơ người dùng</CardTitle>
          <CardDescription>
            Xem và cập nhật thông tin định danh cá nhân của bạn trong hệ sinh thái NexSpace.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmitForm}>
          <CardContent className='space-y-6'>
            {/* Row 1: Name fields */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='first-name-input' className='text-xs font-medium'>
                  Họ đệm (First Name) <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='first-name-input'
                  type='text'
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) {
                      setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                    }
                  }}
                  placeholder='Nguyễn Văn'
                  className={fieldErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {fieldErrors.firstName && (
                  <p className='text-[11px] text-red-500 flex items-center gap-1 mt-1'>
                    <AlertCircle className='w-3 h-3' />
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='last-name-input' className='text-xs font-medium'>
                  Tên (Last Name)
                </Label>
                <Input
                  id='last-name-input'
                  type='text'
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (fieldErrors.lastName) {
                      setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                    }
                  }}
                  placeholder='An'
                  className={fieldErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {fieldErrors.lastName && (
                  <p className='text-[11px] text-red-500 flex items-center gap-1 mt-1'>
                    <AlertCircle className='w-3 h-3' />
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Phone, Gender, BirthDate */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='phone-input' className='text-xs font-medium'>
                  Số điện thoại
                </Label>
                <Input
                  id='phone-input'
                  type='tel'
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: '' }));
                    }
                  }}
                  placeholder='0987654321'
                  className={fieldErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {fieldErrors.phone && (
                  <p className='text-[11px] text-red-500 flex items-center gap-1 mt-1'>
                    <AlertCircle className='w-3 h-3' />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Giới tính</Label>
                <Select
                  value={gender}
                  onValueChange={(val) => setGender(val as UserGender)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Chọn giới tính' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='MALE'>Nam (Male)</SelectItem>
                    <SelectItem value='FEMALE'>Nữ (Female)</SelectItem>
                    <SelectItem value='OTHER'>Khác (Other)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='birth-date-input' className='text-xs font-medium'>
                  Ngày sinh
                </Label>
                <Input
                  id='birth-date-input'
                  type='date'
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (fieldErrors.birthDate) {
                      setFieldErrors((prev) => ({ ...prev, birthDate: '' }));
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className={fieldErrors.birthDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {fieldErrors.birthDate && (
                  <p className='text-[11px] text-red-500 flex items-center gap-1 mt-1'>
                    <AlertCircle className='w-3 h-3' />
                    {fieldErrors.birthDate}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Read-only Account Identity */}
            <div className='pt-4 border-t border-border/80'>
              <h3 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5'>
                <Lock className='w-3.5 h-3.5' />
                <span>Thông tin tài khoản định danh (Không thể chỉnh sửa)</span>
              </h3>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    Tên đăng nhập (Username):
                  </Label>
                  <Input
                    type='text'
                    value={user?.userName || ''}
                    disabled
                    className='bg-muted/50 text-muted-foreground font-mono text-xs cursor-not-allowed'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    Email tài khoản:
                  </Label>
                  <Input
                    type='email'
                    value={user?.email || ''}
                    disabled
                    className='bg-muted/50 text-muted-foreground font-mono text-xs cursor-not-allowed'
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className='flex items-center justify-between pt-4 border-t border-border/80'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleReset}
              disabled={isPending}
              className='text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5'
            >
              <RotateCcw className='w-3.5 h-3.5' />
              <span>Khôi phục</span>
            </Button>

            <Button
              type='submit'
              size='sm'
              disabled={isPending}
              className='bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm'
            >
              {isPending ? (
                <div className='w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              ) : (
                <>
                  <Save className='w-3.5 h-3.5' />
                  <span>Lưu thông tin</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Confirmation Dialog: Save Profile */}
      <AlertDialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu thay đổi hồ sơ?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn cập nhật thông tin cá nhân không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              disabled={isPending}
              className='bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-medium shadow-sm transition-colors cursor-pointer'
            >
              Lưu thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

