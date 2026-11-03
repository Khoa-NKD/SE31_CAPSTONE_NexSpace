import React, { useState, useEffect, useTransition } from 'react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { authService } from '@/features/auth/api/auth-service';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  LogOut,
  Clock,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useRouter } from '@tanstack/react-router';

function getPasswordStrength(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  return score;
}

export function ProfileSettingsView() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Profile Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar || '');
  const [isUpdatingProfile, startUpdateProfile] = useTransition();

  // Password Form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, startChangePassword] = useTransition();

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || user.avatar || '');
    }
  }, [user]);

  // Load fresh profile from backend
  useEffect(() => {
    authService
      .getMe()
      .then((freshUser) => {
        setUser(freshUser);
      })
      .catch(() => {
        // Fallback to store
      });
  }, [setUser]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startUpdateProfile(async () => {
      try {
        const updatedUser = await authService.updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined
        });

        setUser(updatedUser);
        toast.success('Cập nhật thông tin hồ sơ thành công!');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          toast.error(payload?.message || err.message || 'Cập nhật hồ sơ thất bại');
        } else {
          toast.error('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
        }
      }
    });
  };

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

  const initials = (
    (user?.firstName?.[0] || user?.fullName?.[0] || user?.userName?.[0] || 'U')
  ).toUpperCase();
  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className='space-y-6 max-w-5xl mx-auto pb-12'>
      {/* Top Profile Summary Header Card */}
      <Card className='border border-border/80 bg-gradient-to-r from-card via-card to-muted/20 shadow-sm'>
        <CardContent className='p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6'>
          <div className='flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left'>
            <Avatar className='w-20 h-20 ring-4 ring-indigo-500/20 border-2 border-border'>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.userName || 'User'} />}
              <AvatarFallback className='text-xl font-bold bg-indigo-600 text-white'>
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className='space-y-1.5'>
              <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2'>
                <h2 className='text-xl sm:text-2xl font-bold text-foreground tracking-tight'>
                  {user?.fullName || `${firstName} ${lastName}`.trim() || user?.userName}
                </h2>
                <Badge
                  variant='outline'
                  className='border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]'
                >
                  {user?.role || (user?.roles?.length ? user.roles[0] : 'USER')}
                </Badge>
                {user?.status === 'ACTIVE' ? (
                  <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'>
                    <CheckCircle2 className='w-3 h-3 mr-1' /> Hoạt động (ACTIVE)
                  </Badge>
                ) : (
                  <Badge variant='destructive'>{user?.status || 'PENDING'}</Badge>
                )}
              </div>

              <p className='text-sm text-muted-foreground font-mono'>{user?.email}</p>
              <p className='text-xs text-muted-foreground/80 flex items-center justify-center sm:justify-start gap-1.5 pt-0.5'>
                <Clock className='w-3.5 h-3.5' />
                <span>Tài khoản khởi tạo: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}</span>
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleSignOut}
              className='px-3.5 py-2 rounded-lg text-xs font-medium border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer'
            >
              <LogOut className='w-3.5 h-3.5' />
              <span>Đăng xuất phiên</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Tabs */}
      <Tabs defaultValue='profile' className='w-full'>
        <TabsList className='grid grid-cols-3 max-w-md mb-6'>
          <TabsTrigger value='profile' className='flex items-center gap-2 cursor-pointer'>
            <User className='w-4 h-4' />
            <span>Hồ sơ</span>
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

        {/* TAB 1: PROFILE MANAGEMENT */}
        <TabsContent value='profile'>
          <Card className='border border-border/80'>
            <CardHeader>
              <CardTitle className='text-lg font-bold'>Thông tin hồ sơ người dùng</CardTitle>
              <CardDescription>
                Cập nhật thông tin hiển thị của bạn trong hệ sinh thái quản lý không gian NexSpace.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className='space-y-5'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-medium text-foreground mb-1.5'>
                      Họ đệm (First Name):
                    </label>
                    <input
                      type='text'
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder='Nguyễn Văn'
                      className='w-full h-10 px-3 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-medium text-foreground mb-1.5'>
                      Tên (Last Name):
                    </label>
                    <input
                      type='text'
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder='An'
                      className='w-full h-10 px-3 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-medium text-foreground mb-1.5'>
                      Số điện thoại liên hệ:
                    </label>
                    <input
                      type='tel'
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder='0987654321'
                      className='w-full h-10 px-3 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-medium text-foreground mb-1.5'>
                      Đường dẫn ảnh đại diện (Avatar URL):
                    </label>
                    <input
                      type='url'
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder='https://images.unsplash.com/...'
                      className='w-full h-10 px-3 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all'
                    />
                  </div>
                </div>

                <div className='pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                      Tên đăng nhập (Username - Khóa bảo mật):
                    </label>
                    <input
                      type='text'
                      value={user?.userName || ''}
                      disabled
                      className='w-full h-10 px-3 text-sm bg-muted/60 text-muted-foreground border border-input rounded-lg cursor-not-allowed font-mono'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                      Email định danh (Primary Email):
                    </label>
                    <input
                      type='email'
                      value={user?.email || ''}
                      disabled
                      className='w-full h-10 px-3 text-sm bg-muted/60 text-muted-foreground border border-input rounded-lg cursor-not-allowed font-mono'
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className='flex justify-end gap-3 pt-4 border-t border-border/80'>
                <button
                  type='submit'
                  disabled={isUpdatingProfile}
                  className='h-10 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer'
                >
                  {isUpdatingProfile ? (
                    <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      <span>Lưu thông tin</span>
                    </>
                  )}
                </button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 2: SECURITY & PASSWORD CHANGE */}
        <TabsContent value='security'>
          <Card className='border border-border/80'>
            <CardHeader>
              <CardTitle className='text-lg font-bold'>Đổi mật khẩu tài khoản</CardTitle>
              <CardDescription>
                Thay đổi mật khẩu đăng nhập định kỳ để đảm bảo an toàn cho dữ liệu không gian và quyền truy cập.
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
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
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
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
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
                        {passwordStrength >= 3 ? 'Mật khẩu mạnh' : passwordStrength === 2 ? 'Mật khẩu trung bình' : 'Mật khẩu yếu'}
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
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
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
    </div>
  );
}

export default ProfileSettingsView;

