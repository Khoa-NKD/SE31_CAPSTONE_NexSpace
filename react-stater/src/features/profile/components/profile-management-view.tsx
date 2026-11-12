import React, { useState, useEffect, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { User, KeyRound, ShieldCheck, Shield, Building2, CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/store/auth-store';
import { authService } from '@/features/auth/api/auth-service';
import { ApiError } from '@/lib/api-client';
import { profileQueryOptions } from '../api/queries';
import { ProfileOverviewCard } from './profile-overview-card';
import { ProfileForm } from './profile-form';
import { AvatarManagerDialog } from './avatar-manager-dialog';

function getPasswordStrength(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  return score;
}

export function ProfileManagementView() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  // Password Change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, startChangePassword] = useTransition();

  // Load fresh profile from GET /api/users/me
  const { data: freshUser } = useQuery(profileQueryOptions());

  // Sync to auth store
  useEffect(() => {
    if (freshUser) {
      setUser(freshUser);
    }
  }, [freshUser, setUser]);

  const activeUser = freshUser || authUser;

  // Handle password change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có tối thiểu 8 ký tự!');
      return;
    }
    if (newPassword === oldPassword) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    startChangePassword(async () => {
      try {
        await authService.changePassword({
          oldPassword,
          newPassword,
          confirmNewPassword
        });

        toast.success('Đổi mật khẩu thành công! Vui lòng bảo mật mật khẩu mới.');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          toast.error(payload?.message || err.message || 'Đổi mật khẩu không thành công');
        } else {
          toast.error('Lỗi máy chủ khi đổi mật khẩu.');
        }
      }
    });
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore
    } finally {
      clearAuth();
      toast.success('Đã đăng xuất thành công.');
      router.navigate({ to: '/auth/sign-in' });
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className='space-y-6 max-w-5xl mx-auto pb-12'>
      {/* 1. Profile Overview Header Card */}
      <ProfileOverviewCard
        user={activeUser}
        onOpenAvatarDialog={() => setIsAvatarDialogOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Tabs */}
      <Tabs defaultValue='profile' className='w-full'>
        <TabsList className='grid grid-cols-3 max-w-md mb-6'>
          <TabsTrigger value='profile' className='flex items-center gap-2 cursor-pointer'>
            <User className='w-4 h-4' />
            <span>Hồ sơ cá nhân</span>
          </TabsTrigger>
          <TabsTrigger value='security' className='flex items-center gap-2 cursor-pointer'>
            <KeyRound className='w-4 h-4' />
            <span>Đổi mật khẩu</span>
          </TabsTrigger>
          <TabsTrigger value='audit' className='flex items-center gap-2 cursor-pointer'>
            <ShieldCheck className='w-4 h-4' />
            <span>An toàn & BR-03</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFILE MANAGEMENT & FORM */}
        <TabsContent value='profile' className='space-y-4'>
          <ProfileForm user={activeUser} />
        </TabsContent>

        {/* TAB 2: SECURITY & PASSWORD CHANGE */}
        <TabsContent value='security'>
          <Card className='border border-border/80'>
            <CardHeader>
              <CardTitle className='text-lg font-bold'>Đổi mật khẩu tài khoản</CardTitle>
              <CardDescription>
                Thay đổi mật khẩu đăng nhập định kỳ để đảm bảo an toàn cho dữ liệu và quyền truy cập.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className='space-y-4 max-w-lg'>
                <div>
                  <label className='block text-xs font-medium text-foreground mb-1.5'>
                    Mật khẩu hiện tại:
                  </label>
                  <div className='relative'>
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder='••••••••'
                      required
                      className='w-full h-10 px-3 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600'
                    />
                    <button
                      type='button'
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer'
                    >
                      {showOldPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-medium text-foreground mb-1.5'>
                    Mật khẩu mới (Tối thiểu 8 ký tự):
                  </label>
                  <div className='relative'>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder='••••••••'
                      required
                      className='w-full h-10 px-3 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600'
                    />
                    <button
                      type='button'
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer'
                    >
                      {showNewPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className='mt-2 space-y-1'>
                      <div className='flex gap-1 h-1.5'>
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 rounded-full ${
                              step <= passwordStrength
                                ? passwordStrength >= 3
                                  ? 'bg-emerald-500'
                                  : passwordStrength === 2
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className='text-[11px] text-muted-foreground text-right'>
                        {passwordStrength >= 3
                          ? 'Mật khẩu mạnh'
                          : passwordStrength === 2
                            ? 'Mật khẩu trung bình'
                            : 'Mật khẩu yếu'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className='block text-xs font-medium text-foreground mb-1.5'>
                    Xác nhận mật khẩu mới:
                  </label>
                  <div className='relative'>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder='••••••••'
                      required
                      className='w-full h-10 px-3 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600'
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer'
                    >
                      {showConfirmPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className='flex justify-end gap-3 pt-4 border-t border-border/80'>
                <button
                  type='submit'
                  disabled={isChangingPassword || !oldPassword || !newPassword}
                  className='h-10 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer'
                >
                  {isChangingPassword ? (
                    <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  ) : (
                    <>
                      <KeyRound className='w-4 h-4' />
                      <span>Cập nhật mật khẩu</span>
                    </>
                  )}
                </button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 3: AUDIT & BR-03 TELEMETRY */}
        <TabsContent value='audit'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            <Card className='border border-border/80'>
              <CardHeader>
                <div className='flex items-center gap-2 text-indigo-600 dark:text-indigo-400'>
                  <Shield className='w-5 h-5' />
                  <CardTitle className='text-base font-bold'>Cơ chế chống Brute-Force (BR-03)</CardTitle>
                </div>
                <CardDescription>
                  Bảo vệ tài khoản tự động chống tấn công dò quét mật khẩu độc hại.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 text-xs text-muted-foreground leading-relaxed'>
                <div className='p-3 rounded-lg bg-muted/40 border border-border flex items-start gap-2.5'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-500 shrink-0 mt-0.5' />
                  <span>
                    Hệ thống giới hạn tối đa <strong>5 lần</strong> đăng nhập sai liên tiếp.
                  </span>
                </div>
                <div className='p-3 rounded-lg bg-muted/40 border border-border flex items-start gap-2.5'>
                  <Clock className='w-4 h-4 text-indigo-500 shrink-0 mt-0.5' />
                  <span>
                    Nếu vượt quá 5 lần, tài khoản tự động bị khóa tạm thời trong <strong>15 phút</strong>.
                  </span>
                </div>
                <div className='p-3 rounded-lg bg-muted/40 border border-border flex items-start gap-2.5'>
                  <ShieldCheck className='w-4 h-4 text-blue-500 shrink-0 mt-0.5' />
                  <span>
                    Trạng thái khóa tự động giải phóng khi người dùng đặt lại mật khẩu thành công qua email.
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className='border border-border/80'>
              <CardHeader>
                <div className='flex items-center gap-2 text-indigo-600 dark:text-indigo-400'>
                  <Building2 className='w-5 h-5' />
                  <CardTitle className='text-base font-bold'>Nhật ký kiểm toán Quản trị (BR-31)</CardTitle>
                </div>
                <CardDescription>
                  Mọi thao tác thay đổi trạng thái tài khoản bởi Quản trị viên đều ghi vết bắt buộc.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 text-xs text-muted-foreground leading-relaxed'>
                <div className='p-3 rounded-lg bg-muted/40 border border-border'>
                  <p className='font-semibold text-foreground mb-1'>Lý do khóa / mở khóa:</p>
                  <p>Bắt buộc ghi rõ lý do khi Admin thực hiện đổi trạng thái tài khoản.</p>
                </div>
                <div className='p-3 rounded-lg bg-muted/40 border border-border'>
                  <p className='font-semibold text-foreground mb-1'>Tiêu chuẩn mã hóa Token:</p>
                  <p>Stateless JWT Token sử dụng thuật toán HMAC-SHA256, thời hạn 24 giờ kèm cơ chế Revocation Blacklist khi đăng xuất.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 3. Avatar Manager Dialog */}
      <AvatarManagerDialog
        open={isAvatarDialogOpen}
        onOpenChange={setIsAvatarDialogOpen}
        user={activeUser}
      />
    </div>
  );
}

export default ProfileManagementView;

