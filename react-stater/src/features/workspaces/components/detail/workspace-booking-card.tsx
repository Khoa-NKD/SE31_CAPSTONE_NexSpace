import { ArrowRight, Calendar, CheckCircle2, ChevronDown, Clock, Lock, Monitor, ShieldCheck, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateTimePickerModal } from './date-time-picker-modal';

export function WorkspaceBookingCard() {
  return (
    <div className="lg:col-span-4 relative">
      <div className="sticky top-24 bg-card border rounded-2xl p-6 shadow-xl transition-all">
        {/* Price Display Header */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-2xl font-bold text-foreground">$2.50</span>
            <span className="text-[13px] text-muted-foreground font-medium"> / hour</span>
          </div>
          <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            or $18.00 / full day (save 25%)
          </div>
        </div>
        <p className="text-[12px] font-medium text-muted-foreground mb-4">
          Instant booking confirmation with instant smart-pass access code.
        </p>
        
        {/* Reservation Configuration Container */}
        <div className="border rounded-xl p-3.5 bg-muted space-y-2.5 mb-5">
          <DateTimePickerModal>
            <div className="space-y-2.5">
              {/* Row 1: Date */}
              <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center justify-between cursor-pointer hover:border-primary transition">
                <div className="flex items-center gap-2.5">
                  <Calendar className="text-primary w-5 h-5" />
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-muted-foreground">Date</div>
                    <div className="text-[13px] font-semibold text-foreground">Tomorrow, Sat, Jan 25, 2026</div>
                  </div>
                </div>
                <ChevronDown className="text-muted-foreground/50 w-4 h-4" />
              </div>
              
              {/* Row 2: Duration & Time */}
              <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center justify-between cursor-pointer hover:border-primary transition">
                <div className="flex items-center gap-2.5">
                  <Clock className="text-primary w-5 h-5" />
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-muted-foreground">Duration &amp; Time</div>
                    <div className="text-[13px] font-semibold text-foreground">09:00 AM – 01:00 PM (4 hours)</div>
                  </div>
                </div>
                <ChevronDown className="text-muted-foreground/50 w-4 h-4" />
              </div>
            </div>
          </DateTimePickerModal>
          
          {/* Row 3: Desk Selection */}
          <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center justify-between cursor-pointer hover:border-primary transition">
            <div className="flex items-center gap-2.5">
              <Monitor className="text-primary w-5 h-5" />
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Desk Selection</div>
                <div className="text-[13px] font-semibold text-foreground">Hot Desk • Flex Node #14A</div>
              </div>
            </div>
            <CheckCircle2 className="text-emerald-600 fill-emerald-100 dark:fill-emerald-950 w-5 h-5" />
          </div>
        </div>
        
        {/* Price Breakdown Table */}
        <div className="space-y-2 text-[13px] border-b pb-4 mb-4">
          <div className="flex justify-between text-muted-foreground">
            <span>4 hours × $2.50 / hr</span>
            <span className="font-medium text-foreground">$10.00</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform Service &amp; Gigabit WiFi</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-500">Included ($0.00)</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Value Added Tax (VAT 8%)</span>
            <span className="font-medium text-foreground">$0.80</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold text-foreground pt-2">
            <span>Total Amount</span>
            <span className="text-lg text-primary">$10.80 USD</span>
          </div>
        </div>
        
        {/* Primary Action CTA */}
        <Button className="w-full h-11 py-3 px-4 rounded-xl shadow-md transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 mb-4 group cursor-pointer text-sm font-semibold">
          <span>Select Desk &amp; Reserve Space</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
        
        {/* Reassurance Microcopy */}
        <div className="space-y-2.5 text-[13px] text-muted-foreground mb-4">
          <div className="flex items-center gap-2 text-[12px]">
            <Lock className="w-4 h-4 text-muted-foreground/60" />
            <span>You won't be charged yet.</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <Timer className="w-4 h-4 text-amber-600" />
            <span>10-minute hold reservation guaranteed while checking out.</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Free cancellation up to 1 hour before booking starts.</span>
          </div>
        </div>
        
        {/* Host Guarantee Banner */}
        <div className="bg-muted border rounded-xl p-3 flex items-start gap-2.5">
          <ShieldCheck className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] font-semibold text-foreground leading-relaxed">
            <span className="font-bold">PayOS Protected Payment</span> • Instant VAT E-invoice issued to company tax code.
          </div>
        </div>
      </div>
    </div>
  );
}

