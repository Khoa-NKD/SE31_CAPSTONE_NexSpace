import { getAmenityIcon } from '@/features/amenities/components/amenity-icons';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { amenityQueries } from '@/features/amenities/api/queries';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import type { BookingDto } from '../../api/booking-types';

export function BookingAddonSelector({
  booking,
  locked,
  onUpdated,
  onBusy
}: {
  booking: BookingDto;
  locked: boolean;
  onUpdated: (booking: BookingDto) => void;
  onBusy: (busy: boolean) => void;
}) {
  const query = useQuery(amenityQueries.workspaceAmenities(booking.workspaceId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  let selected: number[] = [];
  try {
    selected =
      JSON.parse(booking.pricingSnapshot ?? '{}').addons?.map(
        (a: { amenityId: number }) => a.amenityId
      ) ?? [];
  } catch {
    /* Historical bookings may lack addon snapshots. */
  }
  async function change(id: number, checked: boolean) {
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      const updated = await apiClient.patch<BookingDto>('/bookings/' + booking.id + '/addons', {
        amenityIds: checked ? [...selected, id] : selected.filter((value) => value !== id)
      });
      onUpdated(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không cập nhật được tiện ích.');
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  const paid = query.data?.filter((item) => Number(item.addonPricePerHour) > 0) ?? [];
  if (query.isError)
    return (
      <div role='alert' className='rounded-lg border p-3 text-sm'>
        Không tải được tiện ích bổ sung.{' '}
        <Button size='sm' variant='link' onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  if (query.isPending)
    return <p className='text-xs text-muted-foreground'>Đang tải tiện ích bổ sung…</p>;
  if (!paid.length) return null;
  return (
    <section className='space-y-3 border-b pb-4'>
      <h3 className='text-sm font-semibold'>
        Thêm tiện ích <span className='font-normal text-muted-foreground'>(tùy chọn)</span>
      </h3>
      <p className='text-xs text-muted-foreground'>
        Tính theo số giờ sử dụng thực tế, cộng VAT vào tổng thanh toán.
      </p>
      {paid.map((item) => {
        const Icon = getAmenityIcon(item.icon || item.name);
        return (
          <label
            key={item.amenityId}
            className='flex items-center gap-3 rounded-lg border p-3 text-sm'
          >
            <input
              type='checkbox'
              disabled={locked || busy}
              checked={selected.includes(Number(item.amenityId))}
              onChange={(e) => void change(Number(item.amenityId), e.target.checked)}
            />
            <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Icon className='size-5' aria-hidden='true' />
            </span>
            <span className='flex-1'>{item.name}</span>
            <span className='text-xs text-muted-foreground'>
              {Number(item.addonPricePerHour).toLocaleString('vi-VN')} ₫/giờ
            </span>
          </label>
        );
      })}
      {locked && (
        <p className='text-xs text-muted-foreground'>Tiện ích đã chốt theo phiên thanh toán.</p>
      )}
      {error && (
        <p role='alert' className='text-xs text-destructive'>
          {error}
        </p>
      )}
    </section>
  );
}
