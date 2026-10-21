import { ArrowRight, Calendar, ChevronDown, Clock, Lock, Monitor, ShieldCheck } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { DateTimePickerModal } from './date-time-picker-modal';
import type { PublicWorkspaceDetail } from '../../api/types';

interface WorkspaceBookingCardProps {
  workspace?: PublicWorkspaceDetail;
}

export function WorkspaceBookingCard({ workspace }: WorkspaceBookingCardProps) {
  const hasHourlyPrice = typeof workspace?.pricePerHour === 'number' && workspace.pricePerHour > 0;
  const hasDailyPrice = typeof workspace?.pricePerDay === 'number' && workspace.pricePerDay > 0;
  const pricePerHour = hasHourlyPrice ? workspace!.pricePerHour : null;
  const pricePerDay = hasDailyPrice ? workspace!.pricePerDay : null;
  const deskCategoryLabel = workspace?.category
    ? workspace.category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Desk / Room';

  return (
    <div className="lg:col-span-4 relative">
      <div className="sticky top-24 bg-card border rounded-2xl p-6 shadow-xl transition-all">
        {/* Price Display Header */}
        <div className="flex items-baseline justify-between mb-2">
          {pricePerHour !== null ? (
            <div>
              <span className="text-2xl font-bold text-foreground">${pricePerHour.toFixed(2)}</span>
              <span className="text-[13px] text-muted-foreground font-medium"> / hour</span>
            </div>
          ) : (
            <div>
              <span className="text-xl font-bold text-foreground">Pricing upon request</span>
            </div>
          )}
          {pricePerDay !== null && (
            <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              or ${pricePerDay.toFixed(2)} / day
            </div>
          )}
        </div>
        <p className="text-[12px] font-medium text-muted-foreground mb-4">
          Estimated price based on the selected duration. Final availability, applicable fees, and confirmation depend on the booking process.
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
                    <div className="text-[13px] font-medium text-muted-foreground">Select date in booking flow</div>
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
                    <div className="text-[13px] font-medium text-muted-foreground">Configure hours in booking flow</div>
                  </div>
                </div>
                <ChevronDown className="text-muted-foreground/50 w-4 h-4" />
              </div>
            </div>
          </DateTimePickerModal>
          
          {/* Row 3: Seating Selection */}
          <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center justify-between cursor-pointer hover:border-primary transition">
            <div className="flex items-center gap-2.5">
              <Monitor className="text-primary w-5 h-5" />
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Seat / Space Option</div>
                <div className="text-[13px] font-medium text-muted-foreground">Select available {deskCategoryLabel} in next step</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Price Breakdown Table */}
        <div className="space-y-2 text-[13px] border-b pb-4 mb-4">
          {pricePerHour !== null ? (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Illustrative Base Rate (1 hr × ${pricePerHour.toFixed(2)})</span>
                <span className="font-medium text-foreground">${pricePerHour.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-foreground pt-2">
                <span>Estimated Subtotal (Base)</span>
                <span className="text-lg text-primary">${pricePerHour.toFixed(2)} USD</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Final total calculated based on your selected duration and add-ons during checkout.
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic py-1">
              Pricing details will be confirmed based on your requested duration and seating choice.
            </div>
          )}
        </div>
        
        {/* Primary Action CTA */}
        <Button asChild className="w-full h-11 py-3 px-4 rounded-xl shadow-md transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 mb-4 group cursor-pointer text-sm font-semibold">
          <Link to="/workspaces/seats">
            <span>Proceed to Seat Selection</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
        
        {/* Reassurance Microcopy */}
        <div className="space-y-2.5 text-[13px] text-muted-foreground mb-4">
          <div className="flex items-center gap-2 text-[12px]">
            <Lock className="w-4 h-4 text-muted-foreground/60" />
            <span>You won't be charged yet.</span>
          </div>
        </div>
        
        {/* Host Guarantee Banner */}
        <div className="bg-muted border rounded-xl p-3 flex items-start gap-2.5">
          <ShieldCheck className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] font-semibold text-foreground leading-relaxed">
            <span className="font-bold">NexSpace Platform</span> • Verified host listing and reservation assistance.
          </div>
        </div>
      </div>
    </div>
  );
}
