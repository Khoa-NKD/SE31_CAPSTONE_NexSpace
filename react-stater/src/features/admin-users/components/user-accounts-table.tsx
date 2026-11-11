import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, HelpCircle, Phone, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUserRecord } from '../api/types';
import { getUserInitial } from '../api/service';
import { ChangeRoleDialog } from './change-role-dialog';

interface UserAccountsTableProps {
  users: AdminUserRecord[];
  selectedUserId?: string;
  onSelectUser: (user: AdminUserRecord) => void;
  isLoading?: boolean;
  totalElements?: number;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function UserAccountsTable({
  users,
  selectedUserId,
  onSelectUser,
  isLoading = false,
  totalElements,
  totalPages,
  currentPage: propCurrentPage,
  onPageChange
}: UserAccountsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [internalPage, setInternalPage] = useState<number>(1);
  const [roleTargetUser, setRoleTargetUser] = useState<AdminUserRecord | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);

  const currentPage = propCurrentPage ?? internalPage;
  const resolvedTotalPages = totalPages ?? 1;
  const resolvedTotalAccounts = totalElements ?? users.length;

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Card className='rounded-xl border border-border/80 overflow-hidden shadow-xs bg-card'>
      {/* Table Stats Header Toolbar */}
      <div className='px-4 py-3 bg-muted/60 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          <span>
            Hiển thị <strong className='text-foreground font-semibold'>{users.length}</strong> tài khoản
            {resolvedTotalAccounts > users.length
              ? ` (trên tổng số ${resolvedTotalAccounts.toLocaleString()} tài khoản hệ thống)`
              : ''}
          </span>
          <span className='inline-block size-1 rounded-full bg-border' />
          <button
            type='button'
            onClick={() => {
              setSelectedIds(users.map((u) => u.id));
              toast.info('Đã chọn hàng loạt', {
                description: `Đã chọn ${users.length} tài khoản trên trang hiện tại.`
              });
            }}
            className='text-primary font-semibold hover:underline cursor-pointer'
          >
            Chọn tất cả trang này
          </button>
        </div>

        {/* Pagination indicators */}
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            aria-label='Trang trước'
          >
            <ChevronLeft className='size-4' aria-hidden='true' />
          </Button>

