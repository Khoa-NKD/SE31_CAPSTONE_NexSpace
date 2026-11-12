import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2, Clock, LogOut, ShieldCheck, Mail, User as UserIcon } from 'lucide-react';
import type { UserDto } from '../api/types';

interface ProfileOverviewCardProps {
  user: UserDto | null;
  onOpenAvatarDialog: () => void;
  onSignOut: () => void;
}

export function ProfileOverviewCard({ user, onOpenAvatarDialog, onSignOut }: ProfileOverviewCardProps) {
  const avatarUrl = user?.avatarUrl || user?.avatar || '';
  const initial = (
    user?.firstName?.[0] || user?.fullName?.[0] || user?.userName?.[0] || 'U'
  ).toUpperCase();

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.userName ||
    'Người dùng NexSpace';

  return (
    <Card className='border border-border/80 bg-gradient-to-r from-card via-card to-muted/20 shadow-sm overflow-hidden'>
      <CardContent className='p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6'>
        <div className='flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left'>
          {/* Avatar with Camera Trigger Overlay */}
          <div className='relative group'>
            <Avatar className='w-20 h-20 ring-4 ring-indigo-500/20 border-2 border-border shadow-md'>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className='object-cover' />}
              <AvatarFallback className='text-xl font-bold bg-indigo-600 text-white select-none'>
                {initial}
              </AvatarFallback>
            </Avatar>
            <button
              type='button'
              onClick={onOpenAvatarDialog}
              title='Quản lý ảnh đại diện'
              className='absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md ring-2 ring-background transition-transform active:scale-95 cursor-pointer'
            >
              <Camera className='w-3.5 h-3.5' />
            </button>
          </div>

          {/* User Details */}
          <div className='space-y-1.5'>
            <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2'>
              <h2 className='text-xl sm:text-2xl font-bold text-foreground tracking-tight'>
                {displayName}
              </h2>

              <Badge
                variant='outline'
                className='border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]'
              >
                {user?.role || (user?.roles?.length ? user.roles[0] : 'USER')}
              </Badge>

              {user?.status === 'ACTIVE' ? (
                <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'>
                  <CheckCircle2 className='w-3 h-3 mr-1' /> Hoạt động
                </Badge>
              ) : (
                <Badge variant='destructive'>{user?.status || 'PENDING'}</Badge>
              )}

              {user?.verified && (
                <Badge variant='secondary' className='text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'>
                  <ShieldCheck className='w-3 h-3 mr-1' /> Đã xác minh
                </Badge>
              )}
            </div>

            <div className='flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5'>
              <span className='flex items-center gap-1 font-mono'>
                <Mail className='w-3.5 h-3.5 text-muted-foreground/70' />
                {user?.email}
              </span>
              <span className='flex items-center gap-1 font-mono'>
                <UserIcon className='w-3.5 h-3.5 text-muted-foreground/70' />
                @{user?.userName}
              </span>
            </div>

            <div className='flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80 pt-1'>
              <span className='flex items-center gap-1'>
                <Clock className='w-3 h-3' />
                Tài khoản tạo: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
              </span>
              {user?.lastLoginAt && (
                <span className='flex items-center gap-1'>
                  <Clock className='w-3 h-3 text-indigo-500' />
                  Đăng nhập gần nhất: {new Date(user.lastLoginAt).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Sign Out Action */}
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onSignOut}
            className='px-3.5 py-2 rounded-lg text-xs font-medium border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <LogOut className='w-3.5 h-3.5' />
            <span>Đăng xuất phiên</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

