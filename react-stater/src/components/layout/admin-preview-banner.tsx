import React from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';

export function AdminPreviewBanner() {
  const { pathname } = useLocation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setAdminViewMode = useAuthStore((state) => state.setAdminViewMode);

  // Không hiển thị banner khi đang ở trong các route của Dashboard Quản trị
  if (pathname.startsWith('/dashboard')) {
    return null;
  }

  // Chỉ hiển thị cho tài khoản có vai trò ADMIN
  if (!isAuthenticated || getUserRole(user) !== 'ADMIN') {
    return null;
  }

  const handleReturnToAdmin = () => {
    setAdminViewMode('admin');
    router.navigate({ to: '/dashboard/overview' });
  };

  return (
    <aside
      aria-label='Admin Customer Preview Mode'
      className='bg-slate-950/95 text-slate-100 border-b border-indigo-500/40 px-4 py-2 text-xs sticky top-0 z-[60] backdrop-blur-md shadow-md transition-all'
    >
      <div className='mx-auto max-w-[1440px] flex flex-wrap items-center justify-between gap-2.5'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='relative flex h-2 w-2 shrink-0'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75' />
            <span className='relative inline-flex rounded-full h-2 w-2 bg-indigo-500' />
          </span>
          <span className='font-mono font-bold text-indigo-400 tracking-wider text-[11px] shrink-0 uppercase'>
            [CHẾ ĐỘ QUẢN TRỊ VIÊN]
          </span>
          <span className='text-slate-300 truncate hidden sm:inline'>
            Bạn đang trải nghiệm giao diện với tư cách Khách hàng (Customer View). Mọi thao tác đều khả dụng.
          </span>
        </div>

        <button
          type='button'
          onClick={handleReturnToAdmin}
          className='inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-all duration-150 text-xs shadow-xs active:scale-95 cursor-pointer ml-auto shrink-0 border border-indigo-400/30'
        >
          <ShieldCheck className='size-3.5' />
          <span>Quay lại Trang Quản trị (Admin Console)</span>
          <ArrowRight className='size-3 ml-0.5' />
        </button>
      </div>
    </aside>
  );
}

export default AdminPreviewBanner;

