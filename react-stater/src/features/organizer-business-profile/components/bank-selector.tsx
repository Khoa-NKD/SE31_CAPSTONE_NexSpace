import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Landmark, LoaderCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { bankCatalogQueryOptions, bankSearchText, findSelectedBank } from '../api/banks';
import type { BankOption } from '../api/banks';

function BankLogo({ bank }: { bank?: BankOption }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className='border-border bg-muted/30 flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border'>
      {bank?.logo && !failed ? (
        <img
          src={bank.logo}
          alt=''
          loading='lazy'
          referrerPolicy='no-referrer'
          onError={() => setFailed(true)}
          className='h-full w-full bg-white object-contain p-1'
        />
      ) : (
        <Landmark className='text-muted-foreground size-4' />
      )}
    </span>
  );
}

/** Stores the existing bank-name value while provider BINs remain catalog-only metadata. */
export function BankSelector({
  value,
  onChange,
  disabled,
  error
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const [open, setOpen] = useState(false);
  const catalog = useQuery(bankCatalogQueryOptions());
  const options = catalog.data ?? [];
  const selected = findSelectedBank(options, value);
  return (
    <div className='space-y-2'>
      <label htmlFor='business-bankName' className='text-sm font-medium'>
        {vi ? 'Ngân hàng' : 'Bank'}
      </label>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id='business-bankName'
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open && !disabled}
            aria-invalid={!!error}
            aria-describedby={error ? 'bankName-error' : undefined}
            disabled={disabled}
            className='h-auto min-h-14 w-full justify-between gap-3 px-3 py-2 text-left font-normal'
          >
            <BankLogo key={selected?.logo ?? value} bank={selected} />
            <span className='min-w-0 flex-1'>
              <span
                className={`block truncate text-sm ${value ? 'font-medium' : 'text-muted-foreground'}`}
              >
                {selected?.shortName || value || (vi ? 'Chọn ngân hàng' : 'Choose a bank')}
              </span>
              <span className='text-muted-foreground block truncate text-xs'>
                {selected?.name ||
                  (vi ? 'Tìm theo tên hoặc mã ngân hàng' : 'Search by bank name or code')}
              </span>
            </span>
            {catalog.isFetching ? (
              <LoaderCircle className='text-muted-foreground size-4 shrink-0 animate-spin' />
            ) : (
              <ChevronsUpDown className='text-muted-foreground size-4 shrink-0' />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'
        >
          <Command
            filter={(value, search) =>
              bankSearchText(value).includes(bankSearchText(search.trim())) ? 1 : 0
            }
          >
            <CommandInput
              placeholder={vi ? 'Tìm Vietcombank, VCB, mã BIN…' : 'Search Vietcombank, VCB, BIN…'}
            />
            {catalog.isPending ? (
              <p
                role='status'
                className='text-muted-foreground flex items-center gap-2 p-4 text-sm'
              >
                <LoaderCircle className='size-4 animate-spin' />
                {vi ? 'Đang tải danh sách ngân hàng…' : 'Loading banks…'}
              </p>
            ) : catalog.isError && !options.length ? (
              <div className='space-y-3 p-4'>
                <p role='alert' className='text-muted-foreground text-sm'>
                  {vi
                    ? 'Chưa tải được danh sách ngân hàng. Thông tin đang lưu vẫn được giữ nguyên.'
                    : 'Could not load banks. Your saved details are preserved.'}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={catalog.isFetching}
                  onClick={() => void catalog.refetch()}
                >
                  <RefreshCw className='size-3.5' />
                  {vi ? 'Thử lại' : 'Try again'}
                </Button>
              </div>
            ) : (
              <CommandList className='max-h-[204px] overflow-y-auto overscroll-contain'>
                <CommandEmpty>
                  {vi ? 'Không tìm thấy ngân hàng phù hợp.' : 'No matching bank found.'}
                </CommandEmpty>
                <CommandGroup heading={vi ? 'Danh sách VietQR' : 'VietQR directory'}>
                  {options.map((bank) => (
                    <CommandItem
                      key={bank.bin}
                      value={`${bank.shortName} ${bank.code} ${bank.name} ${bank.bin}`}
                      onSelect={() => {
                        onChange(bank.shortName);
                        setOpen(false);
                      }}
                      className='h-14 cursor-pointer gap-3 rounded-lg px-3 py-2.5'
                    >
                      <BankLogo bank={bank} />
                      <span className='min-w-0 flex-1'>
                        <span className='block text-sm font-medium'>{bank.shortName}</span>
                        <span className='text-muted-foreground block truncate text-xs'>
                          {bank.name}
                        </span>
                      </span>
                      {selected?.bin === bank.bin ? (
                        <Check className='text-primary size-4 shrink-0' />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
          <div className='border-border bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs'>
            {vi
              ? 'Danh sách và logo từ VietQR · Chủ tài khoản nhập thủ công'
              : 'Directory & logos by VietQR · Enter account holder manually'}
          </div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p id='bankName-error' role='alert' className='text-destructive text-sm'>
          {error}
        </p>
      ) : null}
    </div>
  );
}
