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
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CommissionRule } from '../data/mock-commissions';
import { CommissionActionDialog } from './commission-action-dialog';
import { useLanguage } from '@/features/landing/context/language-context';

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
  const { language } = useLanguage();
  const [ruleTitle, setRuleTitle] = useState(
    language === 'vi' ? (rule.nameVi || rule.name) : rule.name
  );
  const [scope, setScope] = useState(
    language === 'vi' ? (rule.scopeVi || rule.scope) : rule.scope
  );
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
    toast.success(
      language === 'vi' ? 'Đã sao chép mã quy tắc' : 'Rule Code Copied',
      {
        description: `${rule.ruleCode} copied to clipboard.`
      }
    );
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Real-time booking fee simulation (Base booking: 250,000 VND)
  const baseVnd = 250000;
  const retainedVnd = Math.round((baseVnd * takeRate) / 100);

  function handleSuccessConfirm() {
    const updated: CommissionRule = {
      ...rule,
      name: ruleTitle,
      nameVi: language === 'vi' ? ruleTitle : rule.nameVi,
      scope,
      scopeVi: language === 'vi' ? scope : rule.scopeVi,
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
      <div className='p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs'>
        {/* Section 1: Core Identification */}
        <div className='space-y-3'>
          <div className='text-[10px] font-bold text-muted-foreground tracking-wider uppercase font-mono'>
            {language === 'vi' ? '1. Định danh Quy tắc' : '1. Core Identification'}
          </div>
          <div>
            <label
              htmlFor='rule-title-input'
              className='block font-semibold text-foreground mb-1'
            >
              {language === 'vi' ? 'Tên quy tắc biểu phí' : 'Rule Title'}
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
              {language === 'vi' ? 'Mã định danh bất biến (Rule Code)' : 'Rule Code / Unique Identifier'}
            </div>
            <div className='flex items-center justify-between p-2.5 bg-muted/50 border border-border/70 rounded-lg font-mono text-xs text-foreground'>
              <span className='font-bold'>{rule.ruleCode}</span>
              <button
                type='button'
                onClick={handleCopyRuleCode}
                className='flex items-center gap-1 text-[11px] font-sans text-primary hover:underline font-semibold cursor-pointer'
              >
                {copiedCode ? (
                  <Check className='size-3.5 text-emerald-600' />
                ) : (
                  <Copy className='size-3.5' />
                )}
                <span>
                  {copiedCode
                    ? language === 'vi'
                      ? 'Đã chép'
                      : 'Copied'
                    : language === 'vi'
                      ? 'Sao chép'
                      : 'Copy'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className='h-px bg-border/60' />

        {/* Section 2: Scope & Applicability */}
        <div className='space-y-3'>
          <div className='text-[10px] font-bold text-muted-foreground tracking-wider uppercase font-mono'>
            {language === 'vi' ? '2. Phạm vi & Đối tượng Áp dụng' : '2. Scope & Applicability'}
          </div>
          <div>
            <label
              htmlFor='rule-scope-select'
              className='block font-semibold text-foreground mb-1'
            >
              {language === 'vi' ? 'Phạm vi áp dụng mục tiêu' : 'Target Application Scope'}
            </label>
            <select
              id='rule-scope-select'
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              aria-label='Target Application Scope'
              className='w-full text-xs border border-input rounded-lg p-2.5 text-foreground bg-background focus:ring-1 focus:ring-primary focus:outline-none'
            >
              {language === 'vi' ? (
                <>
                  <option value='Toàn bộ sàn (Tất cả không gian)'>
                    Toàn bộ sàn (Tất cả không gian)
                  </option>
                  <option value='Khách hàng Doanh nghiệp Tier-1'>
                    Khách hàng Doanh nghiệp Tier-1
                  </option>
                  <option value='Cổng VietQR NAPAS247 & Thẻ nội địa'>
                    Cổng VietQR NAPAS247 &amp; Thẻ nội địa
                  </option>
                  <option value='Ngoài giờ & Hội trường sự kiện'>
                    Ngoài giờ &amp; Hội trường sự kiện
                  </option>
                  <option value='Hủy chỗ trong vòng 24 giờ'>
                    Hủy chỗ trong vòng 24 giờ
                  </option>
                </>
              ) : (
                <>
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
                </>
              )}
            </select>
          </div>
          <p className='text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60 leading-relaxed'>
            {language === 'vi' ? (rule.descriptionVi || rule.description) : rule.description}
          </p>
        </div>

        <div className='h-px bg-border/60' />

        {/* Section 3: Take-Rate Calculation */}
        <div className='space-y-4'>
          <div className='text-[10px] font-bold text-muted-foreground tracking-wider uppercase font-mono'>
            {language === 'vi' ? '3. Cách tính Tỷ lệ Hoa hồng' : '3. Take-Rate Calculation'}
          </div>

          <div>
            <span className='block font-semibold text-foreground mb-2'>
              {language === 'vi' ? 'Loại cấu trúc phí' : 'Commission Rate Type'}
            </span>
            <div className='grid grid-cols-3 gap-2'>
              <button
                type='button'
                onClick={() => setRateType('PERCENTAGE')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  rateType === 'PERCENTAGE'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'border-border/70 hover:bg-muted text-foreground font-medium'
                }`}
              >
                <span className='text-xs'>
                  {language === 'vi' ? 'Phần trăm' : 'Percentage'}
                </span>
                <span className='text-[10px] text-muted-foreground mt-0.5'>(%)</span>
              </button>
              <button
                type='button'
                onClick={() => setRateType('FLAT_VARIABLE')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  rateType === 'FLAT_VARIABLE'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'border-border/70 hover:bg-muted text-foreground font-medium'
                }`}
              >
                <span className='text-xs'>
                  {language === 'vi' ? 'Cố định + Biến đổi' : 'Flat + Variable'}
                </span>
                <span className='text-[10px] text-muted-foreground mt-0.5'>+ VNĐ</span>
              </button>
              <button
                type='button'
                onClick={() => setRateType('TIERED')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  rateType === 'TIERED'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'border-border/70 hover:bg-muted text-foreground font-medium'
                }`}
              >
                <span className='text-xs'>
                  {language === 'vi' ? 'Theo bậc thang' : 'Tiered Volume'}
                </span>
                <span className='text-[10px] text-muted-foreground mt-0.5'>Bậc số lượng</span>
              </button>
            </div>
          </div>

          {/* Numeric input with attached % suffix */}
          <div>
            <label
              htmlFor='take-rate-percentage-input'
              className='block font-semibold text-foreground mb-1'
            >
              {language === 'vi' ? 'Tỷ lệ phần trăm hoa hồng (%)' : 'Take-Rate Percentage (%)'}
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
          <div className='bg-muted/50 border border-border/70 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2.5'>
            <Calculator className='size-4 text-primary shrink-0 mt-0.5' />
            <div>
              <span className='font-bold text-foreground'>
                {language === 'vi' ? 'Mô phỏng tức thì: ' : 'Real-Time Simulation: '}
              </span>
              {language === 'vi' ? (
                <>
                  Với một đơn đặt chỗ tiêu chuẩn{' '}
                  <span className='font-mono font-semibold text-foreground'>250.000 ₫</span>, sàn NexSpace sẽ giữ lại{' '}
                  <strong className='text-emerald-600 dark:text-emerald-400 font-mono font-bold'>
                    {retainedVnd.toLocaleString('vi-VN')} ₫
                  </strong>{' '}
                  doanh thu phí hoa hồng.
                </>
              ) : (
                <>
                  On a standard <span className='font-mono font-semibold text-foreground'>250,000 VND</span> booking, NexSpace retains{' '}
                  <strong className='text-emerald-600 dark:text-emerald-400 font-mono font-bold'>
                    {retainedVnd.toLocaleString('vi-VN')} VND
                  </strong>{' '}
                  net platform commission.
                </>
              )}
            </div>
          </div>
        </div>

        <div className='h-px bg-border/60' />

        {/* Section 4: Effective Timeline & Lifecycle */}
        <div className='space-y-4'>
          <div className='text-[10px] font-bold text-muted-foreground tracking-wider uppercase font-mono'>
            {language === 'vi' ? '4. Thời gian Hiệu lực & Vòng đời' : '4. Effective Timeline & Lifecycle'}
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label
                htmlFor='rule-start-date'
                className='block font-semibold text-foreground mb-1'
              >
                {language === 'vi' ? 'Ngày bắt đầu' : 'Start Date'}
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
                {language === 'vi' ? 'Ngày kết thúc' : 'End Date'}
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
          <div className='flex items-center justify-between p-3 border border-border/70 rounded-lg bg-muted/30'>
            <div>
              <div className='font-semibold text-foreground'>
                {language === 'vi' ? 'Trạng thái kích hoạt trên hệ thống' : 'Rule Production State'}
              </div>
              <div className='text-[11px] text-muted-foreground'>
                {language === 'vi'
                  ? 'Tắt công tắc để dừng áp dụng chính sách này ngay lập tức'
                  : 'Turn off to deprecate this policy immediately'}
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
        <div className='bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 text-xs space-y-1.5'>
          <div className='flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-200'>
            <Info className='size-4 text-amber-600 dark:text-amber-400' />
            <span>{language === 'vi' ? 'Lưu ý kiểm toán quan trọng:' : 'Crucial Notice:'}</span>
          </div>
          <p className='text-amber-900/90 dark:text-amber-300/90 leading-relaxed text-[11px]'>
            {language === 'vi' ? (
              <>
                Việc lưu thay đổi sẽ tự động tăng phiên bản chính sách lên{' '}
                <strong className='font-mono text-primary'>v2.4.2</strong>. Các giao dịch đang diễn ra và các khoản chờ giải ngân vẫn sẽ giữ nguyên mức phí tại thời điểm checkout ban đầu.
              </>
            ) : (
              <>
                Saving changes will increment the policy version to{' '}
                <strong className='font-mono text-primary'>v2.4.2</strong>. In-flight bookings and pending disbursements will preserve their checkout-time rate.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Fixed Bottom Footer Actions */}
      <div className='border-t border-border/70 p-4 sm:p-5 bg-muted/40 flex flex-col gap-2 shrink-0'>
        <div className='flex items-center justify-between gap-3'>
          <Button variant='outline' onClick={onClose} className='text-xs h-8'>
            {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
          </Button>
          <Button
            onClick={() => setIsHsmDialogOpen(true)}
            className='text-xs font-bold gap-2 h-8'
          >
            <Lock className='size-3.5' />
            <span>{language === 'vi' ? 'Ký duyệt & Kích hoạt' : 'Save & Activate Rule'}</span>
          </Button>
        </div>
        <div className='text-[10px] text-muted-foreground text-center font-mono'>
          {language === 'vi'
            ? 'Yêu cầu xác thực 2FA / chữ ký số HSM của Super Admin khi lưu.'
            : 'Requires 2FA / SecOps HSM approval upon submission.'}
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
  const { language } = useLanguage();
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
        className='ns-modal-shine fixed top-0 right-0 h-screen w-full sm:w-[560px] z-50 bg-card text-card-foreground border-l border-border/80 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300'
      >
        {/* Drawer Header */}
        <div className='p-5 sm:p-6 border-b border-border/70 flex items-start justify-between bg-card shrink-0'>
          <div>
            <div className='flex items-center gap-2 mb-1.5'>
              <span className='bg-primary/10 text-primary font-mono font-bold text-xs px-2.5 py-0.5 rounded'>
                #{rule.ruleCode}
              </span>
              <Badge
                variant='outline'
                className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5'
              >
                <span className='size-1.5 rounded-full bg-emerald-500 mr-1.5' />
                {language === 'vi' ? 'ĐANG VẬN HÀNH' : 'PRODUCTION LIVE'}
              </Badge>
            </div>
            <h2 className='text-base sm:text-lg font-bold text-foreground tracking-tight font-heading'>
              {language === 'vi' ? 'Cấu hình Quy tắc Biểu phí' : 'Configure Fee Rule'}
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {language === 'vi'
                ? 'Điều chỉnh tham số hoa hồng kiếm tiền trên nền tảng'
                : 'Editing production monetization parameters'}
            </p>
          </div>

          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={() =>
                toast.info(
                  language === 'vi'
                    ? 'Chế độ toàn màn hình (Mô phỏng)'
                    : 'Expanded Fullscreen View (Simulated)'
                )
              }
              aria-label='Expand View'
              className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer'
            >
              <Maximize2 className='size-4' />
            </button>
            <button
              type='button'
              onClick={onClose}
              aria-label='Close Panel (Esc)'
              className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer'
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
