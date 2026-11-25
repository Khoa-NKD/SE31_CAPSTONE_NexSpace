import React from 'react';
import { CalendarClock, CheckCircle, Receipt, Info, ArrowRight } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/features/landing/context/language-context';

export function StatutoryComplianceCard() {
  const { language } = useLanguage();

  function handleAuditLogClick() {
    toast.info(
      language === 'vi' ? 'Nhật ký kiểm toán HSM' : 'HSM Audit Log Explorer',
      {
        description:
          language === 'vi'
            ? 'Đang xem lịch sử sửa đổi sổ cái bất biến mật mã cho Chính sách v2.4.1.'
            : 'Viewing cryptographic immutable ledger revisions for Policy v2.4.1.'
      }
    );
  }

  function handleTaxInfoClick() {
    toast.info(
      language === 'vi' ? 'Tuân thủ Thuế & Hóa đơn điện tử' : 'Vietnamese Tax Compliance',
      {
        description:
          language === 'vi'
            ? 'Tuân thủ Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC. Tích hợp xuất hóa đơn điện tử tự động qua nhà cung cấp T-VAN.'
            : 'Decree 123/2020/ND-CP compliance active. Automated digital VAT e-invoicing integrated via authorized T-VAN provider.'
      }
    );
  }

  return (
    <div className='flex flex-col gap-5 h-full'>
      {/* Card 1: Scheduled Fee Policy Revisions */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-5 shadow-2xs'>
        <div className='flex items-center gap-2 mb-3'>
          <div className='p-1 rounded-md bg-primary/10 text-primary'>
            <CalendarClock className='size-4' />
          </div>
          <h3 className='text-sm font-bold text-foreground'>
            {language === 'vi' ? 'Lịch trình điều chỉnh biểu phí' : 'Scheduled Fee Policy Revisions'}
          </h3>
        </div>

        <div className='p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3 flex items-start gap-3'>
          <CheckCircle className='size-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0' />
          <div>
            <p className='text-xs font-bold text-emerald-950 dark:text-emerald-200'>
              {language === 'vi' ? 'Không có điều chỉnh tỷ lệ đang chờ xử lý' : 'No pending rate revisions scheduled'}
            </p>
            <p className='text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed'>
              {language === 'vi'
                ? 'Toàn bộ hợp đồng đối tác Tier-1 được khóa cố định đến hết Quý 2/2026. Mọi điều chỉnh biểu phí bắt buộc phải thông báo trước 30 ngày và ký duyệt mật mã HSM.'
                : 'All tier-1 organizer contracts are locked through Q2 2026. Any rate adjustment mandates a 30-day notice and SecOps HSM authorization.'}
            </p>
          </div>
        </div>

        <div className='flex items-center justify-between pt-2 text-xs'>
          <span className='text-muted-foreground font-mono text-[11px]'>
            {language === 'vi' ? 'Phiên bản chính sách:' : 'Policy Version:'}{' '}
            <strong className='text-foreground'>v2.4.1</strong>
          </span>
          <Button
            variant='link'
            size='sm'
            onClick={handleAuditLogClick}
            className='h-auto p-0 text-primary font-semibold inline-flex items-center gap-1 hover:underline text-xs'
          >
            <span>{language === 'vi' ? 'Xem nhật ký kiểm toán' : 'View Audit Log'}</span>
            <ArrowRight className='size-3.5' />
          </Button>
        </div>
      </div>

      {/* Card 2: Tax Compliance & Statutory VAT */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-5 shadow-2xs'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div className='p-1 rounded-md bg-muted text-muted-foreground'>
              <Receipt className='size-4' />
            </div>
            <h3 className='text-sm font-bold text-foreground'>
              {language === 'vi' ? 'Tuân thủ Thuế & Hóa đơn VAT' : 'Tax Compliance & Statutory VAT'}
            </h3>
          </div>
          <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border'>
            Nghị định 123/2020/NĐ-CP
          </span>
        </div>

        <div className='grid grid-cols-2 gap-3 mb-3'>
          <div className='p-3 rounded-lg bg-muted/40 border border-border/60'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono'>
              {language === 'vi' ? 'Thuế suất VAT' : 'VAT Take Rate'}
            </span>
            <p className='text-xl font-extrabold text-foreground mt-0.5 font-heading'>8.0%</p>
            <span className='text-[11px] text-muted-foreground'>
              {language === 'vi' ? 'Hóa đơn điện tử GTGT' : 'e-Invoice Standard'}
            </span>
          </div>

          <div className='p-3 rounded-lg bg-muted/40 border border-border/60'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono'>
              {language === 'vi' ? 'Đồng bộ Tổng cục Thuế' : 'GDT Sync Status'}
            </span>
            <p className='text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-heading'>
              Real-time
            </p>
            <span className='text-[11px] text-muted-foreground'>
              {language === 'vi' ? 'Cổng truyền nhận T-VAN' : 'General Dept of Taxation'}
            </span>
          </div>
        </div>

        <div className='flex items-center justify-between text-xs text-muted-foreground pt-1'>
          <div className='flex items-center gap-2'>
            <span className='size-2 rounded-full bg-emerald-500 shrink-0' />
            <span className='text-[11px]'>
              {language === 'vi'
                ? 'Hóa đơn điện tử VietQR đối soát và phát hành hàng ngày'
                : 'VietQR e-invoices reconciled daily'}
            </span>
          </div>
          <button
            type='button'
            onClick={handleTaxInfoClick}
            aria-label='View statutory tax compliance details'
            className='text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted cursor-pointer'
          >
            <Info className='size-4' />
          </button>
        </div>
      </div>
    </div>
  );
}
