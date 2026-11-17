import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Calculator,
  Calendar,
  Infinity as InfinityIcon,
  Lock,
  Info,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CommissionRule } from '../data/mock-commissions';
import { CommissionActionDialog } from './commission-action-dialog';

interface CommissionRuleDrawerProps {
  rule: CommissionRule | null;
  open: boolean;
  onClose: () => void;
  onRuleUpdated?: (updatedRule: CommissionRule) => void;
}

interface CommissionRuleFormProps {
  rule: CommissionRule;
  onClose: () => void;
  onRuleUpdated?: (updatedRule: CommissionRule) => void;
}

function CommissionRuleForm({
  rule,
  onClose,
  onRuleUpdated
}: CommissionRuleFormProps) {
  const [ruleTitle, setRuleTitle] = useState(rule.name);
  const [scope, setScope] = useState(rule.scope);
  const [rateType, setRateType] = useState<'PERCENTAGE' | 'FLAT_VARIABLE' | 'TIERED'>(rule.calculationType);
  const [takeRate, setTakeRate] = useState<number>(rule.effectiveRate);
  const [startDate, setStartDate] = useState(rule.effectiveFrom);
  const [endDate, setEndDate] = useState(rule.effectiveTo);
  const [isActive, setIsActive] = useState(rule.status === 'ACTIVE');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isHsmDialogOpen, setIsHsmDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && !isHsmDialogOpen) {
        onClose();
        triggerRef.current?.focus?.({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHsmDialogOpen, onClose]);

  function handleCopyRuleCode() {
    navigator.clipboard.writeText(rule.ruleCode);
    setCopiedCode(true);
    toast.success('Rule Code Copied', {
      description: `${rule.ruleCode} copied to clipboard.`
    });
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Real-time booking fee simulation (Base booking: 250,000 VND / $10.00 USD)
  const baseVnd = 250000;
  const baseUsd = 10.0;
  const retainedVnd = Math.round((baseVnd * takeRate) / 100);
  const retainedUsd = ((baseUsd * takeRate) / 100).toFixed(2);

  function handleSuccessConfirm() {
    const updated: CommissionRule = {
      ...rule,
      name: ruleTitle,
      scope,
      effectiveRate: takeRate,
      effectiveFrom: startDate,
      effectiveTo: endDate,
      status: isActive ? 'ACTIVE' : 'DEPRECATED',
      version: 'v2.4.2'
    };
    onRuleUpdated?.(updated);
    onClose();
  }

  return (
    <>
      {/* Scrollable Form Body */}
      <div className='p-6 space-y-6 overflow-y-auto flex-1 text-xs'>
        {/* Section 1: Core Identification */}
        <div className='space-y-3'>
          <div className='text-[11px] font-bold text-muted-foreground tracking-wider uppercase'>
            1. Core Identification
          </div>
          <div>
            <label
              htmlFor='rule-title-input'
              className='block font-semibold text-foreground mb-1'
            >
              Rule Title
            </label>
            <input
              id='rule-title-input'
              type='text'
              value={ruleTitle}
              onChange={(e) => setRuleTitle(e.target.value)}
              className='w-full text-xs font-medium border border-input rounded-lg p-2.5 text-foreground bg-background focus:ring-1 focus:ring-primary focus:outline-none transition-all'
            />
          </div>
          <div>
            <div className='font-semibold text-foreground mb-1'>
              Rule Code / Unique Identifier
            </div>
            <div className='flex items-center justify-between p-2.5 bg-muted/60 border border-border rounded-lg font-mono text-xs text-foreground'>
              <span className='font-bold'>{rule.ruleCode}</span>
              <button
                type='button'
                onClick={handleCopyRuleCode}
                className='flex items-center gap-1 text-[11px] font-sans text-primary hover:underline font-semibold'
              >
                {copiedCode ? (
                  <Check className='size-3.5 text-emerald-600' />
                ) : (
                  <Copy className='size-3.5' />
                )}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className='h-px bg-border' />

        {/* Section 2: Scope & Applicability */}
        <div className='space-y-3'>
          <div className='text-[11px] font-bold text-muted-foreground tracking-wider uppercase'>
            2. Scope &amp; Applicability
          </div>
          <div>
            <label
              htmlFor='rule-scope-select'
              className='block font-semibold text-foreground mb-1'
            >
              Target Application Scope
            </label>
            <select
              id='rule-scope-select'
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              aria-label='Target Application Scope'
              className='w-full text-xs border border-input rounded-lg p-2.5 text-foreground bg-background focus:ring-1 focus:ring-primary focus:outline-none'
            >
              <option value='Global Marketplace (All Spaces)'>
                Global Marketplace (All Spaces)
              </option>
              <option value='Tier-1 Enterprise Accounts'>
                Tier-1 Enterprise Accounts
              </option>
              <option value='All VietQR & Domestic Rails'>
                All VietQR &amp; Domestic Rails
              </option>
              <option value='After-hours & Auditorium'>
                After-hours &amp; Auditorium
              </option>
              <option value='Short-notice Cancellations'>
                Short-notice Cancellations
              </option>
            </select>
          </div>
          <p className='text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border leading-relaxed'>
            {rule.description}
          </p>
        </div>

        <div className='h-px bg-border' />

        {/* Section 3: Take-Rate Calculation */}
        <div className='space-y-4'>
          <div className='text-[11px] font-bold text-muted-foreground tracking-wider uppercase'>
            3. Take-Rate Calculation
          </div>

          <div>
            <span className='block font-semibold text-foreground mb-2'>
              Commission Rate Type
            </span>
            <div className='grid grid-cols-3 gap-2'>
              <button
                type='button'
                onClick={() => setRateType('PERCENTAGE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  rateType === 'PERCENTAGE'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border hover:bg-muted text-foreground font-medium'
                }`}
              >
                <span className='text-xs'>Percentage</span>
                <span className='text-[10px] text-muted-foreground mt-0.5'>(%)</span>
              </button>
              <button
                type='button'
                onClick={() => setRateType('FLAT_VARIABLE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  rateType === 'FLAT_VARIABLE'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border hover:bg-muted text-foreground font-medium'
                }`}
              >
                <span className='text-xs'>Flat + Variable</span>
                <span className='text-[10px] text-muted-foreground mt-0.5'>Fixed Add-on</span>
              </button>
              <button
                type='button'
                onClick={() => setRateType('TIERED')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  rateType === 'TIERED'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border hover:bg-muted text-foreground font-medium'
                }`}
              >
                <span className='text-xs'>Tiered Volume</span>
                <span className='text-[10px] text-muted-foreground mt-0.5'>Multi-bracket</span>
              </button>
            </div>
          </div>

          {/* Numeric input with attached % suffix */}
          <div>
            <label
              htmlFor='take-rate-percentage-input'
              className='block font-semibold text-foreground mb-1'
            >
              Take-Rate Percentage
            </label>
            <div className='relative flex items-center'>
              <input
                id='take-rate-percentage-input'
                type='number'
                step='0.1'
                min='0.1'
                max='100'
                value={takeRate}
                onChange={(e) => setTakeRate(parseFloat(e.target.value) || 0)}
                className='w-full text-xl font-bold font-mono border border-input rounded-lg p-2.5 pr-12 text-foreground bg-background focus:ring-1 focus:ring-primary focus:outline-none'
              />
              <div className='absolute right-3 text-sm font-bold text-muted-foreground font-mono pointer-events-none'>
                %
              </div>
            </div>
          </div>

          {/* Dynamic Real-Time Simulation Box */}
          <div className='bg-muted/60 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2.5'>
            <Calculator className='size-4 text-primary shrink-0 mt-0.5' />
            <div>
              <span className='font-bold text-foreground'>Real-Time Simulation: </span>
              On a standard <span className='font-mono font-semibold text-foreground'>250,000 VND (${baseUsd.toFixed(2)})</span> booking, NexSpace retains{' '}
              <strong className='text-emerald-700 dark:text-emerald-400 font-mono font-bold'>
                {retainedVnd.toLocaleString('vi-VN')} VND (${retainedUsd})
              </strong>{' '}
              net platform commission.
            </div>
          </div>
        </div>

        <div className='h-px bg-border' />

        {/* Section 4: Effective Timeline & Lifecycle */}
        <div className='space-y-4'>
          <div className='text-[11px] font-bold text-muted-foreground tracking-wider uppercase'>
            4. Effective Timeline &amp; Lifecycle
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label
                htmlFor='rule-start-date'
                className='block font-semibold text-foreground mb-1'
              >
                Start Date
              </label>
              <div className='relative flex items-center'>
                <Calendar className='size-3.5 absolute left-2.5 text-muted-foreground' />
                <input
                  id='rule-start-date'
                  type='text'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='w-full text-xs font-medium border border-input rounded-lg p-2.5 pl-8 text-foreground bg-background'
                />
              </div>
            </div>
            <div>
              <label
                htmlFor='rule-end-date'
                className='block font-semibold text-foreground mb-1'
              >
                End Date
              </label>
              <div className='relative flex items-center'>
                <InfinityIcon className='size-3.5 absolute left-2.5 text-muted-foreground' />
                <input
                  id='rule-end-date'
                  type='text'
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className='w-full text-xs font-medium border border-input rounded-lg p-2.5 pl-8 text-foreground bg-background font-mono'
                />
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div className='flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30'>
            <div>
              <div className='font-semibold text-foreground'>Rule Production State</div>
              <div className='text-[11px] text-muted-foreground'>
                Turn off to deprecate this policy immediately
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                aria-label='Toggle rule production state'
                className='sr-only peer'
              />
              <div className='w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500' />
            </label>
          </div>
        </div>

        {/* Section 5: Legal Disclaimer Box */}
        <div className='bg-slate-100 dark:bg-slate-900 border border-border rounded-lg p-3.5 text-xs space-y-1.5'>
          <div className='flex items-center gap-1.5 font-bold text-foreground'>
            <Info className='size-4 text-amber-600 dark:text-amber-400' />
            <span>Crucial Notice:</span>
          </div>
          <p className='text-muted-foreground leading-relaxed'>
            Saving changes will increment the policy version to{' '}
            <strong className='font-mono text-primary'>v2.4.2</strong>. In-flight bookings and pending disbursements will preserve their checkout-time rate (<code className='font-mono bg-muted px-1 py-0.5 rounded'>#RULE-01-v1</code>).
          </p>
        </div>
      </div>

      {/* Fixed Bottom Footer Actions */}
      <div className='border-t border-border p-5 bg-muted/40 flex flex-col gap-2 shrink-0'>
        <div className='flex items-center justify-between'>
          <Button variant='outline' onClick={onClose} className='text-xs'>
            Cancel
          </Button>
          <Button
            onClick={() => setIsHsmDialogOpen(true)}
            className='text-xs font-bold gap-2'
          >
            <Lock className='size-3.5' />
            Save &amp; Activate Rule
          </Button>
        </div>
        <div className='text-[10px] text-muted-foreground text-center font-mono'>
          Requires 2FA / SecOps HSM approval upon submission.
        </div>
      </div>

      {/* 2FA / HSM Dialog */}
      <CommissionActionDialog
        open={isHsmDialogOpen}
        onOpenChange={setIsHsmDialogOpen}
        ruleCode={rule.ruleCode}
        ruleTitle={ruleTitle}
        ratePercentage={takeRate}
        onConfirmSuccess={handleSuccessConfirm}
      />
    </>
  );
}

export function CommissionRuleDrawer({
  rule,
  open,
  onClose,
  onRuleUpdated
}: CommissionRuleDrawerProps) {
  if (!open || !rule) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-background/80 backdrop-blur-xs z-40 transition-opacity'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-over Panel (560px desktop) */}
      <aside
        aria-label='Commission Rule Configuration Panel'
        className='fixed top-0 right-0 h-screen w-full sm:w-[560px] z-50 bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300'
      >
        {/* Drawer Header */}
        <div className='p-6 border-b border-border flex items-start justify-between bg-card shrink-0'>
          <div>
            <div className='flex items-center gap-2 mb-1.5'>
              <span className='bg-primary/10 text-primary font-mono font-bold text-xs px-2.5 py-0.5 rounded'>
                #{rule.ruleCode}
              </span>
              <Badge
                variant='outline'
                className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold px-2 py-0.5'
              >
                <span className='size-1.5 rounded-full bg-emerald-500 mr-1.5' />
                PRODUCTION LIVE
              </Badge>
            </div>
            <h2 className='text-lg font-bold text-foreground tracking-tight'>
              Configure Fee Rule
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Editing production monetization parameters
            </p>
          </div>

          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={() => toast.info('Expanded Fullscreen View (Simulated)')}
              aria-label='Expand View'
              className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
            >
              <Maximize2 className='size-4' />
            </button>
            <button
              type='button'
              onClick={onClose}
              aria-label='Close Panel (Esc)'
              className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
            >
              <X className='size-5' />
            </button>
          </div>
        </div>

        {/* Self-contained form with key for state isolation */}
        <CommissionRuleForm
          key={rule.id}
          rule={rule}
          onClose={onClose}
          onRuleUpdated={onRuleUpdated}
        />
      </aside>
    </>
  );
}
