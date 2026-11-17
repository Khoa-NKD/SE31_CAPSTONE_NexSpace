import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  administrativeName,
  buildingStreetLine,
  composeBuildingAddress,
  locateBuilding,
  provinceOptions,
  wardOptions,
  type MapPoint
} from '../api/building-location';

interface AddressDraft {
  city: string;
  ward: string;
  street: string;
  provinceCode: number;
}

export function BuildingAddressFields({
  mapPoint,
  disabled,
  initial,
  onChange
}: {
  mapPoint: MapPoint | null;
  disabled: boolean;
  initial?: { address: string; city?: string | null; ward?: string | null };
  onChange: (
    address: string,
    point: MapPoint | null,
    pending: boolean,
    administration: { city: string; ward: string }
  ) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const provinces = useQuery(provinceOptions());
  const [draft, setDraft] = useState<AddressDraft>({
    city: initial?.city || '',
    ward: initial?.ward || '',
    street: buildingStreetLine(initial?.address || ''),
    provinceCode: 0
  });
  const provinceCode =
    draft.provinceCode || provinces.data?.find((item) => item.name === draft.city)?.code || 0;
  const wards = useQuery({ ...wardOptions(provinceCode), enabled: provinceCode > 0 });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'approximate' | 'error'>(
    'idle'
  );
  const [administrationUnmatched, setAdministrationUnmatched] = useState(false);
  const job = useRef<{
    timer?: ReturnType<typeof setTimeout>;
    controller?: AbortController;
    sequence: number;
  }>({ sequence: 0 });
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const cancel = useCallback(() => {
    clearTimeout(job.current.timer);
    job.current.controller?.abort();
    job.current.sequence++;
  }, []);

  function edit(next: AddressDraft, immediately = false) {
    next = { ...next, street: immediately ? buildingStreetLine(next.street) : next.street };
    cancel();
    setDraft(next);
    setAdministrationUnmatched(false);
    const address = composeBuildingAddress(next.street, next.ward, next.city);
    const complete = Boolean(next.street.trim() && next.city && next.ward);
    changeRef.current(address, null, complete, next);
    setStatus(complete ? 'loading' : 'idle');
    if (!complete) return;
    const sequence = job.current.sequence;
    const controller = new AbortController();
    job.current.controller = controller;
    job.current.timer = setTimeout(
      async () => {
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const result = await locateBuilding(
            { address, city: next.city, ward: next.ward },
            controller.signal
          );
          if (sequence !== job.current.sequence) return;
          changeRef.current(
            address,
            { latitude: result.latitude, longitude: result.longitude },
            false,
            next
          );
          setStatus(result.approximate ? 'approximate' : 'ready');
        } catch {
          if (sequence !== job.current.sequence) return;
          changeRef.current(address, null, false, next);
          setStatus('error');
        } finally {
          clearTimeout(timeout);
        }
      },
      immediately ? 0 : 850
    );
  }

  useEffect(() => {
    if (!mapPoint) return;
    cancel();
    const sequence = job.current.sequence;
    const controller = new AbortController();
    job.current.controller = controller;
    job.current.timer = setTimeout(async () => {
      setStatus('loading');
      changeRef.current(
        composeBuildingAddress(
          draftRef.current.street,
          draftRef.current.ward,
          draftRef.current.city
        ),
        mapPoint,
        true,
        draftRef.current
      );
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const result = await locateBuilding(mapPoint, controller.signal);
        const allProvinces = await client.ensureQueryData(provinceOptions());
        const province = allProvinces.find(
          (item) => administrativeName(item.name) === administrativeName(result.city)
        );
        const allWards = province ? await client.ensureQueryData(wardOptions(province.code)) : [];
        const ward = allWards.find(
          (item) => administrativeName(item.name) === administrativeName(result.ward)
        );
        if (sequence !== job.current.sequence) return;
        if (controller.signal.aborted) throw new Error('Location lookup timed out');
        const next = {
          city: province?.name || result.city,
          ward: ward?.name || result.ward,
          street: buildingStreetLine(result.street),
          provinceCode: province?.code || 0
        };
        setDraft(next);
        setAdministrationUnmatched(!province || !ward);
        const address = composeBuildingAddress(next.street, next.ward, next.city);
        const complete = Boolean(next.street && next.ward && next.city);
        changeRef.current(address, complete ? mapPoint : null, false, next);
        setStatus(complete ? 'ready' : 'error');
      } catch {
        if (sequence !== job.current.sequence) return;
        // Keep the user's pin and entered address when reverse lookup is unavailable.
        const previous = draftRef.current;
        const complete = Boolean(previous.city && previous.ward && previous.street.trim());
        changeRef.current(
          composeBuildingAddress(previous.street, previous.ward, previous.city),
          complete ? mapPoint : null,
          false,
          previous
        );
        setStatus('error');
      } finally {
        clearTimeout(timeout);
      }
    }, 450);
    return cancel;
  }, [mapPoint, client, cancel]);

  useEffect(() => () => cancel(), [cancel]);

  const selectClass =
    'border-input bg-background focus:ring-ring h-11 w-full rounded-xl border px-3 text-sm focus:ring-2 focus:outline-none disabled:opacity-50';
  const cityListed = provinces.data?.some((item) => item.name === draft.city);
  const wardListed = wards.data?.some((item) => item.name === draft.ward);
  return (
    <div className='space-y-4'>
      <div>
        <label htmlFor='building-city' className='mb-2 block text-sm font-medium'>
          {c('Province / City', 'Tỉnh / Thành phố')} <span className='text-destructive'>*</span>
        </label>
        <select
          id='building-city'
          required
          className={selectClass}
          value={draft.city}
          disabled={disabled || provinces.isPending}
          onChange={(event) => {
            const province = provinces.data?.find((item) => item.name === event.target.value);
            edit({
              ...draft,
              city: event.target.value,
              provinceCode: province?.code || 0,
              ward: ''
            });
          }}
        >
          <option value=''>
            {provinces.isPending
              ? c('Loading provinces…', 'Đang tải tỉnh/thành…')
              : c('Select province / city', 'Chọn tỉnh / thành phố')}
          </option>
          {draft.city && !cityListed && (
            <option value={draft.city}>
              {draft.city} · {c('From map', 'Từ bản đồ')}
            </option>
          )}
          {provinces.data?.map((item) => (
            <option key={item.code} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        {provinces.isError && (
          <div className='text-destructive mt-2 text-xs'>
            {c('Cannot load provinces.', 'Chưa tải được tỉnh/thành.')}{' '}
            <button type='button' className='underline' onClick={() => void provinces.refetch()}>
              {c('Retry', 'Thử lại')}
            </button>
          </div>
        )}
      </div>
      <div>
        <label htmlFor='building-ward' className='mb-2 block text-sm font-medium'>
          {c('Ward / Commune', 'Phường / Xã')} <span className='text-destructive'>*</span>
        </label>
        <select
          id='building-ward'
          required
          className={selectClass}
          value={draft.ward}
          disabled={disabled || !draft.city || (draft.provinceCode > 0 && wards.isPending)}
          onChange={(event) => edit({ ...draft, ward: event.target.value })}
        >
          <option value=''>
            {draft.provinceCode > 0 && wards.isPending
              ? c('Loading wards…', 'Đang tải phường/xã…')
              : c('Select ward / commune', 'Chọn phường / xã')}
          </option>
          {draft.ward && !wardListed && (
            <option value={draft.ward}>
              {draft.ward} · {c('From map', 'Từ bản đồ')}
            </option>
          )}
          {wards.data?.map((item) => (
            <option key={item.code} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        {wards.isError && (
          <button
            type='button'
            className='text-destructive mt-2 text-xs underline'
            onClick={() => void wards.refetch()}
          >
            {c('Retry loading wards', 'Tải lại danh sách phường/xã')}
          </button>
        )}
      </div>
      <div>
        <label htmlFor='building-street' className='mb-2 block text-sm font-medium'>
          {c('House number & street', 'Số nhà và tên đường')}{' '}
          <span className='text-destructive'>*</span>
        </label>
        <Input
          id='building-street'
          required
          maxLength={300}
          value={draft.street}
          disabled={disabled}
          placeholder={c('e.g. 82 Nguyen Van Thoai', 'VD: 82 Nguyễn Văn Thoại')}
          onChange={(event) => edit({ ...draft, street: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              edit(draft, true);
            }
          }}
        />
      </div>
      <div
        className='from-primary/10 to-primary/0 rounded-xl border bg-gradient-to-br p-4'
        aria-live='polite'
      >
        <p className='text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide'>
          {c('Full address', 'Địa chỉ đầy đủ')}
        </p>
        <p className='text-sm leading-relaxed break-words'>
          {composeBuildingAddress(draft.street, draft.ward, draft.city) ||
            c('Your address will appear here', 'Địa chỉ sẽ hiển thị tại đây')}
        </p>
        <p className='text-muted-foreground mt-3 flex items-start gap-2 text-xs leading-relaxed'>
          {status === 'loading' ? (
            <LoaderCircle className='text-primary size-4 shrink-0 animate-spin' />
          ) : status === 'ready' ? (
            <CheckCircle2 className='size-4 shrink-0 text-emerald-500' />
          ) : (
            <MapPin className='text-primary size-4 shrink-0' />
          )}
          {status === 'loading'
            ? c('Syncing address and map…', 'Đang đồng bộ địa chỉ và bản đồ…')
            : status === 'ready'
              ? c(
                  'Location synced. Check the pin before saving.',
                  'Đã đồng bộ vị trí. Kiểm tra ghim trước khi lưu.'
                )
              : status === 'approximate'
                ? c(
                    'Approximate location. Move the pin to the exact building.',
                    'Vị trí gần đúng. Kéo ghim đến chính xác tòa nhà.'
                  )
                : status === 'error'
                  ? c(
                      'Could not resolve the full address. Complete the fields and place the pin manually.',
                      'Chưa xác định đủ địa chỉ. Hoàn thiện các ô rồi chọn ghim thủ công.'
                    )
                  : c(
                      'Complete the address to automatically locate it, or select a pin on the map.',
                      'Điền đủ địa chỉ để tự tìm vị trí hoặc chọn ghim trên bản đồ.'
                    )}
        </p>
        {administrationUnmatched && (
          <p className='mt-2 text-xs text-amber-600 dark:text-amber-400'>
            {c(
              'Map administrative names differ from the directory. Please check the province and ward.',
              'Tên địa giới trên bản đồ khác danh mục. Vui lòng kiểm tra lại tỉnh/thành và phường/xã.'
            )}
          </p>
        )}
        {status === 'error' && draft.city && draft.ward && draft.street && (
          <Button
            type='button'
            variant='link'
            size='sm'
            className='mt-2 h-auto p-0'
            disabled={disabled}
            onClick={() => edit(draft, true)}
          >
            {c('Find location again', 'Tìm lại vị trí')}
          </Button>
        )}
      </div>
    </div>
  );
}
