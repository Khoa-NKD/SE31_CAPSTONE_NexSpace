import type { GeometryReview, GeometryPreviewShape } from '../api/floor-design';
import { useLanguage } from '@/features/landing/context/language-context';

/** Confirmation always follows a server-side review of all areas sharing this floor. */
export function GeometryReviewNotice({ review }: { review: GeometryReview | null }) {
  const { language } = useLanguage();
  if (!review) return null;
  const vi = language === 'vi';
  return (
    <div
      role='status'
      className={`space-y-2 rounded-xl border p-3 text-sm ${review.applicable ? 'border-primary/20 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}
    >
      <p className='font-medium'>{vi ? 'Đã kiểm tra toàn tầng' : 'Shared floor reviewed'}</p>
      <p>
        {review.workspaceAreas} {vi ? 'vùng workspace' : 'workspace areas'} · {review.resources}{' '}
        {vi ? 'ghế/phòng' : 'seats/rooms'}
      </p>
      {review.physicalWidthM != null && review.physicalLengthM != null && (
        <p className='font-medium'>
          {vi ? 'Toàn tầng sau cập nhật' : 'Updated physical floor'}: {review.physicalWidthM} ×{' '}
          {review.physicalLengthM} m
        </p>
      )}
      {review.measurementMode === 'RESIZE' && (
        <p>
          {vi
            ? 'Giữ nguyên số đo vùng workspace. Vùng có thể vẫn là hình chữ nhật dù toàn tầng là hình vuông.'
            : 'Workspace measurements stay fixed. An area can remain rectangular inside a square floor.'}
        </p>
      )}
      {review.measurementMode === 'CALIBRATE' && (
        <p>
          {vi
            ? 'Hiệu chỉnh vùng và vị trí theo bản vẽ; giữ kích thước chuẩn của ghế/phòng.'
            : 'Calibrate areas and positions from the drawing while preserving catalog footprints.'}
        </p>
      )}
      {review.conversionRequired && (
        <p>
          {vi
            ? 'Chuyển sang kích thước chuẩn theo mét. Bố cục cũ được giữ để đối chiếu; sơ đồ khách hàng chỉ đổi khi bạn publish.'
            : 'Convert to metric geometry. Original geometry is retained; the customer map changes only when published.'}
        </p>
      )}
      {review.issues.length > 0 && (
        <ul className='max-h-48 list-disc space-y-1 overflow-auto pl-4 text-destructive'>
          {review.issues.map((issue, index) => (
            <li key={`${index}:${issue}`}>
              {issue.startsWith('Legacy floor measurements need manual review')
                ? vi
                  ? 'Số đo gốc của tầng cũ đang thiếu hoặc tỷ lệ ngang/dọc không đồng nhất. Cần rà soát trước khi chuyển đổi; hệ thống giữ nguyên bố cục hiện có. Với tầng chỉ có vùng trống, có thể gỡ vùng trống rồi thiết lập lại số đo tầng.'
                  : issue
                : issue.startsWith('Drawing/type orientation conflict: ')
                  ? (vi
                      ? 'Hình phòng trong bản vẽ và số đo loại chỗ có hướng dài/ngắn ngược nhau. Cần chọn lại số đo hoặc loại phòng trước khi áp dụng: '
                      : 'The drawing and resource type disagree on the room’s long axis. Review its dimensions/type before applying: ') +
                    issue.slice('Drawing/type orientation conflict: '.length)
                  : issue}
            </li>
          ))}
        </ul>
      )}
      {!!review.previews?.length && (
        <details className='rounded-lg border bg-background p-2'>
          <summary className='cursor-pointer font-medium'>
            {vi ? 'Đối chiếu bố cục trước / sau' : 'Compare before / after'}
          </summary>
          <div className='mt-2 max-h-80 space-y-3 overflow-auto'>
            {review.previews.map((area) => {
              // Normalize legacy model pixels before comparing both scenes at the same real-world zoom.
              const scaleX =
                area.beforeWidthM != null && area.beforeWidth > 0
                  ? (area.beforeWidthM * 60) / area.beforeWidth
                  : 1;
              const scaleY =
                area.beforeLengthM != null && area.beforeHeight > 0
                  ? (area.beforeLengthM * 60) / area.beforeHeight
                  : 1;
              const frameWidth = Math.max(area.beforeFloorWidth * scaleX, area.afterFloorWidth);
              const frameHeight = Math.max(area.beforeFloorHeight * scaleY, area.afterFloorHeight);
              return (
                <div key={area.floorId}>
                  <p className='mb-1 text-xs font-medium'>{area.name}</p>
                  <div className='grid grid-cols-2 gap-2'>
                    <GeometryThumbnail
                      label={vi ? 'Hiện tại' : 'Current'}
                      width={area.beforeFloorWidth}
                      height={area.beforeFloorHeight}
                      areaX={area.beforeX}
                      areaY={area.beforeY}
                      areaWidth={area.beforeWidth}
                      areaHeight={area.beforeHeight}
                      shapes={area.before}
                      scaleX={scaleX}
                      scaleY={scaleY}
                      frameWidth={frameWidth}
                      frameHeight={frameHeight}
                    />
                    <GeometryThumbnail
                      label={vi ? 'Sau cập nhật' : 'Updated'}
                      width={area.afterFloorWidth}
                      height={area.afterFloorHeight}
                      areaX={area.afterX}
                      areaY={area.afterY}
                      areaWidth={area.afterWidth}
                      areaHeight={area.afterHeight}
                      shapes={area.after}
                      frameWidth={frameWidth}
                      frameHeight={frameHeight}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
      {review.applicable && (
        <p>{vi ? 'Bấm Xác nhận và lưu để áp dụng.' : 'Choose Confirm and save to apply.'}</p>
      )}
    </div>
  );
}

function GeometryThumbnail({
  label,
  width,
  height,
  shapes,
  areaX,
  areaY,
  areaWidth,
  areaHeight,
  frameWidth,
  frameHeight,
  scaleX = 1,
  scaleY = 1
}: {
  scaleX?: number;
  scaleY?: number;
  label: string;
  width: number;
  height: number;
  shapes: GeometryPreviewShape[];
  areaX: number;
  areaY: number;
  areaWidth: number;
  areaHeight: number;
  frameWidth: number;
  frameHeight: number;
}) {
  return (
    <figure className='min-w-0 rounded-md border p-1'>
      <figcaption className='mb-1 text-center text-[10px] text-muted-foreground'>
        {label} · {((100 * areaWidth * areaHeight) / (width * height)).toFixed(1)}%
      </figcaption>
      <svg
        className='h-28 w-full bg-muted/20'
        viewBox={`-5 -5 ${Math.max(1, frameWidth) + 10} ${Math.max(1, frameHeight) + 10}`}
        role='img'
        aria-label={label}
      >
        <g transform={`scale(${scaleX} ${scaleY})`}>
          <rect
            width={width}
            height={height}
            className='fill-background stroke-border'
            vectorEffect='non-scaling-stroke'
          />
          <g transform={`translate(${areaX} ${areaY})`}>
            <rect
              width={areaWidth}
              height={areaHeight}
              className='fill-primary/5 stroke-primary'
              vectorEffect='non-scaling-stroke'
              strokeDasharray='4 3'
            />
            {shapes.map((shape, index) => (
              <rect
                key={index}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                transform={`rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`}
                className='fill-primary/20 stroke-primary'
                strokeWidth='0.7'
                vectorEffect='non-scaling-stroke'
              >
                <title>{shape.label}</title>
              </rect>
            ))}
          </g>
        </g>
      </svg>
    </figure>
  );
}
