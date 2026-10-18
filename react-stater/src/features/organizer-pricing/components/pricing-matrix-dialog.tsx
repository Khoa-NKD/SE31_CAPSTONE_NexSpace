import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  X,
  Check,
  Percent,
  Sun,
  Lock,
  TrendingDown,
  Info,
  Calculator,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  PricingScope,
  ResourceTypeCategory,
  PricingTierRule,
  LiveDiscountPreview
} from '../types';

interface PricingMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRule?: PricingTierRule | null;
  onSaveRule: (savedRule: PricingTierRule) => void;
}

export function PricingMatrixDialog({
  open,
  onOpenChange,
  initialRule,
  onSaveRule
}: PricingMatrixDialogProps) {
  // Use key trick so inner form state resets automatically whenever open or initialRule changes
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden border border-border rounded-2xl shadow-2xl">
        {open && (
          <PricingMatrixForm
            key={initialRule?.id || 'new-rule'}
            initialRule={initialRule}
            onClose={() => onOpenChange(false)}
            onSave={(rule) => {
              onSaveRule(rule);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PricingMatrixFormProps {
  initialRule?: PricingTierRule | null;
  onClose: () => void;
  onSave: (rule: PricingTierRule) => void;
}

function PricingMatrixForm({ initialRule, onClose, onSave }: PricingMatrixFormProps) {
  // Target Scope
  const [scope, setScope] = useState<PricingScope>(initialRule?.scope || 'RESOURCE_TYPE');
  const [targetCategory, setTargetCategory] = useState<ResourceTypeCategory>(
    initialRule?.targetCategory || 'HOT_DESK'
  );
  const [targetResourceCode, setTargetResourceCode] = useState(
    initialRule?.targetResourceCode || 'DESK-A12'
  );

  // Rate Tiers
  const [hourlyRate, setHourlyRate] = useState<number>(initialRule?.hourlyRate ?? 2.5);
  const [dailyRate, setDailyRate] = useState<number>(initialRule?.dailyRate ?? 18.0);
  const [monthlyRate, setMonthlyRate] = useState<number>(initialRule?.monthlyRate ?? 250.0);
  const [minBookingHours, setMinBookingHours] = useState<number>(
    initialRule?.minBookingHours ?? 1
  );

  // Volume Duration Discount
  const [durationDiscountEnabled, setDurationDiscountEnabled] = useState<boolean>(
    initialRule?.durationDiscountEnabled ?? true
  );
  const [durationThresholdHours, setDurationThresholdHours] = useState<number>(
    initialRule?.durationThresholdHours ?? 5
  );
  const [durationDiscountPercent, setDurationDiscountPercent] = useState<number>(
    initialRule?.durationDiscountPercent ?? 15
  );

  // Weekend Surcharge
  const [weekendSurchargeEnabled, setWeekendSurchargeEnabled] = useState<boolean>(
    initialRule?.weekendSurchargeEnabled ?? false
  );
  const [weekendSurchargePerHour, setWeekendSurchargePerHour] = useState<number>(
    initialRule?.weekendSurchargePerHour ?? 0.5
  );

  // Dynamic daily savings percent calculation vs standard 8 hours
  const dailySavingsPercent = useMemo(() => {
    const raw8HourCost = hourlyRate * 8;
    if (raw8HourCost <= 0 || dailyRate >= raw8HourCost) return 0;
    return Math.round(((raw8HourCost - dailyRate) / raw8HourCost) * 100);
  }, [hourlyRate, dailyRate]);

  // Live dynamic discount calculation preview for an example booking
  const discountPreview: LiveDiscountPreview = useMemo(() => {
    // Example test duration: 1 hour above threshold, minimum 6 hours
    const testHours = Math.max(durationThresholdHours + 1, 6);
    const base = hourlyRate * testHours;
    const discount = durationDiscountEnabled ? (base * durationDiscountPercent) / 100 : 0;
    const net = base - discount;

    return {
      testDurationHours: testHours,
      baseTotal: Number(base.toFixed(2)),
      discountAmount: Number(discount.toFixed(2)),
      netTotal: Number(net.toFixed(2)),
      appliedDiscountPercent: durationDiscountEnabled ? durationDiscountPercent : 0
    };
  }, [hourlyRate, durationThresholdHours, durationDiscountPercent, durationDiscountEnabled]);

  const handleResetToDefault = () => {
    setHourlyRate(2.5);
    setDailyRate(18.0);
    setMonthlyRate(250.0);
    setMinBookingHours(1);
    setDurationDiscountEnabled(true);
    setDurationThresholdHours(5);
    setDurationDiscountPercent(15);
    setWeekendSurchargeEnabled(false);
    setWeekendSurchargePerHour(0.5);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const categoryNames: Record<ResourceTypeCategory, string> = {
      HOT_DESK: 'All Hot Desks',
      DEDICATED_DESK: 'Dedicated Workstations',
      MEETING_ROOM: 'Meeting & Conference Suites',
      BOOTH: 'Acoustic Solo Booths',
      EVENT_SPACE: 'Event Terrace & Lounge'
    };

    const saved: PricingTierRule = {
      id: initialRule?.id || `rule-${Date.now()}`,
      name:
        scope === 'RESOURCE_TYPE'
          ? `${categoryNames[targetCategory]} Tier`
          : `Custom Rule for ${targetResourceCode}`,
      scope,
      targetCategory,
      targetCategoryLabel: categoryNames[targetCategory],
      targetCount: scope === 'RESOURCE_TYPE' ? 28 : 1,
      targetResourceCode: scope === 'SPECIFIC_RESOURCE' ? targetResourceCode : undefined,
      hourlyRate,
      dailyRate,
      monthlyRate,
      minBookingHours,
      durationDiscountEnabled,
      durationThresholdHours,
      durationDiscountPercent,
      weekendSurchargeEnabled,
      weekendSurchargePerHour,
      status: 'ACTIVE',
      updatedAt: 'Just now'
    };

    onSave(saved);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
      {/* Modal Header */}
      <DialogHeader className="px-6 py-5 border-b border-border bg-card flex flex-row items-start justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              Resource Pricing Matrix
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Define standard rates, duration discounts, and surcharges
            </DialogDescription>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close modal"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </DialogHeader>

      {/* Modal Scrollable Body */}
      <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(88vh-140px)] select-none">
        {/* 1. Target Scope Selector */}
        <div className="space-y-2.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pricing Target Scope
          </Label>

          <div className="grid grid-cols-2 gap-3">
            {/* Option A: Resource Type */}
            <button
              type="button"
              onClick={() => setScope('RESOURCE_TYPE')}
              className={`rounded-xl p-3.5 flex items-center justify-between text-left transition-all ${
                scope === 'RESOURCE_TYPE'
                  ? 'border-2 border-primary bg-primary/5 shadow-xs'
                  : 'border border-border bg-card hover:bg-muted/50'
              }`}
            >
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold leading-none ${
                    scope === 'RESOURCE_TYPE' ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  Apply to Resource Type
                </p>
                <div className="inline-flex items-center">
                  <span className="text-[11px] font-medium bg-primary/15 text-primary px-2 py-0.5 rounded-md">
                    All Hot Desks (28 units)
                  </span>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  scope === 'RESOURCE_TYPE'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border'
                }`}
              >
                {scope === 'RESOURCE_TYPE' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Option B: Specific Resource */}
            <button
              type="button"
              onClick={() => setScope('SPECIFIC_RESOURCE')}
              className={`rounded-xl p-3.5 flex items-center justify-between text-left transition-all ${
                scope === 'SPECIFIC_RESOURCE'
                  ? 'border-2 border-primary bg-primary/5 shadow-xs'
                  : 'border border-border bg-card hover:bg-muted/50'
              }`}
            >
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold leading-none ${
                    scope === 'SPECIFIC_RESOURCE' ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  Apply to Specific Resource
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Single node (e.g. {targetResourceCode})
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  scope === 'SPECIFIC_RESOURCE'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border'
                }`}
              >
                {scope === 'SPECIFIC_RESOURCE' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>

          {/* If specific resource scope is picked */}
          {scope === 'SPECIFIC_RESOURCE' ? (
            <div className="pt-2">
              <Label htmlFor="specific-node-code" className="text-[11px] text-muted-foreground">
                Target Node Code
              </Label>
              <Input
                id="specific-node-code"
                value={targetResourceCode}
                onChange={(e) => setTargetResourceCode(e.target.value)}
                placeholder="e.g. DESK-A12"
                className="h-8 font-mono text-xs mt-1"
              />
            </div>
          ) : (
            <div className="pt-1">
              <Select
                value={targetCategory}
                onValueChange={(val) => setTargetCategory(val as ResourceTypeCategory)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOT_DESK">Hot Desks (28 units)</SelectItem>
                  <SelectItem value="DEDICATED_DESK">Dedicated Desks (20 units)</SelectItem>
                  <SelectItem value="MEETING_ROOM">Meeting Suites (6 units)</SelectItem>
                  <SelectItem value="BOOTH">Acoustic Solo Booths (8 units)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 2. Base Rate Cards (3-Column Input Grid) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Standard Rate Tiers
            </Label>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs text-primary font-medium hover:underline"
            >
              Reset to Default
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Hourly Rate */}
            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs hover:border-primary/50 transition-colors">
              <Label htmlFor="rate-hourly" className="block text-xs font-medium text-foreground mb-1.5">
                Hourly Rate
              </Label>
              <div className="relative flex items-center rounded-lg border border-border bg-background px-2.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <span className="text-muted-foreground font-medium text-xs mr-1">$</span>
                <input
                  id="rate-hourly"
                  type="number"
                  step="0.25"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full border-0 p-0 text-foreground font-mono text-sm font-semibold focus:outline-hidden bg-transparent"
                />
                <span className="text-muted-foreground text-[11px] shrink-0 ml-1">/ hr</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                <span>Min booking {minBookingHours} hr</span>
              </p>
            </div>

            {/* Card 2: Daily Rate (8 hrs) */}
            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs hover:border-primary/50 transition-colors">
              <Label htmlFor="rate-daily" className="block text-xs font-medium text-foreground mb-1.5">
                Daily Rate (8 hrs)
              </Label>
              <div className="relative flex items-center rounded-lg border border-border bg-background px-2.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <span className="text-muted-foreground font-medium text-xs mr-1">$</span>
                <input
                  id="rate-daily"
                  type="number"
                  step="0.5"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="w-full border-0 p-0 text-foreground font-mono text-sm font-semibold focus:outline-hidden bg-transparent"
                />
                <span className="text-muted-foreground text-[11px] shrink-0 ml-1">/ day</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 shrink-0" />
                <span>Save {dailySavingsPercent}% vs hourly</span>
              </p>
            </div>

            {/* Card 3: Monthly Pass */}
            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs hover:border-primary/50 transition-colors">
              <Label htmlFor="rate-monthly" className="block text-xs font-medium text-foreground mb-1.5">
                Monthly Pass
              </Label>
              <div className="relative flex items-center rounded-lg border border-border bg-background px-2.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <span className="text-muted-foreground font-medium text-xs mr-1">$</span>
                <input
                  id="rate-monthly"
                  type="number"
                  step="5"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  className="w-full border-0 p-0 text-foreground font-mono text-sm font-semibold focus:outline-hidden bg-transparent"
                />
                <span className="text-muted-foreground text-[11px] shrink-0 ml-1">/ mo</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                <span>Dedicated desk access</span>
              </p>
            </div>
          </div>
        </div>

        {/* 3. Volume Duration Discount Section */}
        <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-card border border-border text-primary shrink-0 mt-0.5">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Duration-Based Volume Discount
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Automatically scale rates for extended reservations
                </p>
              </div>
            </div>

            <Switch
              checked={durationDiscountEnabled}
              onCheckedChange={setDurationDiscountEnabled}
              aria-label="Toggle duration-based volume discount"
            />
          </div>

          {durationDiscountEnabled && (
            <div className="pt-3 border-t border-border/70 space-y-3">
              <div className="flex items-center flex-wrap gap-2 text-xs text-foreground">
                <span>If booking duration is ≥</span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={durationThresholdHours}
                  onChange={(e) => setDurationThresholdHours(Number(e.target.value))}
                  aria-label="Minimum duration hours"
                  className="w-14 text-center font-bold text-foreground border border-border rounded-lg py-1 px-1 bg-card focus:border-primary focus:outline-hidden"
                />
                <span>hours, apply</span>
                <div className="relative inline-flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={durationDiscountPercent}
                    onChange={(e) => setDurationDiscountPercent(Number(e.target.value))}
                    aria-label="Discount percentage"
                    className="w-16 text-center font-bold text-primary border border-border rounded-lg py-1 px-1 bg-card focus:border-primary focus:outline-hidden pr-5"
                  />
                  <span className="absolute right-1.5 font-bold text-primary text-[10px] pointer-events-none">
                    %
                  </span>
                </div>
                <span>discount automatically.</span>
              </div>

              {/* Dynamic Live Calculation Preview Pill */}
              <div className="bg-primary/5 text-primary border border-primary/20 text-xs rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Example: {discountPreview.testDurationHours}-hour reservation discount ={' '}
                    <strong>-${discountPreview.discountAmount.toFixed(2)}</strong>
                  </span>
                </div>
                <span className="font-bold bg-background/90 px-2 py-0.5 rounded text-foreground border border-border font-mono text-xs">
                  ${discountPreview.netTotal.toFixed(2)} net total
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Weekend & Peak Surcharge */}
        <div className="bg-card rounded-xl border border-border p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Weekend Surcharge
              </span>
              <span className="text-[11px] text-muted-foreground">
                Standard rate + ${weekendSurchargePerHour.toFixed(2)}/hr on Sat & Sun
              </span>
            </div>
          </div>

          <Switch
            checked={weekendSurchargeEnabled}
            onCheckedChange={setWeekendSurchargeEnabled}
            aria-label="Toggle weekend surcharge"
          />
        </div>
      </div>

      {/* Modal Action Footer */}
      <div className="border-t border-border px-6 py-4 bg-muted/40 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl shrink-0">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
          <span>Takes effect immediately across marketplace listings</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-4 text-xs font-medium"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            size="sm"
            className="h-9 px-4 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 transition-all duration-200 active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Apply Pricing Rules</span>
          </Button>
        </div>
      </div>
    </form>
  );
}

