import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Download, Tags, Layers, Armchair, Coins, ReceiptText } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { RateType } from '@/features/organizer-operations/api';
import {
  useOperationsWorkspace,
  OperationsHeader,
  OperationsState,
  OperationMetrics,
  panelClass
} from '@/features/organizer-operations/components/operations-shared';
import {
  type TypeOption,
  type ResourceOptions
} from '@/features/organizer-resources/api/resources';
import { apiClient } from '@/lib/api-client';
import { operationMoney, exportRows } from '@/features/organizer-operations/format';
import { BaseRateEditor } from './pricing-live-editors';

export function PricingLiveView() {
  const c = useOrganizerCopy();
  const state = useOperationsWorkspace();
  const [rate, setRate] = useState<TypeOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const config = state.pricing.data;
  const shown =
    config?.resources.filter((r) =>
      `${r.name} ${r.code} ${r.typeName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    ) ?? [];
  async function editRate(type: RateType) {
    if (!state.workspaceId || busy) return;
    setBusy(true);
    setError('');
    try {
      const options = await apiClient.get<ResourceOptions>(
        `/organizer/workspaces/${state.workspaceId}/resource-options`
      );
      const current = options.types.find((t) => t.id === type.id);
      if (!current)
        throw new Error(
          c('Resource type changed. Reload.', 'Loại chỗ đã thay đổi. Vui lòng tải lại.')
        );
      setRate(current);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 pb-10'>
      <OperationsHeader
        icon={<Tags />}
        disabled={busy}
        title={c('Pricing', 'Bảng giá')}
        description={c(
          'Manage base rates by resource type and individual seat or room.',
          'Quản lý giá cơ bản theo loại chỗ và từng ghế/phòng.'
        )}
        state={{
          ...state,
          setWorkspaceId: (id) => {
            setRate(null);
            setError('');
            state.setWorkspaceId(id);
          }
        }}
      />
      <OperationsState state={state} />
      {error && (
        <p role='alert' className='rounded-xl border p-3 text-sm text-destructive'>
          {error}
        </p>
      )}
      {config && (
        <>
          <OperationMetrics
            items={[
              {
                label: c('Resource types', 'Loại chỗ'),
                value: config.types.length,
                icon: Layers,
                unit: c('types', 'loại')
              },
              {
                label: c('Seats and rooms', 'Ghế và phòng'),
                value: config.resources.length,
                icon: Armchair,
                unit: c('resources', 'chỗ')
              },
              {
                label: c('Currencies', 'Tiền tệ'),
                value: [...new Set(config.types.map((t) => t.currency))].join(' · ') || '—',
                icon: Coins
              }
            ]}
          />
          <section className={panelClass}>
            <h2 className='flex items-center gap-2.5 font-semibold'>
              <span className='organizer-section-icon'>
                <ReceiptText className='size-4' />
              </span>
              {c('Base rates by resource type', 'Giá cơ bản theo loại chỗ')}
            </h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              {c(
                'New bookings use current rates. Existing booking prices remain unchanged.',
                'Đổi giá áp dụng cho booking mới; giá đã chốt của booking cũ giữ nguyên.'
              )}
            </p>
            <div className='mt-4 overflow-x-auto rounded-xl border'>
              <table className='w-full text-sm'>
                <thead className='text-left text-xs text-muted-foreground'>
                  <tr>
                    <th className='p-3'>{c('Type', 'Loại chỗ')}</th>
                    {[
                      c('Hourly', 'Theo giờ'),
                      c('Daily', 'Theo ngày'),
                      c('Monthly', 'Theo tháng')
                    ].map((t) => (
                      <th key={t} className='p-3 text-right'>
                        {t}
                      </th>
                    ))}
                    <th className='p-3 text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                      <span className='sr-only'>{c('Actions', 'Thao tác')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.types.map((t) => (
                    <tr key={t.id} className='border-t transition-colors hover:bg-muted/30 group'>
                      <td className='p-3 font-medium'>
                        {t.name}
                        <p className='text-xs text-muted-foreground'>
                          {t.category === 'ROOM' ? c('Room', 'Phòng') : c('Seat', 'Ghế')} ·{' '}
                          {t.currency}
                          {!t.active && ` · ${c('Inactive', 'Ngừng dùng')}`}
                        </p>
                      </td>
                      {[t.hourlyPrice, t.dailyPrice, t.monthlyPrice].map((p, i) => (
                        <td key={i} className='whitespace-nowrap p-3 text-right tabular-nums'>
                          {operationMoney(p, t.currency)}
                        </td>
                      ))}
                      <td className='p-3 text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={busy}
                          onClick={() => void editRate(t)}
                        >
                          <Pencil className='size-3.5' />
                          {c('Edit rates', 'Chỉnh giá')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!config.types.length && (
              <p className='py-6 text-sm text-muted-foreground'>
                {c(
                  'Create resource types in Seats & rooms.',
                  'Chưa có loại chỗ. Tạo loại chỗ tại Quản lý ghế & phòng.'
                )}
              </p>
            )}
          </section>
          <section className={panelClass}>
            <div className='mb-4 flex flex-wrap justify-between gap-3'>
              <div>
                <h2 className='font-semibold'>
                  {c('Rates for each seat / room', 'Giá của từng ghế / phòng')}
                </h2>
                <p className='text-xs text-muted-foreground'>
                  {c('Base rates before taxes.', 'Giá cơ bản chưa bao gồm thuế.')}
                </p>
              </div>
              <div className='flex gap-2'>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={c('Search name or code…', 'Tìm mã hoặc tên…')}
                />
                <Button
                  variant='outline'
                  onClick={() =>
                    exportRows('bang-gia.csv', [
                      ['Code', 'Name', 'Floor', 'Currency', 'Hourly', 'Daily'],
                      ...shown.map((r) => [
                        r.code,
                        r.name,
                        r.floorNumber,
                        r.currency,
                        r.hourlyPrice,
                        r.dailyPrice
                      ])
                    ])
                  }
                >
                  <Download className='size-4' />
                  CSV
                </Button>
              </div>
            </div>
            <div className='max-h-[480px] overflow-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-muted text-left text-xs'>
                  <tr>
                    {[
                      c('Seat / room', 'Ghế / phòng'),
                      c('Floor', 'Tầng'),
                      c('Type', 'Loại chỗ'),
                      c('Hourly', 'Theo giờ'),
                      c('Daily', 'Theo ngày')
                    ].map((h) => (
                      <th key={h} className='p-3'>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className='border-t'>
                      <td className='p-3'>
                        {r.name || r.code}
                        <p className='text-xs text-muted-foreground'>
                          {r.code}
                          {r.parentRoomId && ` · ${c('Inside a room', 'Thuộc phòng')}`}
                        </p>
                      </td>
                      <td className='p-3'>{r.floorNumber}</td>
                      <td className='p-3'>{r.typeName}</td>
                      <td className='whitespace-nowrap p-3'>
                        {operationMoney(r.hourlyPrice, r.currency)}
                      </td>
                      <td className='whitespace-nowrap p-3'>
                        {operationMoney(r.dailyPrice, r.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && (
              <p className='py-4 text-sm text-muted-foreground'>
                {c('No matching resources.', 'Chưa có ghế/phòng phù hợp.')}
              </p>
            )}
            <Link
              to='/dashboard/organizer/resources'
              className='mt-4 inline-block text-sm text-primary hover:underline'
            >
              {c('Manage individual rate overrides →', 'Quản lý giá riêng từng ghế/phòng →')}
            </Link>
          </section>
          {rate && (
            <BaseRateEditor
              key={`${state.workspaceId}-${rate.id}`}
              workspaceId={state.workspaceId!}
              current={rate}
              close={() => setRate(null)}
              saved={state.invalidate}
            />
          )}
        </>
      )}
    </div>
  );
}
