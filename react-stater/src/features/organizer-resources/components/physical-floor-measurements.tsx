import { Spinner as LoaderCircle } from '@/components/ui/spinner';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ruler } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { buildingsOptions, savePhysicalFloor, type PhysicalFloor } from '../api/buildings';
import {
  designMetricsOptions,
  previewDesignMetrics,
  saveDesignMetrics,
  type GeometryReview,
  type MetricsInput
} from '../api/floor-design';
import { metresToPixels } from '../utils/metric-units';
import { GeometryReviewNotice } from './geometry-review';

/** Empty floors are measured directly; shared floors must review every existing allocation. */
export function PhysicalFloorMeasurements({
  buildingId,
  floor,
  disabled,
  onEditingChange,
  onSaved
}: {
  buildingId: number;
  floor: PhysicalFloor;
  disabled?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onSaved?: (floor: PhysicalFloor) => void;
}) {
  const actor = useAuthStore((state) => state.user?.id ?? 0);
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [horizontal, setHorizontal] = useState('');
  const [vertical, setVertical] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<{ result: GeometryReview; input: MetricsInput } | null>(
    null
  );
  const reference = floor.occupants[0];
  const metrics = useQuery({
    ...designMetricsOptions(actor, reference?.workspaceId ?? 0, reference?.floorPlanId ?? 0),
    enabled: editing && !!reference
  });
  useEffect(() => {
    if (editing) onEditingChange?.(true);
    return () => {
      if (editing) onEditingChange?.(false);
    };
  }, [editing, onEditingChange]);
  const valid = [horizontal, vertical].every(
    (value) =>
      /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) &&
      Number(value) >= 0.01 &&
      Number(value) <= 10000
  );
  const measured = floor.realWidthM != null && floor.realLengthM != null;
  async function save() {
    if (busy || disabled || !valid || (reference && !metrics.data)) return;
    setBusy(true);
    setError('');
    try {
      if (reference) {
        const data = metrics.data!;
        const input: MetricsInput = review?.input ?? {
          expectedRevision: data.revision,
          measurementMode: 'RESIZE',
          widthM: Number(horizontal),
          lengthM: Number(vertical),
          maxOccupancy: data.maxOccupancy,
          occupancyLimit: data.occupancyLimit,
          confirmGeometryConversion: true
        };
        if (!review) {
          setReview({
            result: await previewDesignMetrics(reference.workspaceId, reference.floorPlanId, input),
            input
          });
          return;
        }
        if (!review.result.applicable) return;
        await saveDesignMetrics(reference.workspaceId, reference.floorPlanId, input);
      } else {
        await savePhysicalFloor(
          buildingId,
          {
            name: floor.name,
            floorNumber: floor.floorNumber,
            width: metresToPixels(Number(horizontal)),
            height: metresToPixels(Number(vertical)),
            widthM: Number(horizontal),
            lengthM: Number(vertical)
          },
          floor
        );
      }
      await client.invalidateQueries({ queryKey: ['organizer-resources', actor] });
      await client.refetchQueries({ queryKey: buildingsOptions(actor).queryKey });
      const updated = client
        .getQueryData(buildingsOptions(actor).queryKey)
        ?.find((building) => building.id === buildingId)
        ?.floors.find((item) => item.id === floor.id);
      if (updated) onSaved?.(updated);
      setEditing(false);
      setReview(null);
    } catch (failure) {
      setReview(null);
      setError(
        failure instanceof Error
          ? failure.message
          : c('Could not save floor measurements.', 'Không thể lưu kích thước tầng.')
      );
      await client.invalidateQueries({ queryKey: buildingsOptions(actor).queryKey });
      if (reference) await metrics.refetch();
    } finally {
      setBusy(false);
    }
  }
  function handleMeasurementKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    if (!review || review.result.applicable) void save();
  }
  return (
    <section className='space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs'>
          <p className='flex items-center gap-2 font-semibold'>
            <Ruler className='size-4' />
            {c('Physical floor', 'Kích thước toàn tầng')}
          </p>
          <p className='mt-1 text-muted-foreground'>
            {measured
              ? c('Horizontal length', 'Dài ngang') +
                ': ' +
                floor.realWidthM +
                ' m · ' +
                c('Vertical width', 'Rộng dọc') +
                ': ' +
                floor.realLengthM +
                ' m · ' +
                (floor.realWidthM! * floor.realLengthM!).toFixed(2) +
                ' m²'
              : c(
                  'Set real dimensions before allocating workspace areas.',
                  'Cần thiết lập số đo thực trước khi bố trí vùng workspace.'
                )}
          </p>
        </div>
        {!editing && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={disabled}
            onClick={() => {
              setHorizontal(String(floor.realWidthM ?? ''));
              setVertical(String(floor.realLengthM ?? ''));
              setReview(null);
              setError('');
              setEditing(true);
            }}
          >
            {measured
              ? c('Edit floor size', 'Sửa kích thước tầng')
              : c('Set floor size', 'Thiết lập kích thước tầng')}
          </Button>
        )}
      </div>
      {editing && (
        <div className='space-y-3'>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Shared by all workspaces on this floor. Existing areas and resources stay fixed.',
              'Số đo dùng chung cho mọi workspace trên tầng. Giữ nguyên vùng và ghế/phòng đã bố trí.'
            )}
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <label className='space-y-1 text-xs'>
              {c('Length — horizontal (m)', 'Dài — ngang (m)')}
              <Input
                onKeyDown={handleMeasurementKeyDown}
                type='number'
                min='0.01'
                max='10000'
                step='0.01'
                disabled={busy}
                value={horizontal}
                onChange={(event) => {
                  setHorizontal(event.target.value);
                  setReview(null);
                }}
              />
            </label>
            <label className='space-y-1 text-xs'>
              {c('Width — vertical (m)', 'Rộng — dọc (m)')}
              <Input
                onKeyDown={handleMeasurementKeyDown}
                type='number'
                min='0.01'
                max='10000'
                step='0.01'
                disabled={busy}
                value={vertical}
                onChange={(event) => {
                  setVertical(event.target.value);
                  setReview(null);
                }}
              />
            </label>
          </div>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Enter 0.01–10,000 m, up to two decimal places.',
              'Nhập từ 0,01 đến 10.000 m, tối đa 2 chữ số thập phân.'
            )}
          </p>
          {valid && (
            <p className='text-xs'>
              {c('Floor area', 'Diện tích tầng')}:{' '}
              <strong>{(Number(horizontal) * Number(vertical)).toFixed(2)} m²</strong>
            </p>
          )}
          {reference && metrics.isPending && (
            <p className='text-xs'>
              {c('Loading shared floor settings…', 'Đang tải cấu hình tầng chung…')}
            </p>
          )}
          {(error || (reference && metrics.isError)) && (
            <p role='alert' className='text-xs text-destructive'>
              {error || metrics.error?.message}
            </p>
          )}
          <GeometryReviewNotice review={review?.result ?? null} />
          <div className='flex gap-2'>
            <Button
              type='button'
              size='sm'
              disabled={
                disabled ||
                busy ||
                !valid ||
                (!!reference && !metrics.data) ||
                (!!review && !review.result.applicable)
              }
              onClick={() => void save()}
            >
              {busy && <LoaderCircle className='size-4' />}
              {review
                ? c('Confirm and save', 'Xác nhận và lưu')
                : reference
                  ? c('Review dimensions', 'Kiểm tra kích thước')
                  : c('Save dimensions', 'Lưu kích thước')}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setReview(null);
                setError('');
              }}
            >
              {c('Cancel', 'Hủy')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
