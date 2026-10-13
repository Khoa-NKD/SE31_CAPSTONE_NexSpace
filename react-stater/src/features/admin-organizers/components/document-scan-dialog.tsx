import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { VerificationDocument } from '../data/mock-organizers';

interface DocumentScanDialogProps {
  document: VerificationDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentScanDialog({
  document,
  isOpen,
  onClose
}: DocumentScanDialogProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!document) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-4xl p-0 overflow-hidden bg-card border border-border shadow-2xl'>
        {/* Header */}
        <div className='p-5 border-b border-border flex items-center justify-between bg-muted/40'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-primary/10 text-primary'>
              <ShieldCheck className='size-5' aria-hidden='true' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold font-heading text-foreground'>
                {document.title}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                {document.englishTitle} • OCR Match: <strong>{document.ocrMatchRate}%</strong>
              </DialogDescription>
            </div>
          </div>

          {/* Zoom & Inspection Controls */}
          <div className='flex items-center gap-2'>
            <div className='flex items-center border border-border rounded-lg bg-card p-1 shadow-2xs'>
              <button
                type='button'
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                aria-label='Zoom out'
                className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors'
              >
                <ZoomOut className='size-4' aria-hidden='true' />
              </button>
              <span className='px-2 text-xs font-mono font-medium text-foreground'>
                {zoomLevel}%
              </span>
              <button
                type='button'
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                aria-label='Zoom in'
                className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors'
              >
                <ZoomIn className='size-4' aria-hidden='true' />
              </button>
              <button
                type='button'
                onClick={handleResetZoom}
                aria-label='Reset zoom'
                className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1 border-l border-border'
              >
                <RotateCw className='size-3.5' aria-hidden='true' />
              </button>
            </div>
          </div>
        </div>