          <span className='font-mono text-xs font-semibold text-foreground px-2'>
            Trang {currentPage} / {resolvedTotalPages || 1}
          </span>

          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            disabled={currentPage >= resolvedTotalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            aria-label='Trang tiếp'
          >
            <ChevronRight className='size-4' aria-hidden='true' />
          </Button>
        </div>
      </div>

      {/* Table Viewport */}
      <div className='overflow-x-auto min-w-0'>
        <table className='w-full min-w-[860px] text-left border-collapse text-xs'>
          <thead>
            <tr className='bg-muted/80 h-9 border-b border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-wider select-none'>
              <th className='w-10 px-3 text-center'>
                <Checkbox
                  checked={selectedIds.length === users.length && users.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label='Select all users on current page'
                />
              </th>
              <th className='w-28 px-3 py-2 font-semibold'>User ID</th>
              <th className='min-w-[200px] px-3 py-2 font-semibold'>Full Name &amp; Profile</th>
              <th className='min-w-[160px] px-3 py-2 font-semibold'>Email Address</th>
              <th className='w-32 px-3 py-2 font-semibold'>Role</th>
              <th className='w-32 px-3 py-2 font-semibold'>Account Status</th>
              <th className='w-32 px-3 py-2 font-semibold'>Verification</th>
              <th className='w-36 px-3 py-2 font-semibold'>Số điện thoại</th>
            </tr>
          </thead>

          <tbody className='divide-y divide-border/60'>
            {users.map((user) => {
              const isSelected = selectedUserId === user.id;
              const isChecked = selectedIds.includes(user.id);

              const rawStatusUpper = String(user.status || '').toUpperCase();
              const isLocked = rawStatusUpper === 'LOCKED';
              const isActive = rawStatusUpper === 'ACTIVE';
              const isInactive = rawStatusUpper === 'INACTIVE';
              const isDeleted = rawStatusUpper === 'DELETED';

              const rawRoleUpper = String(user.role || '').toUpperCase();
              const isOrg = rawRoleUpper === 'ORGANIZER';
              const isAdmin = rawRoleUpper === 'ADMIN' || rawRoleUpper === 'ADMINISTRATOR';

              const displayName = user.name || user.fullName || user.userName || user.email || `User #${user.id}`;
              const displayCompany = user.company || (isOrg ? 'Nhà tổ chức' : isAdmin ? 'Quản trị viên' : 'Thành viên');

              return (
                <tr
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectUser(user);
                    }
                  }}
                  tabIndex={0}
                  className={`cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-l-2 border-primary'
                      : isChecked
                      ? 'bg-muted/40 hover:bg-muted/50'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <td
                    className='w-10 px-3 text-center'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRow(user.id);
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked
                            ? [...prev.filter((i) => i !== user.id), user.id]
                            : prev.filter((i) => i !== user.id)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Chọn ${displayName}`}
                    />
                  </td>

                  <td className='px-3 py-3'>
                    <span className='font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground text-[11px] border border-border/80'>
                      {user.id}
                    </span>
                  </td>

                  <td className='px-3 py-3' aria-label={displayName}>
                    <div className='flex items-center gap-2.5'>
                      <Avatar className='size-8 shrink-0 rounded-full border border-border/80 shadow-2xs'>
                        {user.avatarUrl ? (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={displayName}
                            className='w-full h-full object-cover'
                          />
                        ) : null}
                        <AvatarFallback className='rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 font-bold text-xs select-none'>
                          {getUserInitial(displayName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <span className='font-semibold text-foreground block truncate leading-tight'>
                          {displayName}
                        </span>
                        <span className='text-[10px] text-muted-foreground block truncate'>
                          {displayCompany}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className='px-3 py-3 font-mono text-muted-foreground text-[11px]'>
                    {user.email}
                  </td>

                  <td className='px-3 py-3'>
                    <button
                      type='button'
                      disabled={isDeleted}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDeleted) return;
                        setRoleTargetUser(user);
                        setIsRoleModalOpen(true);
                      }}
                      title={
                        isDeleted
                          ? 'Không thể đổi vai trò của tài khoản đã xóa'
                          : 'Bấm để đổi vai trò của người dùng'
                      }
                      aria-label={
                        isDeleted
                          ? `Không thể đổi vai trò của ${displayName}`
                          : `Đổi vai trò của ${displayName}`
                      }
                      className={`inline-flex items-center gap-1 group/role focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary rounded-full ${
                        isDeleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <Badge
                        variant='outline'
                        className={`text-[11px] font-semibold transition-all flex items-center gap-1 ${
                          !isDeleted ? 'group-hover/role:shadow-xs group-hover/role:scale-105 cursor-pointer ' : ''
                        }${
                          isOrg
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 group-hover/role:border-indigo-400'
                            : isAdmin
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 group-hover/role:border-purple-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 group-hover/role:border-slate-400'
                        }`}
                      >
                        <span>{isAdmin ? 'Quản trị viên' : isOrg ? 'Nhà tổ chức' : 'Khách hàng'}</span>
                        {!isDeleted && <UserCog className='size-2.5 opacity-60 group-hover/role:opacity-100 transition-opacity' />}
                      </Badge>
                    </button>
                  </td>

                  <td className='px-3 py-3'>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : isLocked
                          ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                          : isInactive
                          ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                          : isDeleted
                          ? 'bg-slate-200/80 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 line-through'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-500'
                            : isLocked
                            ? 'bg-red-500'
                            : isInactive
                            ? 'bg-amber-500'
                            : isDeleted
                            ? 'bg-slate-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {isActive
                        ? 'Hoạt động'
                        : isLocked
                        ? 'Đã khóa'
                        : isInactive
                        ? 'Tạm ngưng'
                        : isDeleted
                        ? 'Đã xóa'
                        : user.status}
                    </span>
                  </td>

                  <td className='px-3 py-3'>
                    {user.kycStatus === 'Verified KYC' || user.verified === true ? (
                      <span className='inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium'>
                        <CheckCircle2 className='size-3.5 text-emerald-600' />
                        <span>Đã xác minh</span>
                      </span>
                    ) : user.kycStatus === 'Pending KYC' ? (
                      <span className='inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium'>
                        <Clock className='size-3.5 text-amber-500' />
                        <span>Chờ KYC</span>
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1 text-muted-foreground font-medium'>
                        <HelpCircle className='size-3.5 text-slate-400' />
                        <span>Chưa xác minh</span>
                      </span>
                    )}
                  </td>

                  <td className='px-3 py-3 text-muted-foreground font-mono text-[11px]'>
                    {user.phone && user.phone !== 'Chưa cập nhật' ? (
                      <span className='text-foreground font-medium flex items-center gap-1.5'>
                        <Phone className='size-3 text-muted-foreground shrink-0' />
                        <span>{user.phone}</span>
                      </span>
                    ) : (
                      <span className='text-muted-foreground/60 italic'>Chưa cập nhật</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {isLoading && (
              <tr>
                <td colSpan={8} aria-label='Loading users from Mock API' className='py-12 text-center text-muted-foreground'>
                  <div className='flex items-center justify-center gap-2'>
                    <div className='size-4 border-2 border-primary border-t-transparent animate-spin rounded-full' />
                    <span>Loading users from Mock API...</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={8} className='py-8 text-center text-muted-foreground'>
                  No accounts matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className='px-4 py-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2'>
        <div>
          <span>
            Đang hiển thị {users.length} tài khoản{' '}
            {resolvedTotalAccounts > users.length ? `trong tổng số ${resolvedTotalAccounts.toLocaleString()} tài khoản` : ''}
          </span>
        </div>
        <div className='flex items-center gap-1 font-mono text-[11px]'>
          <span>Cơ sở dữ liệu NexSpace</span>
          <span>•</span>
          <span>Phân trang máy chủ</span>
        </div>
      </div>

      {/* Pop-up xác nhận đổi vai trò trực tiếp từ bảng */}
      <ChangeRoleDialog
        user={roleTargetUser}
        open={isRoleModalOpen}
        onOpenChange={setIsRoleModalOpen}
      />
    </Card>
  );
}
