import { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Timer,
  QrCode,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { NexSpaceLogo, NexSpaceMark } from '@/components/brand/logo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { useCurrency } from '@/features/landing/context/currency-context';

interface PayOSCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmountUsd?: number;
  seatCode?: string;
  orderRef?: string;
}

export function PayOSCheckoutDialog({
  open,
  onOpenChange,
  totalAmountUsd = 11.0,
  seatCode = 'Desk A-04',
  orderRef = '#NX-8821'
}: PayOSCheckoutDialogProps) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [copiedRef, setCopiedRef] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(510); // 08:30 hold countdown

  const approxVnd = Math.round(totalAmountUsd * 25000);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsVerifying(false);
      setIsSuccess(false);
      setSecondsRemaining(510);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(orderRef.replace('#', ''));
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleSimulatePayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
    }, 1200);
  };

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-card border-border sm:max-w-[450px] w-[95vw] max-h-[88vh] flex flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden'>
        <style>{`
          @keyframes scanline {
            0% { top: 6%; opacity: 0.15; }
            50% { top: 90%; opacity: 0.85; }
            100% { top: 6%; opacity: 0.15; }
          }
          .scanner-line {
            animation: scanline 2.8s ease-in-out infinite;
          }
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
            70% { box-shadow: 0 0 0 8px rgba(79, 70, 229, 0); }
            100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
          }
          .pulse-glow {
            animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        {/* Minimalist Top Control Bar (Sticky / Fixed at top) */}
        <div className='border-border/60 bg-muted/40 shrink-0 flex items-center justify-between border-b px-4 py-2.5 text-xs'>
          <button
            type='button'
            onClick={() => handleOpenChange(false)}
            className='text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 font-medium transition-colors group'
          >
            <ArrowLeft className='h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5' />
            <span>
              Return to review <strong className='text-foreground font-mono'>({orderRef})</strong>
            </span>
          </button>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
              <span className='font-mono text-[10px] font-semibold text-muted-foreground tracking-wider uppercase'>
                Gateway Live
              </span>
            </div>
            <DialogClose asChild>
              <button
                aria-label='Close dialog'
                className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors'
                type='button'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Scrollable Main Content Area */}
        <div className='flex-1 overflow-y-auto px-5 py-3.5 space-y-3'>
          {isSuccess ? (
            /* --- SUCCESS STATE --- */
            <div className='space-y-4 text-center py-2'>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-6 ring-emerald-500/10'>
                <CheckCircle2 className='h-8 w-8' />
              </div>

              <div className='space-y-1'>
                <DialogHeader className='p-0 text-center'>
                  <DialogTitle className='text-foreground text-lg font-bold tracking-tight'>
                    Payment Verified &amp; Confirmed!
                  </DialogTitle>
                  <DialogDescription className='text-muted-foreground text-xs'>
                    Instant PayOS webhook confirmed • Smart pass ready for turnstile entry
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Turnstile Pass Preview */}
              <div className='bg-muted/50 border-border/80 rounded-xl border p-3.5 text-left space-y-3'>
                <div className='flex items-center justify-between border-b border-border/60 pb-2.5'>
                  <div>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                      Workspace Access Key
                    </span>
                    <h4 className='text-foreground font-sans text-xs sm:text-sm font-bold'>
                      {seatCode} • Level 14 Quiet Zone
                    </h4>
                  </div>
                  <div className='bg-primary/10 text-primary border-primary/20 flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-bold'>
                    <KeyRound className='h-3 w-3' />
                    <span>PIN #8821</span>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
                  <div className='bg-card border-border flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border shadow-xs'>
                    <QrCode className='text-foreground h-8 w-8' />
                  </div>
                  <div className='text-xs space-y-0.5'>
                    <div className='text-foreground font-semibold'>
                      Valid Fri, Jan 25, 2026 • 09:00 AM – 01:00 PM
                    </div>
                    <div className='text-muted-foreground text-[11px] flex items-center gap-1.5'>
                      <ShieldCheck className='h-3.5 w-3.5 text-emerald-600' />
                      <span>Corporate VAT invoice dispatched to email</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  handleOpenChange(false);
                  navigate({ to: '/workspaces/confirmation' });
                }}
                className='w-full cursor-pointer h-10 text-xs font-semibold shadow-md'
              >
                View Digital Access Pass &amp; Confirmation
              </Button>
            </div>
          ) : (
            /* --- ACTIVE PAYMENT HANDOFF VIEW --- */
            <>
              {/* 1. Co-Branding Header (Compact Lockup) */}
              <div className='flex items-center justify-between gap-2 pt-0.5'>
                <div className='flex items-center gap-2'>
                  {/* NexSpace Vector Logo */}
                  <NexSpaceLogo variant='horizontal' className='h-6 w-auto' />
                  {/* Seamless Connection Arrow */}
                  <ArrowRight className='h-3.5 w-3.5 text-muted-foreground/60' />
                  {/* PayOS Brand Mark */}
                  <div className='flex items-center gap-1.5 bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-xs'>
                    <span className='h-1.5 w-1.5 rounded-full bg-cyan-400' />
                    <span className='font-sans text-xs font-bold tracking-tight text-white'>
                      pay<span className='text-cyan-400'>OS</span>
                    </span>
                  </div>
                </div>

                {/* Trust & Security Badge Pill */}
                <div className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium'>
                  <Lock className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />
                  <span>VietQR &amp; Cards</span>
                </div>
              </div>

              {/* 2. Order Brief Box (Compact Balanced Layout) */}
              <div className='bg-muted/40 border-border/70 rounded-xl border p-2.5 text-xs'>
                <div className='flex items-center justify-between gap-3'>
                  {/* Left Column: Reference & Hold timer */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-muted-foreground text-[11px]'>Ref:</span>
                      <button
                        type='button'
                        onClick={handleCopyRef}
                        className='bg-card border-border/80 hover:border-primary/50 flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground transition-colors active:scale-95'
                        title='Copy order reference'
                      >
                        <span>{orderRef}</span>
                        {copiedRef ? (
                          <Check className='h-3 w-3 text-emerald-600' />
                        ) : (
                          <Copy className='text-muted-foreground h-3 w-3' />
                        )}
                      </button>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        secondsRemaining > 0
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}
                    >
                      <Timer className='h-3 w-3 animate-spin [animation-duration:3s]' />
                      <span>{secondsRemaining > 0 ? `Hold: ${timeFormatted}` : 'Hold expired'}</span>
                    </div>
                  </div>

                  {/* Right Column: Amount */}
                  <div className='text-right'>
                    <span className='text-muted-foreground text-[10px] block'>Total Amount</span>
                    <span className='text-foreground font-sans text-base sm:text-lg font-bold tracking-tight'>
                      {formatPrice(totalAmountUsd)}
                    </span>
                    <div className='text-muted-foreground text-[10px] font-mono'>
                      ≈ {approxVnd.toLocaleString('vi-VN')} VND
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. PayOS Dynamic QR Code Container (Proportioned & Centered) */}
              <div className='bg-muted/20 border-border/80 flex flex-col items-center justify-center rounded-xl border p-2.5 sm:p-3'>
                {/* QR Frame with subtle interactive scanner line */}
                <div className='relative flex h-48 w-48 sm:h-52 sm:w-52 flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-indigo-100 bg-white p-2 sm:p-2.5 shadow-xs'>
                  {/* Top QR Badges: VietQR & NAPAS 24/7 */}
                  <div className='z-10 flex w-full items-center justify-between px-1'>
                    <span className='rounded border border-blue-200 bg-blue-50 px-1.5 py-0.25 text-[10px] font-bold tracking-tighter text-blue-900'>
                      VietQR
                    </span>
                    <span className='rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.25 text-[9px] font-bold tracking-tight text-emerald-800'>
                      NAPAS 24/7
                    </span>
                  </div>

                  {/* Dynamic QR Graphic Matrix */}
                  <div className='relative my-auto flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center'>
                    {/* Simulated Scanning Beam Effect */}
                    <div className='scanner-line absolute left-0 right-0 z-10 h-0.5 bg-gradient-to-r from-transparent via-indigo-600 to-transparent shadow-[0_0_6px_#4F46E5] pointer-events-none' />

                    {/* Crisp Vector QR Code */}
                    <svg className='h-full w-full text-slate-900' fill='currentColor' viewBox='0 0 100 100'>
                      {/* Top-Left Finder */}
                      <rect fill='#0F172A' height='28' rx='4' width='28' x='0' y='0' />
                      <rect fill='#FFFFFF' height='20' rx='2' width='20' x='4' y='4' />
                      <rect fill='#0F172A' height='12' rx='2' width='12' x='8' y='8' />
                      {/* Top-Right Finder */}
                      <rect fill='#0F172A' height='28' rx='4' width='28' x='72' y='0' />
                      <rect fill='#FFFFFF' height='20' rx='2' width='20' x='76' y='4' />
                      <rect fill='#0F172A' height='12' rx='2' width='12' x='80' y='8' />
                      {/* Bottom-Left Finder */}
                      <rect fill='#0F172A' height='28' rx='4' width='28' x='0' y='72' />
                      <rect fill='#FFFFFF' height='20' rx='2' width='20' x='4' y='76' />
                      <rect fill='#0F172A' height='12' rx='2' width='12' x='8' y='80' />
                      {/* Matrix Data Modules */}
                      <rect height='6' rx='1' width='6' x='36' y='4' />
                      <rect height='6' rx='1' width='6' x='48' y='4' />
                      <rect height='6' rx='1' width='6' x='58' y='4' />
                      <rect height='6' rx='1' width='6' x='32' y='14' />
                      <rect height='6' rx='1' width='8' x='44' y='14' />
                      <rect height='6' rx='1' width='6' x='60' y='14' />
                      <rect height='6' rx='1' width='8' x='36' y='24' />
                      <rect height='6' rx='1' width='6' x='52' y='24' />
                      {/* Central Area Data Rings */}
                      <rect height='8' rx='1' width='6' x='4' y='36' />
                      <rect height='6' rx='1' width='6' x='14' y='36' />
                      <rect height='6' rx='1' width='8' x='24' y='40' />
                      <rect height='8' rx='1' width='6' x='72' y='36' />
                      <rect height='6' rx='1' width='8' x='84' y='36' />
                      <rect height='8' rx='1' width='6' x='78' y='48' />
                      <rect height='6' rx='1' width='6' x='90' y='48' />
                      {/* Lower Mid Data */}
                      <rect height='6' rx='1' width='6' x='36' y='72' />
                      <rect height='6' rx='1' width='8' x='48' y='72' />
                      <rect height='8' rx='1' width='6' x='62' y='72' />
                      <rect height='6' rx='1' width='8' x='36' y='84' />
                      <rect height='6' rx='1' width='6' x='52' y='80' />
                      <rect height='6' rx='1' width='6' x='48' y='90' />
                      <rect height='6' rx='1' width='8' x='60' y='88' />
                      <rect height='6' rx='1' width='6' x='74' y='76' />
                      <rect height='6' rx='1' width='8' x='86' y='76' />
                      <rect height='8' rx='1' width='6' x='78' y='86' />
                      <rect height='6' rx='1' width='8' x='88' y='88' />
                    </svg>

                    {/* NexSpace Logo Center Embed */}
                    <div className='absolute inset-0 m-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-md z-20'>
                      <NexSpaceMark className='h-6 w-6' />
                    </div>
                  </div>

                  {/* Bottom Micro Status Bar inside QR Card */}
                  <div className='z-10 flex w-full items-center justify-center gap-1.5 border-t border-slate-100 py-0.5'>
                    <span className='pulse-glow bg-indigo-600 h-1.5 w-1.5 rounded-full' />
                    <span className='font-mono text-[10px] font-semibold text-indigo-600'>
                      Awaiting transfer signal...
                    </span>
                  </div>
                </div>

                {/* Supported Banks Strip */}
                <div className='mt-2 flex w-full items-center justify-center gap-1 flex-wrap'>
                  <span className='rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-slate-700 shadow-2xs'>
                    VCB
                  </span>
                  <span className='rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-blue-700 shadow-2xs'>
                    MB Bank
                  </span>
                  <span className='rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-red-600 shadow-2xs'>
                    TCB
                  </span>
                  <span className='rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-emerald-700 shadow-2xs'>
                    VPBank
                  </span>
                  <span className='rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-pink-600 shadow-2xs'>
                    MoMo
                  </span>
                </div>

                {/* Instructional Microcopy */}
                <p className='text-muted-foreground mt-1.5 px-1 text-center text-[11px] leading-tight'>
                  Scan with banking app (<strong className='text-foreground font-medium'>Vietcombank, MB, Techcombank</strong>) or <strong className='text-foreground font-medium'>MoMo</strong> to pay instantly.
                </p>
              </div>

              {/* 4. Action Controls (Compact) */}
              <div className='space-y-2 pt-0.5'>
                <Button
                  onClick={handleSimulatePayment}
                  disabled={isVerifying}
                  className='w-full cursor-pointer h-9.5 text-xs font-semibold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5'
                >
                  {isVerifying ? (
                    <span>Verifying PayOS Webhook...</span>
                  ) : (
                    <>
                      <span>I Have Completed Payment</span>
                      <ArrowRight className='h-3.5 w-3.5' />
                    </>
                  )}
                </Button>

                <a
                  href='https://payos.vn'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='bg-card hover:bg-muted/60 border-border text-foreground flex h-8.5 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all active:scale-[0.98]'
                >
                  <span>Open PayOS Payment Page</span>
                  <ExternalLink className='text-muted-foreground h-3 w-3' />
                </a>
              </div>

              {/* 5. Security Guarantee Footnote */}
              <div className='border-border/60 flex items-center justify-center gap-2 border-t pt-2 text-[11px] text-muted-foreground'>
                <ShieldCheck className='h-3.5 w-3.5 text-emerald-600 shrink-0' />
                <span>
                  <strong className='text-foreground font-medium'>256-bit SSL encrypted</strong> • Instant booking confirmation &amp; PIN
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Bottom Strip: Compliance & Dismiss (Sticky / Fixed at bottom) */}
        <div className='bg-muted/40 border-border/60 shrink-0 space-y-1 border-t px-4 py-2 text-center'>
          <div className='text-muted-foreground flex items-center justify-center gap-1 text-[10px]'>
            <Shield className='h-3 w-3' />
            <span>Powered by PayOS &amp; Napas 24/7 • SOC-2 Type II Certified</span>
          </div>
          <div>
            <button
              type='button'
              onClick={() => handleOpenChange(false)}
              className='hover:text-destructive text-muted-foreground cursor-pointer text-[10px] underline underline-offset-2 transition-colors'
            >
              Cancel transaction and release workspace hold
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