        {/* Document Inspection Canvas */}
        <div className='p-6 bg-slate-950/5 dark:bg-slate-950/40 overflow-auto max-h-[65vh] flex justify-center items-center'>
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
            className='transition-transform duration-200 w-full max-w-2xl bg-white text-slate-900 rounded-lg border-2 border-slate-300 shadow-xl p-8 relative font-serif select-none'
          >
            {document.type === 'gpkd' ? (
              <div className='space-y-4 text-xs leading-relaxed'>
                {/* Official Seal Simulation */}
                <div className='absolute right-8 top-12 w-28 h-28 rounded-full border-2 border-dashed border-red-600/60 flex items-center justify-center rotate-12 pointer-events-none'>
                  <div className='text-[10px] text-red-600 font-bold text-center leading-tight uppercase'>
                    ★ SỞ KH&amp;ĐT ★<br />TP. HỒ CHÍ MINH<br />ĐÃ CHỨNG THỰC
                  </div>
                </div>

                <div className='text-center space-y-1 pb-4 border-b border-slate-300'>
                  <div className='font-bold uppercase text-[11px] tracking-wide'>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className='italic text-[10px]'>Độc lập - Tự do - Hạnh phúc</div>
                  <div className='pt-3 font-bold uppercase text-sm font-sans tracking-wide text-indigo-950'>
                    GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP
                  </div>
                  <div className='font-bold text-[11px] text-slate-700'>
                    CÔNG TY TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN
                  </div>
                  <div className='font-mono font-bold text-xs pt-1'>
                    Mã số doanh nghiệp: {document.details.regNumber || '0312345678'}
                  </div>
                </div>

                <div className='space-y-2 pt-2'>
                  <div>
                    <span className='font-bold'>1. Tên công ty viết bằng tiếng Việt:</span>{' '}
                    <span className='uppercase font-semibold'>{document.details.companyName}</span>
                  </div>
                  <div>
                    <span className='font-bold'>2. Địa chỉ trụ sở chính:</span>{' '}
                    <span>{document.details.headquarters}</span>
                  </div>
                  <div>
                    <span className='font-bold'>3. Người đại diện theo pháp luật:</span>{' '}
                    <span>{document.details.legalRep}</span>
                  </div>
                  <div>
                    <span className='font-bold'>4. Vốn điều lệ:</span>{' '}
                    <span className='font-mono font-semibold'>10.000.000.000 VNĐ (Mười tỷ đồng)</span>
                  </div>
                </div>

                <div className='pt-6 flex justify-between text-[11px] italic text-slate-500 border-t border-slate-200'>
                  <div>Ngày đăng ký thay đổi lần thứ 3: 15/09/2023</div>
                  <div className='font-bold not-italic text-red-700'>Phòng Đăng ký kinh doanh TP.HCM</div>
                </div>
              </div>
            ) : document.type === 'cccd' ? (
              <div className='space-y-6 text-xs font-sans'>
                <div className='grid grid-cols-2 gap-4'>
                  {/* Front */}
                  <div className='border border-slate-300 rounded-lg p-4 bg-gradient-to-br from-amber-50/50 to-emerald-50/40 space-y-2'>
                    <div className='font-bold text-[10px] text-red-700 uppercase border-b pb-1'>
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM • CĂN CƯỚC CÔNG DÂN
                    </div>
                    <div className='flex gap-3 pt-2'>
                      <div className='w-20 h-24 rounded bg-slate-200 border flex items-center justify-center font-bold text-slate-500 text-xs shrink-0 overflow-hidden'>
                        <img
                          src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
                          alt='Biometric portrait'
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <div className='space-y-1 text-[11px]'>
                        <div>Số / No: <strong className='font-mono'>{document.details.idNumber}</strong></div>
                        <div>Họ và tên: <strong className='font-semibold'>{document.details.legalRep}</strong></div>
                        <div>Ngày sinh: {document.details.dob}</div>
                        <div>Có giá trị đến: {document.details.expiryDate}</div>
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className='border border-slate-300 rounded-lg p-4 bg-slate-50 space-y-2'>
                    <div className='font-bold text-[10px] text-slate-700 uppercase border-b pb-1'>
                      MẶT SAU (BACK)
                    </div>
                    <div className='space-y-1.5 text-[11px] pt-1'>
                      <div>Đặc điểm nhận dạng: {document.details.identificationFeatures}</div>
                      <div>Ngày cấp: {document.details.issueDate}</div>
                      <div className='font-mono text-[9px] bg-slate-200 p-1.5 rounded'>
                        {document.details.mrzCode}
                      </div>
                      <div className='text-emerald-700 font-semibold text-[10px] flex items-center gap-1 pt-1'>
                        <CheckCircle2 className='size-3.5' /> MRZ Checksum &amp; QR Chip Validated
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='space-y-3 text-xs font-sans'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <span className='font-bold text-emerald-800 uppercase'>NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN NGOẠI THƯƠNG VIỆT NAM</span>
                  <span className='font-mono text-xs text-slate-500'>VCB-AUTH-9921</span>
                </div>
                <div className='text-center py-2 font-bold uppercase text-sm'>
                  GIẤY XÁC NHẬN TÀI KHOẢN NGÂN HÀNG
                </div>
                <div className='space-y-1.5 text-[11px]'>
                  <div>Tên chủ tài khoản: <strong>{document.details.accountHolder || 'CÔNG TY TNHH ACME COWORKING VIỆT NAM'}</strong></div>
                  <div>Số tài khoản: <strong className='font-mono'>{document.details.bankAccount}</strong></div>
                  <div>Chi nhánh mở tài khoản: {document.details.bankBranch}</div>
                  <div>Tình trạng: <strong className='text-emerald-700'>Đang hoạt động (Active Escrow Settlement)</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-border flex items-center justify-between bg-muted/30'>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <CheckCircle2 className='size-4 text-emerald-600' aria-hidden='true' />
            <span>Digital hash verified against Government Trust Service: <code>#SHA256-4b89-a21</code></span>
          </div>
          <Button variant='outline' size='sm' onClick={onClose}>
            Close Inspection (ESC)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
