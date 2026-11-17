import { ShieldCheck, User, Mail, Smartphone, Receipt, Sparkles, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

interface BookerInfoCardProps {
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

export function BookerInfoCard({ notes = '', onNotesChange }: BookerInfoCardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.userName ||
    'Guest Booker';

  const email = user?.email || 'guest@nexspace.io';
  const phone = user?.phone || '+84 (Not registered)';

  return (
    <section className='bg-card border-border shadow-xs space-y-5 rounded-2xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex items-center justify-between border-b pb-4'>
        <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
          Booker Information
        </h2>
        {isAuthenticated ? (
          <span className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold'>
            <ShieldCheck className='h-3.5 w-3.5' />
            <span>Verified Customer Profile</span>
          </span>
        ) : (
          <span className='bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold'>
            <AlertCircle className='h-3.5 w-3.5' />
            <span>Unauthenticated Session</span>
          </span>
        )}
      </div>

      {!isAuthenticated && (
        <div className='rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
            <div>
              <p className='font-semibold'>You are not signed in</p>
              <p className='mt-0.5 text-muted-foreground'>
                Please sign in to confirm and save your booking to your dashboard.
              </p>
            </div>
            <Button size='sm' asChild className='h-8 shrink-0 text-xs font-semibold'>
              <Link to='/auth'>Sign in / Register</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Grid Fields */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {/* Full Name */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-name' className='text-foreground block text-xs font-medium'>
            Full Name
          </label>
          <div className='relative'>
            <input
              id='booker-name'
              type='text'
              readOnly
              value={fullName}
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <User className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Corporate Email */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-email' className='text-foreground block text-xs font-medium'>
            Email Address (for Digital Pass)
          </label>
          <div className='relative'>
            <input
              id='booker-email'
              type='email'
              readOnly
              value={email}
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <Mail className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Mobile Phone */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-phone' className='text-foreground block text-xs font-medium'>
            Mobile Phone (SMS Access PIN)
          </label>
          <div className='relative'>
            <input
              id='booker-phone'
              type='tel'
              readOnly
              value={phone}
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <Smartphone className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Account Status / ID */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-tax-id' className='text-foreground block text-xs font-medium'>
            Customer ID / Account
          </label>
          <div className='relative'>
            <input
              id='booker-tax-id'
              type='text'
              readOnly
              value={user ? `NX-CUST-${user.id}` : 'GUEST-SESSION'}
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none font-mono'
            />
            <Receipt className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Purpose of Visit / Booking Notes */}
        <div className='space-y-1.5 sm:col-span-2'>
          <label htmlFor='booker-purpose' className='text-foreground flex items-center justify-between text-xs font-medium'>
            <span>Special Requests or Notes for Concierge</span>
            <span className='text-muted-foreground text-[11px]'>Optional</span>
          </label>
          <div className='relative'>
            <input
              id='booker-purpose'
              type='text'
              value={notes}
              onChange={(e) => onNotesChange?.(e.target.value)}
              placeholder='e.g. Need external monitor setup, quiet call booth at 2 PM...'
              className='bg-card border-border text-foreground focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border px-3 text-xs sm:text-sm transition-colors focus:ring-2 focus:outline-none'
            />
            <Sparkles className='text-muted-foreground/50 pointer-events-none absolute top-3 right-3 h-4 w-4' />
          </div>
        </div>
      </div>
    </section>
  );
}
