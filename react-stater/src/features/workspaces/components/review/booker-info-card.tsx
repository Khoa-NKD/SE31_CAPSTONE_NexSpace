import { useState } from 'react';
import { ShieldCheck, User, Mail, Smartphone, Receipt, Sparkles } from 'lucide-react';

export function BookerInfoCard() {
  const [purpose, setPurpose] = useState('Focused work & remote sprint review');

  return (
    <section className='bg-card border-border shadow-xs space-y-5 rounded-2xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex items-center justify-between border-b pb-4'>
        <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
          Booker Information
        </h2>
        <span className='bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold'>
          <ShieldCheck className='h-3.5 w-3.5' />
          <span>Enterprise Auto-fill</span>
        </span>
      </div>

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
              value='Minh Nguyen (Enterprise Member)'
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <User className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Corporate Email */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-email' className='text-foreground block text-xs font-medium'>
            Corporate Email
          </label>
          <div className='relative'>
            <input
              id='booker-email'
              type='email'
              readOnly
              value='minh.nguyen@enterprise.tech'
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <Mail className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Mobile Phone */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-phone' className='text-foreground block text-xs font-medium'>
            Mobile Phone (for SMS PIN)
          </label>
          <div className='relative'>
            <input
              id='booker-phone'
              type='tel'
              readOnly
              value='+84 90 123 4567'
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <Smartphone className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Company Tax ID */}
        <div className='space-y-1.5'>
          <label htmlFor='booker-tax-id' className='text-foreground block text-xs font-medium'>
            Company Tax / Billing ID
          </label>
          <div className='relative'>
            <input
              id='booker-tax-id'
              type='text'
              readOnly
              value='TAX-VN-0314892301'
              className='bg-muted/60 border-border text-foreground h-10 w-full cursor-not-allowed rounded-lg border px-3 pr-10 text-xs sm:text-sm outline-none'
            />
            <Receipt className='text-muted-foreground absolute top-2.5 right-3 h-4 w-4' />
          </div>
        </div>

        {/* Purpose of Visit */}
        <div className='space-y-1.5 sm:col-span-2'>
          <label htmlFor='booker-purpose' className='text-foreground flex items-center justify-between text-xs font-medium'>
            <span>Purpose of Visit</span>
            <span className='text-muted-foreground text-[11px]'>Optional note for concierge</span>
          </label>
          <div className='relative'>
            <input
              id='booker-purpose'
              type='text'
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder='e.g. Focused coding, remote client meeting...'
              className='bg-card border-border text-foreground focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border px-3 text-xs sm:text-sm transition-colors focus:ring-2 focus:outline-none'
            />
            <Sparkles className='text-muted-foreground/50 pointer-events-none absolute top-3 right-3 h-4 w-4' />
          </div>
        </div>
      </div>
    </section>
  );
}

