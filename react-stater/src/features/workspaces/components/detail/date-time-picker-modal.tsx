import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, ChevronDown, ArrowRight, ShieldCheck, TimerIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function DateTimePickerModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px] p-0 rounded-2xl overflow-hidden gap-0 border-border bg-card shadow-2xl [&>button]:hidden outline-none">
        <div className="p-4 pb-3">
          {/* Modal Header */}
          <div className="flex items-start justify-between pb-3 border-b border-border/50">
            <div className="space-y-1">
              <DialogTitle className="text-[18px] leading-[26px] font-bold text-foreground tracking-tight">Select Date &amp; Time</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-medium">
                Choose your booking schedule for NexSpace Central Tower
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                aria-label="Close modal"
                className="w-9 h-9 -mr-1 -mt-1 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95 duration-150 outline-none"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogClose>
          </div>

          {/* Calendar Section */}
          <div className="pt-3 pb-3">
            {/* Month Selector Header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-base font-semibold text-foreground tracking-tight">January 2026</span>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous month"
                  className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none"
                  type="button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  aria-label="Next month"
                  className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none"
                  type="button"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground/70 tracking-wider py-1 border-b border-border/50 mb-1.5">
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>

            {/* 7-Column Dates Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[13px] select-none">
              {/* Week 1 */}
              <div className="h-8 flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">29</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">30</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">31</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">1</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">2</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">3</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">4</div>
              
              {/* Week 2 */}
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">5</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">6</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">7</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">8</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">9</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">10</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">11</div>
              
              {/* Week 3 */}
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">12</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">13</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">14</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">15</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">16</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">17</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">18</div>
              
              {/* Week 4 */}
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">19</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">20</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">21</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">22</div>
              <div className="h-8 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">23</div>
              
              {/* Today */}
              <div className="h-8 flex flex-col items-center justify-center rounded-xl font-semibold text-primary hover:bg-primary/10 cursor-pointer transition-colors relative" title="Today">
                <span>24</span>
                <span className="w-1 h-1 rounded-full bg-primary -mt-0.5"></span>
              </div>
              
              {/* Selected Date */}
              <div className="h-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md ring-4 ring-primary/20 cursor-pointer transform scale-105 transition-all">
                25
              </div>
              
              {/* Week 5 */}
              {[26, 27, 28, 29, 30, 31].map(day => (
                <div key={day} className="h-8 flex items-center justify-center rounded-xl text-foreground font-medium hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors">
                  {day}
                </div>
              ))}
              
              {/* Next month spillover */}
              <div className="h-8 flex items-center justify-center text-muted-foreground/30 cursor-not-allowed">1</div>
            </div>

            {/* Calendar Micro Legend */}
            <div className="flex items-center justify-between px-2 pt-2 mt-1 border-t border-border/50 text-[11px] font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>Selected date</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Peak desk availability (42 open)</span>
              </div>
            </div>
          </div>

          {/* Time Range Selection Section */}
          <div className="pt-1 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                TIME SLOT (OPERATING HOURS: 08:00 AM - 10:00 PM)
              </span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            
            {/* 2-Column Time Dropdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Start Time */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">Start Time</label>
                <div className="relative">
                  <div className="h-10 px-3 bg-card border rounded-lg flex items-center justify-between cursor-pointer hover:border-primary transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <Clock className="text-muted-foreground w-4 h-4" />
                      <span className="text-[13px] font-medium text-foreground">09:00 AM</span>
                    </div>
                    <ChevronDown className="text-muted-foreground w-4 h-4" />
                  </div>
                </div>
              </div>
              
              {/* End Time */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">End Time</label>
                <div className="relative">
                  <div className="h-10 px-3 bg-card border rounded-lg flex items-center justify-between cursor-pointer hover:border-primary transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <Clock className="text-muted-foreground w-4 h-4" />
                      <span className="text-[13px] font-medium text-foreground">01:00 PM</span>
                    </div>
                    <ChevronDown className="text-muted-foreground w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Pill Summary */}
          <div className="py-1.5 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/15">
              <TimerIcon className="w-[15px] h-[15px]" />
              <span>Total Duration: 4 Hours (Half Day)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              Rate: $2.50/hr • Estimated: <span className="font-semibold text-foreground">$10.00 USD</span>
            </p>
          </div>

          {/* Primary Action & Security Footer */}
          <div className="mt-2 pt-2">
            <Button className="w-full h-10 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.98]">
              <span className="text-[13px]">Check Seat Availability</span>
              <ArrowRight className="w-[16px] h-[16px]" />
            </Button>
            <div className="text-center text-[10px] font-semibold text-muted-foreground/80 mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-[14px] h-[14px] text-emerald-600" />
              <span>No payment required at this step • Real-time 2D floor plan unlocks next</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

