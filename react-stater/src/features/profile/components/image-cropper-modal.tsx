import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Crop,
  Check,
  Zap
} from '@/components/ui/hugeicons';
import { toast } from 'sonner';

export type CropShape = 'circle';

interface ImageCropperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  fileName?: string;
  onCropComplete: (croppedFile: File, previewUrl: string, autoSave?: boolean) => void;
}

const VIEWPORT_SIZE = 340; // Kích thước viewport hiển thị (px)
const EXPORT_SIZE = 320; // Kích thước xuất chuẩn tối ưu cho avatar sắc nét (Retina) và siêu nhẹ (~15-25KB)
const CROP_RATIO = 0.84; // Vùng cắt tròn chiếm 84% viewport (bán kính = 42%)
const CROP_DIAMETER = VIEWPORT_SIZE * CROP_RATIO; // ~285.6px

export function ImageCropperModal({
  open,
  onOpenChange,
  imageSrc,
  fileName = 'avatar.png',
  onCropComplete
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tính kích thước cơ sở để ảnh luôn luôn bao phủ (COVER) kín toàn bộ vòng tròn cắt
  const aspect = naturalSize.width > 0 && naturalSize.height > 0
    ? naturalSize.width / naturalSize.height
    : 1;

  let baseWidth = CROP_DIAMETER;
  let baseHeight = CROP_DIAMETER;
  if (aspect >= 1) {
    // Ảnh ngang hoặc vuông: chiều cao bằng đường kính, chiều rộng mở rộng theo tỉ lệ
    baseHeight = CROP_DIAMETER;
    baseWidth = CROP_DIAMETER * aspect;
  } else {
    // Ảnh dọc (như ảnh thẻ, chân dung): chiều rộng bằng đường kính, chiều cao mở rộng theo tỉ lệ
    baseWidth = CROP_DIAMETER;
    baseHeight = CROP_DIAMETER / aspect;
  }

  // Giới hạn kéo thả (Pan Clamping) để ảnh không bao giờ bị kéo hở khoảng trắng ngoài hình tròn
  const currentW = baseWidth * zoom;
  const currentH = baseHeight * zoom;
  const maxPanX = Math.max(0, (currentW - CROP_DIAMETER) / 2);
  const maxPanY = Math.max(0, (currentH - CROP_DIAMETER) / 2);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);
      setNaturalSize({ width: 0, height: 0 });
    }
    onOpenChange(isOpen);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    const nw = target.naturalWidth || target.width;
    const nh = target.naturalHeight || target.height;
    setNaturalSize({ width: nw, height: nh });
    setImageLoaded(true);
  };

  // Xoay 90 độ
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Đặt lại căn giữa
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Thay đổi zoom an toàn kèm kẹp biên độ pan
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(Math.max(newZoom, 1), 3);
    setZoom(clampedZoom);
    const nextW = baseWidth * clampedZoom;
    const nextH = baseHeight * clampedZoom;
    const nextMaxX = Math.max(0, (nextW - CROP_DIAMETER) / 2);
    const nextMaxY = Math.max(0, (nextH - CROP_DIAMETER) / 2);
    setPan((prev) => ({
      x: Math.min(Math.max(prev.x, -nextMaxX), nextMaxX),
      y: Math.min(Math.max(prev.y, -nextMaxY), nextMaxY)
    }));
  };

  // Bắt đầu kéo thả (Pointer Down)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  // Di chuyển ảnh (Pointer Move) kèm giới hạn kéo không lộ khoảng trắng
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setPan({
      x: Math.min(Math.max(rawX, -maxPanX), maxPanX),
      y: Math.min(Math.max(rawY, -maxPanY), maxPanY)
    });
  };

  // Thả chuột (Pointer Up)
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Lăn chuột để zoom mượt
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomStep = 0.08;
    const next = e.deltaY < 0 ? zoom + zoomStep : zoom - zoomStep;
    handleZoomChange(next);
  };

  // Xuất ảnh đã crop bằng HTML5 Canvas hình tròn phủ kín 100% không bao giờ lộ viền trắng
  const performCrop = useCallback(
    (autoSave = false) => {
      if (!imgRef.current) return;

      try {
        const img = imgRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = EXPORT_SIZE;
        canvas.height = EXPORT_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Áp dụng mặt nạ cắt hình tròn (Circle clip mask) khớp 100% canvas
        const cx = EXPORT_SIZE / 2;
        const cy = EXPORT_SIZE / 2;
        const radius = EXPORT_SIZE / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 2. Tỉ lệ scale giữa vùng cắt viewport và canvas xuất ra
        const scaleToCanvas = EXPORT_SIZE / CROP_DIAMETER;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rotation * Math.PI) / 180);
        // Dịch chuyển pan theo chuẩn tọa độ canvas (độc lập với zoom)
        ctx.translate(pan.x * scaleToCanvas, pan.y * scaleToCanvas);
        // Phóng to theo zoom và tỉ lệ canvas
        ctx.scale(zoom * scaleToCanvas, zoom * scaleToCanvas);

        // Vẽ ảnh với kích thước cơ sở (COVER) căn đều quanh tâm
        ctx.drawImage(img, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        ctx.restore();

        // 3. Xuất file ảnh WebP siêu nhẹ với chất lượng 0.82 (~15-25KB, upload siêu tốc)
        const mimeType = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback sang JPEG nếu trình duyệt cũ không hỗ trợ WebP toBlob
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) return;
                  const finalName = fileName.replace(/\.[^.]+$/, '.jpg');
                  const croppedFile = new File([fallbackBlob], finalName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  const previewUrl = URL.createObjectURL(fallbackBlob);
                  onCropComplete(croppedFile, previewUrl, autoSave);
                  onOpenChange(false);
                },
                'image/jpeg',
                0.85
              );
              return;
            }
            const finalName = fileName.replace(/\.[^.]+$/, '.webp');
            const croppedFile = new File([blob], finalName, {
              type: mimeType,
              lastModified: Date.now()
            });
            const previewUrl = URL.createObjectURL(blob);
            onCropComplete(croppedFile, previewUrl, autoSave);
            onOpenChange(false);
          },
          mimeType,
          0.82
        );
      } catch {
        toast.error('Lỗi khi xuất ảnh: Canvas bị hạn chế bảo mật bởi liên kết ngoài. Vui lòng tải ảnh về máy hoặc dùng chức năng proxy.');
      }
    },
    [zoom, rotation, pan, baseWidth, baseHeight, fileName, onCropComplete, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className='sm:max-w-[440px] p-5 gap-4 overflow-hidden'>
        <DialogHeader className='text-left pb-1'>
          <DialogTitle className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <Crop className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
            <span>Cắt & Căn chỉnh ảnh đại diện</span>
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Kéo thả và phóng to để căn giữa khuôn mặt trong khung tròn chuẩn avatar.
          </DialogDescription>
        </DialogHeader>

        {/* Interactive Cropper Viewport */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className={`relative mx-auto w-[340px] h-[340px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner select-none touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
        >
          {/* Lớp hiển thị ảnh được biến đổi COVER */}
          {imageSrc && (
            <div
              className='absolute inset-0 flex items-center justify-center'
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.08s ease-out'
              }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt='Crop preview'
                onLoad={handleImageLoad}
                crossOrigin='anonymous'
                className='max-w-none pointer-events-none select-none'
                style={{
                  width: `${baseWidth * zoom}px`,
                  height: `${baseHeight * zoom}px`,
                  objectFit: 'fill'
                }}
              />
            </div>
          )}

          {/* Lớp phủ SVG: Mặt nạ làm tối vùng ngoài hình tròn + Lưới 3x3 trong khung cắt */}
          <svg
            className='absolute inset-0 pointer-events-none w-full h-full'
            viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
          >
            <defs>
              {/* Mask cho Hình tròn */}
              <mask id='mask-circle'>
                <rect width='100%' height='100%' fill='white' />
                <circle cx={VIEWPORT_SIZE / 2} cy={VIEWPORT_SIZE / 2} r={CROP_DIAMETER / 2} fill='black' />
              </mask>

              {/* Clip path để chỉ hiển thị lưới 3x3 bên trong khung tròn */}
              <clipPath id='clip-circle'>
                <circle cx={VIEWPORT_SIZE / 2} cy={VIEWPORT_SIZE / 2} r={CROP_DIAMETER / 2} />
              </clipPath>
            </defs>

            {/* Lớp phủ làm tối/mờ khu vực ngoài khung tròn */}
            <rect
              width='100%'
              height='100%'
              fill='rgba(15, 23, 42, 0.72)'
              mask='url(#mask-circle)'
            />

            {/* Lưới 3x3 căn chỉnh khuôn mặt bên trong hình tròn */}
            <g clipPath='url(#clip-circle)'>
              {/* 2 đường kẻ ngang */}
              <line
                x1='0'
                y1={VIEWPORT_SIZE / 2 - 45}
                x2={VIEWPORT_SIZE}
                y2={VIEWPORT_SIZE / 2 - 45}
                stroke='rgba(255, 255, 255, 0.6)'
                strokeWidth='1'
              />
              <line
                x1='0'
                y1={VIEWPORT_SIZE / 2 + 45}
                x2={VIEWPORT_SIZE}
                y2={VIEWPORT_SIZE / 2 + 45}
                stroke='rgba(255, 255, 255, 0.6)'
                strokeWidth='1'
              />
              {/* 2 đường kẻ dọc */}
              <line
                x1={VIEWPORT_SIZE / 2 - 45}
                y1='0'
                x2={VIEWPORT_SIZE / 2 - 45}
                y2={VIEWPORT_SIZE}
                stroke='rgba(255, 255, 255, 0.6)'
                strokeWidth='1'
              />
              <line
                x1={VIEWPORT_SIZE / 2 + 45}
                y1='0'
                x2={VIEWPORT_SIZE / 2 + 45}
                y2={VIEWPORT_SIZE}
                stroke='rgba(255, 255, 255, 0.6)'
                strokeWidth='1'
              />
            </g>

            {/* Đường viền khung tròn cắt ảnh */}
            <circle
              cx={VIEWPORT_SIZE / 2}
              cy={VIEWPORT_SIZE / 2}
              r={CROP_DIAMETER / 2}
              fill='none'
              stroke='rgba(255, 255, 255, 0.9)'
              strokeWidth='1.5'
            />
          </svg>
        </div>

        {/* Thanh điều khiển Zoom & Rotate */}
        <div className='flex items-center gap-3 px-1'>
          <ZoomOut className='w-4 h-4 text-muted-foreground shrink-0' />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(val) => handleZoomChange(val[0])}
            className='flex-1 cursor-pointer'
          />
          <ZoomIn className='w-4 h-4 text-muted-foreground shrink-0' />

          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            onClick={handleRotate}
            title='Xoay 90 độ'
            className='shrink-0 h-8 w-8 text-xs cursor-pointer'
          >
            <RotateCw className='w-3.5 h-3.5' />
          </Button>

          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            onClick={handleReset}
            title='Đặt lại vị trí'
            className='shrink-0 h-8 w-8 text-xs text-muted-foreground cursor-pointer'
          >
            <RotateCcw className='w-3.5 h-3.5' />
          </Button>
        </div>

        {/* Action Buttons */}
        <DialogFooter className='flex items-center justify-between sm:justify-between pt-2 border-t border-border mt-1 gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            className='text-xs'
          >
            Hủy
          </Button>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => performCrop(false)}
              disabled={!imageLoaded}
              className='text-xs flex items-center gap-1.5 cursor-pointer'
            >
              <Check className='w-3.5 h-3.5' />
              <span>Cắt & Xem lại</span>
            </Button>

            <Button
              type='button'
              size='sm'
              onClick={() => performCrop(true)}
              disabled={!imageLoaded}
              className='bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm cursor-pointer'
            >
              <Zap className='w-3.5 h-3.5' />
              <span>Cắt & Lưu ngay</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCropperModal;
