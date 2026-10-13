import React from 'react';
import {
  X,
  ExternalLink,
  MapPin,
  Clock,
  Radio,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  CircleDot,
  RotateCcw,
  Ban,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { BookingItem } from '../data/mock-bookings';

interface BookingDetailsDrawerProps {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onForceCancel: (booking: BookingItem) => void;
}

export function BookingDetailsDrawer({
  booking,
  isOpen,
  onClose,
  onForceCancel
}: BookingDetailsDrawerProps) {
  if (!isOpen || !booking) return null;

  const handleResendNfc = () => {
    toast.success(`NFC Pass Re-provisioned (Simulated)`, {
      description: `Re-issued Apple Wallet and dynamic QR token for #${booking.id} to ${booking.customer.email}.`
    });
  };

  const handleModify = () => {
    toast.info(`Reservation Modification (Simulated)`, {
      description: `Opened resource and time slot reassignment dialogue for #${booking.id}.`
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-50 transition-opacity'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-over Container */}
      <aside
        role='dialog'
        aria-label={`Booking Details for #${booking.id}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[640px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Top Header */}
        <div className='border-b border-border bg-card p-6 select-none shrink-0'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2.5'>
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground'>
                #{booking.id}
              </span>

              {booking.status === 'confirmed' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-indigo-500' aria-hidden='true'></span>
                  Confirmed
                </span>
              )}
              {booking.status === 'checked_in' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' aria-hidden='true'></span>
                  Checked In
                </span>
              )}
              {booking.status === 'completed' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border'>
                  Completed
                </span>
              )}
              {booking.status === 'cancelled' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'>
                  Cancelled
                </span>
              )}

              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <Clock className='size-3 text-muted-foreground' aria-hidden='true' />
                {booking.relativeStatusTime}
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 text-muted-foreground hover:text-foreground'
                aria-label='Expand to fullscreen'
              >
                <Maximize2 className='size-4' aria-hidden='true' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='size-8 text-muted-foreground hover:text-foreground'
                aria-label='Close drawer'
              >
                <X className='size-4' aria-hidden='true' />
              </Button>
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-lg font-bold font-heading text-foreground'>
                {booking.customer.name}
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {booking.customer.email} • {booking.customer.phone}
              </p>
            </div>
            <span className='text-xs px-2.5 py-1 rounded-md font-semibold bg-primary/10 text-primary border border-primary/20'>
              {booking.customer.membershipTier}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* SECTION 1: WORKSPACE & HARDWARE ALLOCATION */}
          <section aria-label='Workspace Allocation' className='space-y-3'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
              <MapPin className='size-3.5 text-primary' aria-hidden='true' />
              Workspace &amp; Hardware Allocation
            </h3>

            <div className='p-4 rounded-xl border border-border bg-muted/40 space-y-3 text-xs'>
              <div className='flex items-start justify-between'>
                <div>
                  <div className='font-bold text-foreground text-sm'>{booking.workspace.name}</div>
                  <div className='text-[11px] text-muted-foreground mt-0.5'>{booking.workspace.address}</div>
                </div>
                <Link
                  to='/dashboard/admin/workspaces/directory'
                  search={{ hubId: booking.workspace.hubId }}
                  className='text-primary hover:underline text-[11px] font-semibold flex items-center gap-1'
                >
                  <span>#{booking.workspace.hubId}</span>
                  <ExternalLink className='size-3' aria-hidden='true' />
                </Link>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60'>
                <div>
                  <span className='text-[11px] text-muted-foreground'>Allocated Resource</span>
                  <div className='font-semibold text-foreground mt-0.5'>{booking.workspace.resourceName}</div>
                  <div className='text-[10px] text-muted-foreground'>{booking.workspace.zone}</div>
                </div>
                <div>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                    <Monitor className='size-3 text-muted-foreground' aria-hidden='true' />
                    Hardware &amp; Specs
                  </span>
                  <div className='font-medium text-foreground mt-0.5'>{booking.workspace.hardwareSpecs}</div>
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60'>
                <div>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                    <Clock className='size-3 text-muted-foreground' aria-hidden='true' />
                    Authorized Time Slot
                  </span>
                  <div className='font-semibold text-foreground mt-0.5'>{booking.workspace.authorizedSlot}</div>
                </div>
                <div>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                    <Radio className='size-3 text-primary' aria-hidden='true' />
                    Access Pass
                  </span>
                  <div className='font-mono font-bold text-primary mt-0.5 flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-primary' aria-hidden='true'></span>
                    {booking.workspace.nfcPassCode}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: PayOS Escrow Ledger Breakdown */}
          <section aria-label='Escrow Ledger' className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                <ShieldCheck className='size-3.5 text-primary' aria-hidden='true' />
                PayOS Escrow Ledger
              </h3>
              <div className='flex items-center gap-2'>
                <span className='text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-semibold'>
                  {booking.escrow.status}
                </span>
                <Link
                  to='/dashboard/admin/reconciliation'
                  search={{ txId: booking.escrow.txReference }}
                  className='text-primary hover:underline text-[11px] font-mono flex items-center gap-1'
                >
                  <span>#{booking.escrow.txReference}</span>
                  <ExternalLink className='size-3' aria-hidden='true' />
                </Link>
              </div>
            </div>

            <div className='p-4 rounded-xl border border-border bg-card shadow-2xs space-y-2.5 text-xs'>
              <div className='flex justify-between items-center text-foreground font-medium'>
                <span>Gross Reservation Fee</span>
                <span className='font-semibold'>
                  ${booking.escrow.grossFeeUsd.toFixed(2)}{' '}
                  <span className='text-muted-foreground font-normal'>
                    ({booking.escrow.grossFeeVnd.toLocaleString()} VND)
                  </span>
                </span>
              </div>

              <div className='flex justify-between items-center text-indigo-700 dark:text-indigo-400 font-medium'>
                <span className='flex items-center gap-1.5'>
                  NexSpace Platform Take Rate
                  <span className='text-[10px] px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded font-bold'>
                    {booking.escrow.platformTakeRatePercent}%
                  </span>
                </span>
                <span>
                  -${booking.escrow.platformTakeRateUsd.toFixed(2)}{' '}
                  <span className='text-muted-foreground font-normal'>
                    ({booking.escrow.platformTakeRateVnd.toLocaleString()} VND)
                  </span>
                </span>
              </div>

              <div className='pt-2 border-t border-border flex justify-between items-baseline'>
                <span className='font-bold text-foreground'>Net Payout to Space Partner</span>
                <span className='text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono'>
                  ${booking.escrow.netPayoutUsd.toFixed(2)}{' '}
                  <span className='text-xs text-muted-foreground font-normal'>
                    ({booking.escrow.netPayoutVnd.toLocaleString()} VND)
                  </span>
                </span>
              </div>

              {/* Escrow Banner */}
              <div className='p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300'>
                Funds locked in PayOS Smart Escrow <strong>{booking.escrow.escrowContractId}</strong>. Automatic payout disbursement occurs upon check-out verification.
              </div>
            </div>
          </section>

          {/* SECTION 3: RESERVATION LIFECYCLE (Timeline) */}
          <section aria-label='Reservation Lifecycle' className='space-y-3'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
              <Clock className='size-3.5 text-primary' aria-hidden='true' />
              Reservation Lifecycle
            </h3>

            <div className='p-4 rounded-xl border border-border bg-muted/20 space-y-4'>
              {booking.timeline.map((step, idx) => (
                <div key={step.id} className='flex items-start gap-3 relative'>
                  {idx !== booking.timeline.length - 1 && (
                    <div
                      className='absolute left-[9px] top-5 bottom-[-16px] w-[2px] bg-border'
                      aria-hidden='true'
                    />
                  )}
                  <div className='mt-0.5 shrink-0 z-10'>
                    {step.isLive ? (
                      <CircleDot className='size-5 text-emerald-600 dark:text-emerald-400 animate-pulse' aria-hidden='true' />
                    ) : (
                      <CheckCircle2 className='size-5 text-emerald-600 dark:text-emerald-400' aria-hidden='true' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between text-xs'>
                      <div className='flex items-center gap-2'>
                        <strong className='text-foreground'>{step.title}</strong>
                        {step.isLive && (
                          <span className='px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'>
                            Live Session
                          </span>
                        )}
                      </div>
                      <span className='text-[10px] font-mono text-muted-foreground'>{step.timestamp}</span>
                    </div>
                    <p className='text-[11px] text-muted-foreground mt-0.5'>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className='border-t border-border bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0'>
          {booking.status !== 'cancelled' && (
            <Button
              type='button'
              variant='outline'
              onClick={() => onForceCancel(booking)}
              className='w-full sm:w-auto h-9 text-xs border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
            >
              <Ban className='size-3.5 mr-1.5' aria-hidden='true' />
              <span>Force Cancel &amp; Refund</span>
            </Button>
          )}

          <div className='flex items-center gap-2 w-full sm:w-auto sm:ml-auto'>
            <Button
              type='button'
              variant='outline'
              onClick={handleResendNfc}
              className='flex-1 sm:flex-none h-9 text-xs'
            >
              <RotateCcw className='size-3.5 mr-1.5' aria-hidden='true' />
              <span>Re-send NFC</span>
            </Button>
            <Button
              type='button'
              onClick={handleModify}
              className='flex-1 sm:flex-none h-9 text-xs bg-primary hover:bg-primary/90 text-white'
            >
              <span>Modify Reservation</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
